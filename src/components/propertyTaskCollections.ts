import type { Schema } from "../../amplify/data/resource";
import { defaultWorkflow, resolveTaskWorkflowType } from "../data/defaultWorkflow";
import { dedupeTasksByCanonicalOrder, normalizeWorkflowOwner } from "./propertyWorkflowNormalization";

type PropertyTask = Schema["PropertyTask"]["type"];
type WorkflowTaskDefinition = (typeof defaultWorkflow)[number];

const constructionTaskOrders = new Set<number>(
  defaultWorkflow.filter((task) => task.workflowType === "Construction Workflow").map((task) => task.order)
);
const orderingTaskOrders = new Set<number>(
  defaultWorkflow.filter((task) => task.workflowType === "Check List Workflow").map((task) => task.order)
);

export interface ConstructionTaskGroups {
  constructionTasks: PropertyTask[];
  constructionSections: { id: string; label: string; tasks: PropertyTask[] }[];
  allTasks: PropertyTask[];
}

function getTaskSubWorkflowLabel(task: WorkflowTaskDefinition): string {
  const value = task.subWorkflowType?.trim();
  return value || (task.workflowType === "Check List Workflow" ? "Ordering & Scope Checklist" : "Construction");
}

function toSectionId(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function isCanonicalWorkflowTask(task: PropertyTask): boolean {
  if (typeof task.order === "number" && defaultWorkflow.some((item) => item.order === task.order)) return true;
  const stage = task.stage?.trim();
  if (!stage) return false;
  return defaultWorkflow.some((item) => item.stage === stage);
}

function normalizeTeamMemberToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getEmployeeTokens(name: string): Set<string> {
  const cleaned = name.trim();
  const parts = cleaned.split(/\s+/).map(normalizeTeamMemberToken).filter(Boolean);
  const tokens = new Set(parts);
  tokens.add(normalizeTeamMemberToken(cleaned));
  return tokens;
}

function getAssigneeTokens(assigneeId: string): Set<string> {
  const parts = assigneeId
    .split(/(?:\band\b|\/|&|,)/i)
    .flatMap((segment) => segment.trim().split(/\s+/))
    .map(normalizeTeamMemberToken)
    .filter(Boolean);
  const tokens = new Set(parts);
  tokens.add(normalizeTeamMemberToken(assigneeId));
  return tokens;
}

export function resolveTeamTaskAssignee(task: PropertyTask): string | null {
  const assigneeId = task.assigneeId?.trim();
  if (assigneeId) return assigneeId;
  return normalizeWorkflowOwner(task.owner);
}

export function getPrimaryTasksAcrossProperties(tasks: PropertyTask[]): PropertyTask[] {
  const tasksByProperty = new Map<string, PropertyTask[]>();
  const nonCanonicalTasks: PropertyTask[] = [];

  for (const task of tasks) {
    const propertyId = task.propertyId?.trim() ?? "";
    if (!propertyId || !isCanonicalWorkflowTask(task)) {
      nonCanonicalTasks.push({ ...task, propertyId: propertyId || null });
      continue;
    }
    const group = tasksByProperty.get(propertyId) ?? [];
    group.push(task);
    tasksByProperty.set(propertyId, group);
  }

  const dedupedTasks: PropertyTask[] = [];

  for (const [propertyId, propertyTasks] of [...tasksByProperty.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const { keepByOrder } = dedupeTasksByCanonicalOrder(propertyTasks);
    for (const workflowTask of defaultWorkflow) {
      const task = keepByOrder.get(workflowTask.order);
      if (task) dedupedTasks.push({ ...task, propertyId });
    }
  }

  return [...dedupedTasks, ...nonCanonicalTasks];
}

export function getConstructionWorkflowTasks(tasks: PropertyTask[]): PropertyTask[] {
  return getConstructionWorkflowTaskGroups(tasks).allTasks;
}

export function getChecklistWorkflowTasks(tasks: PropertyTask[]): PropertyTask[] {
  const { keepByOrder } = dedupeTasksByCanonicalOrder(tasks);
  const result: PropertyTask[] = [];
  for (const workflowTask of defaultWorkflow) {
    if (!orderingTaskOrders.has(workflowTask.order)) continue;
    const task = keepByOrder.get(workflowTask.order);
    if (task) result.push(task);
  }
  return result;
}

/**
 * Returns only the tasks that should be shown in the Team tab:
 * checklist workflow tasks and manually-created Team Tasks.
 * Main Workflow and Construction Workflow tasks are excluded.
 */
export function filterTasksForTeamTab(tasks: PropertyTask[]): PropertyTask[] {
  return tasks.filter((task) => {
    if (task.workflowType === "Team Task") return true;
    return resolveTaskWorkflowType(task) === "Check List Workflow";
  });
}

export function getTasksForTeamMember(tasks: PropertyTask[], employeeName: string): PropertyTask[] {
  const employeeTokens = getEmployeeTokens(employeeName);
  return tasks.filter((task) => {
    const assigneeId = resolveTeamTaskAssignee(task);
    if (!assigneeId) return false;
    const assigneeTokens = getAssigneeTokens(assigneeId);
    for (const token of assigneeTokens) {
      if (employeeTokens.has(token)) return true;
    }
    return false;
  });
}

export function getConstructionWorkflowTaskGroups(tasks: PropertyTask[]): ConstructionTaskGroups {
  const { keepByOrder } = dedupeTasksByCanonicalOrder(tasks);
  const constructionTasks: PropertyTask[] = [];
  const constructionSections = new Map<string, { id: string; label: string; tasks: PropertyTask[] }>();

  for (const workflowTask of defaultWorkflow) {
    if (!constructionTaskOrders.has(workflowTask.order)) continue;
    const task = keepByOrder.get(workflowTask.order);
    if (!task) continue;

    const sectionLabel = getTaskSubWorkflowLabel(workflowTask);
    const sectionId = toSectionId(sectionLabel);

    constructionTasks.push(task);
    const section = constructionSections.get(sectionId) ?? { id: sectionId, label: sectionLabel, tasks: [] };
    section.tasks.push(task);
    constructionSections.set(sectionId, section);
  }

  return {
    constructionTasks,
    constructionSections: [...constructionSections.values()],
    allTasks: [...constructionTasks],
  };
}
