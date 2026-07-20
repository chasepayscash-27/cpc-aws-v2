import { useEffect, useMemo, useRef, useState } from "react";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { loadCsv } from "../utils/csv";
import type { ProjectRow } from "../types/project";
import ProjectDetailsModal from "../components/ProjectDetailsModal";
import PropertyMapPopup from "../components/PropertyMapPopup";
import {
  PIPELINE_STATUS_LEGEND,
  getPipelineStatusColor,
  getPipelineStatusLabel,
} from "../utils/pipelineStatus";
import "./MapsPage.css";

interface MappedProject extends ProjectRow {
  markerId: string;
  latitude: number;
  longitude: number;
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getLatitude(row: ProjectRow): number | null {
  return parseCoordinate(row.lat ?? (row as Record<string, unknown>).latitude);
}

function getLongitude(row: ProjectRow): number | null {
  return parseCoordinate(row.lng ?? (row as Record<string, unknown>).longitude);
}

function fitInRange(latitude: number, longitude: number): boolean {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function FitMapBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

function MapClickReset({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: onMapClick,
  });

  return null;
}

function markerIcon(color: string) {
  return L.divIcon({
    className: "pipelineMapMarkerWrap",
    html: `<div class="pipelineMapMarker" style="background:${color};"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

export default function MapsPage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pinnedMarkerId, setPinnedMarkerId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const markerRefs = useRef<Record<string, LeafletMarker | null>>({});
  const pinnedMarkerIdRef = useRef<string | null>(null);

  useEffect(() => {
    pinnedMarkerIdRef.current = pinnedMarkerId;
  }, [pinnedMarkerId]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await loadCsv<ProjectRow>("/data/projects_v2.csv");
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load properties");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const mappedProjects = useMemo<MappedProject[]>(() => {
    return rows
      .map((row, index) => {
        const latitude = getLatitude(row);
        const longitude = getLongitude(row);
        if (latitude === null || longitude === null || !fitInRange(latitude, longitude)) {
          return null;
        }

        return {
          ...row,
          markerId: row.project_uuid ?? `${row.name ?? "property"}-${index}`,
          latitude,
          longitude,
        };
      })
      .filter((row): row is MappedProject => row !== null);
  }, [rows]);

  const points = useMemo(
    () => mappedProjects.map((project) => [project.latitude, project.longitude] as [number, number]),
    [mappedProjects]
  );

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Maps</h1>
        <p className="muted">Property locations across your pipeline, color-coded by status.</p>
      </div>

      {loading && (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          Loading map…
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "rgba(239,68,68,0.85)" }}>
          Failed to load properties: {error}
        </div>
      )}

      {!loading && !error && mappedProjects.length === 0 && (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No properties with coordinates to display yet.
        </div>
      )}

      {!loading && !error && mappedProjects.length > 0 && (
        <div className="mapsPageMapWrap">
          <MapContainer center={[33.52, -86.8]} zoom={11} className="mapsPageMap">
            <MapClickReset
              onMapClick={() => {
                setPinnedMarkerId(null);
              }}
            />
            <FitMapBounds points={points} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              // TODO: Swap to Mapbox/Amplify Geo by replacing this URL and attribution once your provider is configured.
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mappedProjects.map((project) => {
              const statusColor = getPipelineStatusColor(project.stage);
              return (
                <Marker
                  key={project.markerId}
                  position={[project.latitude, project.longitude]}
                  icon={markerIcon(statusColor)}
                  ref={(marker) => {
                    markerRefs.current[project.markerId] = marker;
                  }}
                  eventHandlers={{
                    mouseover: () => {
                      if (!pinnedMarkerIdRef.current) {
                        markerRefs.current[project.markerId]?.openPopup();
                      }
                    },
                    mouseout: () => {
                      if (pinnedMarkerIdRef.current !== project.markerId) {
                        markerRefs.current[project.markerId]?.closePopup();
                      }
                    },
                    click: () => {
                      setPinnedMarkerId(project.markerId);
                      markerRefs.current[project.markerId]?.openPopup();
                    },
                    popupclose: () => {
                      if (pinnedMarkerIdRef.current === project.markerId) {
                        setPinnedMarkerId(null);
                      }
                    },
                  }}
                >
                  <Popup closeButton autoPan={false}>
                    <PropertyMapPopup
                      project={project}
                      statusColor={statusColor}
                      onViewDetails={() => setSelectedProject(project)}
                    />
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          <div className="mapsPageLegend">
            <div className="mapsPageLegendTitle">Pipeline Status</div>
            <ul className="mapsPageLegendList">
              {PIPELINE_STATUS_LEGEND.map((item) => (
                <li key={item.key} className="mapsPageLegendItem">
                  <span className="mapsPageLegendDot" style={{ background: item.color }} />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {selectedProject && (
        <ProjectDetailsModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
      {!loading && !error && mappedProjects.length > 0 && (
        <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
          Hover a pin for a quick preview, click to keep it open. Status colors follow{" "}
          {getPipelineStatusLabel("negotiation")}, {getPipelineStatusLabel("under_construction")},{" "}
          {getPipelineStatusLabel("active_listing")}, and other pipeline stages.
        </p>
      )}
    </>
  );
}
