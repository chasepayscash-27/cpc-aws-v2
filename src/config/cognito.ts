/**
 * Cognito Hosted UI configuration.
 *
 * All values are read from Vite environment variables so that no secrets are
 * hard-coded and each deployment environment (local dev / staging / prod) can
 * be configured independently.
 *
 * Required variables (set in .env.local or in the Amplify Console under
 * App settings → Environment variables):
 *
 *   VITE_COGNITO_REGION          AWS region, e.g. us-east-1
 *   VITE_COGNITO_USER_POOL_ID    User Pool ID, e.g. us-east-1_ba4UX341U
 *   VITE_COGNITO_CLIENT_ID       App Client ID (no client secret for browser apps)
 *   VITE_COGNITO_DOMAIN          Cognito hosted-UI domain prefix,
 *                                  e.g. my-app.auth.us-east-1.amazoncognito.com
 *   VITE_COGNITO_REDIRECT_URI    OAuth callback URL the Cognito client is
 *                                  allowed to redirect to, e.g.
 *                                  http://localhost:5173/auth/callback
 *   VITE_COGNITO_LOGOUT_URI      Post-logout redirect URL the Cognito client
 *                                  is allowed to redirect to, e.g.
 *                                  http://localhost:5173
 */

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
  /** Full Hosted-UI domain (without trailing slash), e.g. https://my-app.auth.us-east-1.amazoncognito.com */
  domain: string;
  redirectSignIn: string;
  redirectSignOut: string;
}

function requireEnv(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    throw new Error(
      `[cognito config] Missing required environment variable: ${key}. ` +
        'Copy .env.example to .env.local and fill in the Cognito values.',
    );
  }
  return value;
}

/** Returns the Cognito Hosted UI configuration derived from env vars. */
export function getCognitoConfig(): CognitoConfig {
  return {
    region: requireEnv('VITE_COGNITO_REGION'),
    userPoolId: requireEnv('VITE_COGNITO_USER_POOL_ID'),
    clientId: requireEnv('VITE_COGNITO_CLIENT_ID'),
    domain: requireEnv('VITE_COGNITO_DOMAIN').replace(/\/$/, ''),
    redirectSignIn: requireEnv('VITE_COGNITO_REDIRECT_URI'),
    redirectSignOut: requireEnv('VITE_COGNITO_LOGOUT_URI'),
  };
}
