import { useEffect, useState } from "react";
import { loadCsv } from "../utils/csv";
import type { ProjectRow } from "../types/project";
import ProjectsTable from "../components/ProjectsTable";
import ProjectsGallery from "../components/ProjectsGallery";

type ViewMode = "table" | "gallery";

export default function ProjectsPage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await loadCsv<ProjectRow>("/data/projects_v2.csv");
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const activeTabStyle = {
    background: "rgba(26,122,60,0.15)",
    borderColor: "rgba(26,122,60,0.50)",
    color: "#1a7a3c",
  };

  const inactiveTabStyle = {
    background: "transparent",
    borderColor: "rgba(26,122,60,0.15)",
    color: "#5a7060",
  };

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Projects</h1>
        <p className="muted">All active and completed projects from Flipper Force.</p>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          style={{
            padding: "8px 18px",
            borderRadius: 12,
            border: "1px solid",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            transition: "background 0.15s, border-color 0.15s",
            ...(viewMode === "gallery" ? activeTabStyle : inactiveTabStyle),
          }}
          onClick={() => setViewMode("gallery")}
        >
          ⊞ Gallery
        </button>
        <button
          style={{
            padding: "8px 18px",
            borderRadius: 12,
            border: "1px solid",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            transition: "background 0.15s, border-color 0.15s",
            ...(viewMode === "table" ? activeTabStyle : inactiveTabStyle),
          }}
          onClick={() => setViewMode("table")}
        >
          ☰ Table
        </button>

        {!loading && !error && (
          <span
            style={{
              marginLeft: "auto",
              alignSelf: "center",
              fontSize: 12,
              color: "#5a7060",
            }}
          >
            {rows.length} projects
          </span>
        )}
      </div>

      {/* Content */}
      <div className="card" style={{ padding: viewMode === "gallery" ? 16 : 0, overflow: "hidden" }}>
        {loading && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#5a7060",
            }}
          >
            Loading projects…
          </div>
        )}
        {error && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "rgba(239,68,68,0.85)",
            }}
          >
            Error: {error}
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#5a7060",
            }}
          >
            No projects found.
          </div>
        )}
        {!loading && !error && rows.length > 0 && viewMode === "table" && (
          <ProjectsTable rows={rows} />
        )}
        {!loading && !error && rows.length > 0 && viewMode === "gallery" && (
          <ProjectsGallery rows={rows} />
        )}
      </div>
    </>
  );
}
