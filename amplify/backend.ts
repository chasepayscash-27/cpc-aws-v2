import { HttpApi, CORSConfig } from '@aws-cdk/aws-apigatewayv2';
import { LambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import * as lambda from '@aws-cdk/aws-lambda';

const api = new HttpApi(this, 'MyHttpApi', {
  cors: CORSConfig.DEFAULT, // Update this to your CORS configuration
});

const rdsQueryFunction = new lambda.Function(this, 'RDSQueryFunction', {
  runtime: lambda.Runtime.NODEJS_14_X,
  handler: 'rdsQuery.handler',
  code: lambda.Code.fromAsset('lambda'),
});

api.addRoutes({
  path: '/query',
  methods: ['POST'],
  integration: new LambdaIntegration(rdsQueryFunction),
});

new cdk.CfnOutput(this, 'ApiUrl', {
  value: api.apiEndpoint,
  description: 'API Gateway endpoint URL for Prod stage',
});
