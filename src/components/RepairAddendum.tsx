import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CustomAttachmentType, CustomProjectAttachment, ProjectRow } from "../types/project";
import outputs from "../../amplify/amplify_outputs.json";

const HTTP_API_URL =
  (outputs as { custom?: { cpcHttpApi?: { url?: string } } })?.custom?.cpcHttpApi?.url ?? "";
const REPAIR_ADDENDUM_ENDPOINT = HTTP_API_URL
  ? `${HTTP_API_URL.replace(/\/?$/, "/")}repair-addendum`
  : "";

type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  row: ProjectRow;
}

function detectAttachmentType(file: File): CustomAttachmentType {
  if (file.type.startsWith("image/")) return "photo";
  return "file";
}

function fileToAttachment(file: File): Promise<CustomProjectAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        attachment_type: detectAttachmentType(file),
        data_url: String(reader.result ?? ""),
        created_at: new Date().toISOString(),
      });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function parseAttachments(raw: string | undefined): CustomProjectAttachment[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function RepairAddendum({ row }: Props) {
  const projectId = row.project_uuid ?? "";
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<CustomProjectAttachment[]>([]);
  const [invoices, setInvoices] = useState<CustomProjectAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [uploadError, setUploadError] = useState("");
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isUploadingInvoices, setIsUploadingInvoices] = useState(false);
  const pendingRef = useRef<{ notes: string; photos: CustomProjectAttachment[]; invoices: CustomProjectAttachment[] }>({
    notes: "",
    photos: [],
    invoices: [],
  });
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load saved values ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId || !REPAIR_ADDENDUM_ENDPOINT) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetch(`${REPAIR_ADDENDUM_ENDPOINT}?projectId=${encodeURIComponent(projectId)}`)
      .then((r) => r.json())
      .then((data: { fields?: Record<string, string>; error?: string }) => {
        if (data.error) throw new Error(data.error);
        const fields = data.fields ?? {};
        setNotes(fields.notes ?? "");
        setPhotos(parseAttachments(fields.photos_json));
        setInvoices(parseAttachments(fields.invoices_json));
      })
      .catch((err: Error) => {
        setLoadError(err.message ?? "Failed to load repair addendum data");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  // ── Persist changes (debounced) ───────────────────────────────────────────
  const flushSave = useCallback(
    async (snapshot: { notes: string; photos: CustomProjectAttachment[]; invoices: CustomProjectAttachment[] }) => {
      if (!projectId || !REPAIR_ADDENDUM_ENDPOINT) return;
      setSaveState("saving");
      try {
        const res = await fetch(REPAIR_ADDENDUM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            fields: {
              notes: snapshot.notes,
              photos_json: JSON.stringify(snapshot.photos),
              invoices_json: JSON.stringify(snapshot.invoices),
            },
          }),
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
    (updated: { notes: string; photos: CustomProjectAttachment[]; invoices: CustomProjectAttachment[] }) => {
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

  const handleNotesChange = useCallback(
    (value: string) => {
      setNotes(value);
      setSaveState("saving");
      scheduleAutoSave({ notes: value, photos, invoices });
    },
    [photos, invoices, scheduleAutoSave],
  );

  const handleManualSave = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    flushSave({ notes, photos, invoices });
  }, [notes, photos, invoices, flushSave]);

  async function handlePhotoUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploadError("");
    setIsUploadingPhotos(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(fileToAttachment));
      const updatedPhotos = [...photos, ...uploaded];
      setPhotos(updatedPhotos);
      setSaveState("saving");
      scheduleAutoSave({ notes, photos: updatedPhotos, invoices });
    } catch {
      setUploadError("Failed to read one or more selected photos.");
    } finally {
      setIsUploadingPhotos(false);
      event.target.value = "";
    }
  }

  async function handleInvoiceUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploadError("");
    setIsUploadingInvoices(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(fileToAttachment));
      const updatedInvoices = [...invoices, ...uploaded];
      setInvoices(updatedInvoices);
      setSaveState("saving");
      scheduleAutoSave({ notes, photos, invoices: updatedInvoices });
    } catch {
      setUploadError("Failed to read one or more selected invoice files.");
    } finally {
      setIsUploadingInvoices(false);
      event.target.value = "";
    }
  }

  function removePhoto(id: string) {
    const updatedPhotos = photos.filter((p) => p.id !== id);
    setPhotos(updatedPhotos);
    setSaveState("saving");
    scheduleAutoSave({ notes, photos: updatedPhotos, invoices });
  }

  function removeInvoice(id: string) {
    const updatedInvoices = invoices.filter((inv) => inv.id !== id);
    setInvoices(updatedInvoices);
    setSaveState("saving");
    scheduleAutoSave({ notes, photos, invoices: updatedInvoices });
  }

  const missingRequiredPhotos = useMemo(() => !loading && photos.length === 0, [loading, photos]);

  // ── Styles ─────────────────────────────────────────────────────────────────
  const headerStyle = {
    background: "linear-gradient(135deg, #b45309, #7c2d12)",
    borderRadius: "12px 12px 0 0",
    padding: "16px 20px",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const sectionLabelStyle = {
    fontSize: 10,
    fontWeight: 700,
    color: "#7a5230",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    display: "block",
    marginBottom: 6,
  };

  const attachmentRowStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "6px 10px",
    border: "1px solid #f0dcc4",
    borderRadius: 6,
    background: "#fff",
    fontSize: 12,
    marginBottom: 6,
  };

  const saveIndicator = () => {
    if (!REPAIR_ADDENDUM_ENDPOINT) return null;
    if (saveState === "saving")
      return <span style={{ fontSize: 12, color: "#f0c98a", fontStyle: "italic" }}>Saving…</span>;
    if (saveState === "saved")
      return <span style={{ fontSize: 12, color: "#fcd34d", fontWeight: 600 }}>✓ Saved</span>;
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
    <div style={{ border: "1px solid #f0dcc4", borderRadius: 12, overflow: "hidden", marginTop: 4 }}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>🔧 Repair Addendum</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
            Document completed repairs, required photos, and invoices for this contract
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {saveIndicator()}
          <button
            onClick={handleManualSave}
            disabled={saveState === "saving" || !REPAIR_ADDENDUM_ENDPOINT}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              cursor: saveState === "saving" || !REPAIR_ADDENDUM_ENDPOINT ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.28)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)"; }}
          >
            💾 Save
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: "#fffaf3", padding: "16px 20px" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#7a5230", padding: "20px 0", fontSize: 13 }}>
            Loading repair addendum…
          </div>
        )}
        {!loading && loadError && (
          <div style={{ color: "#c0392b", fontSize: 13, padding: "8px 0" }}>
            ⚠️ Could not load saved data: {loadError}
          </div>
        )}
        {!loading && !REPAIR_ADDENDUM_ENDPOINT && (
          <div style={{ color: "#b07d0a", fontSize: 12, marginBottom: 12, padding: "6px 10px", background: "#fffbe6", borderRadius: 6, border: "1px solid #ffe58f" }}>
            ⚠️ API endpoint not configured — edits will not be persisted until the backend is deployed.
          </div>
        )}

        {!loading && (
          <>
            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ra-notes" style={sectionLabelStyle}>
                Notes
              </label>
              <textarea
                id="ra-notes"
                rows={5}
                placeholder="Describe the repairs completed, remaining items, or details buyers/agents should know…"
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "8px 10px",
                  border: "1px solid #f0dcc4",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#3a2410",
                  background: "#fff",
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Required photos */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ra-photos" style={sectionLabelStyle}>
                Repair Completion Photos <span style={{ color: "#c0392b" }}>(required)</span>
              </label>
              <input
                id="ra-photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                disabled={isUploadingPhotos}
              />
              {missingRequiredPhotos && (
                <div style={{ color: "#c0392b", fontSize: 12, marginTop: 6 }}>
                  ⚠️ At least one photo of completed repairs is required.
                </div>
              )}
              {photos.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {photos.map((photo) => (
                    <div key={photo.id} style={attachmentRowStyle}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📷 {photo.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        style={{ background: "none", border: "1px solid #f0dcc4", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional invoices */}
            <div>
              <label htmlFor="ra-invoices" style={sectionLabelStyle}>
                Invoices (optional)
              </label>
              <input
                id="ra-invoices"
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                onChange={handleInvoiceUpload}
                disabled={isUploadingInvoices}
              />
              {invoices.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {invoices.map((invoice) => (
                    <div key={invoice.id} style={attachmentRowStyle}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🧾 {invoice.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeInvoice(invoice.id)}
                        style={{ background: "none", border: "1px solid #f0dcc4", borderRadius: 6, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {uploadError && (
              <div style={{ color: "#c0392b", fontSize: 12, marginTop: 10 }}>{uploadError}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
