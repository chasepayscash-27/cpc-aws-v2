import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import {
  PROGRESS_THRESHOLDS,
  computeMainWorkflowProgressByProperty,
  computeMainWorkflowProgress,
  getProgressColorTier,
  getProgressColors,
} from "./workflowProgress";
import { defaultWorkflow } from "../data/defaultWorkflow";

type PropertyTask = Schema["PropertyTask"]["type"];

function buildTask(overrides: Partial<PropertyTask>): PropertyTask {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    propertyId: overrides.propertyId ?? "prop-1",
    stage: overrides.stage ?? "Make an offer",
    order: overrides.order ?? 1,
    owner: overrides.owner ?? null,
    responsibilities: overrides.responsibilities ?? null,
    notes: overrides.notes ?? null,
    isComplete: overrides.isComplete ?? false,
    workflowType: overrides.workflowType ?? "Main Workflow",
    subWorkflowType: overrides.subWorkflowType ?? null,
    completedAt: overrides.completedAt ?? null,
    completedBy: overrides.completedBy ?? null,
    assigneeId: overrides.assigneeId ?? null,
    alertRecipientId: overrides.alertRecipientId ?? null,
    taskNote: overrides.taskNote ?? null,
    taskNoteCreatedAt: overrides.taskNoteCreatedAt ?? null,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  } as PropertyTask;
}

describe("getProgressColorTier", () => {
  it("returns red for 0%", () => {
    expect(getProgressColorTier(0)).toBe("red");
  });

  it("returns red for values below LOW_MAX", () => {
    expect(getProgressColorTier(PROGRESS_THRESHOLDS.LOW_MAX - 1)).toBe("red");
  });

  it("returns yellow at LOW_MAX threshold", () => {
    expect(getProgressColorTier(PROGRESS_THRESHOLDS.LOW_MAX)).toBe("yellow");
  });

  it("returns yellow between LOW_MAX and HIGH_MIN", () => {
    expect(getProgressColorTier(50)).toBe("yellow");
  });

  it("returns green at HIGH_MIN threshold", () => {
    expect(getProgressColorTier(PROGRESS_THRESHOLDS.HIGH_MIN)).toBe("green");
  });

  it("returns green for 100%", () => {
    expect(getProgressColorTier(100)).toBe("green");
  });

  it("treats null as 0 (red)", () => {
    expect(getProgressColorTier(null)).toBe("red");
  });

  it("treats undefined as 0 (red)", () => {
    expect(getProgressColorTier(undefined)).toBe("red");
  });
});

describe("getProgressColors", () => {
  it("returns distinct non-empty colors for each tier", () => {
    const red = getProgressColors("red");
    const yellow = getProgressColors("yellow");
    const green = getProgressColors("green");

    expect(red.background).toBeTruthy();
    expect(yellow.background).toBeTruthy();
    expect(green.background).toBeTruthy();

    // Backgrounds must differ across tiers
    expect(new Set([red.background, yellow.background, green.background]).size).toBe(3);
  });
});

describe("computeMainWorkflowProgress", () => {
  const mainTotal = defaultWorkflow.filter((t) => t.workflowType === "Main Workflow").length;

  it("returns 0/total for empty task list", () => {
    const result = computeMainWorkflowProgress([], "prop-1");
    expect(result.percent).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.total).toBe(mainTotal);
  });

  it("returns 0/total for null propertyId", () => {
    const tasks = [buildTask({ propertyId: "prop-1", isComplete: true })];
    const result = computeMainWorkflowProgress(tasks, null);
    expect(result.percent).toBe(0);
    expect(result.total).toBe(mainTotal);
  });

  it("returns 0/total for undefined propertyId", () => {
    const result = computeMainWorkflowProgress([], undefined);
    expect(result.percent).toBe(0);
    expect(result.total).toBe(mainTotal);
  });

  it("excludes tasks belonging to a different property", () => {
    const tasks = [buildTask({ propertyId: "other-prop", isComplete: true })];
    const result = computeMainWorkflowProgress(tasks, "prop-1");
    expect(result.percent).toBe(0);
    expect(result.completed).toBe(0);
  });

  it("excludes non-Main-Workflow tasks from the count", () => {
    const tasks = [
      buildTask({ propertyId: "prop-1", workflowType: "Construction Workflow", isComplete: true }),
    ];
    const result = computeMainWorkflowProgress(tasks, "prop-1");
    expect(result.completed).toBe(0);
  });

  it("counts completed main workflow tasks correctly", () => {
    const tasks = [
      buildTask({ propertyId: "prop-1", order: 1, workflowType: "Main Workflow", isComplete: true }),
      buildTask({ propertyId: "prop-1", order: 2, workflowType: "Main Workflow", isComplete: true }),
      buildTask({ propertyId: "prop-1", order: 3, workflowType: "Main Workflow", isComplete: false }),
    ];
    const result = computeMainWorkflowProgress(tasks, "prop-1");
    expect(result.completed).toBe(2);
    expect(result.percent).toBeGreaterThan(0);
  });

  it("returns percent=100 when all main workflow tasks are complete", () => {
    const allMainTasks = defaultWorkflow
      .filter((t) => t.workflowType === "Main Workflow")
      .map((t) =>
        buildTask({ propertyId: "prop-full", order: t.order, workflowType: "Main Workflow", isComplete: true }),
      );
    const result = computeMainWorkflowProgress(allMainTasks, "prop-full");
    expect(result.percent).toBe(100);
    expect(result.completed).toBe(mainTotal);
  });

  it("percent is always in 0–100 range", () => {
    const tasks = [
      buildTask({ propertyId: "prop-1", order: 1, workflowType: "Main Workflow", isComplete: true }),
    ];
    const result = computeMainWorkflowProgress(tasks, "prop-1");
    expect(result.percent).toBeGreaterThanOrEqual(0);
    expect(result.percent).toBeLessThanOrEqual(100);
  });
});

describe("computeMainWorkflowProgressByProperty", () => {
  const mainTotal = defaultWorkflow.filter((t) => t.workflowType === "Main Workflow").length;

  it("builds per-property progress in one pass", () => {
    const results = computeMainWorkflowProgressByProperty([
      buildTask({ propertyId: "prop-1", order: 1, isComplete: true }),
      buildTask({ propertyId: "prop-1", order: 2, isComplete: false }),
      buildTask({ propertyId: "prop-2", order: 1, isComplete: true }),
      buildTask({ propertyId: "prop-2", order: 2, isComplete: true }),
    ]);

    expect(results["prop-1"]?.completed).toBe(1);
    expect(results["prop-2"]?.completed).toBe(2);
    expect(results["prop-1"]?.total).toBe(mainTotal);
  });

  it("ignores non-main-workflow and missing-property tasks", () => {
    const results = computeMainWorkflowProgressByProperty([
      buildTask({ propertyId: "prop-1", order: 9991, workflowType: "Construction Workflow", isComplete: true }),
      buildTask({ propertyId: "prop-1", order: 9992, workflowType: "Check List Workflow", isComplete: true }),
      buildTask({ propertyId: "", workflowType: "Main Workflow", isComplete: true }),
    ]);

    expect(results["prop-1"]).toBeUndefined();
  });
});
