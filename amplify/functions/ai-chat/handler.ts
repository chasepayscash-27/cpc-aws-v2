import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";
const MODEL_ID_INFERENCE_PROFILE = "us.anthropic.claude-3-haiku-20240307-v1:0";

type ChatRole = "user" | "assistant";
type ChatHistoryItem = {
  role: ChatRole;
  text: string;
};

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

function response(statusCode: number, body: unknown) {
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

export const handler = async (event: any) => {
  try {
    if (event.requestContext?.http?.method === "OPTIONS") {
      return response(200, { ok: true });
    }

    const parsedBody = event.body ? JSON.parse(event.body) : {};
    const message = String(parsedBody.message ?? "").trim();
    const parsedHistory = Array.isArray(parsedBody.history)
      ? parsedBody.history
      : [];

    if (!message) {
      return response(400, { error: "Message is required." });
    }

    const rawHistoryItems = parsedHistory.filter(
      (item: unknown): item is { role?: unknown; text?: unknown } =>
        !!item && typeof item === "object"
    );
    const history: ChatHistoryItem[] = rawHistoryItems
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
      system:
        "You are a helpful assistant for Chase Pays Cash, a real estate investment company. " +
        "Answer questions about real estate investing, deal analysis, and property management. " +
        "Be concise, friendly, and practical.",
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

    return response(200, { reply });
  } catch (error: any) {
    console.error("AI chat error:", error);

    return response(500, {
      error: "AI chat failed.",
      detail: error?.message ?? String(error),
    });
  }
};
