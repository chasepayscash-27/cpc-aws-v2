import { useCallback, useMemo, useState } from 'react';
import type { ProjectRow } from '../types/project';
import { isArchivedStage, NEGOTIATION_STAGES, normalizePipelineStatus } from '../utils/pipelineStatus';
import { usePropertyTasks } from '../contexts/PropertyTasksContext';
import { useStageOverrides } from '../contexts/StageOverrideContext';
import { computeMainWorkflowProgressByProperty } from '../utils/workflowProgress';
import ProgressStatusBadge from './ProgressStatusBadge';

export const ACTIVE_STAGE_ORDER = [
  'negotiation',
  'pending_purchase',
  'under_construction',
  'punch_list',
  'active_listing',
  'under_contract',
];

const STAGE_COLORS: Record<string, string> = {
  negotiation: 'rgba(234,179,8,0.85)',
  pending_purchase: 'rgba(20,184,166,0.85)',
  under_contract: 'rgba(59,130,246,0.85)',
  under_construction: 'rgba(251,146,60,0.85)',
  punch_list: 'rgba(245,158,11,0.85)',
  active_listing: 'rgba(236,72,153,0.85)',
};

function getProjectLabel(p: ProjectRow): string {
  return p.name ?? p.full_address ?? p.address_1 ?? '—';
}

