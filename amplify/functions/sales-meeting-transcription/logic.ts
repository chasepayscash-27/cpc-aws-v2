import { createHash } from "node:crypto";

export const VOICE_MEMO_PREFIX = "sales-meetings/voice-memos/";
export const TRANSCRIPT_PREFIX = "sales-meetings/transcripts/";
export const SUMMARY_PREFIX = "sales-meetings/summaries/";

const AUDIO_FORMATS: Record<string, string> = {
  amr: "amr",
  flac: "flac",
  m4a: "m4a",
  mp3: "mp3",
  mp4: "mp4",
  ogg: "ogg",
  wav: "wav",
  webm: "webm",
};

export type TranscribeMediaFormat =
  | "amr"
  | "flac"
  | "m4a"
  | "mp3"
  | "mp4"
  | "ogg"
  | "wav"
  | "webm";

export function parseVoiceMemoKey(value: unknown): {
  key: string;
  format: TranscribeMediaFormat;
} {
  if (
    typeof value !== "string" ||
    !value.startsWith(VOICE_MEMO_PREFIX) ||
    value.length > 1024 ||
    !/^sales-meetings\/voice-memos\/[a-zA-Z0-9._/-]+$/.test(value) ||
    value.split("/").some((part) => part === "." || part === "..")
  ) {
    throw new Error("A valid voice memo path is required.");
  }

  const extension = value.split("/").pop()?.split(".").pop()?.toLowerCase() ?? "";
  const format = AUDIO_FORMATS[extension] as TranscribeMediaFormat | undefined;
  if (!format) {
    throw new Error("This audio format is not supported for transcription.");
  }

  return { key: value, format };
}

export function transcriptionJobName(key: string): string {
  const digest = createHash("sha256").update(key).digest("hex").slice(0, 40);
  return `sales-meeting-${digest}`;
}
