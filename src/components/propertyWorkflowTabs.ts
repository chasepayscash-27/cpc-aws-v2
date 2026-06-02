import type { Schema } from "../../amplify/data/resource";

type PropertyTask = Schema["PropertyTask"]["type"];

export type WorkflowTab = { id: string; label: string; assigneeId: string | null };

export function normalizeAssignee(assigneeId: string | null | undefined): string | null {
  const value = assigneeId?.trim();
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
