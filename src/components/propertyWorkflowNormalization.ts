import type { Schema } from "../../amplify/data/resource";
import { defaultWorkflow } from "../data/defaultWorkflow";

type PropertyTask = Schema["PropertyTask"]["type"];

const kevinMattOwnerRegex = /^\s*(?:kevin\s*(?:and|&|\/)\s*matt|matt\s*(?:and|&|\/)\s*kevin)\s*$/i;
const workflowOrderByStage = new Map(defaultWorkflow.map((task) => [task.stage, task.order]));
const validOrders = new Set(defaultWorkflow.map((task) => task.order));

function resolveWorkflowOrder(task: PropertyTask): number | null {
  const stageOrder = workflowOrderByStage.get(task.stage ?? "");
  if (stageOrder !== undefined) return stageOrder;
  const taskOrder = task.order;
  if (typeof taskOrder === "number" && validOrders.has(taskOrder)) return taskOrder;
  return null;
}

export function normalizeWorkflowOwner(owner: string | null | undefined): string | null {
  const value = owner?.trim();
  if (!value) return null;
  return kevinMattOwnerRegex.test(value) ? "Kevin/Matt" : value;
}

export function getWorkflowProgressCounts(tasks: PropertyTask[]): { totalCount: number; completedCount: number } {
  const completionByOrder = new Map<number, boolean>();

  for (const task of tasks) {
    const resolvedOrder = resolveWorkflowOrder(task);
    if (resolvedOrder === null) continue;
    completionByOrder.set(resolvedOrder, !!task.isComplete || completionByOrder.get(resolvedOrder) === true);
  }

  const completedCount = [...completionByOrder.values()].filter(Boolean).length;
  return {
    totalCount: defaultWorkflow.length,
    completedCount,
  };
}
