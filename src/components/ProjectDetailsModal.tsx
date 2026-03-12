import { CSSProperties, useEffect, useCallback } from "react";
import type { ProjectRow } from "../types/project";

interface Props {
  project: ProjectRow;
  onClose: () => void;
}

const STAGE_COLORS: Record<string, string> = {
  under_construction: "rgba(251,146,60,0.35)",
  planning_permitting: "rgba(59,130,246,0.35)",
  completed: "rgba(34,197,94,0.35)",
  sold: "rgba(168,85,247,0.35)",
};

const STRATEGY_COLORS: Record<string, string> = {
  fix_and_flip: "rgba(124,58,237,0.35)",
  new_construction: "rgba(59,130,246,0.35)",
};

function badgeStyle(value: string | undefined, colorMap: Record<string, string>): CSSProperties {
  return {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    background: value ? (colorMap[value] ?? "rgba(255,255,255,0.10)") : "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.12)",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  };
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.40)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: "rgba(255,255,255,0.88)" }}>{value}</span>
    </div>
  );
}

export default function ProjectDetailsModal({ project: row, onClose }: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.70)",
    backdropFilter: "blur(6px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    animation: "fadeIn 0.18s ease",
  };

  const modalStyle: CSSProperties = {
    background: "linear-gradient(145deg, rgba(30,20,55,0.98) 0%, rgba(18,12,40,0.98) 100%)",
    border: "1px solid rgba(124,58,237,0.30)",
    borderRadius: 20,
    width: "100%",
    maxWidth: 680,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 24px 80px rgba(0,0,0,0.60), 0 0 0 1px rgba(124,58,237,0.12)",
    animation: "slideUp 0.22s ease",
    position: "relative",
  };

  const closeBtnStyle: CSSProperties = {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.07)",
    color: "rgba(255,255,255,0.70)",
    fontSize: 18,
    lineHeight: 1,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.15s, color 0.15s",
    zIndex: 1,
  };

  const sectionLabelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: "rgba(124,58,237,0.85)",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 12,
  };

  const dividerStyle: CSSProperties = {
    borderTop: "1px solid rgba(255,255,255,0.07)",
    margin: "20px 0",
  };

  const address = [row.address_1, row.address_2].filter(Boolean).join(" ") || row.full_address;
  const cityStateZip = [row.city, row.state, row.postal_code].filter(Boolean).join(", ");
  const coords = row.lat && row.lng ? `${row.lat}, ${row.lng}` : undefined;
  const sqftFormatted =
    row.square_feet && !isNaN(Number(row.square_feet))
      ? Number(row.square_feet).toLocaleString()
      : undefined;
  const sqft = sqftFormatted ? sqftFormatted + " sq ft" : undefined;
  const createdDate = row.created_at ? new Date(row.created_at).toLocaleDateString() : undefined;
  const updatedDate = row.updated_at ? new Date(row.updated_at).toLocaleDateString() : undefined;

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        .modal-close-btn:hover { background: rgba(255,255,255,0.14) !important; color: rgba(255,255,255,0.95) !important; }
      `}</style>
      <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true" aria-label={row.name ?? "Project details"}>
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          {/* Close button */}
          <button
            className="modal-close-btn"
            style={closeBtnStyle}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>

          {/* Hero image */}
          {row.featured_image_url && (
            <div style={{ height: 220, overflow: "hidden", borderRadius: "20px 20px 0 0" }}>
              <img
                src={row.featured_image_url}
                alt={row.name ?? "project"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Content */}
          <div style={{ padding: "22px 24px 28px" }}>
            {/* Header */}
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, lineHeight: 1.2, paddingRight: 36 }}>
                {row.name ?? "Unnamed Project"}
              </h2>
              {cityStateZip && (
                <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>
                  {cityStateZip}
                </p>
              )}
            </div>

            {/* Badges */}
            {(row.stage || row.investment_strategy) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {row.stage && (
                  <span style={badgeStyle(row.stage, STAGE_COLORS)}>
                    {row.stage.replace(/_/g, " ")}
                  </span>
                )}
                {row.investment_strategy && (
                  <span style={badgeStyle(row.investment_strategy, STRATEGY_COLORS)}>
                    {row.investment_strategy.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            )}

            {/* Quick stats */}
            {(row.beds || row.baths || sqft || row.year_built) && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: 12,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 20,
                  }}
                >
                  {row.beds && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{row.beds}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Beds</div>
                    </div>
                  )}
                  {row.baths && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{row.baths}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Baths</div>
                    </div>
                  )}
                  {sqft && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>
                        {sqftFormatted}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Sq Ft</div>
                    </div>
                  )}
                  {row.year_built && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{row.year_built}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Year Built</div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Location section */}
            {(address || cityStateZip || row.country || coords) && (
              <>
                <div style={sectionLabelStyle}>📍 Location</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 4 }}>
                  <DetailRow label="Address" value={address} />
                  <DetailRow label="City / State / Zip" value={cityStateZip || undefined} />
                  <DetailRow label="Country" value={row.country} />
                  <DetailRow label="Coordinates" value={coords} />
                </div>
                <div style={dividerStyle} />
              </>
            )}

            {/* Property section */}
            {(row.type || row.style) && (
              <>
                <div style={sectionLabelStyle}>🏠 Property</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 4 }}>
                  <DetailRow label="Type" value={row.type?.replace(/_/g, " ")} />
                  <DetailRow label="Style" value={row.style?.replace(/_/g, " ")} />
                </div>
                <div style={dividerStyle} />
              </>
            )}

            {/* Metadata section */}
            {(row.project_uuid || createdDate || updatedDate) && (
              <>
                <div style={sectionLabelStyle}>ℹ️ Details</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
                  <DetailRow label="Project ID" value={row.project_uuid} />
                  <DetailRow label="Workspace ID" value={row.workspace_uuid} />
                  <DetailRow label="Created" value={createdDate} />
                  <DetailRow label="Last Updated" value={updatedDate} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
