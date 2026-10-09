import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  DeleteTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  StartTranscriptionJobCommand,
  TranscribeClient,
} from "@aws-sdk/client-transcribe";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import {
  parseVoiceMemoKey,
  SUMMARY_PREFIX,
  TRANSCRIPT_PREFIX,
  type TranscribeMediaFormat,
  transcriptionJobName,
} from "./logic";

const region = process.env.AWS_REGION ?? "us-east-1";
const s3Client = new S3Client({ region });
const transcribeClient = new TranscribeClient({ region });
const bedrockClient = new BedrockRuntimeClient({ region });

const SOURCE_BUCKET = process.env.VOICE_MEMO_BUCKET_NAME ?? "";
const ARTIFACT_BUCKET = process.env.TRANSCRIPTION_ARTIFACT_BUCKET_NAME ?? "";
const TRANSCRIBE_ROLE_ARN = process.env.TRANSCRIBE_DATA_ACCESS_ROLE_ARN ?? "";
const MODEL_ID = "anthropic.claude-haiku-4-5-20251001-v1:0";
const MODEL_ID_INFERENCE_PROFILE = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const MAX_TRANSCRIPT_CHARS = 400_000;
const SUMMARY_CHUNK_CHARS = 80_000;
const MAX_AUDIO_BYTES = 500 * 1024 * 1024;

function response(
  statusCode: number,
  body: unknown,
): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event: APIGatewayProxyEventV2): Record<string, unknown> {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf-8")
      : event.body;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function isMissingObject(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    ["NoSuchKey", "NotFound", "NoSuchBucket"].includes(
      String((error as { name?: string }).name),
    )
  );
}

async function getCachedSummary(jobName: string): Promise<string | undefined> {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: ARTIFACT_BUCKET,
        Key: `${SUMMARY_PREFIX}${jobName}.json`,
      }),
    );
    const cached = JSON.parse(await result.Body?.transformToString("utf-8") ?? "{}");
    return typeof cached.summary === "string" ? cached.summary : undefined;
  } catch (error: unknown) {
    if (isMissingObject(error)) return undefined;
    throw error;
  }
}

async function invokeClaude(prompt: string, modelId: string): Promise<string> {
  const result = await bedrockClient.send(
    new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 3000,
        temperature: 0.2,
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }),
    }),
  );
  const parsed = JSON.parse(new TextDecoder().decode(result.body));
  return parsed?.content?.[0]?.text ?? "";
}

async function callSummaryModel(prompt: string): Promise<string> {
  try {
    return await invokeClaude(prompt, MODEL_ID);
  } catch (error: unknown) {
    const detail =
      error && typeof error === "object"
        ? `${(error as { name?: string }).name ?? ""} ${(error as { message?: string }).message ?? ""}`.toLowerCase()
        : String(error).toLowerCase();
    if (
      !detail.includes("accessdenied") &&
      !detail.includes("inference profile") &&
      !detail.includes("on-demand throughput")
    ) {
      throw error;
    }
    return invokeClaude(prompt, MODEL_ID_INFERENCE_PROFILE);
  }
}

function summaryPrompt(transcript: string): string {
  return [
    "Turn this sales meeting transcript into accurate, useful notes for the team.",
    "Use Markdown with these sections: Meeting overview, Key updates, Decisions, Action items (include owner and due date only when stated), and Open questions.",
    "Preserve specific names, numbers, commitments, and dates. Do not invent missing details; write 'Not specified' when useful.",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

async function summarizeTranscript(transcript: string): Promise<string> {
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    throw new Error("The transcript is too large to summarize.");
  }

  if (transcript.length <= SUMMARY_CHUNK_CHARS) {
    return callSummaryModel(summaryPrompt(transcript));
  }

  const notes: string[] = [];
  for (let start = 0; start < transcript.length; start += SUMMARY_CHUNK_CHARS) {
    notes.push(
      await callSummaryModel(
        summaryPrompt(
          `Summarize this segment of a longer meeting. Capture updates, decisions, action items, names, and numbers. Do not invent details.\n\n${transcript.slice(start, start + SUMMARY_CHUNK_CHARS)}`,
        ),
      ),
    );
  }
  return callSummaryModel(summaryPrompt(notes.join("\n\n")));
}

async function readTranscript(jobName: string): Promise<string> {
  const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: ARTIFACT_BUCKET,
      Key: `${TRANSCRIPT_PREFIX}${jobName}.json`,
    }),
  );
  const output = JSON.parse(await result.Body?.transformToString("utf-8") ?? "{}");
  const transcript = output?.results?.transcripts?.[0]?.transcript;
  if (typeof transcript !== "string" || !transcript.trim()) {
    throw new Error("Amazon Transcribe returned an empty transcript.");
  }
  return transcript;
}

