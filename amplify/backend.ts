import { defineBackend } from "@aws-amplify/backend";
import { Cors, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";

import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { rdsQuery } from "./functions/rds-query/resource";

const backend = defineBackend({
  auth,
  data,
  rdsQuery,
});

// Create a separate stack for the REST API
const apiStack = backend.createStack("api-stack");

// REST API with open CORS (fastest for now)
const restApi = new RestApi(apiStack, "rdsRestApi", {
  restApiName: "rdsRestApi",
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: Cors.ALL_METHODS,
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

// Wire POST /query -> Lambda
const queryIntegration = new LambdaIntegration(backend.rdsQuery.resources.lambda);
const query = restApi.root.addResource("query");
query.addMethod("POST", queryIntegration);
