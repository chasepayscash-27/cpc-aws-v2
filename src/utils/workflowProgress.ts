import type { Schema } from "../../amplify/data/resource";
import { defaultWorkflow, resolveTaskWorkflowType } from "../data/defaultWorkflow";

type PropertyTask = Schema["PropertyTask"]["type"];
type WorkflowProgress = { percent: number; completed: number; total: number };

const MAIN_WORKFLOW_TOTAL = defaultWorkflow.filter(
  (t) => t.workflowType === "Main Workflow",
).length;

/**
 * Thresholds that map a progress percentage to a semantic color tier.
 * Values are lower-bound-inclusive:
 *   - [0, LOW_MAX)       → red
 *   - [LOW_MAX, HIGH_MIN) → yellow
 *   - [HIGH_MIN, 100]     → green
 */
export const PROGRESS_THRESHOLDS = {
  /** Anything below this is considered low progress (red). */
  LOW_MAX: 34,
  /** Anything at or above this is considered high progress (green). */
  HIGH_MIN: 67,
} as const;

export type ProgressColorTier = "red" | "yellow" | "green";

/**
 * Maps a 0–100 progress percentage to a semantic color tier.
 * Handles null/undefined gracefully by treating them as 0.
 */
export function getProgressColorTier(percent: number | null | undefined): ProgressColorTier {
  const value = percent ?? 0;
  if (value < PROGRESS_THRESHOLDS.LOW_MAX) return "red";
  if (value < PROGRESS_THRESHOLDS.HIGH_MIN) return "yellow";
  return "green";
}

/**
 * Resolves a color tier to its background/foreground CSS values for the badge.
 * Colors are chosen to satisfy WCAG AA contrast requirements.
 */
export function getProgressColors(tier: ProgressColorTier): {
  background: string;
  color: string;
  border: string;
} {
  switch (tier) {
    case "red":
      return { background: "#fee2e2", color: "#991b1b", border: "#fca5a5" };
    case "yellow":
      return { background: "#fef3c7", color: "#92400e", border: "#fcd34d" };
    case "green":
      return { background: "#dcfce7", color: "#14532d", border: "#86efac" };
  }
}

/**
 * Counts main-workflow task completion for a single property from a shared
 * flat list of all PropertyTasks (as returned by PropertyTasksContext).
 *
 * Only "Main Workflow" tasks are included; construction / checklist tasks are
 * excluded so this number matches the progress shown in PropertyWorkflow.tsx.
 *
 * Edge cases:
 * - Returns 0 / defaultWorkflow.length when `propertyId` is falsy.
 * - Returns 0 / defaultWorkflow.length when no tasks match the propertyId.
 * - Returns 0 percent when total is 0 (defensive; should not happen in practice).
 */
export function computeMainWorkflowProgress(
  allTasks: PropertyTask[],
  propertyId: string | null | undefined,
): WorkflowProgress {
  if (!propertyId) {
    return { percent: 0, completed: 0, total: MAIN_WORKFLOW_TOTAL };
  }

  const propertyTasks = allTasks.filter(
    (t) => t.propertyId === propertyId && resolveTaskWorkflowType(t) === "Main Workflow",
  );

  if (propertyTasks.length === 0) {
    return { percent: 0, completed: 0, total: MAIN_WORKFLOW_TOTAL };
  }

  const completed = propertyTasks.filter((t) => !!t.isComplete).length;
  const total = Math.max(propertyTasks.length, MAIN_WORKFLOW_TOTAL);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { percent, completed, total };
}

/**
 * Computes main-workflow progress for all properties in one pass.
 * Useful for list views (e.g. Home pipeline tiles) to avoid repeated filtering.
 */
export function computeMainWorkflowProgressByProperty(
  allTasks: PropertyTask[],
): Record<string, WorkflowProgress> {
  const progressByProperty: Record<string, { completed: number; total: number }> = {};

  for (const task of allTasks) {
    if (!task.propertyId || resolveTaskWorkflowType(task) !== "Main Workflow") continue;

    const current = progressByProperty[task.propertyId] ?? { completed: 0, total: 0 };
    progressByProperty[task.propertyId] = {
      completed: current.completed + (task.isComplete ? 1 : 0),
      total: current.total + 1,
    };
  }

  const result: Record<string, WorkflowProgress> = {};
  for (const [propertyId, progress] of Object.entries(progressByProperty)) {
    const total = Math.max(progress.total, MAIN_WORKFLOW_TOTAL);
    result[propertyId] = {
      completed: progress.completed,
      total,
      percent: total === 0 ? 0 : Math.round((progress.completed / total) * 100),
    };
  }

  return result;
}
