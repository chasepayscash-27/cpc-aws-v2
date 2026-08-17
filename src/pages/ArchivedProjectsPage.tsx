import { CSSProperties, useEffect, useState } from "react";
import type { ProjectRow } from "../types/project";
import {
  ARCHIVE_CHANGE_EVENT,
  ARCHIVED_PROJECTS_STORAGE_KEY,
  loadArchivedProjects,
  saveArchivedProjects,
} from "../utils/archivedProjects";
import { getPipelineStatusColor, getPipelineStatusLabel } from "../utils/pipelineStatus";
import PropertyMainImage from "../components/PropertyMainImage";
import ProjectDetailsModal from "../components/ProjectDetailsModal";
import ReturnToPipelineModal from "../components/ReturnToPipelineModal";
import { useStageOverrides } from "../contexts/StageOverrideContext";

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

export default function ArchivedProjectsPage() {
  const [archived, setArchived] = useState<ProjectRow[]>(() =>
    loadArchivedProjects()
  );
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const [returnProject, setReturnProject] = useState<ProjectRow | null>(null);
  const { setOverride } = useStageOverrides();

  // Keep the archived list in sync when projects are archived/unarchived from
  // other pages in the same tab (ARCHIVE_CHANGE_EVENT) or from another tab
  // (native storage event).
  useEffect(() => {
    function refresh() {
      setArchived(loadArchivedProjects());
    }
    window.addEventListener(ARCHIVE_CHANGE_EVENT, refresh);
    function handleStorageChange(e: StorageEvent) {
      if (e.key === ARCHIVED_PROJECTS_STORAGE_KEY) refresh();
    }
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener(ARCHIVE_CHANGE_EVENT, refresh);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  function handleUnarchive(project: ProjectRow) {
    setArchived((prev) => {
      const next = prev.filter((r) => r.project_uuid !== project.project_uuid);
      saveArchivedProjects(next);
      return next;
    });
  }

  async function handleReturnToPipeline(project: ProjectRow, stage: string) {
    // Persist the chosen pipeline stage as a stage override so it appears
    // in the correct column in Home / Projects dashboards immediately.
    if (project.project_uuid) {
      await setOverride(project.project_uuid, stage, {
        flipperForceStage: project.stage,
        updatedBy: "archived-page",
      });
    }
    handleUnarchive(project);
    setReturnProject(null);
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

      {returnProject && (
        <ReturnToPipelineModal
          project={returnProject}
          onConfirm={(stage) => handleReturnToPipeline(returnProject, stage)}
          onCancel={() => setReturnProject(null)}
        />
      )}

      <div className="pageHeader">
        <h1 className="h1">Archived Projects</h1>
        <p className="muted">
          Projects that have been archived. They no longer appear in the active Projects
          pipeline.
        </p>
      </div>

      <div className="card" style={{ padding: 16, overflow: "hidden" }}>
        {archived.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            No archived projects yet.
          </div>
        )}
        {archived.length > 0 && (
          <>
            <div
              style={{
                marginBottom: 12,
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              {archived.length} archived project{archived.length !== 1 ? "s" : ""}
            </div>
            <div style={gridStyle}>
              {archived.map((row, i) => {
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
                        "rgba(239,68,68,0.35)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow =
                        "0 8px 24px rgba(239,68,68,0.10)";
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
                        key={row.featured_image_url ?? "archived-placeholder"}
                        imageUrl={row.featured_image_url}
                        alt={row.name ?? "project"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                          filter: "grayscale(30%)",
                        }}
                        placeholder={
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 36,
                              color: "rgba(26,122,60,0.15)",
                            }}
                          >
                            🏠
                          </div>
                        }
                      />

                      {/* Archived badge */}
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
                          background: "rgba(239,68,68,0.88)",
                          color: "#fff",
                          backdropFilter: "blur(4px)",
                          border: "1px solid rgba(255,255,255,0.25)",
                        }}
                      >
                        🗃️ Archived
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
                        Archived {formatDate(row.archived_at)}
                      </div>

                      {/* Return To Pipeline button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReturnProject(row);
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
                          transition: "background 0.15s, color 0.15s, border-color 0.15s",
                          marginBottom: 6,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(59,130,246,0.1)";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "rgb(59,130,246)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor =
                            "rgb(59,130,246)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background =
                            "var(--panel2)";
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "var(--muted)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor =
                            "var(--border)";
                        }}
                        aria-label="Return project to pipeline"
                      >
                        🔄 Return To Pipeline
                      </button>

                      {/* Restore button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnarchive(row);
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
                        aria-label="Restore project from archive"
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