function formatStage(stage: string): string {
  return stage
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Maps a raw Flipper Force stage value to the canonical ACTIVE_STAGE_ORDER key
 * used by PipelineTracker, or returns null if the stage should not be displayed
 * (e.g. archived, completed, on-hold).
 */
function toTrackerStage(rawStage?: string | null): string | null {
  if (!rawStage) return null;
  if (isArchivedStage(rawStage)) return null;
  const normalized = normalizePipelineStatus(rawStage);
  if (NEGOTIATION_STAGES.has(normalized)) return 'negotiation';
  if (normalized === 'planning permitting' || normalized === 'planning / permitting' || normalized === 'pending sale') return 'under_contract';
  // Convert space-separated form back to underscore form for lookup
  const underscored = normalized.replace(/\s+/g, '_');
  if (ACTIVE_STAGE_ORDER.includes(underscored)) return underscored;
  return null;
}

const TILE_HOVER_BG = 'var(--panel3)';
const TILE_HOVER_BORDER = 'rgba(26,122,60,0.50)';
const DROP_TARGET_BORDER = 'rgba(59,130,246,0.70)';

interface PipelineTrackerProps {
  rows: ProjectRow[];
  onProjectClick?: (project: ProjectRow) => void;
}

export default function PipelineTracker({ rows, onProjectClick }: PipelineTrackerProps) {
  const { allTasks, isLoading: tasksLoading } = usePropertyTasks();
  const { overrides, setOverride, clearOverride, error: overrideError } = useStageOverrides();
  const progressByProperty = useMemo(
    () => computeMainWorkflowProgressByProperty(allTasks),
    [allTasks],
  );

  // ── Drag-and-drop state ────────────────────────────────────────────────────
  // draggedId: project_uuid of the card being dragged
  const [draggedId, setDraggedId] = useState<string | null>(null);
  // overStage: which stage column the cursor is currently over
  const [overStage, setOverStage] = useState<string | null>(null);
  // Optimistic override map applied immediately on drop; reverted if persistence fails.
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, string>>({});
  // Error banner shown when a save fails.
  const [dragError, setDragError] = useState<string | null>(null);
  // Track which propertyId is being optimistically cleared (reset).
  const [clearingIds, setClearingIds] = useState<Record<string, true>>({});
  // Ref so async drop handlers can read the latest rows without stale closures.



  // Merge persisted overrides with any in-flight optimistic ones so the UI
  // reflects both layers simultaneously.
  const mergedOverrides = useMemo(
    () => ({ ...overrides, ...optimisticOverrides }),
    [overrides, optimisticOverrides],
  );

  // ── Grouping (with overrides applied) ─────────────────────────────────────
  const grouped = useMemo(() => {
    const nextGrouped: Record<string, ProjectRow[]> = {};
    for (const stage of ACTIVE_STAGE_ORDER) {
      nextGrouped[stage] = [];
    }
    for (const row of rows) {
      if (row.archived_at) continue;
      // Prefer merged override (optimistic + persisted) over CSV stage.
      // If this card is being optimistically cleared, fall back to CSV stage.
      const isClearingThisRow = row.project_uuid ? clearingIds[row.project_uuid] : false;
      const overriddenStage =
        !isClearingThisRow && row.project_uuid ? mergedOverrides[row.project_uuid] : undefined;
      const trackerStage =
        overriddenStage && ACTIVE_STAGE_ORDER.includes(overriddenStage)
          ? overriddenStage
          : toTrackerStage(row.stage);
      if (trackerStage) {
        nextGrouped[trackerStage].push(row);
      }
    }
    return nextGrouped;
  }, [rows, mergedOverrides, clearingIds]);

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, projectId: string) => {
      setDraggedId(projectId);
      setDragError(null);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', projectId);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setOverStage(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, stage: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverStage(stage);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Only clear overStage when the cursor truly leaves the column (not just
      // entering a child element).
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setOverStage(null);
      }
    },
    [],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, targetStage: string) => {
      e.preventDefault();
      setOverStage(null);

      const projectId = e.dataTransfer.getData('text/plain') || draggedId;
      if (!projectId) return;

      // Find the row to determine its current (Flipper Force) stage.
      const row = rows.find((r) => r.project_uuid === projectId);
      const currentOverride = mergedOverrides[projectId];
      const currentStage = currentOverride ?? row?.stage;

      // No-op if dropped back onto the same effective stage.
      const currentTrackerStage =
        currentOverride && ACTIVE_STAGE_ORDER.includes(currentOverride)
          ? currentOverride
          : toTrackerStage(currentStage);
      if (currentTrackerStage === targetStage) {
        setDraggedId(null);
        return;
      }

      // 1. Optimistic update — show the change immediately.
      setOptimisticOverrides((prev) => ({ ...prev, [projectId]: targetStage }));
      setDraggedId(null);

      // 2. Persist to backend.
      const error = await setOverride(projectId, targetStage, {
        flipperForceStage: row?.stage,
      });

      if (error) {
        // 3. Rollback on failure.
        setOptimisticOverrides((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
        setDragError(`Failed to save stage change: ${error}`);
      } else {
        // Remove the optimistic entry — the observeQuery subscription will
        // update the persisted overrides map momentarily.
        setOptimisticOverrides((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
      }
    },
    [draggedId, mergedOverrides, rows, setOverride],
  );

  // ── Reset (clear override) handler ────────────────────────────────────────
  const handleReset = useCallback(
    async (e: React.MouseEvent, projectId: string) => {
      e.stopPropagation(); // Don't bubble to the card's onClick (drill-in).
      setDragError(null);
      // Optimistic: hide the override badge immediately.
      setClearingIds((prev) => ({ ...prev, [projectId]: true }));
      const error = await clearOverride(projectId);
      if (error) {
        setClearingIds((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
        setDragError(`Failed to reset stage: ${error}`);
      } else {
        setClearingIds((prev) => {
          const next = { ...prev };
          delete next[projectId];
          return next;
        });
      }
    },
    [clearOverride],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {dragError && (
        <div
          role="alert"
          style={{
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(220,38,38,0.4)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 10,
            fontSize: 13,
            color: 'var(--danger, #dc2626)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>⚠️</span>
          <span style={{ flex: 1 }}>{dragError}</span>
          <button
            aria-label="Dismiss error"
            onClick={() => setDragError(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              color: 'inherit',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      )}
      {overrideError && (
        <div
          role="status"
          style={{
            background: 'rgba(245,158,11,0.14)',
            border: '1px solid rgba(245,158,11,0.45)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 10,
            fontSize: 13,
            color: 'var(--text)',
          }}
        >
          Drag-and-drop unavailable: {overrideError}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${ACTIVE_STAGE_ORDER.length}, minmax(0, 1fr))`,
          gap: 0,
          border: '1.5px solid var(--border)',
          borderRadius: 18,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        {ACTIVE_STAGE_ORDER.map((stage, idx) => {
          const color = STAGE_COLORS[stage] ?? 'var(--accent)';
          const projects = grouped[stage];
          const isLast = idx === ACTIVE_STAGE_ORDER.length - 1;
          const isDropTarget = overStage === stage && draggedId !== null;
          return (
            <div
              key={stage}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => { void handleDrop(e, stage); }}
              style={{
                borderRight: isLast ? 'none' : '1.5px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 220,
                outline: isDropTarget ? `2px dashed ${DROP_TARGET_BORDER}` : undefined,
                outlineOffset: -3,
                transition: 'outline 0.1s',
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

              {/* Project list — drop target area */}
              <div
                style={{
                  padding: '10px 12px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {isDropTarget && projects.length === 0 && (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--muted)',
                      fontStyle: 'italic',
                      margin: 0,
                      borderRadius: 6,
                      border: `1.5px dashed ${DROP_TARGET_BORDER}`,
                      padding: '8px 6px',
                      textAlign: 'center',
                    }}
                  >
                    Drop here
                  </p>
                )}
                {!isDropTarget && projects.length === 0 && (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--muted)',
                      fontStyle: 'italic',
                      margin: 0,
                    }}
                  >
                    No projects
                  </p>
                )}
                {projects.map((p, i) => {
                  const label = getProjectLabel(p);
                  const sub = [p.city, p.state].filter(Boolean).join(', ');
                  const progress = p.project_uuid ? progressByProperty[p.project_uuid] : undefined;
                  const percent = progress?.percent ?? 0;
                  const isDragging = draggedId === p.project_uuid;
                  const hasOverride =
                    p.project_uuid !== undefined &&
                    overrides[p.project_uuid] !== undefined &&
                    !clearingIds[p.project_uuid];
                  return (
                    <div
                      key={p.project_uuid ?? i}
                      draggable={!!p.project_uuid && !overrideError}
                      onDragStart={
                        p.project_uuid
                          ? (e) => handleDragStart(e, p.project_uuid!)
                          : undefined
                      }
                      onDragEnd={handleDragEnd}
                      role={onProjectClick ? 'button' : undefined}
                      tabIndex={onProjectClick ? 0 : undefined}
                      onClick={onProjectClick ? () => onProjectClick(p) : undefined}
                      onKeyDown={
                        onProjectClick
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onProjectClick(p);
                              }
                            }
                          : undefined
                      }
                      aria-label={
                        p.project_uuid
                          ? `${label} — drag to move to a different stage`
                          : label
                      }
                      style={{
                        background: 'var(--panel2)',
                        border: `1px solid ${isDragging ? DROP_TARGET_BORDER : 'var(--border)'}`,
                        borderRadius: 8,
                        padding: '6px 8px',
                        cursor:
                          p.project_uuid && !overrideError
                            ? 'grab'
                            : onProjectClick
                              ? 'pointer'
                              : 'default',
                        opacity: isDragging ? 0.45 : 1,
                        transition: 'background 0.15s, border-color 0.15s, opacity 0.15s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={
                        onProjectClick
                          ? (e) => {
                              (e.currentTarget as HTMLDivElement).style.background = TILE_HOVER_BG;
                              (e.currentTarget as HTMLDivElement).style.borderColor =
                                TILE_HOVER_BORDER;
                            }
                          : undefined
                      }
                      onMouseLeave={
                        onProjectClick
                          ? (e) => {
                              (e.currentTarget as HTMLDivElement).style.background = 'var(--panel2)';
                              (e.currentTarget as HTMLDivElement).style.borderColor =
                                'var(--border)';
                            }
                          : undefined
                      }
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span aria-hidden="true" style={{ fontSize: 13, flexShrink: 0 }}>🏠</span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--text)',
                            lineHeight: 1.3,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {label}
                        </span>
                        <ProgressStatusBadge
                          percent={percent}
                          propertyName={label}
                          loading={tasksLoading && !progress}
                        />
                      </div>
                      {sub && (
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--muted)',
                            marginTop: 2,
                            lineHeight: 1.2,
                          }}
                        >
                          {sub}
                        </div>
                      )}
                      {hasOverride && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 2,
                          }}
                        >
                          <span
                            title="Stage overridden locally — not from Flipper Force"
                            style={{
                              fontSize: 10,
                              color: 'rgba(59,130,246,0.8)',
                              lineHeight: 1.2,
                              fontStyle: 'italic',
                              flex: 1,
                            }}
                          >
                            ✎ stage overridden
                          </span>
                          {p.project_uuid && (
                            <button
                              aria-label={`Reset ${label} to original Flipper Force stage`}
                              title="Reset to original stage"
                              onClick={(e) => { void handleReset(e, p.project_uuid!); }}
                              style={{
                                background: 'none',
                                border: '1px solid rgba(59,130,246,0.4)',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: 9,
                                color: 'rgba(59,130,246,0.8)',
                                padding: '1px 4px',
                                lineHeight: 1.4,
                                flexShrink: 0,
                              }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
