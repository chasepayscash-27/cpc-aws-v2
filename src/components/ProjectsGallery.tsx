import { CSSProperties } from "react";
import type { ProjectRow } from "../types/project";

interface Props {
  rows: ProjectRow[];
}

const STAGE_COLORS: Record<string, string> = {
  under_construction: "rgba(251,146,60,0.30)",
  planning_permitting: "rgba(59,130,246,0.30)",
  completed: "rgba(34,197,94,0.30)",
  sold: "rgba(168,85,247,0.30)",
};

const STRATEGY_COLORS: Record<string, string> = {
  fix_and_flip: "rgba(124,58,237,0.30)",
  new_construction: "rgba(59,130,246,0.30)",
};

function badgeStyle(value: string | undefined, colorMap: Record<string, string>): CSSProperties {
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    background: value ? (colorMap[value] ?? "rgba(255,255,255,0.10)") : "rgba(255,255,255,0.10)",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  };
}

export default function ProjectsGallery({ rows }: Props) {
  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  };

  const cardStyle: CSSProperties = {
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    overflow: "hidden",
    background: "rgba(255,255,255,0.05)",
    transition: "transform 0.15s, border-color 0.15s",
    cursor: "default",
  };

  return (
    <div style={gridStyle}>
      {rows.map((row, i) => (
        <div
          key={row.project_uuid ?? i}
          style={cardStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.50)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.transform = "";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.10)";
          }}
        >
          {/* Image */}
          <div style={{ position: "relative", height: 180, background: "rgba(255,255,255,0.04)" }}>
            {row.featured_image_url ? (
              <img
                src={row.featured_image_url}
                alt={row.name ?? "project"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 40,
                  color: "rgba(255,255,255,0.20)",
                }}
              >
                🏠
              </div>
            )}
            {/* Stage badge overlay */}
            {row.stage && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  ...badgeStyle(row.stage, STAGE_COLORS),
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {row.stage.replace(/_/g, " ")}
              </div>
            )}
          </div>

          {/* Card body */}
          <div style={{ padding: "12px 14px 14px" }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, lineHeight: 1.3 }}>
              {row.name ?? "Unnamed Project"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
              {row.city && row.state
                ? `${row.city}, ${row.state}${row.postal_code ? " " + row.postal_code : ""}`
                : row.full_address ?? ""}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {row.investment_strategy && (
                <span style={badgeStyle(row.investment_strategy, STRATEGY_COLORS)}>
                  {row.investment_strategy.replace(/_/g, " ")}
                </span>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 4,
                fontSize: 12,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                paddingTop: 10,
              }}
            >
              <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginBottom: 2 }}>BEDS</div>
                <div style={{ fontWeight: 600 }}>{row.beds ?? "—"}</div>
              </div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginBottom: 2 }}>BATHS</div>
                <div style={{ fontWeight: 600 }}>{row.baths ?? "—"}</div>
              </div>
              <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginBottom: 2 }}>SQ FT</div>
                <div style={{ fontWeight: 600 }}>
                  {row.square_feet && !isNaN(Number(row.square_feet))
                    ? Number(row.square_feet).toLocaleString()
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
