import { defineBackend } from "@aws-amplify/backend";
import { CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Effect, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Stack } from "aws-cdk-lib";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { rdsQuery } from "./functions/rds-query/resource";

const backend = defineBackend({
  auth,
  data,
  rdsQuery,
});

const MODEL_ID = "anthropic.claude-3-5-haiku-20250110-v1:0";
const INFERENCE_PROFILE_ID = "us.anthropic.claude-3-5-haiku-20250110-v1:0";
const US_CROSS_REGION_PROFILE_REGIONS = ["us-east-1", "us-east-2", "us-west-2"] as const;

function validateBedrockConfig(): void {
  if (!/^anthropic\.claude-3-5-haiku-[\w-]+:0$/.test(MODEL_ID)) {
    throw new Error(
      `[amplify/backend] Invalid Claude 3.5 Haiku model id: ${MODEL_ID}. ` +
        "Expected format: anthropic.claude-3-5-haiku-<date>-v1:0"
    );
  }

  if (!/^us\.anthropic\.claude-3-5-haiku-[\w-]+:0$/.test(INFERENCE_PROFILE_ID)) {
    throw new Error(
      `[amplify/backend] Invalid US cross-region inference profile id: ${INFERENCE_PROFILE_ID}. ` +
        "Expected format: us.anthropic.claude-3-5-haiku-<date>-v1:0"
    );
  }

  if (!US_CROSS_REGION_PROFILE_REGIONS.includes("us-east-1")) {
    throw new Error(
      "[amplify/backend] Misconfigured US Bedrock profile regions: us-east-1 must be included."
    );
  }
}

validateBedrockConfig();

const dataStack = Stack.of(backend.data.resources.graphqlApi);
const region = dataStack.region;
const account = dataStack.account;

const bedrockPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
  resources: [
    `arn:aws:bedrock:${region}::foundation-model/${MODEL_ID}`,
    ...US_CROSS_REGION_PROFILE_REGIONS.map(
      (r) => `arn:aws:bedrock:${r}::foundation-model/${MODEL_ID}`
    ),
    ...US_CROSS_REGION_PROFILE_REGIONS.map(
      (r) => `arn:aws:bedrock:${r}:${account}:inference-profile/${INFERENCE_PROFILE_ID}`
    ),
  ],
});

const attachedRolePaths = new Set<string>();
backend.data.resources.graphqlApi.node.findAll().forEach((construct) => {
  if (construct instanceof Role && !attachedRolePaths.has(construct.node.path)) {
    construct.addToPrincipalPolicy(bedrockPolicy);
    attachedRolePaths.add(construct.node.path);
  }
});

console.log(
  `[amplify/backend] Bedrock policy configured for model=${MODEL_ID}, profile=${INFERENCE_PROFILE_ID}, ` +
    `deployRegion=${region}, profileRegions=${US_CROSS_REGION_PROFILE_REGIONS.join(",")}`
);

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
