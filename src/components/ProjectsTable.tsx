import { useEffect, useMemo, useState } from "react";
import { loadCsv } from "../utils/csv";
import type { ProjectRow } from "../types/project";

type SortField = keyof ProjectRow;
type SortDir = "asc" | "desc";

const STAGE_LABELS: Record<string, string> = {
  under_construction: "Under Construction",
  planning_permitting: "Planning / Permitting",
  completed: "Completed",
  listed: "Listed",
  sold: "Sold",
};

const STAGE_COLORS: Record<string, string> = {
  under_construction: "#f59e0b",
  planning_permitting: "#3b82f6",
  completed: "#10b981",
  listed: "#8b5cf6",
  sold: "#6b7280",
};

export default function ProjectsTable() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [stageFilter, setStageFilter] = useState("all");

  useEffect(() => {
    loadCsv<ProjectRow>("/data/projects_v2.csv")
      .then(setRows)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load projects")
      )
      .finally(() => setLoading(false));
  }, []);

  const stages = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => r.stage && seen.add(r.stage));
    return Array.from(seen).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (stageFilter !== "all") {
      result = result.filter((r) => r.stage === stageFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.full_address?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      const av = (a[sortField] ?? "").toString().toLowerCase();
      const bv = (b[sortField] ?? "").toString().toLowerCase();
      const cmp = av.localeCompare(bv, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [rows, search, stageFilter, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  if (loading)
    return (
      <div style={{ padding: 24, color: "var(--muted)" }}>
        Loading projects…
      </div>
    );
  if (error)
    return (
      <div style={{ padding: 24, color: "#ef4444" }}>Error: {error}</div>
    );

  const thStyle: React.CSSProperties = {
    padding: "10px 12px",
    textAlign: "left",
    fontWeight: 600,
    color: "var(--muted)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid var(--border)",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const columns: { label: string; field: SortField | null }[] = [
    { label: "Image", field: null },
    { label: "Project", field: "name" },
    { label: "Address", field: "full_address" },
    { label: "Stage", field: "stage" },
    { label: "Strategy", field: "investment_strategy" },
    { label: "Sq Ft", field: "square_feet" },
    { label: "Beds", field: "beds" },
    { label: "Baths", field: "baths" },
  ];

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search by name or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            padding: "8px 12px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--text)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "rgba(255,255,255,0.07)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--text)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          <option value="all">All Stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {filtered.length} of {rows.length} projects
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 14,
          border: "1px solid var(--border)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.06)" }}>
              {columns.map(({ label, field }) => (
                <th
                  key={label}
                  onClick={field ? () => handleSort(field) : undefined}
                  style={{
                    ...thStyle,
                    cursor: field ? "pointer" : "default",
                  }}
                >
                  {label}
                  {field && sortField === field
                    ? sortDir === "asc"
                      ? " ↑"
                      : " ↓"
                    : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={row.project_uuid ?? i}
                style={{
                  borderBottom: "1px solid var(--border)",
                  background:
                    i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                }}
              >
                {/* Featured Image */}
                <td style={{ padding: "8px 12px", width: 56 }}>
                  {row.featured_image_url ? (
                    <img
                      src={row.featured_image_url}
                      alt={row.name ?? "Project"}
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: "cover",
                        borderRadius: 8,
                        display: "block",
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.06)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--muted)",
                        fontSize: 20,
                      }}
                    >
                      🏠
                    </div>
                  )}
                </td>

                {/* Project Name */}
                <td
                  style={{
                    padding: "8px 12px",
                    fontWeight: 600,
                    maxWidth: 200,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.name ?? "—"}
                </td>

                {/* Address */}
                <td
                  style={{
                    padding: "8px 12px",
                    color: "var(--muted)",
                    maxWidth: 240,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.full_address ?? "—"}
                </td>

                {/* Stage badge */}
                <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                  {row.stage ? (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: `${STAGE_COLORS[row.stage] ?? "#6b7280"}22`,
                        color: STAGE_COLORS[row.stage] ?? "#6b7280",
                        border: `1px solid ${STAGE_COLORS[row.stage] ?? "#6b7280"}55`,
                      }}
                    >
                      {STAGE_LABELS[row.stage] ?? row.stage}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>

                {/* Investment Strategy */}
                <td
                  style={{
                    padding: "8px 12px",
                    color: "var(--muted)",
                    textTransform: "capitalize",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.investment_strategy?.replace(/_/g, " ") ?? "—"}
                </td>

                {/* Square Feet */}
                <td style={{ padding: "8px 12px", textAlign: "right" }}>
                  {row.square_feet && !isNaN(Number(row.square_feet))
                    ? Number(row.square_feet).toLocaleString()
                    : row.square_feet ?? "—"}
                </td>

                {/* Beds */}
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  {row.beds ?? "—"}
                </td>

                {/* Baths */}
                <td style={{ padding: "8px 12px", textAlign: "center" }}>
                  {row.baths ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            No projects match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
