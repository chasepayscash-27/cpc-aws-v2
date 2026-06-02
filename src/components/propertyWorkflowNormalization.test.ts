import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import { getWorkflowProgressCounts, normalizeWorkflowOwner } from "./propertyWorkflowNormalization";

type PropertyTask = Schema["PropertyTask"]["type"];

function buildTask(overrides: Partial<PropertyTask>): PropertyTask {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    propertyId: overrides.propertyId ?? "property-1",
    stage: overrides.stage ?? "Task",
    order: overrides.order ?? 1,
    owner: overrides.owner ?? null,
    responsibilities: overrides.responsibilities ?? null,
    notes: overrides.notes ?? null,
    isComplete: overrides.isComplete ?? false,
    completedAt: overrides.completedAt ?? null,
    completedBy: overrides.completedBy ?? null,
    assigneeId: overrides.assigneeId ?? null,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  } as PropertyTask;
}

describe("property workflow normalization", () => {
  it("normalizes Kevin/Matt owner variants to canonical value", () => {
    expect(normalizeWorkflowOwner(["Matt", "and", "Kevin"].join(" "))).toBe("Kevin/Matt");
    expect(normalizeWorkflowOwner(["Kevin", "&", "Matt"].join(" "))).toBe("Kevin/Matt");
    expect(normalizeWorkflowOwner(["Matt", "Kevin"].join("/"))).toBe("Kevin/Matt");
    expect(normalizeWorkflowOwner(["Kevin", "and", "Matt"].join(" "))).toBe("Kevin/Matt");
    expect(normalizeWorkflowOwner("Kevin/Matt")).toBe("Kevin/Matt");
    expect(normalizeWorkflowOwner("Devin/Chase")).toBe("Devin/Chase");
  });

  it("reports workflow progress against canonical 18-task workflow and deduplicates duplicate orders", () => {
    const tasks = [
      buildTask({ id: "1", stage: "Offer placed", order: 1, isComplete: true }),
      buildTask({ id: "2", stage: "Offer placed", order: 1, isComplete: false }),
      buildTask({ id: "3", stage: "Closed on property", order: 2, isComplete: true }),
      buildTask({ id: "4", stage: "Initial walk through", order: 6, isComplete: false }),
      buildTask({ id: "5", stage: "Initial walk through", order: 6, isComplete: false }),
      buildTask({ id: "6", stage: "Not a workflow stage", order: 99, isComplete: true }),
    ];

    expect(getWorkflowProgressCounts(tasks)).toEqual({
      totalCount: 18,
      completedCount: 2,
    });
  });
});
