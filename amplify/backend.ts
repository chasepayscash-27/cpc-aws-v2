import { defineBackend } from "@aws-amplify/backend";
import { aiChat } from "./functions/ai-chat/resource";
import { CorsHttpMethod, HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Stack } from "aws-cdk-lib";
import { Policy, PolicyStatement, Effect, Role } from "aws-cdk-lib/aws-iam";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { rdsQuery } from "./functions/rds-query/resource";

const backend = defineBackend({
  auth,
  data,
  rdsQuery,
  aiChat,
});

backend.auth.resources.cfnResources.cfnIdentityPool.allowUnauthenticatedIdentities = true;

// ─────────────────────────────────────────────────────────────────────────────
// EXPLICIT APPSYNC IAM GRANT FOR OLD generateRecipe ROUTE
// Keep this for now. We can remove it later after Lambda chat is working.
// ─────────────────────────────────────────────────────────────────────────────

const dataStack = Stack.of(backend.data.resources.graphqlApi);
const region = dataStack.region;
const apiId = backend.data.resources.graphqlApi.apiId;

const apiArn = dataStack.formatArn({
  service: "appsync",
  resource: "apis",
  resourceName: apiId,
});

const appSyncGenerateRecipeStatement = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["appsync:GraphQL"],
  resources: [`${apiArn}/types/Mutation/fields/generateRecipe`],
});

new Policy(dataStack, "PublicGenerateRecipeAppSyncGrant", {
  policyName: "PublicGenerateRecipeAppSyncGrant",
  statements: [appSyncGenerateRecipeStatement],
  roles: [
    backend.auth.resources.unauthenticatedUserIamRole,
    backend.auth.resources.authenticatedUserIamRole,
  ],
});

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

// This is the important NEW part:
// Give the ai-chat Lambda permission to call Bedrock directly.
backend.aiChat.resources.lambda.addToRolePolicy(bedrockPolicy);

// Keep this old patch for the AppSync generation route for now.
// Not required for the new Lambda route, but harmless while transitioning.
const attachedRolePaths = new Set<string>();

dataStack.node.findAll().forEach((construct) => {
  if (construct instanceof Role && !attachedRolePaths.has(construct.node.path)) {
    construct.addToPrincipalPolicy(bedrockPolicy);
    attachedRolePaths.add(construct.node.path);
  }
});

console.log(
  `[amplify/backend] Bedrock policy configured for Lambda aiChat and old AppSync AI route. deployRegion=${region}`
);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HTTP API
// ─────────────────────────────────────────────────────────────────────────────

const apiStack = backend.createStack("api-stack");

const rdsIntegration = new HttpLambdaIntegration(
  "RdsQueryIntegration",
  backend.rdsQuery.resources.lambda
);

const chatIntegration = new HttpLambdaIntegration(
  "AiChatIntegration",
  backend.aiChat.resources.lambda
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