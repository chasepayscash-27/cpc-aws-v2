import { CSSProperties, useEffect, useCallback, useState } from "react";
import type { ProjectRow } from "../types/project";
import type { PhotoLogRow } from "../types/photoLog";
import { loadCsv } from "../utils/csv";
import PropertyFinancials from "./PropertyFinancials";
import { generatePropertyPdf } from "../utils/generatePropertyPdf";

interface Props {
  project: ProjectRow;
  onClose: () => void;
  onViewFullPnL?: (propertyName: string) => void;
}

const STAGE_COLORS: Record<string, string> = {
  under_construction: "rgba(251,146,60,0.85)",
  planning_permitting: "rgba(59,130,246,0.85)",
  completed: "rgba(34,197,94,0.85)",
  sold: "rgba(168,85,247,0.85)",
};

const STRATEGY_COLORS: Record<string, string> = {
  fix_and_flip: "rgba(124,58,237,0.85)",
  new_construction: "rgba(59,130,246,0.85)",
};

function badgeStyle(value: string | undefined, colorMap: Record<string, string>): CSSProperties {
  return {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    background: value ? (colorMap[value] ?? "rgba(26,122,60,0.85)") : "rgba(26,122,60,0.85)",
    border: "1px solid rgba(255,255,255,0.3)",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
    color: "#fff",
  };
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: "#5a7060", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: "#1a2e1a" }}>{value}</span>
    </div>
  );
}

