/**
 * Maps common street abbreviations to their full forms.
 * Used to normalize property addresses for matching between datasets
 * that may use different conventions (e.g., "Mtn Dr" vs "Mountain Drive").
 */
const ADDRESS_WORD_MAP: Record<string, string> = {
  dr: 'drive',
  rd: 'road',
  cir: 'circle',
  ln: 'lane',
  st: 'street',
  blvd: 'boulevard',
  ave: 'avenue',
  mtn: 'mountain',
  mt: 'mountain',
  hwy: 'highway',
  prkwy: 'parkway',
  pkwy: 'parkway',
  terr: 'terrace',
  ter: 'terrace',
  ne: 'northeast',
  nw: 'northwest',
  se: 'southeast',
  sw: 'southwest',
  pl: 'place',
  ct: 'court',
  co: 'county',
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
};

/**
 * Normalizes a property address string by:
 * - Lowercasing
 * - Removing periods
 * - Collapsing whitespace
 * - Expanding common street abbreviations to their full forms
 *
 * This allows matching across datasets that use different abbreviation
 * conventions (e.g., P&L CSV uses "10 Anderson Mtn Dr" while the projects
 * CSV uses "10 Anderson Mountain Drive").
 */
export function normalizeAddress(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => ADDRESS_WORD_MAP[word] ?? word)
    .join(' ');
}

/**
 * Returns a compact (whitespace-free) form of the normalized address.
 * Used as a fallback in {@link addressesMatch} to handle cases where
 * multi-word street-name fragments are written as a single word in one
 * dataset and as separate words in the other
 * (e.g. "Ridge View" ↔ "Ridgeview", "Pine Needle" ↔ "Pineneedle").
 */
export function normalizeAddressCompact(name: string): string {
  return normalizeAddress(name).replace(/\s+/g, '');
}

/**
 * Directional suffixes that may be appended to or omitted from an address
 * in different datasets (e.g. "505 Sunhill Road Northwest" vs "505 Sunhill Rd").
 */
const TRAILING_DIRECTIONALS = new Set([
  'north', 'south', 'east', 'west',
  'northeast', 'northwest', 'southeast', 'southwest',
]);

/**
 * Street-type words that may be omitted at the end of an address in some
 * datasets (e.g. "150 Beaver Ridge Drive" vs "150 Beaver Ridge").
 */
const STREET_TYPES = new Set([
  'drive', 'road', 'circle', 'lane', 'street', 'boulevard', 'avenue',
  'highway', 'parkway', 'terrace', 'place', 'court',
]);

/** Strip the last token if it is a trailing directional; otherwise return unchanged. */
function stripTrailingDirectional(normalized: string): string {
  const tokens = normalized.split(' ');
  return TRAILING_DIRECTIONALS.has(tokens[tokens.length - 1])
    ? tokens.slice(0, -1).join(' ')
    : normalized;
}

/**
 * Returns true when two address strings refer to the same property,
 * using a multi-step comparison:
 * 1. Exact match after {@link normalizeAddress} (handles abbreviation differences).
 * 2. Compact match after {@link normalizeAddressCompact} (handles compound-word
 *    vs separated-word spellings such as "Ridgeview" vs "Ridge View").
 * 3. Match after stripping a trailing directional token from both sides
 *    (handles "505 Sunhill Road Northwest" ↔ "505 Sunhill Rd").
 * 4. Match when exactly one side ends with a street-type word that the other
 *    side omits (handles "150 Beaver Ridge Drive" ↔ "150 Beaver Ridge").
 *
 * @example
 * addressesMatch('5609 Ridgeview Dr', '5609 Ridge View Drive') // true
 * addressesMatch('10 Anderson Mtn Dr', '10 Anderson Mountain Drive') // true
 * addressesMatch('335 Co Rd 1130', '335 County Road 1130') // true
 * addressesMatch('505 Sunhill Road Northwest', '505 Sunhill Rd') // true
 * addressesMatch('150 Beaver Ridge Drive', '150 Beaver Ridge') // true
 * addressesMatch('123 Oak Street', '456 Oak Street') // false
 */
export function addressesMatch(a: string, b: string): boolean {
  const normA = normalizeAddress(a);
  const normB = normalizeAddress(b);

  // Step 1: exact normalized match
  if (normA === normB) return true;

  // Step 2: compact match (handles compound-word vs separated-word spellings)
  if (normA.replace(/\s+/g, '') === normB.replace(/\s+/g, '')) return true;

  // Step 3: strip trailing directional from both sides, then compare
  const dirA = stripTrailingDirectional(normA);
  const dirB = stripTrailingDirectional(normB);
  if (dirA === dirB) return true;
  if (dirA.replace(/\s+/g, '') === dirB.replace(/\s+/g, '')) return true;

  // Step 4: when exactly one side ends with a street-type word that the other
  // omits, strip it and compare (asymmetric, to avoid false positives when
  // both sides name a street type)
  const aTokens = normA.split(' ');
  const bTokens = normB.split(' ');
  const aEndsInType = STREET_TYPES.has(aTokens[aTokens.length - 1]);
  const bEndsInType = STREET_TYPES.has(bTokens[bTokens.length - 1]);
  if (aEndsInType !== bEndsInType) {
    const baseA = aEndsInType ? normA.split(' ').slice(0, -1).join(' ') : normA;
    const baseB = bEndsInType ? normB.split(' ').slice(0, -1).join(' ') : normB;
    if (baseA === baseB) return true;
    if (baseA.replace(/\s+/g, '') === baseB.replace(/\s+/g, '')) return true;
  }

  return false;
}
