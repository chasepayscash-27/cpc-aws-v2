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

1. **Enable Amazon Bedrock model access** in the AWS Console for the region you deploy to:
   - For deployments in `us-east-1`, `us-east-2`, or `us-west-2`, Amplify routes **Claude 3.5 Haiku** through the US cross-region inference profile. Enable model access in **all three US profile regions**: `us-east-1`, `us-east-2`, and `us-west-2`.
   - Direct links:
     - us-east-1: https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
     - us-east-2: https://console.aws.amazon.com/bedrock/home?region=us-east-2#/modelaccess
     - us-west-2: https://console.aws.amazon.com/bedrock/home?region=us-west-2#/modelaccess
   - For deployments outside those US regions, go to **Amazon Bedrock → Model access** in your deployment region and enable **Claude 3.5 Haiku** (Anthropic).
2. **Deploy or sandbox the Amplify backend** so the `generateRecipe` AppSync mutation and the Bedrock Lambda resolver are provisioned:
   ```bash
   npx ampx sandbox          # for local development
   # or push via CI/CD for production
   ```
3. After a successful deployment, Amplify CLI regenerates `amplify/amplify_outputs.json`. This file **must** contain a `generations.generateRecipe` entry inside `data.model_introspection`. Without it, the frontend Amplify client cannot expose `client.generations.generateRecipe` and will display a user-friendly error in the UI instead of crashing.

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

This message is shown when both the Cognito guest-credentials client and the API-key fallback client receive an AppSync auth error (`AccessDeniedException` / `UnauthorizedException`). The most common causes are:

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

This AppSync error message means the backend resolver for the `generateRecipe` generation route failed before it could reach Claude. The most common causes are:

| Cause | How to check | Fix |
|---|---|---|
| **Bedrock model access not enabled** | AWS Console → Amazon Bedrock → Model access | For `us-east-1` / `us-east-2` / `us-west-2` deployments, enable **Claude 3.5 Haiku** (Anthropic) in **all three US profile regions**. For other regions, enable it in the deployment region. |
| **Wrong region** | Check `amplify_outputs.json` → `data.aws_region` | Ensure Bedrock model access is enabled in that region (default: `us-east-1`) |
| **Stale backend deployment** | AWS Amplify Console → last build date | Push a new commit or manually trigger a build to redeploy the backend |
| **AppSync resolver IAM missing `bedrock:InvokeModel`** | AWS IAM → search for roles with "Bedrock" or "generateRecipe" | The `amplify/backend.ts` now adds this explicitly; redeploy after merging |
| **Cross-region inference profile not covered by IAM policy** | CloudWatch Logs for the `generateRecipe` resolver → look for `inference-profile` in the error | Redeploy — `amplify/backend.ts` now includes inference-profile ARNs in the policy |

#### About cross-region inference profiles

Amplify Gen 2 (≥ 1.x) invokes Claude through an **inference profile** in `us-east-1`, `us-east-2`, and `us-west-2` rather than the foundation model directly. The IAM policy must allow `bedrock:InvokeModel` on *both* the foundation-model ARN (`arn:aws:bedrock:REGION::foundation-model/MODEL_ID`) **and** the inference-profile ARN (`arn:aws:bedrock:REGION:ACCOUNT:inference-profile/PROFILE_ID`). `amplify/backend.ts` now covers both. Bedrock model access must also be enabled in **each region used by that US cross-region profile**, not only the single Amplify deployment region. If your deployment fails with `AccessDeniedException` referencing `inference-profile/`, redeploy after pulling the latest changes.

### Step-by-step diagnosis

1. **Enable AppSync request/response logging**
   - AWS Console → AppSync → your API → Settings → Logging → Enable (Field-level)
   - Reproduce the error; check CloudWatch Logs for the `generateRecipe` resolver
   - The log usually shows the real error (e.g. `AccessDeniedException`, `ResourceNotFoundException`)

2. **Validate Bedrock model access**
   - AWS Console → Amazon Bedrock → Model access
   - Direct links for US cross-region profile checks:
     - us-east-1: https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
     - us-east-2: https://console.aws.amazon.com/bedrock/home?region=us-east-2#/modelaccess
     - us-west-2: https://console.aws.amazon.com/bedrock/home?region=us-west-2#/modelaccess
   - Ensure **Anthropic Claude 3.5 Haiku** shows status **Access granted**
   - Changes take a few minutes to propagate

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
| "The AI request failed in the backend resolver…" | `AccessDeniedException` / `ResourceNotFoundException` / `ValidationException` from Bedrock — model access not enabled, IAM missing `bedrock:InvokeModel`, or incorrect model/inference-profile ARN |
| "The AI service is currently rate-limited…" | `ThrottlingException` from Bedrock — wait a few seconds and retry |
| "Authorization error (UnauthorizedException on Mutation.generateRecipe) — …" | Identity Pool unauthenticated role is missing `appsync:GraphQL` on `generateRecipe`; the explicit grant in `amplify/backend.ts` fixes this — redeploy |
| "Authorization error — the AI service rejected the request…" | Guest IAM auth is still propagating, the Identity Pool unauthenticated role is missing AppSync permission, or the frontend bundle is still stale; the app now retries with API key automatically, so wait about a minute, refresh, and redeploy the backend if it persists |
| "AI assistant is not available right now…" | `amplify_outputs.json` is missing the `generations.generateRecipe` introspection entry — redeploy the backend |

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
