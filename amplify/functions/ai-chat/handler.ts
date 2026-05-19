import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

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

    if (!message) {
      return response(400, { error: "Message is required." });
    }

    const body = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 800,
      temperature: 0.4,
      system:
        "You are a helpful assistant for Chase Pays Cash, a real estate investment company. " +
        "Answer questions about real estate investing, deal analysis, and property management. " +
        "Be concise, friendly, and practical.",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: message }],
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(body),
    });

    const bedrockResponse = await client.send(command);
    const decoded = new TextDecoder().decode(bedrockResponse.body);
    const result = JSON.parse(decoded);

    const reply =
      result?.content?.[0]?.text ??
      "Sorry, I could not generate a response.";

    return response(200, { reply });
  } catch (error: any) {
    console.error("AI chat error:", error);

    return response(500, {
      error: "AI chat failed.",
      detail: error?.message ?? String(error),
    });
  }
};