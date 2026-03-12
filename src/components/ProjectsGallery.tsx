import { useEffect, useMemo, useState } from "react";
import { loadCsv } from "../utils/csv";
import type { ProjectRow } from "../types/project";

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

const STRATEGY_LABELS: Record<string, string> = {
  fix_and_flip: "Fix & Flip",
  buy_and_hold: "Buy & Hold",
  wholesale: "Wholesale",
  new_construction: "New Construction",
};

export default function ProjectsGallery() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [strategyFilter, setStrategyFilter] = useState("all");
  const [search, setSearch] = useState("");

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

  const strategies = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => r.investment_strategy && seen.add(r.investment_strategy));
    return Array.from(seen).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (stageFilter !== "all") {
      result = result.filter((r) => r.stage === stageFilter);
    }
    if (strategyFilter !== "all") {
      result = result.filter((r) => r.investment_strategy === strategyFilter);
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
    return result;
  }, [rows, stageFilter, strategyFilter, search]);

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

  const selectStyle: React.CSSProperties = {
    padding: "8px 12px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--text)",
    fontSize: 14,
    cursor: "pointer",
  };

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 18,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search projects…"
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
          style={selectStyle}
        >
          <option value="all">All Stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <select
          value={strategyFilter}
          onChange={(e) => setStrategyFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="all">All Strategies</option>
          {strategies.map((s) => (
            <option key={s} value={s}>
              {STRATEGY_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>
          {filtered.length} of {rows.length} projects
        </span>
      </div>

      {/* Gallery grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((row, i) => {
          const stageColor = STAGE_COLORS[row.stage ?? ""] ?? "#6b7280";
          return (
            <div
              key={row.project_uuid ?? i}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 16,
                overflow: "hidden",
                background: "rgba(255,255,255,0.04)",
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.2s",
              }}
            >
              {/* Project image */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.06)",
                  position: "relative",
                }}
              >
                {row.featured_image_url ? (
                  <img
                    src={row.featured_image_url}
                    alt={row.name ?? "Project"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      const placeholder = target.parentElement?.querySelector(
                        ".img-placeholder"
                      ) as HTMLElement | null;
                      if (placeholder) placeholder.style.display = "grid";
                    }}
                  />
                ) : null}
                <div
                  className="img-placeholder"
                  style={{
                    display: row.featured_image_url ? "none" : "grid",
                    placeItems: "center",
                    width: "100%",
                    height: "100%",
                    fontSize: 40,
                    color: "var(--muted)",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  🏠
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: "12px 14px", flex: 1 }}>
                {/* Stage badge */}
                <div style={{ marginBottom: 8 }}>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      background: `${stageColor}22`,
                      color: stageColor,
                      border: `1px solid ${stageColor}55`,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {STAGE_LABELS[row.stage ?? ""] ?? row.stage ?? "Unknown"}
                  </span>
                </div>

                {/* Project name */}
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    marginBottom: 4,
                    lineHeight: 1.3,
                  }}
                >
                  {row.name ?? "Unnamed Project"}
                </div>

                {/* Address */}
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 12,
                    marginBottom: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {row.city && row.state
                    ? `${row.city}, ${row.state} ${row.postal_code ?? ""}`.trim()
                    : row.full_address ?? "—"}
                </div>

                {/* Stats row */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: 12,
                    color: "var(--muted)",
                    borderTop: "1px solid var(--border)",
                    paddingTop: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {row.square_feet && (
                    <span>
                      📐{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {!isNaN(Number(row.square_feet))
                          ? Number(row.square_feet).toLocaleString()
                          : row.square_feet}
                      </strong>{" "}
                      sq ft
                    </span>
                  )}
                  {row.beds && (
                    <span>
                      🛏{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {row.beds}
                      </strong>{" "}
                      bd
                    </span>
                  )}
                  {row.baths && (
                    <span>
                      🚿{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {row.baths}
                      </strong>{" "}
                      ba
                    </span>
                  )}
                  {row.year_built && (
                    <span>
                      🗓{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {row.year_built}
                      </strong>
                    </span>
                  )}
                </div>

                {/* Strategy */}
                {row.investment_strategy && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: "var(--muted)",
                      textTransform: "capitalize",
                    }}
                  >
                    {STRATEGY_LABELS[row.investment_strategy] ??
                      row.investment_strategy.replace(/_/g, " ")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div
          style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}
        >
          No projects match your filters.
        </div>
      )}
    </div>
  );
}
