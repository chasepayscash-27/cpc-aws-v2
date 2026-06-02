import { describe, it, expect } from 'vitest';
import {
  normalizeAddress,
  normalizeAddressCompact,
  addressesMatch,
} from '../normalizeAddress';

describe('normalizeAddress', () => {
  it('lowercases and expands street-type abbreviations', () => {
    expect(normalizeAddress('1037 Sharp Dr')).toBe('1037 sharp drive');
    expect(normalizeAddress('1309 Springville Rd')).toBe('1309 springville road');
    expect(normalizeAddress('1118 Hale Cir')).toBe('1118 hale circle');
    expect(normalizeAddress('4038 Ida Ln')).toBe('4038 ida lane');
  });

  it('expands Mtn → mountain (regression)', () => {
    expect(normalizeAddress('10 Anderson Mtn Dr')).toBe('10 anderson mountain drive');
    expect(normalizeAddress('10 Anderson Mountain Drive')).toBe('10 anderson mountain drive');
  });

  it('expands NE/NW/SE/SW directional abbreviations', () => {
    expect(normalizeAddress('1645 Barrington Ln NE')).toBe('1645 barrington lane northeast');
    expect(normalizeAddress('1504 8th St NW')).toBe('1504 8th street northwest');
  });

  it('expands Co → county', () => {
    expect(normalizeAddress('335 Co Rd 1130')).toBe('335 county road 1130');
    expect(normalizeAddress('424 Co Rd 3150')).toBe('424 county road 3150');
  });

  it('strips periods', () => {
    expect(normalizeAddress('2308 Kala St.')).toBe('2308 kala street');
  });

  it('collapses extra whitespace', () => {
    expect(normalizeAddress('  5400  J R  Dr  ')).toBe('5400 j r drive');
  });
});

describe('normalizeAddressCompact', () => {
  it('removes all spaces from the normalized form', () => {
    expect(normalizeAddressCompact('5609 Ridge View Drive')).toBe('5609ridgeviewdrive');
    expect(normalizeAddressCompact('5609 Ridgeview Dr')).toBe('5609ridgeviewdrive');
    expect(normalizeAddressCompact('5337 Pine Needle Dr')).toBe('5337pineneedledrive');
    expect(normalizeAddressCompact('5337 Pineneedle Drive')).toBe('5337pineneedledrive');
  });
});

describe('addressesMatch', () => {
  // ── Primary reported bug ──────────────────────────────────────────────────
  it('matches 5609 Ridge View Drive ↔ 5609 Ridgeview Dr', () => {
    expect(addressesMatch('5609 Ridge View Drive', '5609 Ridgeview Dr')).toBe(true);
  });

  // ── Other compound-word cases fixed by compact normalization ──────────────
  it('matches 5337 Pineneedle Drive ↔ 5337 Pine Needle Dr', () => {
    expect(addressesMatch('5337 Pineneedle Drive', '5337 Pine Needle Dr')).toBe(true);
  });

  // ── County-road abbreviation cases ───────────────────────────────────────
  it('matches 335 County Road 1130 ↔ 335 Co Rd 1130', () => {
    expect(addressesMatch('335 County Road 1130', '335 Co Rd 1130')).toBe(true);
  });

  it('matches 424 County Road 3150 ↔ 424 Co Rd 3150', () => {
    expect(addressesMatch('424 County Road 3150', '424 Co Rd 3150')).toBe(true);
  });

  // ── Mtn / Mountain regression ─────────────────────────────────────────────
  it('matches 10 Anderson Mtn Dr ↔ 10 Anderson Mountain Drive (regression)', () => {
    expect(addressesMatch('10 Anderson Mtn Dr', '10 Anderson Mountain Drive')).toBe(true);
  });

  // ── Exact abbreviation matches ────────────────────────────────────────────
  it('matches abbreviation variants that normalize identically', () => {
    expect(addressesMatch('1645 Barrington Ln NE', '1645 Barrington Lane Northeast')).toBe(true);
  });

  // ── Negative cases ────────────────────────────────────────────────────────
  it('does NOT match genuinely different addresses', () => {
    expect(addressesMatch('123 Oak Street', '456 Oak Street')).toBe(false);
    expect(addressesMatch('5609 Ridge View Drive', '5610 Ridge View Drive')).toBe(false);
    expect(addressesMatch('1788 Whitmire Street', '1792 Whitmire Street')).toBe(false);
  });
});
