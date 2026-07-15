import { ConditionalCheckFailedException, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
  type UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { ScheduledEvent } from "aws-lambda";
import {
  isTransientError,
  isValidEmail,
  isValidPhone,
  nextStatusFromFailure,
  parseChannels,
} from "./logic";

interface WorkflowAlertEvent {
  id: string;
  propertyId: string;
  taskId: string;
  taskStage: string;
  recipientId: string;
  recipientEmail: string;
  recipientPhone: string;
  channels: string;
  status: string;
  triggeredAt: string;
  triggeredBy?: string | null;
  attemptCount?: number | null;
  lastAttemptAt?: string | null;
  sentAt?: string | null;
  errorDetails?: string | null;
}

declare const process: {
  env: Record<string, string | undefined>;
};

const BATCH_SIZE = Number(process.env.WORKFLOW_ALERT_BATCH_SIZE ?? "25");
const MAX_ATTEMPTS = Number(process.env.WORKFLOW_ALERT_MAX_ATTEMPTS ?? "3");
const ALERT_FROM_EMAIL = process.env.WORKFLOW_ALERT_FROM_EMAIL ?? "";
const TABLE_NAME = process.env.WORKFLOW_ALERT_EVENT_TABLE_NAME ?? "";
const region = process.env.AWS_REGION ?? "us-east-1";

const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
const sesClient = new SESv2Client({ region });
const snsClient = new SNSClient({ region });

function formatError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function buildStatusUpdate(
  event: WorkflowAlertEvent,
  updates: { status: string; errorDetails?: string | null; sentAt?: string | null },
): UpdateCommandInput {
  const expressionNames: Record<string, string> = {
    "#status": "status",
    "#updatedAt": "updatedAt",
  };
  const expressionValues: Record<string, unknown> = {
    ":status": updates.status,
    ":updatedAt": new Date().toISOString(),
  };

  const updateFragments = ["#status = :status", "#updatedAt = :updatedAt"];

  if (updates.errorDetails !== undefined) {
    expressionNames["#errorDetails"] = "errorDetails";
    expressionValues[":errorDetails"] = updates.errorDetails;
    updateFragments.push("#errorDetails = :errorDetails");
  }

  if (updates.sentAt !== undefined) {
    expressionNames["#sentAt"] = "sentAt";
    expressionValues[":sentAt"] = updates.sentAt;
    updateFragments.push("#sentAt = :sentAt");
  }

  return {
    TableName: TABLE_NAME,
    Key: { id: event.id },
    UpdateExpression: `SET ${updateFragments.join(", ")}`,
    ExpressionAttributeNames: expressionNames,
    ExpressionAttributeValues: expressionValues,
    ConditionExpression: "#status = :processing",
    ReturnValues: "ALL_NEW",
  };
}

async function sendEmail(event: WorkflowAlertEvent): Promise<void> {
  if (!isValidEmail(event.recipientEmail)) {
    throw new Error("Recipient email is missing or invalid.");
  }

  if (!ALERT_FROM_EMAIL) {
    throw new Error("WORKFLOW_ALERT_FROM_EMAIL is not configured.");
  }

  await sesClient.send(
    new SendEmailCommand({
      FromEmailAddress: ALERT_FROM_EMAIL,
      Destination: {
        ToAddresses: [event.recipientEmail],
      },
      Content: {
        Simple: {
          Subject: {
            Data: `Workflow task completed: ${event.taskStage}`,
          },
          Body: {
            Text: {
              Data: [
                `A workflow task was completed for property ${event.propertyId}.`,
                `Task: ${event.taskStage}`,
                `Completed by: ${event.triggeredBy ?? "Unknown"}`,
                `Triggered at: ${event.triggeredAt}`,
              ].join("\n"),
            },
          },
        },
      },
    }),
  );
}

async function sendSms(event: WorkflowAlertEvent): Promise<void> {
  if (!isValidPhone(event.recipientPhone)) {
    throw new Error("Recipient phone is missing or invalid E.164 format.");
  }

  await snsClient.send(
    new PublishCommand({
      PhoneNumber: event.recipientPhone,
      Message: `Workflow task complete: ${event.taskStage} (property ${event.propertyId}).`,
    }),
  );
}

async function claimQueuedEvent(event: WorkflowAlertEvent): Promise<boolean> {
  const nextAttemptCount = Math.max(event.attemptCount ?? 0, 0) + 1;

  try {
    await ddbClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id: event.id },
        UpdateExpression:
          "SET #status = :processing, #attemptCount = :attemptCount, #lastAttemptAt = :lastAttemptAt, #errorDetails = :emptyError, #updatedAt = :updatedAt",
        ConditionExpression: "#status = :queued",
        ExpressionAttributeNames: {
          "#status": "status",
          "#attemptCount": "attemptCount",
          "#lastAttemptAt": "lastAttemptAt",
          "#errorDetails": "errorDetails",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":queued": "queued",
          ":processing": "processing",
          ":attemptCount": nextAttemptCount,
          ":lastAttemptAt": new Date().toISOString(),
          ":emptyError": null,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );
    event.attemptCount = nextAttemptCount;
    return true;
  } catch (error: unknown) {
    if (error instanceof ConditionalCheckFailedException) {
      return false;
    }

    throw error;
  }
}

