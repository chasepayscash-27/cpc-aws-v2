import { lazy, Suspense, useEffect, useState } from 'react';
import { loadCsv } from '../utils/csv';
import type { ProjectRow } from '../types/project';
import PipelineTracker from '../components/PipelineTracker';
import { isArchivedStage } from '../utils/pipelineStatus';
import '../App.css';

const ProjectDetailsModal = lazy(() => import('../components/ProjectDetailsModal'));

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
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);

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
        // Exclude archived projects so they do not appear in the active pipeline.
        const active = rows.filter(
          (r) => !r.archived_at && !isArchivedStage(r.stage)
        );
        setProjectRows(active);
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
        <p style={{ color: 'var(--danger)' }}>Error: {error}</p>
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
      {selectedProject && (
        <Suspense fallback={null}>
          <ProjectDetailsModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        </Suspense>
      )}
      <div className="pageHeader">
        <h1 className="h1">YTD Summary</h1>
        <p className="muted">Year-to-date performance summary of properties flipped.</p>
      </div>

      {/* Properties Sold topline tile */}
      <section style={{ margin: '12px 0 14px' }}>
        <div className="card" style={{ borderTop: '3px solid var(--accent)', maxWidth: 220 }}>
          <div className="cardLabel">Properties Sold</div>
          <div className="cardValue">{Number(data['Number of Houses Sold']).toLocaleString()}</div>
          <div className="cardSub" style={{ color: 'var(--muted)' }}>Goal: {data['Houses Sold Goal']}</div>
        </div>
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

      {/* Pipeline by Stage — horizontal tracker */}
      <section style={{ margin: '0 0 14px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Pipeline by Stage
        </h2>
        {stagesLoading ? (
          <p className="muted" style={{ fontSize: 13 }}>Loading stage data…</p>
        ) : projectRows.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>No stage data available.</p>
        ) : (
          <PipelineTracker rows={projectRows} onProjectClick={setSelectedProject} />
        )}
      </section>
    </div>
  );
}
