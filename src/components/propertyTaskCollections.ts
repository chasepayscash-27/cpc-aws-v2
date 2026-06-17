import type { Schema } from "../../amplify/data/resource";
import { defaultWorkflow } from "../data/defaultWorkflow";
import { dedupeTasksByCanonicalOrder } from "./propertyWorkflowNormalization";

type PropertyTask = Schema["PropertyTask"]["type"];

const constructionTaskOrders = new Set<number>([5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);

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
  const { keepByOrder } = dedupeTasksByCanonicalOrder(tasks);
  const result: PropertyTask[] = [];

  for (const workflowTask of defaultWorkflow) {
    if (!constructionTaskOrders.has(workflowTask.order)) continue;
    const task = keepByOrder.get(workflowTask.order);
    if (task) result.push(task);
  }

  return result;
}
