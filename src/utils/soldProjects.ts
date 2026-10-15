export type SoldYear = '2024' | '2025';

export interface SoldProjectRow {
  'PROPERTY ADDRESS'?: string;
  PROFIT?: string;
  GP?: string;
  'SOLD $'?: string;
  'PURCHASE $'?: string;
  'REHAB $'?: string;
  'PURCHASE DATE'?: string;
  CLOSED?: string;
  DOM?: string;
  AGENT?: string;
}

export function parseSoldNumber(value?: string): number | null {
  if (!value?.trim()) return null;
  const text = value.trim().replace(/[$,\s]/g, '');
  if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)[kKmM]?$/.test(text)) return null;
  const multiplier = /k$/i.test(text) ? 1000 : /m$/i.test(text) ? 1000000 : 1;
  const amount = Number(text.replace(/[kKmM]$/, '')) * multiplier;
  return Number.isFinite(amount) ? amount : null;
}

export function isRental(row: SoldProjectRow): boolean {
  return [row.PROFIT, row.GP, row['SOLD $'], row.CLOSED, row.AGENT]
    .some(value => value?.trim().toUpperCase() === 'RENTAL');
}

export function getSoldProfit(row: SoldProjectRow): number | null {
  return parseSoldNumber(row.PROFIT?.trim() ? row.PROFIT : row.GP);
}

export function summarizeSoldProjects(rows: SoldProjectRow[]) {
  const sold = rows.filter(row => row['PROPERTY ADDRESS']?.trim() && !isRental(row));
  const amounts = sold.map(row => parseSoldNumber(row['SOLD $'])).filter((n): n is number => n !== null);
  const profits = sold.map(getSoldProfit).filter((n): n is number => n !== null);
  const days = sold.map(row => parseSoldNumber(row.DOM)).filter((n): n is number => n !== null && n >= 0);
  return {
    soldCount: sold.length,
    sales: amounts.length ? amounts.reduce((sum, n) => sum + n, 0) : null,
    profit: profits.length ? profits.reduce((sum, n) => sum + n, 0) : null,
    averageDom: days.length ? days.reduce((sum, n) => sum + n, 0) / days.length : null,
    salesCount: amounts.length,
    profitCount: profits.length,
    domCount: days.length,
  };
}
