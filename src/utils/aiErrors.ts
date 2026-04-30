/**
 * Helpers for detecting and formatting AI / AppSync auth errors.
 */

const UNAUTHORIZED_PATTERNS = [
  "unauthorized",
  "not authorized",
  "UnauthorizedException",
  "401",
  "403",
  "forbidden",
  "api key",
  "apiKey",
  "InvalidSignatureException",
  "AccessDeniedException",
];

/**
 * Returns true when the given error looks like an authentication or
 * authorization failure from AppSync / Bedrock.
 */
export function isUnauthorizedError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
      ? err
      : JSON.stringify(err);
  const lower = msg.toLowerCase();
  return UNAUTHORIZED_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

/**
 * Returns a user-facing message for auth errors, or null if the error is not
 * an auth issue (so the caller can fall back to the original message).
 */
export function unauthorizedMessage(): string {
  return (
    "The AI service could not authenticate your request. " +
    "The AppSync API key may be expired or invalid. " +
    "A new deployment will automatically rotate the key. " +
    "If the issue persists, please contact the site administrator."
  );
}

/**
 * Logs structured auth-error details to the console to aid debugging without
 * leaking secrets.
 */
export function logAuthError(context: string, err: unknown): void {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
  console.error(
    `[${context}] Authorization error calling AppSync AI route. ` +
      `Error: ${msg}. ` +
      "Check that the AppSync API key in amplify_outputs.json has not expired, " +
      "or set VITE_APPSYNC_API_KEY in the Amplify Console environment variables."
  );
}
