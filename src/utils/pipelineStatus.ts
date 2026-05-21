export const PIPELINE_STATUS_COLORS = {
  completed: "#16a34a",
  active: "#2563eb",
  "under negotiation": "#f59e0b",
  pending: "#8b5cf6",
  "on hold": "#6b7280",
  unknown: "#94a3b8",
} as const;

export function normalizePipelineStatus(status?: string | null): string {
  return (status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function getPipelineStatusColor(status?: string | null): string {
  const normalized = normalizePipelineStatus(status);
  if (normalized === "under negotiation") return PIPELINE_STATUS_COLORS["under negotiation"];
  if (normalized === "completed") return PIPELINE_STATUS_COLORS.completed;
  if (normalized === "active") return PIPELINE_STATUS_COLORS.active;
  if (normalized === "pending") return PIPELINE_STATUS_COLORS.pending;
  if (normalized === "on hold") return PIPELINE_STATUS_COLORS["on hold"];
  return PIPELINE_STATUS_COLORS.unknown;
}

export function getPipelineStatusLabel(status?: string | null): string {
  const normalized = normalizePipelineStatus(status);
  if (!normalized) return "Unknown";
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export const PIPELINE_STATUS_LEGEND = [
  { key: "completed", label: "Completed", color: PIPELINE_STATUS_COLORS.completed },
  { key: "active", label: "Active", color: PIPELINE_STATUS_COLORS.active },
  {
    key: "under-negotiation",
    label: "Under Negotiation",
    color: PIPELINE_STATUS_COLORS["under negotiation"],
  },
  { key: "pending", label: "Pending", color: PIPELINE_STATUS_COLORS.pending },
  { key: "on-hold", label: "On Hold", color: PIPELINE_STATUS_COLORS["on hold"] },
  { key: "unknown", label: "Unknown", color: PIPELINE_STATUS_COLORS.unknown },
] as const;
