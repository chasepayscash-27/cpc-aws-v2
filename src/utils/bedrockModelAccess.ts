// Claude 3 Haiku is available directly in the deployment region without
// cross-region inference profiles, so only one region needs model access.
export function getBedrockModelAccessRegions(
  deploymentRegion?: string
): string[] {
  return deploymentRegion ? [deploymentRegion] : ["us-east-1"];
}

export function getBedrockModelAccessUrl(region?: string): string {
  return `https://console.aws.amazon.com/bedrock/home${
    region ? `?region=${region}` : ""
  }#/modelaccess`;
}
