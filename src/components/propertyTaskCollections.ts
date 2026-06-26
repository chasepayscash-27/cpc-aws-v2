import type { Schema } from "../../amplify/data/resource";
import { defaultWorkflow } from "../data/defaultWorkflow";
import { dedupeTasksByCanonicalOrder } from "./propertyWorkflowNormalization";

type PropertyTask = Schema["PropertyTask"]["type"];

const constructionTaskOrders = new Set<number>(
  defaultWorkflow.filter((task) => task.workflowType === "Construction Workflow").map((task) => task.order)
);
const orderingTaskOrders = new Set<number>(
  defaultWorkflow.filter((task) => task.workflowType === "Check List Workflow").map((task) => task.order)
);

export interface ConstructionTaskGroups {
  constructionTasks: PropertyTask[];
  orderingTasks: PropertyTask[];
  allTasks: PropertyTask[];
}

export function getPrimaryTasksAcrossProperties(tasks: PropertyTask[]): PropertyTask[] {
  const tasksByProperty = new Map<string, PropertyTask[]>();

  for (const task of tasks) {
    const propertyId = task.propertyId?.trim() ?? "";
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

  return dedupedTasks;
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

export function getConstructionWorkflowTaskGroups(tasks: PropertyTask[]): ConstructionTaskGroups {
  const { keepByOrder } = dedupeTasksByCanonicalOrder(tasks);
  const constructionTasks: PropertyTask[] = [];
  const orderingTasks: PropertyTask[] = [];

  for (const workflowTask of defaultWorkflow) {
    if (!constructionTaskOrders.has(workflowTask.order) && !orderingTaskOrders.has(workflowTask.order)) continue;
    const task = keepByOrder.get(workflowTask.order);
    if (!task) continue;

    if (orderingTaskOrders.has(workflowTask.order)) {
      orderingTasks.push(task);
    } else {
      constructionTasks.push(task);
    }
  }

  return {
    constructionTasks,
    orderingTasks,
    allTasks: [...constructionTasks, ...orderingTasks],
  };
}
