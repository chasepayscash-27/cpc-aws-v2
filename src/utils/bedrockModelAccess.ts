// Titan Text Lite is invoked in the deployment region, so surface that region
// in the Bedrock console link when available.
export function getBedrockModelAccessRegions(
  deploymentRegion?: string
): string[] {
  return deploymentRegion ? [deploymentRegion] : ["us-east-1"];
}

export function getBedrockModelAccessUrl(region?: string): string {
  return `https://console.aws.amazon.com/bedrock/home${region ? `?region=${region}` : ""}`;
}
