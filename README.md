## AWS Amplify React+Vite Starter Template

This repository provides a starter template for creating applications using React+Vite and AWS Amplify, emphasizing easy setup for authentication, API, and database capabilities.

## Overview

This template equips you with a foundational React application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.
- **AI Chat & Insights**: Public chat widget and AI insights panel call a Lambda-backed HTTP API (`POST /chat`) that invokes Claude 3 Haiku in Bedrock.

## AI Feature Requirements

The AI chat widget (`PublicChatWidget`) and AI insights panel (`AiInsightsPanel`) call the custom HTTP API output at `custom.cpcHttpApi.url` and send `POST /chat` to the `ai-chat` Lambda.

### Required setup before deploying the AI features

1. **Deploy or sandbox the Amplify backend** so the HTTP API and Lambda route are provisioned:
   ```bash
   npx ampx sandbox          # for local development
   # or push via CI/CD for production
   ```
2. The `ai-chat` Lambda invokes Claude 3 Haiku in `us-east-1` using:
   - Primary model ID: `anthropic.claude-3-haiku-20240307-v1:0`
   - Fallback inference profile: `us.anthropic.claude-3-haiku-20240307-v1:0`
3. No manual Bedrock model-access approval step is required for this flow. The Lambda execution role policy in `amplify/backend.ts` is the permission source for `bedrock:InvokeModel`.
4. After deployment, `amplify/amplify_outputs.json` must include `custom.cpcHttpApi.url`; the frontend reads that value to call `/chat`.

### Environment variables

The Amplify outputs file (`amplify/amplify_outputs.json`) provides the AppSync endpoint and Cognito Identity Pool details automatically — no extra frontend env vars are needed under normal operation.

During CI/CD, `npx ampx pipeline-deploy` generates a fresh `amplify_outputs.json` at the **project root**. The `amplify.yml` build script then copies this file into `amplify/amplify_outputs.json` (the path imported by the frontend) so the deployed app always uses current backend outputs:

```yaml
- npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
- cp -f amplify_outputs.json amplify/amplify_outputs.json  # copies fresh key into frontend path
```

For local development, run `npx ampx sandbox` to generate a fresh `amplify_outputs.json` at the project root, then copy it manually if needed:

```bash
npx ampx sandbox
cp amplify_outputs.json amplify/amplify_outputs.json
```

> **Note:** The `amplify/amplify_outputs.json` committed to this repo is a placeholder. Every CI/CD deployment overwrites it with fresh backend outputs via the copy step above.

**Optional override variables** — set these in the AWS Amplify Console (App settings → Environment variables) or in a local `.env.local` file when `amplify_outputs.json` has a stale key (e.g. if CI/CD has not yet run after a backend change):

| Variable | Description |
|---|---|
| `VITE_APPSYNC_URL` | Override the AppSync GraphQL endpoint URL |
| `VITE_APPSYNC_API_KEY` | Override the AppSync API key |

See `.env.example` for a template.

The AppSync API key is provisioned with a 365-day lifetime and is automatically rotated on each backend deployment.

For the backend Lambda functions that connect to the RDS database, the following secrets must be set in Amplify (App settings → Secrets):

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

## Troubleshooting AI Chat / AI Insights

### `/chat` returns 4xx/5xx

The frontend now calls API Gateway directly. Check browser network logs for `POST /chat` response JSON (`error` / `detail`) and Lambda CloudWatch logs for `ai-chat`.

| Symptom | Cause | Fix |
|---|---|---|
| `400 Message is required.` | Request payload missing `message` | Ensure frontend sends `{ message }` JSON |
| `429` | Bedrock throttling | Client retries automatically with backoff |
| `500 AI chat failed` + Bedrock access message | Primary model invocation denied | Lambda retries with `us.anthropic.claude-3-haiku-20240307-v1:0` inference profile |
| `500 AI chat failed` persists | Lambda role or Bedrock issue | Confirm Lambda role has `bedrock:InvokeModel` and redeploy |

### Step-by-step diagnosis

1. **Verify backend output wiring**
   - Confirm `amplify/amplify_outputs.json` contains `custom.cpcHttpApi.url`
   - Confirm requests are sent to `${custom.cpcHttpApi.url}chat`

2. **Check Lambda logs**
   - AWS Console → CloudWatch Logs → `/aws/lambda/*ai-chat*`
   - Reproduce the error and inspect the logged Bedrock exception and fallback path

3. **Validate locally with sandbox**
   ```bash
   npx ampx sandbox
   # Wait for "Deployment complete"
   cp amplify_outputs.json amplify/amplify_outputs.json
   npm run dev
   # Open http://localhost:5173 → AI Chat tab → send a message
   ```

4. **Validate Bedrock permissions and region**
   - Deployment region remains `us-east-1`
   - Confirm `ai-chat` Lambda execution role includes `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream`
   - If Bedrock rejects the base model with inference-profile guidance, the Lambda fallback should automatically handle it

5. **Redeploy the Amplify backend**
   ```bash
   # From your deployment runner or local environment with Amplify credentials:
   npx ampx pipeline-deploy

   # Via CI/CD (recommended):
   git push origin main          # triggers the Amplify build pipeline

   # Or manually trigger from the AWS Console:
   # Amplify Console → your app → Hosting → Deployments → Redeploy this version
   ```

### Error messages and what they mean

| Message shown in UI | Root cause |
|---|---|
| "AI assistant request failed (4xx/5xx)" | API Gateway/Lambda returned an HTTP error; inspect response `error`/`detail` and CloudWatch logs |
| "The AI service is currently rate-limited…" | `ThrottlingException` from Bedrock — wait a few seconds and retry |
| "AI assistant endpoint is unavailable…" | `custom.cpcHttpApi.url` is missing from `amplify_outputs.json`; regenerate outputs during deploy |

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
