import { useEffect, useState, useMemo } from 'react';
import { loadCsv } from '../utils/csv';
import type { PipelineRow } from '../types/pipeline';

const STAGE_COLORS: Record<string, string> = {
  'Closed': '#1a7a3c',
  'Active Listing': '#d97706',
  'Under Construction': '#2563eb',
  'Planning / Permitting': '#7c3aed',
};

function formatCurrency(value?: string): string {
  const num = parseFloat(value ?? '');
  if (isNaN(num)) return '—';
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function CurrentPipelinePage() {
  const [rows, setRows] = useState<PipelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCsv<PipelineRow>('/data/ytd_csv_looker.csv')
      .then((data) => {
        setRows(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load pipeline data');
        setLoading(false);
      });
  }, []);

  const stages = useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.stage ?? '').filter(Boolean))];
    return unique.sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchesStage = stageFilter === 'all' || r.stage === stageFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        (r.property_address ?? '').toLowerCase().includes(term) ||
        (r.city ?? '').toLowerCase().includes(term) ||
        (r.stage ?? '').toLowerCase().includes(term);
      return matchesStage && matchesSearch;
    });
  }, [rows, stageFilter, searchTerm]);

  const totalInvestment = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + (parseFloat(r.total_investment ?? '0') || 0), 0);
  }, [filteredRows]);

  const totalExpectedProfit = useMemo(() => {
    return filteredRows.reduce((sum, r) => sum + (parseFloat(r.expected_profit ?? '0') || 0), 0);
  }, [filteredRows]);

  const activeCount = useMemo(() => {
    return filteredRows.filter((r) => r.stage !== 'Closed').length;
  }, [filteredRows]);

  if (loading) {
    return (
      <div className="pageHeader">
        <p className="muted">Loading pipeline data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pageHeader">
        <p style={{ color: '#dc2626' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="pageHeader">
        <h1 className="h1">Current Pipeline</h1>
        <p className="muted">Year-to-date pipeline data for all active and closed projects.</p>
      </div>

      {/* Summary cards */}
      <section className="grid">
        <div className="card">
          <div className="cardLabel">Active Projects</div>
          <div className="cardValue">{activeCount}</div>
        </div>
        <div className="card">
          <div className="cardLabel">Total Investment</div>
          <div className="cardValue">{formatCurrency(String(totalInvestment))}</div>
        </div>
        <div className="card">
          <div className="cardLabel">Expected Profit</div>
          <div className="cardValue" style={{ color: totalExpectedProfit >= 0 ? '#1a7a3c' : '#dc2626' }}>
            {formatCurrency(String(totalExpectedProfit))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="card">
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
              Stage
            </label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: '#f0f7f1',
                color: 'var(--text)',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Stages</option>
              {stages.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Address, city, or stage…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: '#f0f7f1',
                color: 'var(--text)',
              }}
            />
          </div>
        </div>
      </section>

      {/* Pipeline table */}
      <section className="card" style={{ marginTop: '16px' }}>
        <div className="cardLabel" style={{ marginBottom: '12px' }}>
          Properties ({filteredRows.length})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Property', 'City', 'Stage', 'Strategy', 'Purchase Price', 'ARV', 'Investment', 'Exp. Profit', 'Days', 'Acquired'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: h === 'Purchase Price' || h === 'ARV' || h === 'Investment' || h === 'Exp. Profit' || h === 'Days' ? 'right' : 'left',
                      padding: '8px',
                      color: 'var(--accent)',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const stageColor = STAGE_COLORS[row.stage ?? ''] ?? 'var(--muted)';
                const profit = parseFloat(row.expected_profit ?? '0') || 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #eaf4ec' }}>
                    <td style={{ padding: '8px', fontWeight: '500' }}>{row.property_address ?? '—'}</td>
                    <td style={{ padding: '8px', color: 'var(--muted)', fontSize: '13px' }}>
                      {row.city ?? '—'}{row.state ? `, ${row.state}` : ''}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <span
                        style={{
                          background: `${stageColor}20`,
                          color: stageColor,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.stage ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '8px', fontSize: '13px' }}>{row.strategy ?? '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(row.purchase_price)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(row.arv)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(row.total_investment)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: profit >= 0 ? '#1a7a3c' : '#dc2626', fontWeight: '600' }}>
                      {formatCurrency(row.expected_profit)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{row.days_in_pipeline ?? '—'}</td>
                    <td style={{ padding: '8px', color: 'var(--muted)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {row.date_acquired ?? '—'}
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    No pipeline records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
