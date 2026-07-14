/**
 * Converts a string to title case: the first letter of each space-separated
 * word is uppercased while the remaining characters are preserved.
 * This handles both all-lowercase legacy database values and existing
 * properly-cased strings without mangling acronyms like "HVAC".
 *
 * Examples:
 *   "all flooring out"  → "All Flooring Out"
 *   "HVAC Rough"        → "HVAC Rough"
 *   "interior painted"  → "Interior Painted"
 */
export function toTitleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}
