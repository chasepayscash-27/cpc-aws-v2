import { CSSProperties, useEffect, useState } from "react";
import type { ProjectRow } from "../types/project";
import { ACTIVE_STAGE_ORDER } from "./PipelineTracker";

const STAGE_LABELS: Record<string, string> = {
  negotiation: "Negotiation",
  pending_purchase: "Pending Purchase",
  under_construction: "Under Construction",
  punch_list: "Punch List",
  active_listing: "Active Listing",
  under_contract: "Under Contract",
};

const STAGE_COLORS: Record<string, string> = {
  negotiation: "rgba(234,179,8,0.85)",
  pending_purchase: "rgba(20,184,166,0.85)",
  under_construction: "rgba(251,146,60,0.85)",
  punch_list: "rgba(245,158,11,0.85)",
  active_listing: "rgba(236,72,153,0.85)",
  under_contract: "rgba(59,130,246,0.85)",
};

interface Props {
  project: ProjectRow;
  onConfirm: (stage: string) => void;
  onCancel: () => void;
}

export default function ReturnToPipelineModal({ project, onConfirm, onCancel }: Props) {
  const [selectedStage, setSelectedStage] = useState<string>("");

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onCancel]);

  const overlayStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  };

  const dialogStyle: CSSProperties = {
    background: "var(--panel)",
    borderRadius: 18,
    border: "1px solid var(--border)",
    padding: "28px 28px 24px",
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  };

  return (
    <div style={overlayStyle} onClick={onCancel} role="dialog" aria-modal="true" aria-label="Return to pipeline">
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>🔄</span>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Return To Pipeline</h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
            Select a pipeline stage for{" "}
            <strong>{project.name ?? project.full_address ?? "this project"}</strong>.
          </p>
        </div>

        {/* Stage selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Pipeline Stage
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {ACTIVE_STAGE_ORDER.map((stage) => {
              const label = STAGE_LABELS[stage] ?? stage;
              const color = STAGE_COLORS[stage] ?? "rgba(26,122,60,0.85)";
              const selected = selectedStage === stage;
              return (
                <button
                  key={stage}
                  onClick={() => setSelectedStage(stage)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: selected
                      ? `2px solid ${color}`
                      : "2px solid var(--border)",
                    background: selected ? `${color.replace("0.85", "0.12")}` : "var(--panel2)",
                    color: selected ? "var(--fg)" : "var(--muted)",
                    fontSize: 13,
                    fontWeight: selected ? 700 : 500,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  aria-pressed={selected}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: color,
                      flexShrink: 0,
                    }}
                  />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--panel2)",
              color: "var(--muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedStage) onConfirm(selectedStage);
            }}
            disabled={!selectedStage}
            style={{
              flex: 2,
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              background: selectedStage ? "var(--accent)" : "var(--panel2)",
              color: selectedStage ? "#fff" : "var(--muted)",
              fontSize: 13,
              fontWeight: 700,
              cursor: selectedStage ? "pointer" : "not-allowed",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            🔄 Return To Pipeline
          </button>
        </div>
      </div>
    </div>
  );
}
