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

// ── Explicit Bedrock permissions ─────────────────────────────────────────────
// Claude 3.5 Haiku model ID currently used by Amazon Bedrock / Amplify AI routes.
// Important: the previous 20250110 model ID was likely incorrect.
const dataStack = Stack.of(backend.data.resources.graphqlApi);
const region = dataStack.region;
const account = dataStack.account;

const MODEL_ID = "anthropic.claude-3-5-haiku-20241022-v1:0";
const INFERENCE_PROFILE_ID = "us.anthropic.claude-3-5-haiku-20241022-v1:0";

const US_REGIONS = ["us-east-1", "us-east-2", "us-west-2"] as const;

const bedrockPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
  resources: [
    // Direct foundation model access
    `arn:aws:bedrock:${region}::foundation-model/${MODEL_ID}`,
    ...US_REGIONS.map((r) => `arn:aws:bedrock:${r}::foundation-model/${MODEL_ID}`),

    // Cross-region inference profile access
    ...US_REGIONS.map(
      (r) => `arn:aws:bedrock:${r}:${account}:inference-profile/${INFERENCE_PROFILE_ID}`
    ),
  ],
});

// Attach Bedrock permissions to all IAM roles under the GraphQL API construct tree.
const attachedRolePaths = new Set<string>();

backend.data.resources.graphqlApi.node.findAll().forEach((construct) => {
  if (construct instanceof Role && !attachedRolePaths.has(construct.node.path)) {
    construct.addToPrincipalPolicy(bedrockPolicy);
    attachedRolePaths.add(construct.node.path);
  }
});

// ── Custom HTTP API for RDS Lambda ────────────────────────────────────────────
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

backend.addOutput({
  custom: {
    cpcHttpApi: {
      url: httpApi.url,
    },
  },
});