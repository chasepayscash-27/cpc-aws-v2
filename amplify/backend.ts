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
// Claude 4.5 Haiku uses Bedrock inference-profile style routing.
// This policy intentionally includes both the foundation model ID and
// the geo/global inference profile IDs so Amplify/AppSync can invoke the model.

const dataStack = Stack.of(backend.data.resources.graphqlApi);
const region = dataStack.region;
const account = dataStack.account;

const MODEL_ID = "anthropic.claude-haiku-4-5-20251001-v1:0";

const INFERENCE_PROFILE_IDS = [
  "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  "global.anthropic.claude-haiku-4-5-20251001-v1:0",
];

const BEDROCK_REGIONS = ["us-east-1", "us-east-2", "us-west-2"];

const bedrockPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream",
    "bedrock:Converse",
    "bedrock:ConverseStream",
  ],
  resources: [
    `arn:aws:bedrock:${region}::foundation-model/${MODEL_ID}`,
    ...BEDROCK_REGIONS.map(
      (r) => `arn:aws:bedrock:${r}::foundation-model/${MODEL_ID}`
    ),
    ...BEDROCK_REGIONS.flatMap((r) =>
      INFERENCE_PROFILE_IDS.map(
        (profileId) => `arn:aws:bedrock:${r}:${account}:inference-profile/${profileId}`
      )
    ),
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
  `[amplify/backend] Bedrock policy configured for model=${MODEL_ID}, ` +
    `deployRegion=${region}, bedrockRegions=${BEDROCK_REGIONS.join(",")}`
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