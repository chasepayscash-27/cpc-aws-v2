import { CSSProperties, useEffect, useMemo, useState } from "react";
import type { ProjectRow } from "../types/project";
import { useCompletedProjects } from "../contexts/CompletedProjectContext";
import { getPipelineStatusColor, getPipelineStatusLabel } from "../utils/pipelineStatus";
import PropertyMainImage from "../components/PropertyMainImage";
import ProjectDetailsModal from "../components/ProjectDetailsModal";
import { loadCsv } from "../utils/csv";
import { loadCustomProjects } from "../utils/customProjects";

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function CompletedProjectsPage() {
  const { completedRecords, unmarkCompleted, isLoading } = useCompletedProjects();
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const [allProjects, setAllProjects] = useState<ProjectRow[]>([]);

  // Load all project data so we can enrich the completed records with full details.
  useEffect(() => {
    async function loadAll() {
      try {
        const csvRows = await loadCsv<ProjectRow>("/data/projects_v2.csv");
        const customRows = loadCustomProjects();
        setAllProjects([...csvRows, ...customRows]);
      } catch {
        // If CSV fails, custom projects are still available.
        setAllProjects(loadCustomProjects());
      }
    }
    void loadAll();
  }, []);

  // Build a lookup map from project_uuid → full ProjectRow.
  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectRow>();
    for (const p of allProjects) {
      if (p.project_uuid) map.set(p.project_uuid, p);
    }
    return map;
  }, [allProjects]);

  // Merge Amplify completed records with full project data.
  const completed: ProjectRow[] = completedRecords.map((r) => {
    const full = r.propertyId ? projectMap.get(r.propertyId) : undefined;
    return {
      ...(full ?? {}),
      project_uuid: r.propertyId,
      completed_at: r.completedAt ?? undefined,
    };
  });

  function handleUncomplete(project: ProjectRow) {
    if (project.project_uuid) {
      void unmarkCompleted(project.project_uuid);
    }
  }

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  };

  const cardStyle: CSSProperties = {
    border: "1px solid var(--border)",
    borderRadius: 18,
    overflow: "hidden",
    background: "var(--panel)",
    transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
    cursor: "pointer",
    opacity: 0.92,
  };

  return (
    <>
      {selectedProject && (
        <ProjectDetailsModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}

      <div className="pageHeader">
        <h1 className="h1">Completed Projects</h1>
        <p className="muted">
          Projects that have been marked as completed. They no longer appear in the active
          Projects pipeline.
        </p>
      </div>

      <div className="card" style={{ padding: 16, overflow: "hidden" }}>
        {isLoading && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            Loading completed projects…
          </div>
        )}
        {!isLoading && completed.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            No completed projects yet.
          </div>
        )}
        {completed.length > 0 && (
          <>
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              {completed.length} completed project{completed.length !== 1 ? "s" : ""}
            </div>
            <div style={gridStyle}>
              {completed.map((row, i) => {
                const statusColor = getPipelineStatusColor(row.stage);
                const statusLabel = getPipelineStatusLabel(row.stage);

                return (
                  <div
                    key={row.project_uuid ?? i}
                    style={cardStyle}
                    onClick={() => setSelectedProject(row)}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform =
                        "translateY(-2px)";
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        "rgba(34,197,94,0.35)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 8px 24px rgba(34,197,94,0.10)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = "";
                      (e.currentTarget as HTMLDivElement).style.borderColor =
                        "var(--border)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                    }}
                  >
                    {/* Image */}
                    <div
                      style={{
                        position: "relative",
                        height: 160,
                        background: "var(--panel2)",
                      }}
                    >
                      <PropertyMainImage
                        key={row.featured_image_url ?? "completed-placeholder"}
                        imageUrl={row.featured_image_url}
                        alt={row.name ?? "project"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                        placeholder={
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 36,
                              color: "rgba(34,197,94,0.15)",
                            }}
                          >
                            🏠
                          </div>
                        }
                      />

                      {/* Completed badge */}
                      <div
                        style={{
                          position: "absolute",
                          top: 8,
                          left: 8,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 10px",
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 700,
                          background: "rgba(34,197,94,0.88)",
                          color: "#fff",
                          backdropFilter: "blur(4px)",
                          border: "1px solid rgba(255,255,255,0.25)",
                        }}
                      >
                        ✅ Completed
                      </div>

                      {/* Status badge */}
                      {row.stage && (
                        <div
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 600,
                            background: statusColor,
                            color: "#fff",
                            backdropFilter: "blur(4px)",
                            border: "1px solid rgba(255,255,255,0.3)",
                          }}
                        >
                          {statusLabel}
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div style={{ padding: "12px 14px 14px" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          marginBottom: 4,
                          lineHeight: 1.3,
                        }}
                      >
                        {row.name ?? "Unnamed Project"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted)",
                          marginBottom: 8,
                        }}
                      >
                        {row.city && row.state
                          ? `${row.city}, ${row.state}${
                              row.postal_code ? " " + row.postal_code : ""
                            }`
                          : row.full_address ?? ""}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          marginBottom: 10,
                        }}
                      >
                        Completed {formatDate(row.completed_at)}
                      </div>

                      {/* Restore button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUncomplete(row);
                        }}
                        style={{
                          width: "100%",
                          padding: "7px 0",
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "var(--panel2)",
                          color: "var(--muted)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 5,
                          transition: "background 0.15s, color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "rgba(26,122,60,0.1)";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "var(--accent)";
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.borderColor = "var(--accent)";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "var(--panel2)";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "var(--muted)";
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.borderColor = "var(--border)";
                        }}
                        aria-label="Restore project from completed"
                      >
                        ↩️ Restore Project
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
