## AWS Amplify React+Vite Starter Template

This repository provides a starter template for creating applications using React+Vite and AWS Amplify, emphasizing easy setup for authentication, API, and database capabilities.

## Overview

This template equips you with a foundational React application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.
- **AI Chat & Insights**: Public chat widget and AI insights panel powered by Amazon Bedrock via Amplify Gen 2 generation routes.

## AI Feature Requirements

The AI chat widget (`PublicChatWidget`) and AI insights panel (`AiInsightsPanel`) use the `generateRecipe` generation route defined in `amplify/data/resource.ts`. This route calls **Claude 3.5 Haiku** via Amazon Bedrock.

### Required setup before deploying the AI features

1. **Enable Amazon Bedrock model access** in the AWS Console for the region you deploy to (default: `us-east-1`):
   - Go to **Amazon Bedrock → Model access** and enable **Claude 3.5 Haiku** (Anthropic).
2. **Deploy or sandbox the Amplify backend** so the `generateRecipe` AppSync mutation and the Bedrock Lambda resolver are provisioned:
   ```bash
   npx ampx sandbox          # for local development
   # or push via CI/CD for production
   ```
3. After a successful deployment, Amplify CLI regenerates `amplify/amplify_outputs.json`. This file **must** contain a `generations.generateRecipe` entry inside `data.model_introspection`. Without it, the frontend Amplify client cannot expose `client.generations.generateRecipe` and will display a user-friendly error in the UI instead of crashing.

### Environment variables

No additional environment variables are required in the frontend for the AI feature — the Amplify outputs file (`amplify/amplify_outputs.json`) provides the AppSync endpoint and API key automatically.

For the backend Lambda functions that connect to the RDS database, the following secrets must be set in Amplify:

| Secret name | Description              |
|-------------|--------------------------|
| `DB_HOST`   | MySQL host               |
| `DB_USER`   | MySQL username           |
| `DB_PASS`   | MySQL password           |
| `DB_NAME`   | MySQL database name      |
| `DB_PORT`   | MySQL port (default 3306)|

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/react/start/quickstart/#deploy-a-fullstack-app-to-aws) of our documentation.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.