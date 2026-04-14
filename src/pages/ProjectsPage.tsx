import { useEffect, useMemo, useState } from "react";
import { loadCsv } from "../utils/csv";
import type { ProjectRow } from "../types/project";
import ProjectsTable from "../components/ProjectsTable";
import ProjectsGallery from "../components/ProjectsGallery";

type ViewMode = "table" | "gallery";

type SortField =
  | "name_asc"
  | "name_desc"
  | "city"
  | "stage"
  | "year_built_newest"
  | "year_built_oldest"
  | "sqft_largest"
  | "sqft_smallest";

interface Props {
  onViewFullPnL?: (propertyName: string) => void;
}

function formatLabel(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProjectsPage({ onViewFullPnL }: Props) {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name_asc");

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

  const stages = useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.stage ?? "").filter(Boolean))];
    return unique.sort();
  }, [rows]);

  const strategies = useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.investment_strategy ?? "").filter(Boolean))];
    return unique.sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    let result = rows.filter((r) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        (r.name ?? "").toLowerCase().includes(term) ||
        (r.city ?? "").toLowerCase().includes(term) ||
        (r.full_address ?? "").toLowerCase().includes(term) ||
        (r.state ?? "").toLowerCase().includes(term);
      const matchesStage = stageFilter === "all" || r.stage === stageFilter;
      const matchesStrategy = strategyFilter === "all" || r.investment_strategy === strategyFilter;
      return matchesSearch && matchesStage && matchesStrategy;
    });

    result = [...result].sort((a, b) => {
      switch (sortField) {
        case "name_asc":
          return (a.name ?? "").localeCompare(b.name ?? "");
        case "name_desc":
          return (b.name ?? "").localeCompare(a.name ?? "");
        case "city":
          return (a.city ?? "").localeCompare(b.city ?? "");
        case "stage":
          return (a.stage ?? "").localeCompare(b.stage ?? "");
        case "year_built_newest":
          return Number(b.year_built ?? 0) - Number(a.year_built ?? 0);
        case "year_built_oldest":
          return Number(a.year_built ?? 0) - Number(b.year_built ?? 0);
        case "sqft_largest":
          return Number(b.square_feet ?? 0) - Number(a.square_feet ?? 0);
        case "sqft_smallest":
          return Number(a.square_feet ?? 0) - Number(b.square_feet ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [rows, search, stageFilter, strategyFilter, sortField]);

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

  const inputStyle: React.CSSProperties = {
    padding: "7px 12px",
    borderRadius: 12,
    border: "1px solid rgba(26,122,60,0.15)",
    fontSize: 13,
    color: "#1a2e1a",
    background: "#f0f7f1",
    outline: "none",
    minWidth: 0,
  };

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Projects</h1>
        <p className="muted">All active and completed projects from Flipper Force.</p>
      </div>

      {/* View toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
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
            {filteredRows.length !== rows.length
              ? `${filteredRows.length} of ${rows.length} projects`
              : `${rows.length} projects`}
          </span>
        )}
      </div>

      {/* Filter / Sort toolbar */}
      {!loading && !error && rows.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 180px" }}
          />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{ ...inputStyle, flex: "0 1 160px" }}
          >
            <option value="all">All Stages</option>
            {stages.map((s) => (
              <option key={s} value={s}>
                {formatLabel(s)}
              </option>
            ))}
          </select>
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            style={{ ...inputStyle, flex: "0 1 180px" }}
          >
            <option value="all">All Strategies</option>
            {strategies.map((s) => (
              <option key={s} value={s}>
                {formatLabel(s)}
              </option>
            ))}
          </select>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            style={{ ...inputStyle, flex: "0 1 200px" }}
          >
            <option value="name_asc">Name (A–Z)</option>
            <option value="name_desc">Name (Z–A)</option>
            <option value="city">City</option>
            <option value="stage">Stage</option>
            <option value="year_built_newest">Year Built (Newest)</option>
            <option value="year_built_oldest">Year Built (Oldest)</option>
            <option value="sqft_largest">Square Feet (Largest)</option>
            <option value="sqft_smallest">Square Feet (Smallest)</option>
          </select>
        </div>
      )}

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
        {!loading && !error && rows.length > 0 && filteredRows.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "#5a7060",
            }}
          >
            No projects match the current filters.
          </div>
        )}
        {!loading && !error && filteredRows.length > 0 && viewMode === "table" && (
          <ProjectsTable rows={filteredRows} onViewFullPnL={onViewFullPnL} />
        )}
        {!loading && !error && filteredRows.length > 0 && viewMode === "gallery" && (
          <ProjectsGallery rows={filteredRows} onViewFullPnL={onViewFullPnL} />
        )}
      </div>
    </>
  );
}
