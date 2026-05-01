import { defineBackend } from "@aws-amplify/backend";
import { CorsHttpMethod, HttpApi, HttpMethod, } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Stack } from "aws-cdk-lib";
import { PolicyStatement, Effect, Role } from "aws-cdk-lib/aws-iam";
import { CfnDataSource } from "aws-cdk-lib/aws-appsync";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { rdsQuery } from "./functions/rds-query/resource";
const backend = defineBackend({
    auth,
    data,
    rdsQuery,
});
// ── Explicit Bedrock permissions ─────────────────────────────────────────────
const dataStack = Stack.of(backend.data.resources.graphqlApi);
const region = dataStack.region;
const bedrockPolicy = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
    resources: [
        // Claude 3.5 Haiku foundation model ARNs (standard invocation)
        `arn:aws:bedrock:${region}::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0`,
        // Cross-region foundation model ARNs for common US regions
        `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0`,
        `arn:aws:bedrock:us-east-2::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0`,
        `arn:aws:bedrock:us-west-2::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0`,
        // Cross-region inference profile ARNs
        `arn:aws:bedrock:us-east-1:*:inference-profile/us.anthropic.claude-3-5-haiku-20241022-v1:0`,
        `arn:aws:bedrock:us-east-2:*:inference-profile/us.anthropic.claude-3-5-haiku-20241022-v1:0`,
        `arn:aws:bedrock:us-west-2:*:inference-profile/us.anthropic.claude-3-5-haiku-20241022-v1:0`,
    ],
});
// Walk the CDK construct tree to find HTTP data source service roles and attach
// the Bedrock policy.  Use instanceof Role and node.id === "ServiceRole" so
// only the intended service role receives the policy (not other roles in scope).
backend.data.resources.graphqlApi.node.findAll().forEach((construct) => {
    if (construct instanceof CfnDataSource &&
        construct.type === "HTTP" &&
        typeof construct.serviceRoleArn === "string") {
        construct.node.scope?.node.findAll().forEach((c) => {
            if (c instanceof Role && c.node.id === "ServiceRole") {
                c.addToPrincipalPolicy(bedrockPolicy);
            }
        });
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
