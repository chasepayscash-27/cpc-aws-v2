import { useMemo, useState, type CSSProperties } from "react";

interface Props {
  propertyName?: string | null;
}

const CONSTRUCTION_WORKFLOW_TEMPLATE = [
  {
    id: "permits",
    title: "Permits + Pre-Construction",
    description: "Finalize permits, scope, budget, and trade schedule.",
  },
  {
    id: "site",
    title: "Site Prep + Demo",
    description: "Site prep, demo, cleanup, and disposal complete.",
  },
  {
    id: "framing",
    title: "Framing + Rough-Ins",
    description: "Framing, HVAC, plumbing, and electrical rough-ins inspected.",
  },
  {
    id: "interior",
    title: "Interior Finishes",
    description: "Drywall, paint, flooring, cabinets, fixtures, and trim.",
  },
  {
    id: "closeout",
    title: "Final Inspections + Closeout",
    description: "Final walk, punch list, photos, and turnover package.",
  },
] as const;

const cardStyle: CSSProperties = {
  border: "1px solid #d4e8d8",
  borderRadius: 12,
  padding: "14px 16px",
  background: "#f0f7f1",
};

export default function ConstructionWorkflowTemplate({ propertyName }: Props) {
  const initialChecklistState = useMemo(
    () =>
      Object.fromEntries(CONSTRUCTION_WORKFLOW_TEMPLATE.map((item) => [item.id, false])) as Record<string, boolean>,
    []
  );
  const [checklist, setChecklist] = useState<Record<string, boolean>>(initialChecklistState);
  const [notes, setNotes] = useState("");

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a7a3c", marginBottom: 4 }}>
        🏗️ Construction Workflow Template
      </div>
      <div style={{ fontSize: 12, color: "#5a7060", marginBottom: 12 }}>
        {propertyName ? `${propertyName} construction workflow draft.` : "Construction workflow draft."} This is a boiler template for now.
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {CONSTRUCTION_WORKFLOW_TEMPLATE.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              setChecklist((current) => ({
                ...current,
                [item.id]: !current[item.id],
              }))
            }
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              border: "1px solid #d4e8d8",
              borderRadius: 10,
              background: checklist[item.id] ? "rgba(26,122,60,0.12)" : "#ffffff",
              padding: "10px 12px",
              textAlign: "left",
              cursor: "pointer",
            }}
            aria-pressed={checklist[item.id]}
          >
            <input type="checkbox" checked={checklist[item.id]} readOnly style={{ marginTop: 2 }} aria-label={item.title} />
            <span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1a2e1a" }}>{item.title}</span>
              <span style={{ display: "block", fontSize: 12, color: "#5a7060" }}>{item.description}</span>
            </span>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#1a7a3c", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add construction notes, milestones, or handoff items..."
          rows={3}
          style={{
            width: "100%",
            borderRadius: 10,
            border: "1px solid #c7ddcc",
            padding: "8px 10px",
            fontSize: 12,
            resize: "vertical",
            fontFamily: "inherit",
            color: "#1a2e1a",
            background: "#ffffff",
          }}
        />
      </div>
    </div>
  );
}
