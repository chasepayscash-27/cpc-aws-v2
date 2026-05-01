import { defineBackend } from "@aws-amplify/backend";
import { CorsHttpMethod, HttpApi, HttpMethod, } from "aws-cdk-lib/aws-apigatewayv2";
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
// Amplify Gen 2 creates AppSync HTTP data sources that call Amazon Bedrock for
// AI generation routes (generateRecipe / chat).  The framework should add
// bedrock:InvokeModel to those data source service roles automatically, but we
// add it here explicitly as a safety net to handle two failure modes:
//
//   1. Foundation-model ARN — used when Bedrock model access is granted
//      directly in the deployment region.
//      ARN format: arn:aws:bedrock:REGION::foundation-model/MODEL_ID
//
//   2. Cross-region inference-profile ARN — Amplify Gen 2 (≥1.x) routes
//      Claude calls through a cross-region inference profile when the request
//      originates from a us-* region.  These profiles have a different ARN
//      that includes the AWS account ID and uses the "us." model prefix.
//      ARN format: arn:aws:bedrock:REGION:ACCOUNT:inference-profile/PROFILE_ID
//
// Without the inference-profile ARN in the IAM policy the invocation returns
// AccessDeniedException, which AppSync surfaces as "A custom error was thrown
// from a mapping template." — the opaque error that triggered this fix.
const dataStack = Stack.of(backend.data.resources.graphqlApi);
const region = dataStack.region;
const account = dataStack.account;

const MODEL_ID = "anthropic.claude-3-5-haiku-20241022-v1:0";
const INFERENCE_PROFILE_ID = "us.anthropic.claude-3-5-haiku-20241022-v1:0";
// These three regions are the only ones where Amazon Bedrock currently provides
// the "us.*" cross-region inference profile for Claude.  If AWS adds more
// us-* regions to the inference-profile program, extend this list accordingly.
const US_REGIONS = ["us-east-1", "us-east-2", "us-west-2"];

const bedrockPolicy = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
    resources: [
        // Foundation-model ARNs (direct access in the deployment region + common US regions)
        `arn:aws:bedrock:${region}::foundation-model/${MODEL_ID}`,
        ...US_REGIONS.map((r) => `arn:aws:bedrock:${r}::foundation-model/${MODEL_ID}`),
        // Cross-region inference-profile ARNs (account-scoped, required in us-* regions)
        ...US_REGIONS.map((r) => `arn:aws:bedrock:${r}:${account}:inference-profile/${INFERENCE_PROFILE_ID}`),
    ],
});

// Attach the policy to every L2 IAM Role found under the GraphQL API construct
// tree.  In CDK, the L2 Role class exposes addToPrincipalPolicy(); using
// instanceof Role (L2) is the reliable way to identify these constructs —
// L1 CfnRole does not have that method and is excluded automatically.
//
// Note: previous versions of this file attempted to walk the tree by matching
// CfnDataSource node IDs against Role paths.  That approach was broken because
// CDK L1 constructs always have node.id === "Resource", making the path
// comparison unreliable.  The simpler scan below is correct and complete.
const attachedRolePaths = new Set();
backend.data.resources.graphqlApi.node.findAll().forEach((construct) => {
    if (construct instanceof Role && !attachedRolePaths.has(construct.node.path)) {
        construct.addToPrincipalPolicy(bedrockPolicy);
        attachedRolePaths.add(construct.node.path);
    }
});
// ─────────────────────────────────────────────────────────────────────────────

const apiStack = backend.createStack("api-stack");
const integration = new HttpLambdaIntegration("RdsQueryIntegration", backend.rdsQuery.resources.lambda);
const httpApi = new HttpApi(apiStack, "HttpApi", {
    apiName: "cpcHttpApi",
    corsPreflight: {
        allowOrigins: ["*"],
        allowHeaders: ["*"],
        allowMethods: [CorsHttpMethod.POST, CorsHttpMethod.OPTIONS, CorsHttpMethod.GET],
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
