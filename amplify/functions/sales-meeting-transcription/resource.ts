import { defineFunction } from "@aws-amplify/backend";

export const salesMeetingTranscription = defineFunction({
  name: "sales-meeting-transcription",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  memoryMB: 1024,
});
