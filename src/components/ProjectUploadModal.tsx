import { ChangeEvent, CSSProperties, FormEvent, useMemo, useState } from "react";
import type { CustomProjectAttachment, CustomAttachmentType, ProjectRow } from "../types/project";

interface Props {
  initialProject?: ProjectRow | null;
  onClose: () => void;
  onSave: (project: ProjectRow) => void;
}

interface FormState {
  name: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  stage: string;
  investment_strategy: string;
  type: string;
  style: string;
  square_feet: string;
  beds: string;
  baths: string;
  year_built: string;
  lat: string;
  lng: string;
}

const inputStyle: CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--panel2)",
  color: "var(--text)",
  fontSize: 13,
};

function buildFormState(project?: ProjectRow | null): FormState {
  return {
    name: project?.name ?? "",
    address_1: project?.address_1 ?? "",
    address_2: project?.address_2 ?? "",
    city: project?.city ?? "",
    state: project?.state ?? "",
    postal_code: project?.postal_code ?? "",
    country: project?.country ?? "",
    stage: project?.stage ?? "",
    investment_strategy: project?.investment_strategy ?? "",
    type: project?.type ?? "",
    style: project?.style ?? "",
    square_feet: project?.square_feet ?? "",
    beds: project?.beds ?? "",
    baths: project?.baths ?? "",
    year_built: project?.year_built ?? "",
    lat: project?.lat ?? "",
    lng: project?.lng ?? "",
  };
}

function parseExistingAttachments(project?: ProjectRow | null): CustomProjectAttachment[] {
  if (!project?.custom_attachments_json) return [];
  try {
    const parsed = JSON.parse(project.custom_attachments_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function detectAttachmentType(file: File): CustomAttachmentType {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
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

export default function ProjectUploadModal({ initialProject, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(() => buildFormState(initialProject));
  const [attachments, setAttachments] = useState<CustomProjectAttachment[]>(() =>
    parseExistingAttachments(initialProject)
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!initialProject;

  const title = isEdit ? "Edit Uploaded Project" : "Upload New Project";
  const photoCount = useMemo(
    () => attachments.filter((a) => a.attachment_type === "photo").length,
    [attachments]
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setError("");
    setIsUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(fileToAttachment));
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch {
      setError("Failed to read one or more selected files.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }

    const addressPieces = [form.address_1, form.address_2, form.city, form.state, form.postal_code]
      .map((v) => v.trim())
      .filter(Boolean);
    const fullAddress = addressPieces.join(", ");
    const primaryPhoto = attachments.find((item) => item.attachment_type === "photo");
    const now = new Date().toISOString();

    onSave({
      ...initialProject,
      ...form,
      name: form.name.trim(),
      full_address: fullAddress || initialProject?.full_address,
      project_uuid: initialProject?.project_uuid ?? crypto.randomUUID(),
      featured_image_url: primaryPhoto?.data_url ?? initialProject?.featured_image_url,
      custom_project: "true",
      custom_attachments_json: JSON.stringify(attachments),
      created_at: initialProject?.created_at ?? now,
      updated_at: now,
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1200,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: "min(980px, 100%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ ...inputStyle, cursor: "pointer" }}>
            Close
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input placeholder="Project Name *" value={form.name} onChange={(e) => updateField("name", e.target.value)} style={inputStyle} />
          <input placeholder="Address 1" value={form.address_1} onChange={(e) => updateField("address_1", e.target.value)} style={inputStyle} />
          <input placeholder="Address 2" value={form.address_2} onChange={(e) => updateField("address_2", e.target.value)} style={inputStyle} />
          <input placeholder="City" value={form.city} onChange={(e) => updateField("city", e.target.value)} style={inputStyle} />
          <input placeholder="State" value={form.state} onChange={(e) => updateField("state", e.target.value)} style={inputStyle} />
          <input placeholder="Postal Code" value={form.postal_code} onChange={(e) => updateField("postal_code", e.target.value)} style={inputStyle} />
          <input placeholder="Country" value={form.country} onChange={(e) => updateField("country", e.target.value)} style={inputStyle} />
          <input placeholder="Stage (e.g. under_construction)" value={form.stage} onChange={(e) => updateField("stage", e.target.value)} style={inputStyle} />
          <input placeholder="Strategy (e.g. fix_and_flip)" value={form.investment_strategy} onChange={(e) => updateField("investment_strategy", e.target.value)} style={inputStyle} />
          <input placeholder="Type" value={form.type} onChange={(e) => updateField("type", e.target.value)} style={inputStyle} />
          <input placeholder="Style" value={form.style} onChange={(e) => updateField("style", e.target.value)} style={inputStyle} />
          <input placeholder="Square Feet" value={form.square_feet} onChange={(e) => updateField("square_feet", e.target.value)} style={inputStyle} />
          <input placeholder="Beds" value={form.beds} onChange={(e) => updateField("beds", e.target.value)} style={inputStyle} />
          <input placeholder="Baths" value={form.baths} onChange={(e) => updateField("baths", e.target.value)} style={inputStyle} />
          <input placeholder="Year Built" value={form.year_built} onChange={(e) => updateField("year_built", e.target.value)} style={inputStyle} />
          <input placeholder="Latitude" value={form.lat} onChange={(e) => updateField("lat", e.target.value)} style={inputStyle} />
          <input placeholder="Longitude" value={form.lng} onChange={(e) => updateField("lng", e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 8 }}>
            Attachments (photos/videos/files)
          </div>
          <input type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            {attachments.length} total attachments • {photoCount} photo{photoCount === 1 ? "" : "s"}
          </div>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  background: "var(--panel2)",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {attachment.attachment_type.toUpperCase()} • {attachment.name}
                </div>
                <button type="button" onClick={() => removeAttachment(attachment.id)} style={{ ...inputStyle, padding: "4px 8px", cursor: "pointer" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <div style={{ marginTop: 12, color: "rgba(239,68,68,0.95)", fontSize: 13 }}>{error}</div>}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={{ ...inputStyle, cursor: "pointer" }}>
            Cancel
          </button>
          <button type="submit" disabled={isUploading} style={{ ...inputStyle, borderColor: "var(--accent)", color: "var(--accent)", cursor: "pointer" }}>
            {isUploading ? "Uploading…" : isEdit ? "Save Project" : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
