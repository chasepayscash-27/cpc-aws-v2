import { loadCsv } from "../utils/csv";
import type { Schema } from "../../amplify/data/resource";

type PropertyTask = Schema["PropertyTask"]["type"];

export type WorkflowTab = { id: string; label: string; assigneeId: string | null };
export type WorkflowAlertRecipient = { id: string; label: string; email: string; phone: string };

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
  const assignees = new Set<string>();
  for (const task of tasks) {
    const assigneeId = normalizeAssignee(task.assigneeId);
    if (assigneeId) {
      assignees.add(assigneeId);
    }
  }

  return [
    { id: "main", label: "Main Workflow", assigneeId: null },
    ...[...assignees]
      .sort((a, b) => a.localeCompare(b))
      .map((assigneeId) => ({ id: `employee:${assigneeId}`, label: assigneeId, assigneeId })),
  ];
}

export function getTasksForTab(tasks: PropertyTask[], tab: WorkflowTab): PropertyTask[] {
  if (!tab.assigneeId) {
    return tasks;
  }
  return tasks.filter((task) => normalizeAssignee(task.assigneeId) === tab.assigneeId);
}

export function updateTask(tasks: PropertyTask[], id: string, updates: Partial<PropertyTask>): PropertyTask[] {
  return tasks.map((task) => (task.id === id ? { ...task, ...updates } : task));
}
