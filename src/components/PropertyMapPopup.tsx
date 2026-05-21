import type { CSSProperties } from "react";
import type { ProjectRow } from "../types/project";
import { getPipelineStatusLabel } from "../utils/pipelineStatus";

interface Props {
  project: ProjectRow;
  statusColor: string;
  onViewDetails: () => void;
}

function formatAddress(project: ProjectRow): string {
  const cityStateZip = [project.city, project.state, project.postal_code].filter(Boolean).join(", ");
  if (cityStateZip) return cityStateZip;
  return project.full_address ?? project.address_1 ?? "Address unavailable";
}

function formatSquareFeet(squareFeet?: string): string {
  if (!squareFeet || Number.isNaN(Number(squareFeet))) return "—";
  return Number(squareFeet).toLocaleString();
}

export default function PropertyMapPopup({ project, statusColor, onViewDetails }: Props) {
  const statusLabel = getPipelineStatusLabel(project.stage);

  const badgeStyle: CSSProperties = {
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    color: "#fff",
    background: statusColor,
    marginBottom: 8,
  };

  return (
    <div className="propertyMapPopup">
      <div className="propertyMapPopupImageWrap">
        {project.featured_image_url ? (
          <img
            src={project.featured_image_url}
            alt={project.name ?? "Property image"}
            className="propertyMapPopupImage"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="propertyMapPopupPlaceholder">🏠</div>
        )}
      </div>

      <div className="propertyMapPopupBody">
        <div style={badgeStyle}>{statusLabel}</div>
        <div className="propertyMapPopupTitle">{project.name ?? "Unnamed Property"}</div>
        <div className="propertyMapPopupAddress">{formatAddress(project)}</div>
        <div className="propertyMapPopupStats">
          <span>Beds: {project.beds ?? "—"}</span>
          <span>Baths: {project.baths ?? "—"}</span>
          <span>Sq Ft: {formatSquareFeet(project.square_feet)}</span>
        </div>
        <button
          type="button"
          className="propertyMapPopupButton"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onViewDetails();
          }}
        >
          View details
        </button>
      </div>
    </div>
  );
}
