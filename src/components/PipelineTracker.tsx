import type { ProjectRow } from '../types/project';

export const ACTIVE_STAGE_ORDER = [
  'negotiation',
  'pending_purchase',
  'planning_permitting',
  'under_construction',
  'active_listing',
];

const STAGE_COLORS: Record<string, string> = {
  negotiation: 'rgba(234,179,8,0.85)',
  pending_purchase: 'rgba(20,184,166,0.85)',
  planning_permitting: 'rgba(59,130,246,0.85)',
  under_construction: 'rgba(251,146,60,0.85)',
  active_listing: 'rgba(236,72,153,0.85)',
};

function getProjectLabel(p: ProjectRow): string {
  return p.name ?? p.full_address ?? p.address_1 ?? '—';
}
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface PipelineTrackerProps {
  rows: ProjectRow[];
}

export default function PipelineTracker({ rows }: PipelineTrackerProps) {
  // Group active projects by stage
  const grouped: Record<string, ProjectRow[]> = {};
  for (const stage of ACTIVE_STAGE_ORDER) {
    grouped[stage] = [];
  }
  for (const row of rows) {
    const stage = row.stage?.trim().toLowerCase();
    if (stage && ACTIVE_STAGE_ORDER.includes(stage)) {
      grouped[stage].push(row);
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${ACTIVE_STAGE_ORDER.length}, minmax(0, 1fr))`,
        gap: 0,
        border: '1.5px solid #d4e8d8',
        borderRadius: 18,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {ACTIVE_STAGE_ORDER.map((stage, idx) => {
        const color = STAGE_COLORS[stage] ?? '#1a7a3c';
        const projects = grouped[stage];
        const isLast = idx === ACTIVE_STAGE_ORDER.length - 1;
        return (
          <div
            key={stage}
            style={{
              borderRight: isLast ? 'none' : '1.5px solid #d4e8d8',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 220,
            }}
          >
            {/* Stage header */}
            <div
              style={{
                background: color,
                padding: '10px 12px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                }}
              >
                {formatStage(stage)}
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1,
                }}
              >
                {projects.length}
              </span>
            </div>

            {/* Arrow connector (visual pipeline flow cue) */}
            {!isLast && (
              <div
                aria-hidden="true"
                style={{
                  height: 0,
                  width: 0,
                  alignSelf: 'flex-end',
                  borderTop: '10px solid transparent',
                  borderBottom: '10px solid transparent',
                  borderLeft: `10px solid ${color}`,
                  marginTop: -20,
                  zIndex: 1,
                  position: 'relative',
                }}
              />
            )}

            {/* Project list */}
            <div
              style={{
                padding: '10px 12px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {projects.length === 0 ? (
                <p
                  style={{
                    fontSize: 12,
                    color: '#5a7060',
                    fontStyle: 'italic',
                    margin: 0,
                  }}
                >
                  No projects
                </p>
              ) : (
                projects.map((p, i) => {
                  const label = getProjectLabel(p);
                  const sub = [p.city, p.state].filter(Boolean).join(', ');
                  return (
                    <div
                      key={p.project_uuid ?? i}
                      style={{
                        background: '#f0f7f1',
                        border: '1px solid #d4e8d8',
                        borderRadius: 8,
                        padding: '6px 8px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#1a3a22',
                          lineHeight: 1.3,
                        }}
                      >
                        {label}
                      </div>
                      {sub && (
                        <div
                          style={{
                            fontSize: 11,
                            color: '#5a7060',
                            marginTop: 2,
                            lineHeight: 1.2,
                          }}
                        >
                          {sub}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
