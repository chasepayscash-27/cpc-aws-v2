import { defineBackend } from "@aws-amplify/backend";
import { CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Stack } from "aws-cdk-lib";
import { PolicyStatement, Effect, Role } from "aws-cdk-lib/aws-iam";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { rdsQuery } from "./functions/rds-query/resource";

const backend = defineBackend({
  auth,
  data,
  rdsQuery,
});

// ─────────────────────────────────────────────────────────────────────────────
// BEDROCK PERMISSIONS FOR AMPLIFY AI ROUTES
// ─────────────────────────────────────────────────────────────────────────────
//
// Claude 3 Haiku is used because it is available as a direct foundation model
// in us-east-1 without requiring cross-region inference profiles.
// Cross-region inference profiles (needed by Claude 3.5/4.x) require Bedrock
// model access to be enabled in us-east-1, us-east-2, AND us-west-2
// simultaneously — a common source of deployment failures.
//
// Model ID: anthropic.claude-3-haiku-20240307-v1:0
// This matches the a.ai.model("Claude 3 Haiku") declaration in data/resource.ts.

const dataStack = Stack.of(backend.data.resources.graphqlApi);
const region = dataStack.region;

// Claude 3 Haiku — stable, widely available, no cross-region inference needed.
const MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0";

const bedrockPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream",
  ],
  resources: [
    `arn:aws:bedrock:${region}::foundation-model/${MODEL_ID}`,
  ],
});

// Attach policy to AppSync/Amplify-generated IAM roles under the GraphQL API.
const attachedRolePaths = new Set<string>();

backend.data.resources.graphqlApi.node.findAll().forEach((construct) => {
  if (construct instanceof Role && !attachedRolePaths.has(construct.node.path)) {
    construct.addToPrincipalPolicy(bedrockPolicy);
    attachedRolePaths.add(construct.node.path);
  }
});

console.log(
  `[amplify/backend] Bedrock policy configured for model=${MODEL_ID}, deployRegion=${region}`
);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HTTP API FOR RDS QUERY LAMBDA
// ─────────────────────────────────────────────────────────────────────────────

const apiStack = backend.createStack("api-stack");

const integration = new HttpLambdaIntegration(
  "RdsQueryIntegration",
  backend.rdsQuery.resources.lambda
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
  integration,
});

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUTS
// ─────────────────────────────────────────────────────────────────────────────

backend.addOutput({
  custom: {
    cpcHttpApi: {
      url: httpApi.url,
    },
  },
});