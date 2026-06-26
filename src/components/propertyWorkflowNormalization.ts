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

export interface DedupeResult {
  /** One primary task per canonical order that has at least one task in the input. */
  keepByOrder: Map<number, PropertyTask>;
  /** Duplicate and unmappable tasks that should be deleted. */
  remove: PropertyTask[];
  /** Canonical order numbers from `defaultWorkflow` for which no task was found in the input. */
  missing: number[];
}

/**
 * Deterministically picks the "winner" from a group of duplicate tasks for
 * the same canonical order.
 * Priority: completed task > earliest createdAt > lexicographically smallest id.
 */
export function selectPrimaryTask(group: PropertyTask[]): PropertyTask {
  return group.reduce((best, task) => {
    if (task.isComplete && !best.isComplete) return task;
    if (!task.isComplete && best.isComplete) return best;
    const bestTime = best.createdAt ?? "";
    const taskTime = task.createdAt ?? "";
    if (taskTime < bestTime) return task;
    if (taskTime > bestTime) return best;
    return task.id < best.id ? task : best;
  });
}

/**
 * Groups `tasks` by canonical order from `defaultWorkflow` and identifies:
 *  - The single primary task to keep for each order (via `selectPrimaryTask`).
 *  - Extra duplicates and unmappable tasks to remove.
 *  - Canonical orders that have no task at all (need to be created).
 *
 * Canonical order resolution per task:
 *  1. Use `task.order` if it is a valid canonical order number in `defaultWorkflow`.
 *  2. Otherwise fall back to the order that `task.stage` maps to in `defaultWorkflow`.
 *  3. If neither maps, the task is unmappable and goes into `remove`.
 */
export function dedupeTasksByCanonicalOrder(tasks: PropertyTask[]): DedupeResult {
  const groupedByOrder = new Map<number, PropertyTask[]>();
  const remove: PropertyTask[] = [];

  for (const task of tasks) {
    let canonicalOrder: number | undefined;
    const taskOrder = task.order;
    if (typeof taskOrder === "number" && validOrders.has(taskOrder)) {
      canonicalOrder = taskOrder;
    } else {
      canonicalOrder = workflowOrderByStage.get(task.stage ?? "");
    }

    if (canonicalOrder === undefined) {
      remove.push(task);
      continue;
    }

    const group = groupedByOrder.get(canonicalOrder) ?? [];
    group.push(task);
    groupedByOrder.set(canonicalOrder, group);
  }

  const keepByOrder = new Map<number, PropertyTask>();
  const missing: number[] = [];

  for (const templateTask of defaultWorkflow) {
    const group = groupedByOrder.get(templateTask.order);
    if (!group || group.length === 0) {
      missing.push(templateTask.order);
    } else {
      const primary = selectPrimaryTask(group);
      keepByOrder.set(templateTask.order, primary);
      for (const dup of group) {
        if (dup.id !== primary.id) remove.push(dup);
      }
    }
  }

  return { keepByOrder, remove, missing };
}
