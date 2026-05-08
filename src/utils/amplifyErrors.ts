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

import {
  getBedrockModelAccessRegions,
  usesBedrockUsCrossRegionProfile,
} from "./bedrockModelAccess";

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
   * Mutually exclusive with isModelAccessError and isThrottleError.
   */
  isAuthError: boolean;
  /**
   * True when the error is specifically about Bedrock model access not being
   * enabled (or the resolver IAM role lacking bedrock:InvokeModel), or when
   * the model ID / inference-profile ARN is wrong (ResourceNotFoundException /
   * ValidationException from Bedrock).
   * Refresh will NOT help — the admin must fix Bedrock/model configuration.
   */
  isModelAccessError: boolean;
  /**
   * True when Bedrock returned ThrottlingException — the request was rate-
   * limited.  Waiting a few seconds and retrying usually resolves this.
   */
  isThrottleError: boolean;
  /**
   * True when opening the Bedrock console is a useful next step, including
   * resolver errors that often trace back to IAM/model-access configuration.
   */
  showBedrockConsoleLink: boolean;
}

function formatRegionList(regions: string[]): string {
  if (regions.length <= 1) return regions[0] ?? "your deployment region";
  if (regions.length === 2) return `${regions[0]} and ${regions[1]}`;
  return `${regions.slice(0, -1).join(", ")}, and ${regions[regions.length - 1]}`;
}

/**
 * Build the Bedrock "how to fix" hint, optionally including the deployment
 * region so users know exactly which AWS Console region to check.
 */
function buildBedrockHint(region?: string): string {
  const accessRegions = getBedrockModelAccessRegions(region);

  if (region && usesBedrockUsCrossRegionProfile(region)) {
    return (
      "Amplify routes Claude 3.5 Haiku through the US cross-region inference " +
      `profile for deployments in ${region}. Check AWS Console → Amazon Bedrock → ` +
      `Model access in ${formatRegionList(accessRegions)} and ensure Claude 3.5 ` +
      "Haiku (Anthropic) is enabled in each region. If access was recently granted, " +
      "redeploy the Amplify backend (`npx ampx pipeline-deploy` or push to the CI branch)."
    );
  }

  const regionNote = region ? ` (region: ${region})` : "";
  return (
    `Check AWS Console → Amazon Bedrock → Model access${regionNote} and ensure ` +
    "Claude 3.5 Haiku (Anthropic) is enabled in your deployment region. " +
    "If access was recently granted, redeploy the Amplify backend " +
    "(`npx ampx pipeline-deploy` or push to the CI branch)."
  );
}

function buildResolverHint(region?: string): string {
  return (
    "This usually means the Amplify backend has not been redeployed since the AI " +
    "resolver changed, the AppSync resolver IAM role is still missing " +
    "`bedrock:InvokeModel` for the Claude 3.5 Haiku inference profile, or the " +
    "Bedrock model/profile access is incomplete. " +
    buildBedrockHint(region)
  );
}

const MAPPING_TEMPLATE_RE = /custom error.*mapping template/i;
const ACCESS_DENIED_RE = /accessdenied|not authorized|unauthorized/i;
const RESOURCE_NOT_FOUND_RE = /resourcenotfound|resource.*not.*found/i;
const THROTTLE_RE = /throttlingexception|throttled|rate.*exceed|too many requests/i;
const VALIDATION_RE = /validationexception|invalid.*model|model.*invalid/i;
const BEDROCK_RE = /bedrock|anthropic|claude|inference-profile|invokemodel/i;

/**
 * Parse an array of Amplify/AppSync GraphQL errors into a single
 * user-facing message plus diagnostic flags.
 *
 * Logs full error details (including errorType/path) to the console for
 * AWS CloudWatch / browser DevTools without surfacing them in the UI.
 *
 * @param context  A short label for log lines (e.g. component name).
 * @param errors   The GraphQL error array from the Amplify Data client.
 * @param region   Optional AWS deployment region (from amplify_outputs.json)
 *                 included in the Bedrock hint so users check the right console.
 */
