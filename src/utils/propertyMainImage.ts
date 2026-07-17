const DIMENSION_SUFFIX_PATTERN = /-\d{2,5}x\d{2,5}(?=\.[a-z0-9]+(?:[?#].*)?$)/i;

export function getPrimaryPropertyImageUrl(imageUrl?: string | null): string | null {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return null;
  return trimmed.replace(DIMENSION_SUFFIX_PATTERN, "");
}

export function getPrimaryPropertyImageSources(imageUrl?: string | null): string[] {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return [];
  const primary = getPrimaryPropertyImageUrl(trimmed);
  if (!primary || primary === trimmed) return [trimmed];
  return [primary, trimmed];
}
