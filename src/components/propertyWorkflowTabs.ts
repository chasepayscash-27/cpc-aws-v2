import { loadCsv } from "../utils/csv";
import type { Schema } from "../../amplify/data/resource";
import { resolveTaskWorkflowType, type WorkflowType } from "../data/defaultWorkflow";

type PropertyTask = Schema["PropertyTask"]["type"];

export type WorkflowTab = { id: string; label: string; workflowType: WorkflowType };
export type WorkflowAlertRecipient = { id: string; label: string; email: string; phone: string };
export type TaskNotePayload = { taskNote: string; taskNoteCreatedAt: string };
export type TaskNoteUpdatePayload = { taskNote: string | null; taskNoteCreatedAt: string | null };
export type TaskNoteEntry = { text: string; createdAt: string };

/**
 * Parses the taskNote field into an array of note entries.
 * Supports the new JSON-array format as well as the legacy plain-string format
 * (stored before multi-note support was added).
 */
export function parseTaskNotes(
  taskNote: string | null | undefined,
  taskNoteCreatedAt?: string | null,
): TaskNoteEntry[] {
  if (!taskNote?.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(taskNote);
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item): item is TaskNoteEntry =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as Record<string, unknown>).text === "string" &&
          typeof (item as Record<string, unknown>).createdAt === "string",
      )
    ) {
      return parsed;
    }
  } catch {
    // not JSON — fall through to legacy handling
  }
  // Legacy: plain string stored directly in taskNote
  return [{ text: taskNote.trim(), createdAt: taskNoteCreatedAt ?? new Date().toISOString() }];
}

/**
 * Returns a new taskNote JSON string with the given text appended as a new entry.
 */
export function appendTaskNote(
  existing: string | null | undefined,
  newText: string,
  taskNoteCreatedAt?: string | null,
  timestamp: Date = new Date(),
): string {
  const trimmed = newText.trim();
  if (!trimmed) throw new Error("Note text must not be empty");
  const entries = parseTaskNotes(existing, taskNoteCreatedAt);
  return JSON.stringify([...entries, { text: trimmed, createdAt: timestamp.toISOString() }]);
}

/**
 * Returns a new taskNote JSON string with the entry at the given index removed,
 * or null if the list becomes empty.
 */
export function removeTaskNote(
  existing: string | null | undefined,
  index: number,
  taskNoteCreatedAt?: string | null,
): string | null {
  const entries = parseTaskNotes(existing, taskNoteCreatedAt);
  const updated = entries.filter((_, i) => i !== index);
  return updated.length > 0 ? JSON.stringify(updated) : null;
}

export function normalizePhoneToE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function deriveRecipientFromRow(row: {
  employee_name?: string;
  employee_email?: string;
  phone_number?: string;
  "\uFEFFemployee_name"?: string;
}): WorkflowAlertRecipient | null {
  const name = (row.employee_name ?? row["\uFEFFemployee_name"])?.trim();
  const email = row.employee_email?.trim();
  const phone = normalizePhoneToE164(row.phone_number);
  if (!name || !email || !phone) return null;
  const firstName = name.split(" ")[0] ?? name;
  return {
    id: firstName.toLowerCase(),
    label: firstName,
    email,
    phone,
  };
}

export async function loadWorkflowAlertRecipients(): Promise<WorkflowAlertRecipient[]> {
  type CsvRow = {
    employee_name?: string;
    "\uFEFFemployee_name"?: string;
    employee_email?: string;
    phone_number?: string;
  };
  const rows = await loadCsv<CsvRow>("/data/cpc_job_titles.csv");
  const result: WorkflowAlertRecipient[] = [];
  for (const row of rows) {
    const recipient = deriveRecipientFromRow(row);
    if (recipient) result.push(recipient);
  }
  return result;
}

export function normalizeAssignee(assigneeId: string | null | undefined): string | null {
  const value = assigneeId?.trim();
  return value ? value : null;
}

export function normalizeAlertRecipient(recipientId: string | null | undefined): string | null {
  const value = recipientId?.trim();
  return value ? value : null;
}

export function getWorkflowTabs(tasks: PropertyTask[]): WorkflowTab[] {
  const workflowTypes = new Set(tasks.map((task) => resolveTaskWorkflowType(task)).filter((value): value is WorkflowType => value !== null));
  const tabs: WorkflowTab[] = [{ id: "main", label: "Main Workflow", workflowType: "Main Workflow" }];

  if (workflowTypes.has("Construction Workflow") || workflowTypes.has("Check List Workflow")) {
    tabs.push({ id: "construction", label: "Construction Workflow", workflowType: "Construction Workflow" });
  }

  return tabs;
}

export function getTasksForTab(tasks: PropertyTask[], tab: WorkflowTab): PropertyTask[] {
  if (tab.workflowType === "Main Workflow") {
    return tasks.filter((task) => resolveTaskWorkflowType(task) === "Main Workflow");
  }

  return tasks.filter((task) => {
    const workflowType = resolveTaskWorkflowType(task);
    return workflowType === "Construction Workflow" || workflowType === "Check List Workflow";
  });
}

export function updateTask(tasks: PropertyTask[], id: string, updates: Partial<PropertyTask>): PropertyTask[] {
  return tasks.map((task) => (task.id === id ? { ...task, ...updates } : task));
}

export function createTaskNotePayload(noteDraft: string, timestamp: Date = new Date()): TaskNotePayload | null {
  const taskNote = noteDraft.trim();
  if (!taskNote) return null;
  return {
    taskNote,
    taskNoteCreatedAt: timestamp.toISOString(),
  };
}

export function createTaskNoteUpdatePayload(
  noteDraft: string,
  existingTaskNote: string | null | undefined,
  timestamp: Date = new Date(),
): TaskNoteUpdatePayload | null {
  const taskNote = noteDraft.trim();
  if (!taskNote) {
    return existingTaskNote?.trim() ? { taskNote: null, taskNoteCreatedAt: null } : null;
  }
  return {
    taskNote,
    taskNoteCreatedAt: timestamp.toISOString(),
  };
}
