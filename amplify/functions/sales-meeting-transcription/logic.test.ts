import { describe, expect, it } from "vitest";
import {
  parseVoiceMemoKey,
  transcriptionJobName,
} from "./logic";

describe("sales meeting transcription logic", () => {
  it("accepts audio paths under the voice memo prefix", () => {
    expect(parseVoiceMemoKey("sales-meetings/voice-memos/meeting.m4a")).toEqual({
      key: "sales-meetings/voice-memos/meeting.m4a",
      format: "m4a",
    });
  });

  it("rejects paths outside the voice memo prefix and unsupported formats", () => {
    expect(() => parseVoiceMemoKey("other/meeting.wav")).toThrow();
    expect(() =>
      parseVoiceMemoKey("sales-meetings/voice-memos/meeting.txt"),
    ).toThrow(/format is not supported/i);
    expect(() =>
      parseVoiceMemoKey("sales-meetings/voice-memos/../private.wav"),
    ).toThrow();
  });

  it("creates stable Transcribe-compatible job names", () => {
    const key = "sales-meetings/voice-memos/meeting.wav";
    expect(transcriptionJobName(key)).toBe(transcriptionJobName(key));
    expect(transcriptionJobName(key)).toMatch(/^sales-meeting-[a-f0-9]{40}$/);
  });
});
