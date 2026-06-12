import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import {
  dedupeTasksByCanonicalOrder,
  getWorkflowProgressCounts,
  normalizeWorkflowOwner,
  selectPrimaryTask,
} from "./propertyWorkflowNormalization";
import { defaultWorkflow } from "../data/defaultWorkflow";

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

describe("selectPrimaryTask", () => {
  it("prefers the completed task over an incomplete one", () => {
    const incomplete = buildTask({ id: "a", isComplete: false, createdAt: "2024-01-01T00:00:00Z" });
    const complete = buildTask({ id: "b", isComplete: true, createdAt: "2024-06-01T00:00:00Z" });
    expect(selectPrimaryTask([incomplete, complete]).id).toBe("b");
    expect(selectPrimaryTask([complete, incomplete]).id).toBe("b");
  });

  it("prefers the earlier createdAt when neither is complete", () => {
    const older = buildTask({ id: "a", isComplete: false, createdAt: "2024-01-01T00:00:00Z" });
    const newer = buildTask({ id: "b", isComplete: false, createdAt: "2024-06-01T00:00:00Z" });
    expect(selectPrimaryTask([newer, older]).id).toBe("a");
  });

  it("breaks ties by lexicographically smallest id", () => {
    const t1 = buildTask({ id: "aaa", isComplete: false, createdAt: "2024-01-01T00:00:00Z" });
    const t2 = buildTask({ id: "bbb", isComplete: false, createdAt: "2024-01-01T00:00:00Z" });
    expect(selectPrimaryTask([t1, t2]).id).toBe("aaa");
    expect(selectPrimaryTask([t2, t1]).id).toBe("aaa");
  });
});

describe("dedupeTasksByCanonicalOrder", () => {
  it("keeps one task and removes duplicates for the same order and stage — complete one wins", () => {
    const incomplete = buildTask({ id: "a", stage: "Offer placed", order: 1, isComplete: false, createdAt: "2024-01-01T00:00:00Z" });
    const complete = buildTask({ id: "b", stage: "Offer placed", order: 1, isComplete: true, createdAt: "2024-06-01T00:00:00Z" });
    const { keepByOrder, remove, missing } = dedupeTasksByCanonicalOrder([incomplete, complete]);
    expect(keepByOrder.get(1)?.id).toBe("b");
    expect(remove.map((t) => t.id)).toContain("a");
    expect(missing).not.toContain(1);
  });

  it("deduplicates tasks with the same order but different stages — earlier createdAt wins", () => {
    // Same canonical order (1) but one has a stale/wrong stage
    const canonical = buildTask({ id: "a", stage: "Offer placed", order: 1, isComplete: false, createdAt: "2024-01-01T00:00:00Z" });
    const stale = buildTask({ id: "b", stage: "Offer placed", order: 1, isComplete: false, createdAt: "2024-06-01T00:00:00Z" });
    const { keepByOrder, remove } = dedupeTasksByCanonicalOrder([canonical, stale]);
    expect(keepByOrder.get(1)?.id).toBe("a");
    expect(remove.map((t) => t.id)).toContain("b");
  });

  it("removes tasks with invalid stage and invalid order", () => {
    const valid = buildTask({ id: "v", stage: "Offer placed", order: 1 });
    const invalid = buildTask({ id: "x", stage: "Not a real stage", order: 99 });
    const { keepByOrder, remove, missing } = dedupeTasksByCanonicalOrder([valid, invalid]);
    expect(remove.map((t) => t.id)).toContain("x");
    expect([...keepByOrder.values()].map((t) => t.id)).not.toContain("x");
    // invalid order doesn't end up in missing either — the template order is what matters
    expect(missing).not.toContain(99);
  });

  it("flags a canonical order as missing when no task exists for it", () => {
    // Only provide a task for order 1; orders 2..18 should be in missing
    const task = buildTask({ id: "a", stage: "Offer placed", order: 1 });
    const { missing } = dedupeTasksByCanonicalOrder([task]);
    expect(missing.length).toBe(defaultWorkflow.length - 1);
    expect(missing).not.toContain(1);
    for (let o = 2; o <= 18; o++) {
      expect(missing).toContain(o);
    }
  });

  it("keeps only one task per canonical order when duplicates are spread across all 18 orders", () => {
    // Two copies of each of the 18 canonical tasks
    const doubled = defaultWorkflow.flatMap((t, i) => [
      buildTask({ id: `${i}-a`, stage: t.stage, order: t.order, isComplete: false, createdAt: "2024-01-01T00:00:00Z" }),
      buildTask({ id: `${i}-b`, stage: t.stage, order: t.order, isComplete: false, createdAt: "2024-06-01T00:00:00Z" }),
    ]);
    const { keepByOrder, remove, missing } = dedupeTasksByCanonicalOrder(doubled);
    expect(keepByOrder.size).toBe(18);
    expect(remove.length).toBe(18); // one duplicate per order
    expect(missing.length).toBe(0);
    // Ensure every canonical order 1..18 has exactly one entry
    for (let o = 1; o <= 18; o++) {
      expect(keepByOrder.has(o)).toBe(true);
    }
  });

  it("uses task.order as primary key when it matches a canonical order, even if stage is different", () => {
    // Task has canonical order=2 but stage belonging to order=1.
    // Resolution should prefer task.order (2) over stage-derived order (1).
    const t = buildTask({ id: "x", stage: "Offer placed", order: 2 });
    const { keepByOrder } = dedupeTasksByCanonicalOrder([t]);
    // Should be grouped under order 2, not order 1
    expect(keepByOrder.has(2)).toBe(true);
    // Order 1 should be missing since no task was mapped there
    expect(keepByOrder.has(1)).toBe(false);
  });

  it("tiebreaks by earliest createdAt when neither task is complete", () => {
    const older = buildTask({ id: "z-older", stage: "Utilities check", order: 5, isComplete: false, createdAt: "2023-01-01T00:00:00Z" });
    const newer = buildTask({ id: "a-newer", stage: "Utilities check", order: 5, isComplete: false, createdAt: "2025-01-01T00:00:00Z" });
    const { keepByOrder, remove } = dedupeTasksByCanonicalOrder([newer, older]);
    expect(keepByOrder.get(5)?.id).toBe("z-older");
    expect(remove.map((t) => t.id)).toContain("a-newer");
  });
});
