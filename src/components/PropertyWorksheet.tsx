import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectRow } from "../types/project";
import { generatePropertyPdf } from "../utils/generatePropertyPdf";
import outputs from "../../amplify/amplify_outputs.json";

const HTTP_API_URL =
  (outputs as { custom?: { cpcHttpApi?: { url?: string } } })?.custom?.cpcHttpApi?.url ?? "";
const WORKSHEET_ENDPOINT = HTTP_API_URL
  ? `${HTTP_API_URL.replace(/\/?$/, "/")}worksheet`
  : "";

type SaveState = "idle" | "saving" | "saved" | "error";

const WORKSHEET_FIELDS: Array<{ label: string; fieldName: string; multiline?: boolean }> = [
  { label: "Property Address", fieldName: "property_address" },
  { label: "List Price / Asking Price", fieldName: "list_price" },
  { label: "Year Built", fieldName: "year_built" },
  { label: "Square Footage", fieldName: "square_footage" },
  { label: "Water Heater (New or Age)", fieldName: "water_heater" },
  { label: "Roof (New or Age)", fieldName: "roof" },
  { label: "Appliances (New or Age)", fieldName: "appliances" },
  { label: "Gas Appliances", fieldName: "gas_appliances" },
  { label: "Electric Appliances", fieldName: "electric_appliances" },
  { label: "Fireplace (Gas Logs or Wood Burning)", fieldName: "fireplace" },
  { label: "Lot Size (Acres)", fieldName: "lot_size_acres" },
  { label: "Bedrooms", fieldName: "bedrooms" },
  { label: "Bathrooms", fieldName: "bathrooms" },
  { label: "Number of Floors", fieldName: "number_of_floors" },
  { label: "Sewer / Septic", fieldName: "sewer_septic" },
  { label: "HVAC (New or Age)", fieldName: "hvac" },
  { label: "Plumbing (New or Partial Update)", fieldName: "plumbing" },
  { label: "Electrical Panel Update", fieldName: "electrical_panel" },
  { label: "Electrical Wiring Update", fieldName: "electrical_wiring" },
  { label: "Deck Update Front", fieldName: "deck_front" },
  { label: "Deck Update Back", fieldName: "deck_back" },
  { label: "Garage Door Motors Update", fieldName: "garage_door_motors" },
  { label: "Garage Doors Update", fieldName: "garage_doors" },
  { label: "Foundation Work Completed", fieldName: "foundation_work" },
  { label: "Counter Top (Granite or Quartz)", fieldName: "counter_top" },
  { label: "Windows Update", fieldName: "windows_update" },
  { label: "Notes", fieldName: "notes", multiline: true },
];

interface Props {
  row: ProjectRow;
}

