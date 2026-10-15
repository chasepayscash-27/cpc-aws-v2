import { readFileSync } from 'node:fs';
import Papa from 'papaparse';
import { describe, expect, it } from 'vitest';
import { getSoldProfit, isRental, parseSoldNumber, summarizeSoldProjects, type SoldProjectRow } from './soldProjects';

describe('historical sold data', () => {
  it.each([
    ['$239.9K', 239900],
    ['$260k', 260000],
    ['$48, 163.59', 48163.59],
    ['-4991.62', -4991.62],
    ['0', 0],
    ['$1.2M', 1200000],
    ['', null],
    ['N/A', null],
    ['RENTAL', null],
    ['$249.$K', null],
    ['Infinity', null],
  ])('parses %s without inventing missing amounts', (input, expected) => {
    expect(parseSoldNumber(input)).toBe(expected);
  });

  it('prefers 2024 PROFIT over GP and uses 2025 GP', () => {
    expect(getSoldProfit({ PROFIT: '51200.01', GP: '5120' })).toBe(51200.01);
    expect(getSoldProfit({ GP: '-4991.62' })).toBe(-4991.62);
    expect(getSoldProfit({ PROFIT: '0', GP: '100' })).toBe(0);
    expect(getSoldProfit({ PROFIT: 'RENTAL', GP: '100' })).toBeNull();
  });

  it('excludes rentals and blank records, preserves losses and zero DOM, and omits unknown amounts', () => {
    const summary = summarizeSoldProjects([
      { 'PROPERTY ADDRESS': 'One', 'SOLD $': '$200K', PROFIT: '-1000', DOM: '0' },
      { 'PROPERTY ADDRESS': 'Two', 'SOLD $': '$249.$K', GP: '2000', DOM: '10' },
      { 'PROPERTY ADDRESS': 'Rental', 'SOLD $': '0', AGENT: 'RENTAL', GP: '999' },
      { 'SOLD $': '999999', GP: '999999' },
    ]);
    expect(summary).toEqual({
      soldCount: 2, sales: 200000, profit: 1000, averageDom: 5,
      salesCount: 1, profitCount: 2, domCount: 2,
    });
    expect(summarizeSoldProjects([]).sales).toBeNull();
    expect(summarizeSoldProjects([]).averageDom).toBeNull();
  });

  it.each(['2024', '2025'])('loads the actual %s file as CSV with readable dates and no blank spreadsheet rows', year => {
    const text = readFileSync(new URL(`../../public/data/cpc_sold_${year}.csv`, import.meta.url), 'utf8');
    const parsed = Papa.parse<SoldProjectRow>(text, { header: true, skipEmptyLines: true });
    expect(parsed.errors).toEqual([]);
    expect(parsed.data).toHaveLength(year === '2024' ? 49 : 58);
    expect(parsed.data.every(row => Boolean(row['PROPERTY ADDRESS']))).toBe(true);
    expect(parsed.data[0].CLOSED).toBe(year === '2024' ? '2024-08-09' : '2025-01-03');
    expect(parsed.data.some(isRental)).toBe(true);
    expect(summarizeSoldProjects(parsed.data).soldCount).toBeLessThan(parsed.data.length);
    expect(summarizeSoldProjects(parsed.data).profit).toBeGreaterThan(0);
  });
});
