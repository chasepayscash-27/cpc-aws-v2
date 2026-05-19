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

// Enable unauthenticated (guest) Identity Pool access so the public AI chat
// widget can call AppSync via IAM-signed requests instead of a build-time
// API key. This eliminates the API-key rotation race that produces recurring
// authorization errors after backend redeploys with cached frontend bundles.
backend.auth.resources.cfnResources.cfnIdentityPool.allowUnauthenticatedIdentities = true;

// ─────────────────────────────────────────────────────────────────────────────
// EXPLICIT APPSYNC IAM GRANTS FOR PUBLIC AI ROUTES
// ─────────────────────────────────────────────────────────────────────────────
//
// Amplify Gen 2 wires allow.guest() into AppSync IAM permissions for a.model()
// routes, but does NOT reliably do so for a.generation() routes. We therefore
// grant appsync:GraphQL on Mutation.generateRecipe explicitly to both the
// unauthenticated (guest) and authenticated IAM roles so the public AI chat
// widget always has access regardless of Amplify Gen 2 auto-wiring behaviour.

const dataStack = Stack.of(backend.data.resources.graphqlApi);
const region = dataStack.region;
const apiId = backend.data.resources.graphqlApi.apiId;
// Use Stack.formatArn for safe ARN construction (handles GovCloud / China partitions).
const apiArn = dataStack.formatArn({
  service: "appsync",
  resource: "apis",
  resourceName: apiId,
});

const appSyncGenerateRecipePolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["appsync:GraphQL"],
  resources: [
    `${apiArn}/types/Mutation/fields/generateRecipe`,
  ],
});

backend.auth.resources.unauthenticatedUserIamRole.addToPrincipalPolicy(
  appSyncGenerateRecipePolicy
);
backend.auth.resources.authenticatedUserIamRole.addToPrincipalPolicy(
  appSyncGenerateRecipePolicy
);

console.log(
  `[amplify/backend] AppSync appsync:GraphQL grant added to unauth+auth roles for Mutation.generateRecipe (apiId=${apiId})`
);

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

// Walk the entire data stack (not just graphqlApi.node) so we also reach the
// AppSync JS resolver / data source service role created in child stacks that
// actually calls Bedrock for a.generation() routes.
const attachedRolePaths = new Set<string>();

dataStack.node.findAll().forEach((construct) => {
  if (construct instanceof Role && !attachedRolePaths.has(construct.node.path)) {
    construct.addToPrincipalPolicy(bedrockPolicy);
    attachedRolePaths.add(construct.node.path);
    console.log(`[amplify/backend] Bedrock policy attached to role: ${construct.node.path}`);
  }
});

console.log(
  `[amplify/backend] Bedrock policy configured for model=${MODEL_ID}, deployRegion=${region}, rolesPatched=${attachedRolePaths.size}`
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
