import { CSSProperties } from "react";
import type { ProjectRow } from "../types/project";

interface Props {
  rows: ProjectRow[];
}

const STAGE_COLORS: Record<string, string> = {
  under_construction: "rgba(251,146,60,0.25)",
  planning_permitting: "rgba(59,130,246,0.25)",
  completed: "rgba(34,197,94,0.25)",
  sold: "rgba(168,85,247,0.25)",
};

const STRATEGY_COLORS: Record<string, string> = {
  fix_and_flip: "rgba(124,58,237,0.25)",
  new_construction: "rgba(59,130,246,0.25)",
};

function badge(value: string | undefined, colorMap: Record<string, string>) {
  const label = value ? value.replace(/_/g, " ") : "—";
  const bg = value ? (colorMap[value] ?? "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.08)";
  const style: CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    background: bg,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  };
  return <span style={style}>{label}</span>;
}

export default function ProjectsTable({ rows }: Props) {
  const thStyle: CSSProperties = {
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    whiteSpace: "nowrap",
  };

  const tdStyle: CSSProperties = {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    fontSize: 13,
    verticalAlign: "middle",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Photo</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Location</th>
            <th style={thStyle}>Stage</th>
            <th style={thStyle}>Strategy</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Sq Ft</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Beds / Baths</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Year Built</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.project_uuid ?? i}
              style={{ transition: "background 0.15s" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLTableRowElement).style.background =
                  "rgba(255,255,255,0.04)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLTableRowElement).style.background = "")
              }
            >
              <td style={tdStyle}>
                {row.featured_image_url ? (
                  <img
                    src={row.featured_image_url}
                    alt={row.name ?? "project"}
                    style={{
                      width: 56,
                      height: 56,
                      objectFit: "cover",
                      borderRadius: 10,
                      display: "block",
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.08)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 20,
                    }}
                  >
                    🏠
                  </div>
                )}
              </td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{row.name ?? "—"}</td>
              <td style={tdStyle}>
                <div>{row.city && row.state ? `${row.city}, ${row.state}` : row.full_address ?? "—"}</div>
                {row.postal_code && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{row.postal_code}</div>
                )}
              </td>
              <td style={tdStyle}>{badge(row.stage, STAGE_COLORS)}</td>
              <td style={tdStyle}>{badge(row.investment_strategy, STRATEGY_COLORS)}</td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                {row.square_feet && !isNaN(Number(row.square_feet))
                ? Number(row.square_feet).toLocaleString()
                : "—"}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>
                {row.beds || row.baths ? `${row.beds ?? "?"} / ${row.baths ?? "?"}` : "—"}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{row.year_built ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
