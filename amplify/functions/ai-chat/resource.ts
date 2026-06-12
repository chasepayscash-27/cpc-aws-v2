import { defineFunction } from "@aws-amplify/backend";

export const aiChat = defineFunction({
  name: "ai-chat",
  timeoutSeconds: 30,
});