import React, { useEffect, useState, useMemo } from 'react';
import { loadCsv } from '../utils/csv';
import '../App.css';

interface FinancialCsvRow {
  account?: string;
  property_name?: string;
  amount?: string;
}

interface InterestRow {
  property: string;
  ytdInterest: number;
}

const DASH = '—';

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const InterestPaymentsPage: React.FC = () => {
  const [csvRows, setCsvRows] = useState<FinancialCsvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCsv<FinancialCsvRow>('/data/sweet_home_bama_pl_long_fixed.csv')
      .then((rows) => {
        if (cancelled) return;
        setCsvRows(rows);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading interest data:', err);
        setError('Failed to load interest payment data');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const rows: InterestRow[] = useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of csvRows) {
      if (row.account?.trim() !== 'Interest Payment') continue;
      const name = row.property_name?.trim();
      if (!name || name === 'Total') continue;
      const amount = Number(row.amount);
      if (Number.isNaN(amount)) continue;
      totals.set(name, (totals.get(name) ?? 0) + amount);
    }
    return Array.from(totals.entries())
      .map(([property, ytdInterest]) => ({ property, ytdInterest }))
      .sort((a, b) => a.property.localeCompare(b.property));
  }, [csvRows]);

  const grandTotal = useMemo(() => rows.reduce((sum, r) => sum + r.ytdInterest, 0), [rows]);

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Interest Payments</h1>
        <p className="muted">Year-to-date interest payment tracking by property.</p>
      </div>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Loading interest payment data…
          </div>
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--danger)', fontSize: 13 }}>
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No interest payment data found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel2)' }}>
                <th style={thStyle}>Property</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>YTD Interest</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.property}
                  style={{
                    borderBottom: idx < rows.length - 1 ? '1px solid var(--border)' : undefined,
                  }}
                >
                  <td style={tdStyleBold}>{row.property}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmt(row.ytdInterest)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--panel2)' }}>
                <td style={{ ...tdStyleBold, padding: '12px 16px' }}>Total</td>
                <td style={{ ...tdStyleBold, textAlign: 'right', padding: '12px 16px', color: 'var(--accent)' }}>
                  {grandTotal > 0 ? fmt(grandTotal) : <span className="muted">{DASH}</span>}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 16px',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--accent)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  color: 'var(--text)',
};

const tdStyleBold: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 600,
};

export default InterestPaymentsPage;
