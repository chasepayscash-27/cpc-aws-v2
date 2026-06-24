import type { Schema } from "../../amplify/data/resource";
import { defaultWorkflow } from "../data/defaultWorkflow";
import { dedupeTasksByCanonicalOrder } from "./propertyWorkflowNormalization";

type PropertyTask = Schema["PropertyTask"]["type"];

const constructionTaskOrders = new Set<number>([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38]);
const orderingTaskOrders = new Set<number>([39, 40, 41, 42, 43, 44, 45, 46]);

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
