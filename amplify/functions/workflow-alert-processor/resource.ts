import { defineFunction } from "@aws-amplify/backend";

export const workflowAlertProcessor = defineFunction({
  name: "workflow-alert-processor",
  entry: "./handler.ts",
  timeoutSeconds: 60,
});