async function persistSummary(jobName: string, summary: string): Promise<string> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: ARTIFACT_BUCKET,
        Key: `${SUMMARY_PREFIX}${jobName}.json`,
        Body: JSON.stringify({ summary, createdAt: new Date().toISOString() }),
        ContentType: "application/json",
        IfNoneMatch: "*",
      }),
    );
    return summary;
  } catch (error: unknown) {
    if (isMissingObject(error)) throw error;
    const cached = await getCachedSummary(jobName);
    if (cached) return cached;
    throw error;
  }
}

async function startTranscription(
  key: string,
  format: TranscribeMediaFormat,
): Promise<APIGatewayProxyResultV2> {
  const jobName = transcriptionJobName(key);
  const audio = await s3Client.send(
    new HeadObjectCommand({ Bucket: SOURCE_BUCKET, Key: key }),
  );
  if (!audio.ContentLength) throw new Error("The voice memo is empty.");
  if (audio.ContentLength > MAX_AUDIO_BYTES) {
    throw new Error("Voice memos must be smaller than 500 MB to transcribe.");
  }

  const startJob = () =>
    transcribeClient.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: "en-US",
        MediaFormat: format,
        Media: { MediaFileUri: `s3://${SOURCE_BUCKET}/${key}` },
        OutputBucketName: ARTIFACT_BUCKET,
        OutputKey: `${TRANSCRIPT_PREFIX}${jobName}.json`,
        JobExecutionSettings: {
          AllowDeferredExecution: true,
          DataAccessRoleArn: TRANSCRIBE_ROLE_ARN,
        },
      }),
    );

  try {
    await startJob();
  } catch (error: unknown) {
    if (
      !error ||
      typeof error !== "object" ||
      (error as { name?: string }).name !== "ConflictException"
    ) {
      throw error;
    }
    const existing = await transcribeClient.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }),
    );
    if (existing.TranscriptionJob?.TranscriptionJobStatus === "FAILED") {
      await transcribeClient.send(
        new DeleteTranscriptionJobCommand({ TranscriptionJobName: jobName }),
      );
      await startJob();
    }
  }

  const result = await transcribeClient.send(
    new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }),
  );
  return response(202, {
    status: result.TranscriptionJob?.TranscriptionJobStatus ?? "QUEUED",
  });
}

async function getTranscriptionStatus(key: string): Promise<APIGatewayProxyResultV2> {
  const jobName = transcriptionJobName(key);
  let result;
  try {
    result = await transcribeClient.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: jobName }),
    );
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      (error as { name?: string }).name === "NotFoundException"
    ) {
      return response(200, { status: "NOT_STARTED" });
    }
    throw error;
  }

  const job = result.TranscriptionJob;
  const status = job?.TranscriptionJobStatus ?? "UNKNOWN";
  if (status !== "COMPLETED") {
    return response(200, {
      status,
      error: status === "FAILED" ? job?.FailureReason ?? "Transcription failed." : undefined,
    });
  }

  const cachedSummary = await getCachedSummary(jobName);
  if (cachedSummary) return response(200, { status, summary: cachedSummary });

  const transcript = await readTranscript(jobName);
  const summary = await summarizeTranscript(transcript);
  if (!summary.trim()) throw new Error("The meeting summary could not be generated.");
  return response(200, {
    status,
    summary: await persistSummary(jobName, summary),
  });
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext?.http?.method ?? "GET";
  if (method === "OPTIONS") return response(200, { ok: true });

  try {
    if (!SOURCE_BUCKET || !ARTIFACT_BUCKET || !TRANSCRIBE_ROLE_ARN) {
      throw new Error("Meeting transcription is not configured.");
    }

    if (method === "POST") {
      const { key, format } = parseVoiceMemoKey(parseBody(event).path);
      return await startTranscription(key, format);
    }

    if (method === "GET") {
      const { key } = parseVoiceMemoKey(event.queryStringParameters?.path);
      return await getTranscriptionStatus(key);
    }

    return response(405, { error: "Method not allowed." });
  } catch (error: unknown) {
    console.error("[sales-meeting-transcription] Request failed.", error);
    const message = error instanceof Error ? error.message : "Unable to process the voice memo.";
    const statusCode =
      message === "A valid voice memo path is required." ||
      message === "This audio format is not supported for transcription."
        ? 400
        : 500;
    return response(statusCode, { error: message });
  }
};
