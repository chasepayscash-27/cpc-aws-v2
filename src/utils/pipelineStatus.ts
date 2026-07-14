export const PIPELINE_STATUS_COLORS = {
  negotiation: "#f59e0b",
  pending_purchase: "#8b5cf6",
  under_contract: "#2563eb",
  under_construction: "#fb923c",
  punch_list: "#d97706",
  active_listing: "#ec4899",
  completed: "#16a34a",
  on_hold: "#6b7280",
  unknown: "#94a3b8",
} as const;

/**
 * Stage values that represent an archived/removed project.
 * These should be excluded from all active-pipeline views.
 */
export const ARCHIVED_STAGES = new Set([
  "archived",
  "archive",
]);

/**
 * Returns true when the given stage string marks a project as archived in
 * Flipper Force, meaning it must be hidden from the active pipeline.
 */
export function isArchivedStage(stage?: string | null): boolean {
  if (!stage) return false;
  return ARCHIVED_STAGES.has(stage.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " "));
}

/**
 * All Flipper Force stage values that belong to the "Negotiation" bucket
 * (lead → under offer). Kept in sync with PIPELINE_STATUS_COLOR_ALIASES.
 */
export const NEGOTIATION_STAGES = new Set([
  "negotiation",
  "under negotiation",
  "lead",
  "contacting seller",
  "appointment set",
  "offer made",
]);

const PIPELINE_STATUS_COLOR_ALIASES: Record<string, keyof typeof PIPELINE_STATUS_COLORS> = {
  negotiation: "negotiation",
  "under negotiation": "negotiation",
  lead: "negotiation",
  "contacting seller": "negotiation",
  "appointment set": "negotiation",
  "offer made": "negotiation",
  pending: "pending_purchase",
  "pending purchase": "pending_purchase",
  "pending sale": "under_contract",
  "planning permitting": "under_contract",
  "planning / permitting": "under_contract",
  "under contract": "under_contract",
  "under construction": "under_construction",
  "punch list": "punch_list",
  active: "active_listing",
  "active listing": "active_listing",
  completed: "completed",
  "completed portfolio": "completed",
  closed: "completed",
  sold: "completed",
  "on hold": "on_hold",
  "construction on hold": "on_hold",
};

const PIPELINE_STATUS_LABELS: Record<string, string> = {
  negotiation: "Negotiation",
  "under negotiation": "Under Negotiation",
  lead: "Lead",
  "appointment set": "Appointment Set",
  "offer made": "Offer Made",
  pending: "Pending",
  "pending purchase": "Pending Purchase",
  "pending sale": "Under Contract",
  "planning permitting": "Under Contract",
  "planning / permitting": "Under Contract",
  "under contract": "Under Contract",
  "under construction": "Under Construction",
  "punch list": "Punch List",
  active: "Active",
  "active listing": "Active Listing",
  completed: "Completed",
  "completed portfolio": "Completed Portfolio",
  closed: "Closed",
  sold: "Sold",
  "on hold": "On Hold",
  "construction on hold": "Construction On Hold",
};

export function normalizePipelineStatus(status?: string | null): string {
  return (status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function getPipelineStatusColor(status?: string | null): string {
  const normalized = normalizePipelineStatus(status);
  const colorKey = PIPELINE_STATUS_COLOR_ALIASES[normalized];
  return colorKey ? PIPELINE_STATUS_COLORS[colorKey] : PIPELINE_STATUS_COLORS.unknown;
}

export function getPipelineStatusLabel(status?: string | null): string {
  const normalized = normalizePipelineStatus(status);
  if (!normalized) return "Unknown";
  return PIPELINE_STATUS_LABELS[normalized] ?? normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

export const PIPELINE_STATUS_LEGEND = [
  { key: "negotiation", label: "Negotiation", color: PIPELINE_STATUS_COLORS.negotiation },
  {
    key: "pending-purchase",
    label: "Pending Purchase",
    color: PIPELINE_STATUS_COLORS.pending_purchase,
  },
  {
    key: "under-contract",
    label: "Under Contract",
    color: PIPELINE_STATUS_COLORS.under_contract,
  },
  {
    key: "under-construction",
    label: "Under Construction",
    color: PIPELINE_STATUS_COLORS.under_construction,
  },
  { key: "punch-list", label: "Punch List", color: PIPELINE_STATUS_COLORS.punch_list },
  {
    key: "active-listing",
    label: "Active Listing",
    color: PIPELINE_STATUS_COLORS.active_listing,
  },
  { key: "completed", label: "Completed", color: PIPELINE_STATUS_COLORS.completed },
  { key: "on-hold", label: "On Hold", color: PIPELINE_STATUS_COLORS.on_hold },
  { key: "unknown", label: "Unknown", color: PIPELINE_STATUS_COLORS.unknown },
] as const;
