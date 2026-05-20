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

The AI chat widget (`PublicChatWidget`) and AI insights panel (`AiInsightsPanel`) use the `generateRecipe` generation route defined in `amplify/data/resource.ts`. This route calls **Amazon Titan Text Lite** (`amazon.titan-text-lite-v1`) via Amazon Bedrock.

### Required setup before deploying the AI features

1. **Deploy or sandbox the Amplify backend** so the `generateRecipe` AppSync mutation and resolver IAM role are provisioned:
   ```bash
   npx ampx sandbox          # for local development
   # or push via CI/CD for production
   ```
2. No manual Bedrock "model access" approval step is required for Amazon-owned Titan models. The deployment step is what updates the resolver role with `bedrock:InvokeModel` on:
   - `arn:aws:bedrock:<region>::foundation-model/amazon.titan-text-lite-v1`
3. After a successful deployment, Amplify CLI regenerates `amplify/amplify_outputs.json`. This file **must** contain a `generations.generateRecipe` entry inside `data.model_introspection`. Without it, the frontend Amplify client cannot expose `client.generations.generateRecipe` and will display a user-friendly error in the UI instead of crashing.
4. Titan output style can differ from Claude. If responses are terse or formatted oddly, tune the `systemPrompt` in `amplify/data/resource.ts` in a follow-up change.

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

### "Authorization error — the AI service rejected the request"

This message is shown when both the Cognito guest-credentials client and the API-key fallback client keep receiving an AppSync auth error (`AccessDeniedException` / `UnauthorizedException`) even after automatic short retries. The most common causes are:

| Cause | How to check | Fix |
|---|---|---|
| **Identity Pool unauth role missing `appsync:GraphQL` on `generateRecipe`** | AWS Console → IAM → Roles → search `amplify-*-unauthRole*` → Permissions → look for `appsync:GraphQL` | `amplify/backend.ts` now adds this explicitly; redeploy after merging |
| **Identity Pool or pool ID is stale** | Compare `identity_pool_id` in `amplify/amplify_outputs.json` vs. Amplify Console → Backend environments | Retrigger the Amplify build so `cp -f amplify_outputs.json amplify/amplify_outputs.json` runs |
| **API key in `amplify_outputs.json` is expired or wrong** | Compare `api_key` in the file vs. AppSync Console → API keys | Push a new commit to regenerate, or set `VITE_APPSYNC_API_KEY` in Amplify Console env vars |

#### Verifying the explicit IAM grant in the AWS Console

After deploying, confirm the fix is in place:

1. **AWS Console → IAM → Roles**
2. Search for `amplify-*-unauthRole*` (the Cognito Identity Pool unauthenticated role)
3. Click the role → **Permissions** tab
4. Look for an inline policy containing `Action: appsync:GraphQL` and a `Resource` ending in `/types/Mutation/fields/generateRecipe`

If it is missing, the `allow.guest()` auto-wiring from Amplify Gen 2 did not fire for this `a.generation()` route. The explicit grant in `amplify/backend.ts` (`unauthenticatedUserIamRole.addToPrincipalPolicy(...)`) is the fix — trigger a fresh deploy.

### "A custom error was thrown from a mapping template."

This AppSync error message means the backend resolver for the `generateRecipe` generation route failed before Bedrock returned a successful response. The most common causes are:

| Cause | How to check | Fix |
|---|---|---|
| **Resolver IAM missing `bedrock:InvokeModel` for Titan** | AWS IAM → search for roles with "Bedrock" or "generateRecipe" | Redeploy backend so the resolver role is refreshed |
| **Wrong region** | Check `amplify_outputs.json` → `data.aws_region` | Ensure Bedrock invocation is happening in that region (default: `us-east-1`) |
| **Stale backend deployment** | AWS Amplify Console → last build date | Push a new commit or manually trigger a build to redeploy the backend |
| **Wrong model ID in generation route** | Check `amplify/data/resource.ts` | Keep `resourcePath: "amazon.titan-text-lite-v1"` and redeploy |

### Step-by-step diagnosis

1. **Enable AppSync request/response logging**
   - AWS Console → AppSync → your API → Settings → Logging → Enable (Field-level)
   - Reproduce the error; check CloudWatch Logs for the `generateRecipe` resolver
   - The log usually shows the real error (e.g. `AccessDeniedException`, `ResourceNotFoundException`)

2. **Validate Bedrock setup**
   - AWS Console → Amazon Bedrock (deployment region)
   - Confirm `amplify/data/resource.ts` uses `resourcePath: "amazon.titan-text-lite-v1"`
   - Confirm the resolver IAM role includes `bedrock:InvokeModel` for `amazon.titan-text-lite-v1`

3. **Validate locally with sandbox**
   ```bash
   npx ampx sandbox
   # Wait for "Deployment complete"
   cp amplify_outputs.json amplify/amplify_outputs.json
   npm run dev
   # Open http://localhost:5173 → AI Chat tab → send a message
   ```

4. **Check guest Identity Pool configuration** (for authorization errors)
   - Public AI routes now use Cognito Identity Pool **guest** credentials (`identityPool`) first and automatically fall back to API key auth during rollout
   - Ensure `allowUnauthenticatedIdentities` is enabled in the backend and redeploy after pulling latest changes
   - `amplify/backend.ts` now **explicitly** adds `appsync:GraphQL` on `Mutation.generateRecipe` to the `unauthenticatedUserIamRole` — Amplify Gen 2 does not auto-wire this for `a.generation()` routes
   - After deploying, verify in AWS Console: IAM → Roles → `amplify-*-unauthRole*` → Permissions → search for `appsync:GraphQL` on `generateRecipe`
   - If running locally, re-run `npx ampx sandbox` so `amplify_outputs.json` includes `aws_cognito_identity_pool_id`, then copy it into `amplify/amplify_outputs.json`

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
| "The AI request failed in the backend resolver…" | `AccessDeniedException` / `ResourceNotFoundException` / `ValidationException` from Bedrock — resolver IAM missing `bedrock:InvokeModel` or incorrect Titan model configuration |
| "The AI service is currently rate-limited…" | `ThrottlingException` from Bedrock — wait a few seconds and retry |
| "Authorization error (UnauthorizedException on Mutation.generateRecipe) — …" | Identity Pool unauthenticated role is missing `appsync:GraphQL` on `generateRecipe`; the explicit grant in `amplify/backend.ts` fixes this — redeploy |
| "Authorization error — the AI service rejected the request…" | Guest IAM auth is still propagating, the Identity Pool unauthenticated role is missing AppSync permission, or the frontend bundle is still stale; the app now retries auth failures automatically (guest + API key), so wait about a minute, refresh, and redeploy the backend if it persists |
| "AI assistant is not available right now…" | `amplify_outputs.json` is missing the `generations.generateRecipe` introspection entry — redeploy the backend |

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