export default function PropertyWorksheet({ row }: Props) {
  const projectId = row.project_uuid ?? "";
  const [fields, setFields] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const pendingRef = useRef<Record<string, string>>({});
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load saved values ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId || !WORKSHEET_ENDPOINT) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetch(`${WORKSHEET_ENDPOINT}?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((data: { fields?: Record<string, string>; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setFields(data.fields ?? {});
      })
      .catch((err: Error) => {
        setLoadError(err.message ?? "Failed to load worksheet data");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  // ── Persist changes (debounced) ───────────────────────────────────────────
  const flushSave = useCallback(
    async (snapshot: Record<string, string>) => {
      if (!projectId || !WORKSHEET_ENDPOINT) return;
      setSaveState("saving");
      try {
        const res = await fetch(WORKSHEET_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, fields: snapshot }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? "Save failed");
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2500);
      } catch {
        setSaveState("error");
      }
    },
    [projectId],
  );

  const scheduleAutoSave = useCallback(
    (updated: Record<string, string>) => {
      pendingRef.current = updated;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        flushSave(pendingRef.current);
      }, 800);
    },
    [flushSave],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleChange = useCallback(
    (fieldName: string, value: string) => {
      setFields((prev) => {
        const updated = { ...prev, [fieldName]: value };
        scheduleAutoSave(updated);
        return updated;
      });
      setSaveState("saving");
    },
    [scheduleAutoSave],
  );

  const handleManualSave = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    flushSave(fields);
  }, [fields, flushSave]);

  const handleDownloadPdf = useCallback(() => {
    generatePropertyPdf(row, fields);
  }, [row, fields]);

  // ── Derive initial default values from row ────────────────────────────────
  function initialValue(fieldName: string): string {
    if (fields[fieldName] !== undefined) return fields[fieldName];
    const rowWithFloors = row as ProjectRow & { stories?: string; floors?: string };
    const addr =
      row.full_address ??
      [row.address_1, row.address_2].filter(Boolean).join(" ") ??
      "";
    switch (fieldName) {
      case "property_address": return addr;
      case "year_built": return row.year_built ?? "";
      case "square_footage":
        return row.square_feet && !isNaN(Number(row.square_feet))
          ? Number(row.square_feet).toLocaleString()
          : row.square_feet ?? "";
      case "bedrooms": return row.beds ?? "";
      case "bathrooms": return row.baths ?? "";
      case "number_of_floors": return rowWithFloors.stories ?? rowWithFloors.floors ?? "";
      default: return "";
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const headerStyle = {
    background: "linear-gradient(135deg, #1a7a3c, #155f30)",
    borderRadius: "12px 12px 0 0",
    padding: "16px 20px",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const saveIndicator = () => {
    if (!WORKSHEET_ENDPOINT) return null;
    if (saveState === "saving")
      return <span style={{ fontSize: 12, color: "#a5c9a8", fontStyle: "italic" }}>Saving…</span>;
    if (saveState === "saved")
      return <span style={{ fontSize: 12, color: "#6ee09a", fontWeight: 600 }}>✓ Saved</span>;
    if (saveState === "error")
      return (
        <span style={{ fontSize: 12, color: "#f97171", fontWeight: 600 }}>
          ✗ Failed to save —{" "}
          <button
            onClick={handleManualSave}
            style={{ background: "none", border: "none", color: "#f97171", cursor: "pointer", textDecoration: "underline", fontSize: 12, padding: 0 }}
          >
            retry
          </button>
        </span>
      );
    return null;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ border: "1px solid #d4e8d8", borderRadius: 12, overflow: "hidden", marginTop: 4 }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>📋 Property Worksheet</div>
          <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
            Edits are saved automatically and shared with all visitors
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {saveIndicator()}
          <button
            onClick={handleManualSave}
            disabled={saveState === "saving" || !WORKSHEET_ENDPOINT}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: saveState === "saving" || !WORKSHEET_ENDPOINT ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.28)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)"; }}
          >
            💾 Save
          </button>
          <button
            onClick={handleDownloadPdf}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.28)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)"; }}
          >
            📄 Download PDF
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: "#fafffe", padding: "16px 20px" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#5a7060", padding: "20px 0", fontSize: 13 }}>
            Loading worksheet…
          </div>
        )}
        {!loading && loadError && (
          <div style={{ color: "#c0392b", fontSize: 13, padding: "8px 0" }}>
            ⚠️ Could not load saved data: {loadError}
          </div>
        )}
        {!loading && !WORKSHEET_ENDPOINT && (
          <div style={{ color: "#b07d0a", fontSize: 12, marginBottom: 12, padding: "6px 10px", background: "#fffbe6", borderRadius: 6, border: "1px solid #ffe58f" }}>
            ⚠️ API endpoint not configured — edits will not be persisted until the backend is deployed.
          </div>
        )}
        {!loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px 16px",
            }}
          >
            {WORKSHEET_FIELDS.filter((f) => !f.multiline).map((f, idx) => (
              <div key={f.fieldName} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label
                  htmlFor={`ws-${f.fieldName}`}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#5a7060",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {idx + 1}. {f.label}
                </label>
                <input
                  id={`ws-${f.fieldName}`}
                  type="text"
                  value={initialValue(f.fieldName)}
                  onChange={(e) => handleChange(f.fieldName, e.target.value)}
                  style={{
                    padding: "5px 8px",
                    border: "1px solid #d4e8d8",
                    borderRadius: 6,
                    fontSize: 13,
                    color: "#1a2e1a",
                    background: "#fff",
                    outline: "none",
                    transition: "border-color 0.15s",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#1a7a3c"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#d4e8d8"; }}
                />
              </div>
            ))}
          </div>
        )}
        {!loading && (
          <div style={{ marginTop: 14 }}>
            <label
              htmlFor="ws-notes"
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#5a7060",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "block",
                marginBottom: 4,
              }}
            >
              Notes — Reference metrics by number (e.g., #5 — Water heater replaced in 2022)
            </label>
            <textarea
              id="ws-notes"
              rows={5}
              value={fields["notes"] ?? ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "8px 10px",
                border: "1px solid #d4e8d8",
                borderRadius: 6,
                fontSize: 13,
                color: "#1a2e1a",
                background: "#fff",
                resize: "vertical",
                outline: "none",
                transition: "border-color 0.15s",
                fontFamily: "inherit",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#1a7a3c"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#d4e8d8"; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
