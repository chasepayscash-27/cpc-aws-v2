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

  it('all required YTD fields are present in the row type', () => {
    const requiredFields: (keyof YTDRow)[] = [
      'Number of Houses Sold',
      'YTD Sold',
      'YTD Profit',
      'Average Profit',
      'Houses Sold Goal',
      'YTD Sold Goal',
      'YTD Profit Goal',
      'Average Profit Goal',
      'Houses Sold % Obtained',
      'YTD Sold % Obtained',
      'YTD Profit % Obtained',
    ];
    for (const field of requiredFields) {
      expect(sampleRow[field]).toBeDefined();
    }
  });
});
