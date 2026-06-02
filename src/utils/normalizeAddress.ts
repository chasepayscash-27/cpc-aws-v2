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
 * Returns true when two address strings refer to the same property,
 * using a two-step comparison:
 * 1. Exact match after {@link normalizeAddress} (handles abbreviation differences).
 * 2. Compact match after {@link normalizeAddressCompact} (handles compound-word
 *    vs separated-word spellings such as "Ridgeview" vs "Ridge View").
 *
 * @example
 * addressesMatch('5609 Ridgeview Dr', '5609 Ridge View Drive') // true
 * addressesMatch('10 Anderson Mtn Dr', '10 Anderson Mountain Drive') // true
 * addressesMatch('335 Co Rd 1130', '335 County Road 1130') // true
 * addressesMatch('123 Oak Street', '456 Oak Street') // false
 */
export function addressesMatch(a: string, b: string): boolean {
  const normA = normalizeAddress(a);
  const normB = normalizeAddress(b);
  if (normA === normB) return true;
  return normalizeAddressCompact(a) === normalizeAddressCompact(b);
}
