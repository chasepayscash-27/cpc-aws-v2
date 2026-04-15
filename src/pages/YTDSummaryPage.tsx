import { useEffect, useState } from 'react';
import { loadCsv } from '../utils/csv';
import type { ProjectRow } from '../types/project';
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

const STAGE_COLORS: Record<string, string> = {
  under_construction: 'rgba(251,146,60,0.85)',
  planning_permitting: 'rgba(59,130,246,0.85)',
  completed: 'rgba(34,197,94,0.85)',
  sold: 'rgba(168,85,247,0.85)',
  active_listing: 'rgba(236,72,153,0.85)',
  negotiation: 'rgba(234,179,8,0.85)',
  pending_purchase: 'rgba(20,184,166,0.85)',
};

const STAGE_ORDER = [
  'negotiation',
  'pending_purchase',
  'planning_permitting',
  'under_construction',
  'active_listing',
  'completed',
  'sold',
];

function formatStage(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parsePercent(value: string): number {
  return parseFloat(value.replace('%', '')) || 0;
}

export default function YTDSummaryPage() {
  const [data, setData] = useState<YTDRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
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
        const counts: Record<string, number> = {};
        for (const row of rows) {
          const stage = row.stage?.trim();
          if (stage) {
            counts[stage] = (counts[stage] ?? 0) + 1;
          }
        }
        setStageCounts(counts);
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

  return (
    <div>
      <div className="pageHeader">
        <h1 className="h1">YTD Summary</h1>
        <p className="muted">Year-to-date performance summary of properties flipped.</p>
      </div>

      {/* KPI Summary Cards — 4-column grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', margin: '12px 0 14px' }}>
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
      </section>

      {/* Pipeline by Stage tiles */}
      <section style={{ margin: '0 0 14px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a7a3c', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Pipeline by Stage
        </h2>
        {stagesLoading ? (
          <p className="muted" style={{ fontSize: 13 }}>Loading stage data…</p>
        ) : Object.keys(stageCounts).length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No stage data available.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {Object.entries(stageCounts)
              .sort(([a], [b]) => {
                const ai = STAGE_ORDER.indexOf(a);
                const bi = STAGE_ORDER.indexOf(b);
                if (ai !== -1 && bi !== -1) return ai - bi;
                if (ai !== -1) return -1;
                if (bi !== -1) return 1;
                return a.localeCompare(b);
              })
              .map(([stage, count]) => {
                const color = STAGE_COLORS[stage] ?? '#1a7a3c';
                return (
                  <div
                    key={stage}
                    className="card"
                    style={{ padding: '14px 16px', borderTop: `3px solid ${color}`, minWidth: 0 }}
                  >
                    <div
                      className="cardLabel"
                      style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >
                      {formatStage(stage)}
                    </div>
                    <div className="cardValue" style={{ fontSize: 28, lineHeight: 1.2 }}>{count}</div>
                  </div>
                );
              })}
          </div>
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
