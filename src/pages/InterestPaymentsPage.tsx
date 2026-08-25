import React from 'react';
import '../App.css';

interface InterestRow {
  property: string;
  ytdInterest: string | null;
  investorBorrowedFrom: string | null;
  interestRate: string | null;
}

// Placeholder data — replace with live CSV / API source once available.
const PLACEHOLDER_ROWS: InterestRow[] = [
  {
    property: 'Property 1',
    ytdInterest: null,
    investorBorrowedFrom: null,
    interestRate: null,
  },
  {
    property: 'Property 2',
    ytdInterest: null,
    investorBorrowedFrom: null,
    interestRate: null,
  },
  {
    property: 'Property 3',
    ytdInterest: null,
    investorBorrowedFrom: null,
    interestRate: null,
  },
];

const DASH = '—';

const InterestPaymentsPage: React.FC = () => {
  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Interest Payments</h1>
        <p className="muted">
          Year-to-date interest payment tracking by property.
          Data will be linked once available.
        </p>
      </div>

      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--panel2)' }}>
              <th style={thStyle}>Property</th>
              <th style={thStyle}>YTD Interest</th>
              <th style={thStyle}>Investor Borrowed From</th>
              <th style={thStyle}>Interest Rate</th>
            </tr>
          </thead>
          <tbody>
            {PLACEHOLDER_ROWS.map((row, idx) => (
              <tr
                key={row.property}
                style={{
                  borderBottom: idx < PLACEHOLDER_ROWS.length - 1 ? '1px solid var(--border)' : undefined,
                }}
              >
                <td style={tdStyleBold}>{row.property}</td>
                <td style={tdStyle}>{row.ytdInterest ?? <span className="muted">{DASH}</span>}</td>
                <td style={tdStyle}>{row.investorBorrowedFrom ?? <span className="muted">{DASH}</span>}</td>
                <td style={tdStyle}>{row.interestRate ?? <span className="muted">{DASH}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
        ℹ️ This page is a template. Connect a data source to populate YTD Interest, Investor
        Borrowed From, and Interest Rate values per property.
      </p>
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