export function parseAmplifyErrors(
  context: string,
  errors: AmplifyGraphQLError[],
  region?: string
): ParsedAmplifyError {
  // Log full details for debugging (AppSync logs, browser DevTools).
  console.error(
    `[${context}] GraphQL errors (region=${region ?? "unknown"}):`,
    errors.map((e) => ({
      message: e.message,
      errorType: e.errorType,
      path: e.path,
    }))
  );

  const messages = errors.map((e) => e.message);
  const errorTypes = errors.map((e) => e.errorType ?? "").filter(Boolean);
  const combined = [...messages, ...errorTypes].join(" ");

  const isMappingTemplate = messages.some((m) => MAPPING_TEMPLATE_RE.test(m));
  const isAccessDenied =
    ACCESS_DENIED_RE.test(combined) ||
    errorTypes.some((t) => /AccessDeniedException|UnauthorizedException/i.test(t));
  const isResourceNotFound =
    RESOURCE_NOT_FOUND_RE.test(combined) ||
    errorTypes.some((t) => /ResourceNotFoundException/i.test(t));
  const isThrottle =
    THROTTLE_RE.test(combined) ||
    errorTypes.some((t) => /ThrottlingException/i.test(t));
  const isValidation =
    VALIDATION_RE.test(combined) ||
    errorTypes.some((t) => /ValidationException/i.test(t));
  const hasBedrockSignal = BEDROCK_RE.test(combined);

  // ThrottlingException — surface before the model-access check so the user
  // gets an actionable "wait and retry" message rather than the access hint.
  if (isThrottle) {
    return {
      userMessage:
        "The AI service is currently rate-limited. Please wait a moment and try again.",
      isAuthError: false,
      isModelAccessError: false,
      isThrottleError: true,
      showBedrockConsoleLink: false,
    };
  }

  // ResourceNotFoundException means the model ID or inference-profile ARN is
  // wrong / not available in the region — a Bedrock configuration problem.
  // ValidationException on a Bedrock invocation can also mean the model ID
  // format is rejected, which is a configuration issue.
  const isModelAccessError =
    (isAccessDenied && hasBedrockSignal) ||
    isResourceNotFound ||
    isValidation;

  if (isModelAccessError) {
    return {
      userMessage:
        "The AI request failed in the backend resolver — this typically means " +
        "Amazon Bedrock model access has not been enabled for Claude 3.5 Haiku. " +
        buildBedrockHint(region),
      isAuthError: false,
      isModelAccessError: true,
      isThrottleError: false,
      showBedrockConsoleLink: true,
    };
  }

  if (isMappingTemplate) {
    return {
      userMessage:
        "The AI request failed in the backend resolver before Amazon Bedrock " +
        "returned a response. " +
        buildResolverHint(region),
      isAuthError: false,
      isModelAccessError: false,
      isThrottleError: false,
      showBedrockConsoleLink: true,
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
      isThrottleError: false,
      showBedrockConsoleLink: false,
    };
  }

  return {
    userMessage: messages.join("\n") || "An unknown AI service error occurred.",
    isAuthError: false,
    isModelAccessError: false,
    isThrottleError: false,
    showBedrockConsoleLink: false,
  };
}

/**
 * Format a value caught in a `catch (e)` block into a ParsedAmplifyError.
 * Handles Error instances, raw strings, and plain objects.
 *
 * @param context  A short label for log lines (e.g. component name).
 * @param e        The caught value.
 * @param region   Optional AWS deployment region included in the Bedrock hint.
 */
export function formatCaughtError(context: string, e: unknown, region?: string): ParsedAmplifyError {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[${context}] Caught error (region=${region ?? "unknown"}):`, e);

  if (THROTTLE_RE.test(msg)) {
    return {
      userMessage:
        "The AI service is currently rate-limited. Please wait a moment and try again.",
      isAuthError: false,
      isModelAccessError: false,
      isThrottleError: true,
      showBedrockConsoleLink: false,
    };
  }

  if (RESOURCE_NOT_FOUND_RE.test(msg) || VALIDATION_RE.test(msg)) {
    return {
      userMessage:
        "The AI request failed in the backend resolver — this typically means " +
        "Amazon Bedrock model access has not been enabled for Claude 3.5 Haiku. " +
        buildBedrockHint(region),
      isAuthError: false,
      isModelAccessError: true,
      isThrottleError: false,
      showBedrockConsoleLink: true,
    };
  }

  if (MAPPING_TEMPLATE_RE.test(msg)) {
    return {
      userMessage:
        "The AI request failed in the backend resolver before Amazon Bedrock " +
        "returned a response. " +
        buildResolverHint(region),
      isAuthError: false,
      isModelAccessError: false,
      isThrottleError: false,
      showBedrockConsoleLink: true,
    };
  }

  if (ACCESS_DENIED_RE.test(msg)) {
    return {
      userMessage:
        "Authorization error — the AI service is not accessible with the current " +
        "API key. If a new deployment has just completed, refresh the page to pick " +
        "up updated credentials.",
      isAuthError: true,
      isModelAccessError: false,
      isThrottleError: false,
      showBedrockConsoleLink: false,
    };
  }

  return {
    userMessage: msg || "An unexpected error occurred. Please try again.",
    isAuthError: false,
    isModelAccessError: false,
    isThrottleError: false,
    showBedrockConsoleLink: false,
  };
}
