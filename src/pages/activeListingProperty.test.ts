import { describe, expect, it } from 'vitest';
import { getActiveListingPropertyKey, getActiveListingPropertyLabel } from './activeListingProperty';

describe('activeListingProperty helpers', () => {
  it('prefers project_uuid for the selection key', () => {
    expect(
      getActiveListingPropertyKey(
        {
          project_uuid: 'abc-123',
          name: '123 Oak Street',
          full_address: '123 Oak St',
        },
        0,
      ),
    ).toBe('abc-123');
  });

  it('falls back to property name and address for labels', () => {
    expect(
      getActiveListingPropertyLabel({
        name: '123 Oak Street',
        full_address: '123 Oak St',
      }),
    ).toBe('123 Oak Street');
    expect(
      getActiveListingPropertyLabel({
        full_address: '123 Oak St',
      }),
    ).toBe('123 Oak St');
  });

  it('provides deterministic fallbacks when listing data is sparse', () => {
    expect(getActiveListingPropertyKey({}, 4)).toBe('active-listing-4');
    expect(getActiveListingPropertyLabel({})).toBe('Unnamed property');
  });
});
