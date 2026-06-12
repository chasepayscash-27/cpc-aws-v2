import { defineBackend } from "@aws-amplify/backend";
import { aiChat } from "./functions/ai-chat/resource";
import { CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Stack } from "aws-cdk-lib";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Bucket, BucketEncryption, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Function as LambdaFunction } from "aws-cdk-lib/aws-lambda";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { rdsQuery } from "./functions/rds-query/resource";
import { worksheet } from "./functions/worksheet/resource";

const backend = defineBackend({
  auth,
  data,
  rdsQuery,
  aiChat,
  worksheet,
});

backend.auth.resources.cfnResources.cfnIdentityPool.allowUnauthenticatedIdentities = true;
const region = Stack.of(backend.aiChat.resources.lambda).region;

// ─────────────────────────────────────────────────────────────────────────────
// BEDROCK PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

const bedrockPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream",
  ],
  resources: ["*"],
});

backend.aiChat.resources.lambda.addToRolePolicy(bedrockPolicy);

console.log(
  `[amplify/backend] Bedrock policy configured for Lambda aiChat route only. deployRegion=${region}`
);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HTTP API
// ─────────────────────────────────────────────────────────────────────────────

const apiStack = backend.createStack("api-stack");
const aiChatLambda = backend.aiChat.resources.lambda as LambdaFunction;
// Keep the chat-logs bucket in the same nested stack as the ai-chat Lambda
// to avoid a circular dependency between api-stack and the function stack.
const chatLogsBucket = new Bucket(Stack.of(aiChatLambda), "AiChatLogsBucket", {
  encryption: BucketEncryption.S3_MANAGED,
  blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
  enforceSSL: true,
});

chatLogsBucket.grantPut(backend.aiChat.resources.lambda);
aiChatLambda.addEnvironment("CHAT_LOG_BUCKET_NAME", chatLogsBucket.bucketName);
aiChatLambda.addEnvironment("CHAT_LOG_PREFIX", "chat-logs");

const rdsIntegration = new HttpLambdaIntegration(
  "RdsQueryIntegration",
  backend.rdsQuery.resources.lambda
);

const chatIntegration = new HttpLambdaIntegration(
  "AiChatIntegration",
  backend.aiChat.resources.lambda
);

const worksheetIntegration = new HttpLambdaIntegration(
  "WorksheetIntegration",
  backend.worksheet.resources.lambda
);

const httpApi = new HttpApi(apiStack, "HttpApi", {
  apiName: "cpcHttpApi",

  corsPreflight: {
    allowOrigins: ["*"],
    allowHeaders: ["*"],
    allowMethods: [
      CorsHttpMethod.POST,
      CorsHttpMethod.OPTIONS,
      CorsHttpMethod.GET,
    ],
  },

  createDefaultStage: true,
});

httpApi.addRoutes({
  path: "/query",
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: rdsIntegration,
});

httpApi.addRoutes({
  path: "/chat",
  methods: [HttpMethod.POST, HttpMethod.OPTIONS],
  integration: chatIntegration,
});

httpApi.addRoutes({
  path: "/worksheet",
  methods: [HttpMethod.GET, HttpMethod.POST, HttpMethod.OPTIONS],
  integration: worksheetIntegration,
});

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

backend.addOutput({
  custom: {
    cpcHttpApi: {
      url: httpApi.url,
    },
    aiChatLogs: {
      bucketName: chatLogsBucket.bucketName,
      prefix: "chat-logs",
    },
  },
});
