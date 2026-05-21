import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const MODEL_ID = "anthropic.claude-haiku-4-5-20251001-v1:0";
const MODEL_ID_INFERENCE_PROFILE = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

type ChatRole = "user" | "assistant";
type ChatHistoryItem = {
  role: ChatRole;
  text: string;
};
type ChatContext = Record<string, unknown>;

const BASE_SYSTEM_PROMPT =
  "You are a helpful assistant for Chase Pays Cash, a real estate investment company. " +
  "Answer questions about real estate investing, deal analysis, property management, portfolio analysis, " +
  "and predictive analytics. Be concise, friendly, practical, and data-aware.";

function asErrorLike(error: unknown): { name?: string; __type?: string; message?: string } {
  return error && typeof error === "object"
    ? (error as { name?: string; __type?: string; message?: string })
    : {};
}

function shouldRetryWithInferenceProfile(error: unknown): boolean {
  const { name, __type, message } = asErrorLike(error);
  const combined = `${name ?? ""} ${__type ?? ""} ${message ?? ""}`.toLowerCase();
  return (
    name === "AccessDeniedException" ||
    __type === "AccessDeniedException" ||
    combined.includes("inference profile") ||
    combined.includes("on-demand throughput isn't supported")
  );
}

async function invokeClaude(body: unknown, modelId: string): Promise<string> {
  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  });

  const bedrockResponse = await client.send(command);
  const decoded = new TextDecoder().decode(bedrockResponse.body);
  const result = JSON.parse(decoded);
  return result?.content?.[0]?.text ?? "Sorry, I could not generate a response.";
}

function response(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function getHeader(
  headers: APIGatewayProxyEventV2["headers"],
  name: string
): string | undefined {
  const exactMatch = headers?.[name];
  if (typeof exactMatch === "string") return exactMatch;

  const lowerCaseMatch = headers?.[name.toLowerCase()];
  return typeof lowerCaseMatch === "string" ? lowerCaseMatch : undefined;
}

function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
  if (!event.body) return {};

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;

  const parsed = JSON.parse(raw);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function getContext(parsedContext: unknown): ChatContext | undefined {
  if (!parsedContext || typeof parsedContext !== "object" || Array.isArray(parsedContext)) {
    return undefined;
  }

  return parsedContext as ChatContext;
}

function buildSystemPrompt(context?: ChatContext): string {
  if (!context) {
    return BASE_SYSTEM_PROMPT;
  }

  return [
    BASE_SYSTEM_PROMPT,
    "Use the provided portfolio context below for any portfolio-specific, analytical, or predictive answer.",
    "If the answer depends on data not present in the context, say so clearly instead of inventing numbers.",
    "When ranking or comparing properties, cite the relevant fields from the provided context.",
    "",
    "Portfolio context:",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

function getSourceIp(event: APIGatewayProxyEventV2): string | null {
  const forwardedFor = getHeader(event.headers, "x-forwarded-for");
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return event.requestContext?.http?.sourceIp ?? null;
}

async function logChatInteraction(input: {
  event: APIGatewayProxyEventV2;
  message: string;
  reply?: string;
  error?: string;
  context?: ChatContext;
}): Promise<void> {
  const bucketName = process.env.CHAT_LOG_BUCKET_NAME;
  if (!bucketName) return;

  const timestamp = new Date().toISOString();
  const datePrefix = timestamp.slice(0, 10).replace(/-/g, "/");
  const prefix = (process.env.CHAT_LOG_PREFIX ?? "chat-logs").replace(/\/+$/, "");
  const key = `${prefix}/${datePrefix}/${timestamp}-${randomUUID()}.json`;

  const payload = {
    timestamp,
    sourceIp: getSourceIp(input.event),
    userAgent:
      input.event.headers?.["user-agent"] ?? input.event.headers?.["User-Agent"] ?? null,
    referer: input.event.headers?.referer ?? input.event.headers?.Referer ?? null,
    question: input.message,
    response: input.reply ?? null,
    error: input.error ?? null,
    contextSummary:
      input.context && typeof input.context.summary === "object"
        ? input.context.summary
        : null,
  };

  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(payload, null, 2),
        ContentType: "application/json",
      })
    );
  } catch (error) {
    console.warn("[ai-chat] Failed to persist chat log to S3.", { bucketName, key, error });
  }
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  let message = "";
  let history: ChatHistoryItem[] = [];
  let context: ChatContext | undefined;

  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return response(200, { ok: true });
    }

    const parsedBody = parseBody(event);
    message = String(parsedBody.message ?? "").trim();
    const parsedHistory = Array.isArray(parsedBody.history)
      ? parsedBody.history
      : [];
    context = getContext(parsedBody.context);

    if (!message) {
      return response(400, { error: "Message is required." });
    }

    const rawHistoryItems = parsedHistory.filter(
      (item: unknown): item is { role?: unknown; text?: unknown } =>
        !!item && typeof item === "object"
    );
    history = rawHistoryItems
      .map((item: { role?: unknown; text?: unknown }): ChatHistoryItem => ({
        role:
          item.role === "assistant" || item.role === "user"
            ? item.role
            : "user",
        text: String(item.text ?? "").trim(),
      }))
      .filter((item: ChatHistoryItem) => item.text.length > 0);

    const body = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 800,
      temperature: 0.4,
      system: buildSystemPrompt(context),
      messages: [
        ...history.map((item) => ({
          role: item.role,
          content: [{ type: "text", text: item.text }],
        })),
        {
          role: "user" as const,
          content: [{ type: "text", text: message }],
        },
      ],
    };

    let reply: string;
    let usedInferenceProfile = false;

    try {
      reply = await invokeClaude(body, MODEL_ID);
      console.log("[ai-chat] Invoked base model ID.", { modelId: MODEL_ID });
    } catch (error: unknown) {
      if (!shouldRetryWithInferenceProfile(error)) {
        throw error;
      }

      console.warn("[ai-chat] Base model invoke failed; retrying via inference profile.", {
        modelId: MODEL_ID,
        fallbackModelId: MODEL_ID_INFERENCE_PROFILE,
        error,
      });
      reply = await invokeClaude(body, MODEL_ID_INFERENCE_PROFILE);
      usedInferenceProfile = true;
    }

    if (usedInferenceProfile) {
      console.log("[ai-chat] Reply generated via inference profile.", {
        modelId: MODEL_ID_INFERENCE_PROFILE,
      });
    }

    await logChatInteraction({ event, message, reply, context });

    return response(200, { reply });
  } catch (error: unknown) {
    console.error("AI chat error:", error);
    const detail = error instanceof Error ? error.message : String(error);

    if (message) {
      await logChatInteraction({
        event,
        message,
        error: detail,
        context,
      });
    }

    return response(500, {
      error: "AI chat failed.",
      detail,
    });
  }
};
