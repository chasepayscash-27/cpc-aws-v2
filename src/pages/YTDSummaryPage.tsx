import { useEffect, useState } from 'react';
import { loadCsv } from '../utils/csv';
import type { ProjectRow } from '../types/project';
import PipelineTracker, { ACTIVE_STAGE_ORDER } from '../components/PipelineTracker';
import '../App.css';

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

export default function YTDSummaryPage() {
  const [data, setData] = useState<YTDRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectRows, setProjectRows] = useState<ProjectRow[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);

  useEffect(() => {
    loadCsv<YTDRow>('/data/ytd_csv_looker.csv')
      .then((rows) => {
        if (rows.length > 0) setData(rows[0]);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load YTD data');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadCsv<ProjectRow>('/data/projects_v2.csv')
      .then((rows) => {
        setProjectRows(rows);
        setStagesLoading(false);
      })
      .catch(() => {
        setStagesLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="pageHeader">
        <p className="muted">Loading YTD summary…</p>
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

  if (!data) {
    return (
      <div className="pageHeader">
        <p className="muted">No data available.</p>
      </div>
    );
  }

  const progressMetrics = [
    {
      label: 'Houses Sold',
      pct: parsePercent(data['Houses Sold % Obtained']),
      display: data['Houses Sold % Obtained'],
    },
    {
      label: 'YTD Sold',
      pct: parsePercent(data['YTD Sold % Obtained']),
      display: data['YTD Sold % Obtained'],
    },
    {
      label: 'YTD Profit',
      pct: parsePercent(data['YTD Profit % Obtained']),
      display: data['YTD Profit % Obtained'],
    },
  ];

  const totalPipelineCount = projectRows.filter(
    (r: ProjectRow) => r.stage && ACTIVE_STAGE_ORDER.includes(r.stage.trim().toLowerCase())
  ).length;

  return (
    <div>
      <div className="pageHeader">
        <h1 className="h1">YTD Summary</h1>
        <p className="muted">Year-to-date performance summary of properties flipped.</p>
      </div>

      {/* KPI Summary Cards — 5-column grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '12px', margin: '12px 0 14px' }}>
        <div className="card">
          <div className="cardLabel">Houses Sold</div>
          <div className="cardValue">{data['Number of Houses Sold']}</div>
          <div className="cardSub" style={{ color: 'var(--muted)' }}>Goal: {data['Houses Sold Goal']}</div>
        </div>
        <div className="card">
          <div className="cardLabel">YTD Sold</div>
          <div className="cardValue">{data['YTD Sold']}</div>
          <div className="cardSub" style={{ color: 'var(--muted)' }}>Goal: {data['YTD Sold Goal']}</div>
        </div>
        <div className="card">
          <div className="cardLabel">YTD Profit</div>
          <div className="cardValue">{data['YTD Profit']}</div>
          <div className="cardSub" style={{ color: 'var(--muted)' }}>Goal: {data['YTD Profit Goal']}</div>
        </div>
        <div className="card">
          <div className="cardLabel">Average Profit</div>
          <div className="cardValue">{data['Average Profit']}</div>
          <div className="cardSub" style={{ color: 'var(--muted)' }}>Goal: {data['Average Profit Goal']}</div>
        </div>
        <div className="card" style={{ borderTop: '3px solid #1a7a3c' }}>
          <div className="cardLabel">Total in Pipeline</div>
          <div className="cardValue">{stagesLoading ? '—' : totalPipelineCount}</div>
          <div className="cardSub" style={{ color: 'var(--muted)' }}>Active projects</div>
        </div>
      </section>

      {/* Pipeline by Stage — horizontal tracker */}
      <section style={{ margin: '0 0 14px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a7a3c', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Pipeline by Stage
        </h2>
        {stagesLoading ? (
          <p className="muted" style={{ fontSize: 13 }}>Loading stage data…</p>
        ) : projectRows.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No stage data available.</p>
        ) : (
          <PipelineTracker rows={projectRows} />
        )}
      </section>

      {/* Goal Progress Cards */}
      <section className="grid">
        {progressMetrics.map((metric) => (
          <div className="card" key={metric.label}>
            <div className="cardLabel">% of Goal — {metric.label}</div>
            <div className="cardValue">{metric.display}</div>
            <div style={{ marginTop: '12px', background: 'var(--border)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(metric.pct, 100)}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  borderRadius: '8px',
                  transition: 'width 0.6s ease',
                }}
              />
            </div>
            <div className="cardSub" style={{ marginTop: '6px', color: 'var(--muted)' }}>
              of annual goal reached
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
