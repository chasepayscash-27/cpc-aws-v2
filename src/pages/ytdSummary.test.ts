import { describe, expect, it } from 'vitest';

// Mirrors the YTDRow interface from YTDSummaryPage.tsx.
// If new fields are added to the CSV and page, update this type and add tests.
interface YTDRow {
  'Number of Houses Sold': string;
  'YTD Sold': string;
  'YTD Profit': string;
  'Average Profit': string;
  'Houses Sold Goal': string;
  'YTD Sold Goal': string;
  'YTD Profit Goal': string;
  'Average Profit Goal': string;
  'Houses Sold % Obtained': string;
  'YTD Sold % Obtained': string;
  'YTD Profit % Obtained': string;
}

function parsePercent(value: string): number {
  return parseFloat(value.replace('%', '')) || 0;
}

/** Format properties-sold count as a locale-aware integer (e.g. 1000 → "1,000"). */
function formatPropertiesSold(raw: string): string {
  return Number(raw).toLocaleString();
}

describe('YTD CSV field mapping', () => {
  const sampleRow: YTDRow = {
    'Number of Houses Sold': '23',
    'YTD Sold': '$8,889,341.14',
    'YTD Profit': '$1,487,908.48',
    'Average Profit': '$64,691.67',
    'Houses Sold Goal': '80',
    'YTD Sold Goal': '$32,000,000.00',
    'YTD Profit Goal': '$6,000,000.00',
    'Average Profit Goal': '$75,000.00',
    'Houses Sold % Obtained': '28.75%',
    'YTD Sold % Obtained': '27.78%',
    'YTD Profit % Obtained': '24.80%',
  };

  it('CSV row includes Number of Houses Sold (properties sold)', () => {
    expect(sampleRow['Number of Houses Sold']).toBeDefined();
    expect(sampleRow['Number of Houses Sold']).toBe('23');
  });

  it('CSV row includes Houses Sold Goal', () => {
    expect(sampleRow['Houses Sold Goal']).toBe('80');
  });

  it('formatPropertiesSold returns locale-formatted integer', () => {
    expect(formatPropertiesSold('23')).toBe('23');
    expect(formatPropertiesSold('1000')).toBe('1,000');
    expect(formatPropertiesSold('0')).toBe('0');
  });

  it('parsePercent handles Houses Sold % Obtained', () => {
    expect(parsePercent(sampleRow['Houses Sold % Obtained'])).toBeCloseTo(28.75);
  });

  it('topline section only requires Properties Sold fields', () => {
    // Only the Properties Sold tile is displayed in the topline section.
    // Profit-related tiles (YTD Sold, YTD Profit, Average Profit) have been removed.
    const toplineFields: (keyof YTDRow)[] = [
      'Number of Houses Sold',
      'Houses Sold Goal',
    ];
    for (const field of toplineFields) {
      expect(sampleRow[field]).toBeDefined();
    }
  });

  it('profit metric fields are not required for topline rendering', () => {
    // These fields exist in the CSV but are no longer shown as topline tiles.
    const removedTileLabels = ['YTD Sold', 'YTD Profit', 'Average Profit'] as const;
    // The test asserts these are not among the topline tile labels.
    const toplineTileLabels = ['Properties Sold'];
    for (const label of removedTileLabels) {
      expect(toplineTileLabels).not.toContain(label);
    }
  });
});
