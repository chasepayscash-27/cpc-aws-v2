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
