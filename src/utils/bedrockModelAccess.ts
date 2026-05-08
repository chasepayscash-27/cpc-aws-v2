const US_CROSS_REGION_PROFILE_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-2",
] as const;

type SupportedUsRegion = (typeof US_CROSS_REGION_PROFILE_REGIONS)[number];

function isUsCrossRegionProfileRegion(
  region: string
): region is SupportedUsRegion {
  return (US_CROSS_REGION_PROFILE_REGIONS as readonly string[]).includes(region);
}

export function getBedrockModelAccessRegions(
  deploymentRegion?: string
): string[] {
  if (!deploymentRegion) return [];

  return isUsCrossRegionProfileRegion(deploymentRegion)
    ? [...US_CROSS_REGION_PROFILE_REGIONS]
    : [deploymentRegion];
}

export function usesBedrockUsCrossRegionProfile(
  deploymentRegion?: string
): boolean {
  return getBedrockModelAccessRegions(deploymentRegion).length > 1;
}

export function getBedrockModelAccessUrl(region?: string): string {
  return `https://console.aws.amazon.com/bedrock/home${
    region ? `?region=${region}` : ""
  }#/modelaccess`;
}