export default function ProjectDetailsModal({ project: row, onClose, onViewFullPnL }: Props) {
  const [photos, setPhotos] = useState<PhotoLogRow[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const isLightboxOpen = lightboxIndex !== null;

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isLightboxOpen) {
        if (e.key === "Escape") { closeLightbox(); return; }
        if (e.key === "ArrowRight") { setLightboxIndex((i: number | null) => (i === null ? 0 : (i + 1) % photos.length)); return; }
        if (e.key === "ArrowLeft") { setLightboxIndex((i: number | null) => (i === null ? 0 : (i - 1 + photos.length) % photos.length)); return; }
      } else {
        if (e.key === "Escape") onClose();
      }
    },
    [isLightboxOpen, onClose, closeLightbox, photos.length]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  useEffect(() => {
    async function fetchPhotos() {
      try {
        const all = await loadCsv<PhotoLogRow>("/data/project_photo_log_v2.csv");
        const projectId = (row.project_uuid ?? "").trim().toLowerCase();
        const filtered = all.filter(
          (p) => (p.project_uuid ?? "").trim().toLowerCase() === projectId && p.source_view_url
        );
        setPhotos(filtered);
      } catch {
        // silently ignore — section simply won't render
      }
    }
    if (row.project_uuid) fetchPhotos();
  }, [row.project_uuid]);

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
    background: "#ffffff",
    border: "1px solid #d4e8d8",
    borderRadius: 20,
    width: "100%",
    maxWidth: 680,
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(26,122,60,0.10)",
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
    border: "1px solid #d4e8d8",
    background: "#f0f7f1",
    color: "#5a7060",
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
    color: "#1a7a3c",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 12,
  };

  const dividerStyle: CSSProperties = {
    borderTop: "1px solid #eaf4ec",
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
        .modal-close-btn:hover { background: #d4e8d8 !important; color: #1a7a3c !important; }
        .photo-thumb:hover { transform: scale(1.03); box-shadow: 0 4px 18px rgba(26,122,60,0.18); }
        .lightbox-nav-btn:hover { background: rgba(255,255,255,0.25) !important; }
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
                <p style={{ margin: 0, fontSize: 14, color: "#5a7060" }}>
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

            {/* Download PDF button */}
            <button
              onClick={() => generatePropertyPdf(row)}
              style={{
                marginBottom: 20,
                padding: "8px 18px",
                borderRadius: 12,
                border: "1px solid #1a7a3c",
                background: "#f0f7f1",
                color: "#1a7a3c",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#1a7a3c";
                (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#f0f7f1";
                (e.currentTarget as HTMLButtonElement).style.color = "#1a7a3c";
              }}
              aria-label="Download PDF report"
            >
              📄 Download PDF
            </button>

            {/* Quick stats */}
            {(row.beds || row.baths || sqft || row.year_built) && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: 12,
                    background: "#f0f7f1",
                    border: "1px solid #d4e8d8",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 20,
                  }}
                >
                  {row.beds && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{row.beds}</div>
                      <div style={{ fontSize: 10, color: "#5a7060", textTransform: "uppercase" }}>Beds</div>
                    </div>
                  )}
                  {row.baths && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{row.baths}</div>
                      <div style={{ fontSize: 10, color: "#5a7060", textTransform: "uppercase" }}>Baths</div>
                    </div>
                  )}
                  {sqft && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>
                        {sqftFormatted}
                      </div>
                      <div style={{ fontSize: 10, color: "#5a7060", textTransform: "uppercase" }}>Sq Ft</div>
                    </div>
                  )}
                  {row.year_built && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{row.year_built}</div>
                      <div style={{ fontSize: 10, color: "#5a7060", textTransform: "uppercase" }}>Year Built</div>
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

            {/* Photos section */}
            {photos.length > 0 && (
              <>
                <div style={dividerStyle} />
                <div style={sectionLabelStyle}>📸 Photos</div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 10,
                    marginBottom: 4,
                  }}
                >
                  {photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="photo-thumb"
                      onClick={() => setLightboxIndex(idx)}
                      style={{
                        position: "relative",
                        borderRadius: 12,
                        overflow: "hidden",
                        cursor: "pointer",
                        border: "1px solid #d4e8d8",
                        background: "#f0f7f1",
                        aspectRatio: "4/3",
                        transition: "transform 0.18s, box-shadow 0.18s",
                      }}
                    >
                      <img
                        src={photo.source_view_url}
                        alt={photo.photo_description ?? photo.description ?? photo.category ?? "photo"}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).parentElement!.style.display = "none";
                        }}
                      />
                      {(photo.category || photo.photo_date) && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: "4px 8px",
                            background: "linear-gradient(transparent, rgba(0,0,0,0.55))",
                            color: "#fff",
                            fontSize: 10,
                            lineHeight: 1.3,
                          }}
                        >
                          {photo.category && (
                            <div style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              {photo.category}
                            </div>
                          )}
                          {photo.photo_date && (
                            <div style={{ opacity: 0.85 }}>
                              {photo.photo_date.slice(0, 10)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Financials section */}
            {row.name && (
              <>
                <div style={dividerStyle} />
                <div style={sectionLabelStyle}>💰 Financials</div>
                <PropertyFinancials
                  propertyName={row.name}
                  onViewFullPnL={
                    onViewFullPnL && row.name
                      ? () => { onViewFullPnL(row.name as string); onClose(); }
                      : undefined
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox overlay */}
      {isLightboxOpen && lightboxIndex !== null && photos[lightboxIndex] && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.88)",
            backdropFilter: "blur(6px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.18s ease",
          }}
          onClick={closeLightbox}
        >
          <div
            style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              aria-label="Close lightbox"
              style={{
                position: "absolute",
                top: -40,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.3)",
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                fontSize: 20,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ×
            </button>

            {/* Image */}
            <img
              src={photos[lightboxIndex].source_view_url}
              alt={photos[lightboxIndex].photo_description ?? photos[lightboxIndex].description ?? photos[lightboxIndex].category ?? "photo"}
              style={{ maxWidth: "85vw", maxHeight: "72vh", borderRadius: 14, objectFit: "contain", boxShadow: "0 8px 48px rgba(0,0,0,0.5)" }}
            />

            {/* Caption */}
            {(photos[lightboxIndex].category || photos[lightboxIndex].description || photos[lightboxIndex].photo_date) && (
              <div style={{ marginTop: 14, textAlign: "center", color: "#fff" }}>
                {photos[lightboxIndex].category && (
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7de0a0", marginBottom: 4 }}>
                    {photos[lightboxIndex].category}
                  </div>
                )}
                {photos[lightboxIndex].description && (
                  <div style={{ fontSize: 14, marginBottom: 4 }}>{photos[lightboxIndex].description}</div>
                )}
                {photos[lightboxIndex].photo_date && (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{photos[lightboxIndex].photo_date.slice(0, 10)}</div>
                )}
              </div>
            )}

            {/* Counter */}
            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              {lightboxIndex + 1} / {photos.length}
            </div>
          </div>

          {/* Prev / Next buttons */}
          {photos.length > 1 && (
            <>
              <button
                className="lightbox-nav-btn"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i: number | null) => (i === null ? 0 : (i - 1 + photos.length) % photos.length)); }}
                aria-label="Previous photo"
                style={{
                  position: "fixed",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: 22,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                }}
              >
                ‹
              </button>
              <button
                className="lightbox-nav-btn"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((i: number | null) => (i === null ? 0 : (i + 1) % photos.length)); }}
                aria-label="Next photo"
                style={{
                  position: "fixed",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                  fontSize: 22,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
