import type { ProjectRow } from '../types/project';

export function getActiveListingPropertyLabel(row: ProjectRow): string {
  return row.name?.trim() || row.full_address?.trim() || row.address_1?.trim() || 'Unnamed property';
}

export function getActiveListingPropertyKey(row: ProjectRow, index: number): string {
  return row.project_uuid?.trim() || row.name?.trim() || row.full_address?.trim() || `active-listing-${index}`;
}
