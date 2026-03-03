import { defineBackend } from "@aws-amplify/backend";
import { CorsHttpMethod, HttpApi, HttpMethod, } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { data } from "./data/resource.js";
import { rdsQuery } from "./functions/rds-query/resource.js";

const backend = defineBackend({
  /* auth, */
  data,
  rdsQuery,
});

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