async function updateAfterProcessing(
  event: WorkflowAlertEvent,
  updates: { status: "queued" | "failed" | "sent"; errorDetails?: string | null; sentAt?: string | null },
): Promise<void> {
  const command = buildStatusUpdate(event, updates);
  command.ExpressionAttributeValues = {
    ...command.ExpressionAttributeValues,
    ":processing": "processing",
  };

  await ddbClient.send(new UpdateCommand(command));
}

async function processAlertEvent(event: WorkflowAlertEvent): Promise<void> {
  const claimed = await claimQueuedEvent(event);
  if (!claimed) {
    return;
  }

  const deliveryErrors: string[] = [];
  let successfulDeliveries = 0;

  try {
    const channels = parseChannels(event.channels);
    if (channels.length === 0) {
      throw new Error("No supported delivery channels were specified.");
    }

    if (channels.includes("email")) {
      try {
        await sendEmail(event);
        successfulDeliveries += 1;
      } catch (error: unknown) {
        deliveryErrors.push(`email: ${formatError(error)}`);
      }
    }

    if (channels.includes("sms")) {
      try {
        await sendSms(event);
        successfulDeliveries += 1;
      } catch (error: unknown) {
        deliveryErrors.push(`sms: ${formatError(error)}`);
      }
    }

    if (successfulDeliveries === 0) {
      throw new Error(deliveryErrors.join("; ") || "No delivery channels succeeded.");
    }

    await updateAfterProcessing(event, {
      status: "sent",
      sentAt: new Date().toISOString(),
      errorDetails: deliveryErrors.length > 0 ? deliveryErrors.join("; ") : null,
    });
  } catch (error: unknown) {
    const transient = isTransientError(error);
    const attemptCount = Math.max(event.attemptCount ?? 0, 0);
    const nextStatus = nextStatusFromFailure(attemptCount, MAX_ATTEMPTS, transient);

    await updateAfterProcessing(event, {
      status: nextStatus,
      errorDetails: formatError(error),
    });

    throw error;
  }
}

export const handler = async (_event: ScheduledEvent): Promise<{ processed: number; failed: number }> => {
  if (!TABLE_NAME) {
    throw new Error("WORKFLOW_ALERT_EVENT_TABLE_NAME is not configured.");
  }

  const { Items } = await ddbClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "#status = :queued",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":queued": "queued",
      },
      Limit: BATCH_SIZE,
    }),
  );

  const queuedEvents = (Items ?? []) as WorkflowAlertEvent[];

  let processed = 0;
  let failed = 0;

  for (const queuedEvent of queuedEvents) {
    try {
      await processAlertEvent(queuedEvent);
      processed += 1;
    } catch (error: unknown) {
      failed += 1;
      console.error("[workflow-alert-processor] Failed to process workflow alert event", {
        id: queuedEvent.id,
        error,
      });
    }
  }

  console.log("[workflow-alert-processor] batch complete", {
    queuedCount: queuedEvents.length,
    processed,
    failed,
  });

  return { processed, failed };
};
