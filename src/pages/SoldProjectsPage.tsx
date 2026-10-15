import { useEffect, useState, type CSSProperties } from 'react';
import { NavLink } from 'react-router-dom';
import { loadCsv } from '../utils/csv';
import { getSoldProfit, isRental, parseSoldNumber, summarizeSoldProjects, type SoldProjectRow, type SoldYear } from '../utils/soldProjects';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const money = (value: number | null) => value === null ? '—' : currency.format(value);
const sourceMoney = (value?: string) => {
  const amount = parseSoldNumber(value);
  return amount === null ? value?.trim() || '—' : money(amount);
};
const cellStyle: CSSProperties = { padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' };

export function CompletedProjectsLinks() {
  return (
    <nav aria-label="Completed project dashboards" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
      {[
        ['/completed-projects', 'Completed Projects'],
        ['/completed-projects/2024-sold', '2024 Sold'],
        ['/completed-projects/2025-sold', '2025 Sold'],
      ].map(([path, label]) => (
        <NavLink key={path} to={path} end className={({ isActive }) => isActive ? 'btnPrimary' : 'btn'} aria-label={label}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function SoldProjectsPage({ year }: { year: SoldYear }) {
  const [data, setData] = useState<{ year: SoldYear; rows: SoldProjectRow[] } | null>(null);
  const [error, setError] = useState<SoldYear | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCsv<SoldProjectRow>(`/data/cpc_sold_${year}.csv`)
      .then(rows => {
        if (!cancelled) {
          setError(null);
          setData({ year, rows: rows.filter(row => row['PROPERTY ADDRESS']?.trim()) });
        }
      })
      .catch(() => {
        if (!cancelled) setError(year);
      });
    return () => { cancelled = true; };
  }, [year]);

  const rows = data?.year === year ? data.rows : [];
  const summary = summarizeSoldProjects(rows);
  const failed = error === year;
  const loading = data?.year !== year && !failed;
  const metrics = [
    { label: 'Sold projects', value: String(summary.soldCount), detail: 'Excludes rental entries' },
    { label: 'Total sales', value: money(summary.sales), detail: `${summary.salesCount} reported amounts` },
    { label: 'Reported profit', value: money(summary.profit), detail: `${summary.profitCount} reported amounts` },
    { label: 'Average days on market', value: summary.averageDom === null ? '—' : summary.averageDom.toFixed(1), detail: `${summary.domCount} reported values` },
  ];

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">{year} Sold</h1>
        <p className="muted">Historical sales from the {year} completed-projects file.</p>
      </div>
      <CompletedProjectsLinks />
      {loading ? <p role="status">Loading {year} sold projects…</p> : failed ? (
        <p role="alert">Unable to load {year} sold projects. Please reload to try again.</p>
      ) : rows.length === 0 ? <p className="muted">No sold projects found for {year}.</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            {metrics.map(metric => (
              <section className="card" style={{ padding: 20 }} key={metric.label}>
                <h2 style={{ fontSize: 14, margin: '0 0 12px' }}>{metric.label}</h2>
                <div style={{ fontSize: 26, fontWeight: 700 }}>{metric.value}</div>
                <p className="muted" style={{ fontSize: 12 }}>{metric.detail}</p>
              </section>
            ))}
          </div>
          <p className="muted">
            Grouped by source file, not closing date. Rental entries are shown below but excluded from summary metrics.
            Missing or invalid amounts are excluded from totals. Profit uses PROFIT when provided, otherwise GP; source values are not recalculated.
          </p>
          <section className="card" aria-label={`${year} sales records`} style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <caption style={{ padding: 16, textAlign: 'left' }}>{rows.length} source records</caption>
              <thead>
                <tr>
                  {['Property', 'Type', 'Purchased', 'Closed', 'Sale price', 'Purchase price', 'Rehab', 'Reported profit', 'Days on market', 'Agent'].map(label => (
                    <th scope="col" key={label} style={cellStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row['PROPERTY ADDRESS']}-${index}`}>
                    <th scope="row" style={cellStyle}>{row['PROPERTY ADDRESS']}</th>
                    <td style={cellStyle}>{isRental(row) ? 'Rental' : 'Sold'}</td>
                    <td style={cellStyle}>{row['PURCHASE DATE'] || '—'}</td>
                    <td style={cellStyle}>{row.CLOSED || '—'}</td>
                    <td style={cellStyle}>{sourceMoney(row['SOLD $'])}</td>
                    <td style={cellStyle}>{sourceMoney(row['PURCHASE $'])}</td>
                    <td style={cellStyle}>{sourceMoney(row['REHAB $'])}</td>
                    <td style={cellStyle}>{getSoldProfit(row) === null ? row.PROFIT || row.GP || '—' : money(getSoldProfit(row))}</td>
                    <td style={cellStyle}>{row.DOM || '—'}</td>
                    <td style={cellStyle}>{row.AGENT || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}
