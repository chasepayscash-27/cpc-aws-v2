/**
 * Shared utilities for extracting and formatting errors from the Amplify
 * Data client (AppSync / GraphQL).
 *
 * AppSync wraps backend failures (e.g. Bedrock AccessDeniedException) as:
 *   "A custom error was thrown from a mapping template."
 * with a more specific `errorType` field on the GraphQL error object.
 *
 * These helpers surface that information as actionable user-facing messages
 * without leaking secrets or raw stack traces.
 */

/** Minimal shape of one GraphQL error returned by the Amplify Data client. */
export interface AmplifyGraphQLError {
  message: string;
  errorType?: string;
  path?: ReadonlyArray<string | number>;
}

export interface ParsedAmplifyError {
  /** Human-readable message to show the user. */
  userMessage: string;
  /**
   * True when the error is an auth/API-key problem — a page refresh may help.
   * Mutually exclusive with isModelAccessError.
   */
  isAuthError: boolean;
  /**
   * True when the error is specifically about Bedrock model access not being
   * enabled (or the resolver IAM role lacking bedrock:InvokeModel).
   * Refresh will NOT help — the admin must enable model access in the console.
   */
  isModelAccessError: boolean;
}

const BEDROCK_HINT =
  "Check AWS Console → Amazon Bedrock → Model access and ensure " +
  "Claude 3.5 Haiku (Anthropic) is enabled in your deployment region. " +
  "If access was recently granted, redeploy the Amplify backend " +
  "(`npx ampx pipeline-deploy` or push to the CI branch).";

const MAPPING_TEMPLATE_RE = /custom error.*mapping template/i;
const ACCESS_DENIED_RE = /accessdenied|not authorized|unauthorized/i;
const RESOURCE_NOT_FOUND_RE = /resourcenotfound|resource.*not.*found/i;
const THROTTLING_RE = /throttling|too many requests|rate exceeded/i;
const VALIDATION_RE = /validationexception|validation.*error|invalid.*model/i;
const SERVICE_UNAVAIL_RE = /serviceunavailable|service.*unavailable|model.*unavailable/i;

/**
 * Internal: map a set of detected error flags into a ParsedAmplifyError.
 * Shared by parseAmplifyErrors (GraphQL errors array) and formatCaughtError
 * (raw caught value) so message strings and logic stay consistent.
 */
function buildParsedError(flags: {
  isMappingTemplate: boolean;
  isAccessDenied: boolean;
  isBedrockRelated: boolean;
  isResourceNotFound: boolean;
  isValidation: boolean;
  isThrottling: boolean;
  isServiceUnavailable: boolean;
  fallbackMessage: string;
}): ParsedAmplifyError {
  const {
    isMappingTemplate,
    isAccessDenied,
    isBedrockRelated,
    isResourceNotFound,
    isValidation,
    isThrottling,
    isServiceUnavailable,
    fallbackMessage,
  } = flags;

  // Mapping-template errors almost always wrap a Bedrock access failure.
  // ResourceNotFoundException on a model means the model ID is wrong or not
  // available in the region — also a "model access" problem from the user POV.
  const isModelAccessError =
    isMappingTemplate || (isAccessDenied && isBedrockRelated) || isResourceNotFound;

  if (isModelAccessError) {
    return {
      userMessage:
        "The AI request failed in the backend resolver — this typically means " +
        "Amazon Bedrock model access has not been enabled for Claude 3.5 Haiku. " +
        BEDROCK_HINT,
      isAuthError: false,
      isModelAccessError: true,
    };
  }

  if (isValidation) {
    return {
      userMessage:
        "The AI request was rejected by the backend (ValidationException) — " +
        "the Bedrock model ID or request format may be misconfigured. " +
        BEDROCK_HINT,
      isAuthError: false,
      isModelAccessError: true,
    };
  }

  if (isThrottling) {
    return {
      userMessage:
        "The AI service is temporarily busy (ThrottlingException). " +
        "Please wait a few seconds and try again.",
      isAuthError: false,
      isModelAccessError: false,
    };
  }

  if (isServiceUnavailable) {
    return {
      userMessage:
        "The AI service is temporarily unavailable. Please try again in a moment.",
      isAuthError: false,
      isModelAccessError: false,
    };
  }

  if (isAccessDenied) {
    return {
      userMessage:
        "Authorization error — the AI service is not accessible with the current " +
        "API key. If a new deployment has just completed, refresh the page to pick " +
        "up updated credentials.",
      isAuthError: true,
      isModelAccessError: false,
    };
  }

  return {
    userMessage: fallbackMessage || "An unknown AI service error occurred.",
    isAuthError: false,
    isModelAccessError: false,
  };
}

/**
 * Parse an array of Amplify/AppSync GraphQL errors into a single
 * user-facing message plus diagnostic flags.
 *
 * Logs full error details (including errorType/path) to the console for
 * AWS CloudWatch / browser DevTools without surfacing them in the UI.
 */
export function parseAmplifyErrors(
  context: string,
  errors: AmplifyGraphQLError[]
): ParsedAmplifyError {
  // Log full details for debugging (AppSync logs, browser DevTools).
  console.error(
    `[${context}] GraphQL errors:`,
    errors.map((e) => ({
      message: e.message,
      errorType: e.errorType,
      path: e.path,
    }))
  );

  const messages = errors.map((e) => e.message);
  const errorTypes = errors.map((e) => e.errorType ?? "").filter(Boolean);
  const combined = [...messages, ...errorTypes].join(" ");

  return buildParsedError({
    isMappingTemplate: messages.some((m) => MAPPING_TEMPLATE_RE.test(m)),
    isAccessDenied:
      ACCESS_DENIED_RE.test(combined) ||
      errorTypes.some((t) => /AccessDeniedException|UnauthorizedException/i.test(t)),
    isBedrockRelated: /bedrock/i.test(combined),
    isResourceNotFound:
      RESOURCE_NOT_FOUND_RE.test(combined) &&
      errorTypes.some((t) => /ResourceNotFoundException/i.test(t)),
    isValidation:
      VALIDATION_RE.test(combined) ||
      errorTypes.some((t) => /ValidationException/i.test(t)),
    isThrottling:
      THROTTLING_RE.test(combined) ||
      errorTypes.some((t) => /ThrottlingException/i.test(t)),
    isServiceUnavailable:
      SERVICE_UNAVAIL_RE.test(combined) ||
      errorTypes.some((t) => /ServiceUnavailableException/i.test(t)),
    fallbackMessage: messages.join("\n"),
  });
}

/**
 * Format a value caught in a `catch (e)` block into a ParsedAmplifyError.
 * Handles Error instances, raw strings, and plain objects.
 */
export function formatCaughtError(context: string, e: unknown): ParsedAmplifyError {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[${context}] Caught error:`, e);

  return buildParsedError({
    isMappingTemplate: MAPPING_TEMPLATE_RE.test(msg),
    isAccessDenied: ACCESS_DENIED_RE.test(msg),
    isBedrockRelated: /bedrock/i.test(msg),
    isResourceNotFound: RESOURCE_NOT_FOUND_RE.test(msg),
    isValidation: VALIDATION_RE.test(msg),
    isThrottling: THROTTLING_RE.test(msg),
    isServiceUnavailable: SERVICE_UNAVAIL_RE.test(msg),
    fallbackMessage: msg,
  });
}
