import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import { getChecklistWorkflowTasks, getConstructionWorkflowTaskGroups, getConstructionWorkflowTasks, getPrimaryTasksAcrossProperties } from "./propertyTaskCollections";

type PropertyTask = Schema["PropertyTask"]["type"];

function buildTask(overrides: Partial<PropertyTask>): PropertyTask {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    propertyId: "propertyId" in overrides ? (overrides.propertyId ?? null) : "property-1",
    stage: overrides.stage ?? "Task",
    order: overrides.order ?? 1,
    owner: overrides.owner ?? null,
    responsibilities: overrides.responsibilities ?? null,
    notes: overrides.notes ?? null,
    isComplete: overrides.isComplete ?? false,
    completedAt: overrides.completedAt ?? null,
    completedBy: overrides.completedBy ?? null,
    assigneeId: overrides.assigneeId ?? null,
    alertRecipientId: overrides.alertRecipientId ?? null,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  } as PropertyTask;
}

describe("getPrimaryTasksAcrossProperties", () => {
  it("deduplicates each property with the same primary task selection used by the main workflow", () => {
    const tasks = [
      buildTask({ id: "p1-incomplete", propertyId: "property-1", stage: "Offer placed", order: 1, isComplete: false, createdAt: "2024-01-01T00:00:00Z" }),
      buildTask({ id: "p1-complete", propertyId: "property-1", stage: "Offer placed", order: 1, isComplete: true, createdAt: "2024-06-01T00:00:00Z" }),
      buildTask({ id: "p1-order-2", propertyId: "property-1", stage: "Closed on property", order: 2 }),
      buildTask({ id: "p2-order-1", propertyId: "property-2", stage: "Offer placed", order: 1 }),
    ];

    expect(getPrimaryTasksAcrossProperties(tasks).map((task) => task.id)).toEqual([
      "p1-complete",
      "p1-order-2",
      "p2-order-1",
    ]);
  });

  it("keeps non-canonical team tasks including tasks without a property", () => {
    const tasks = [
      buildTask({ id: "p1-order-1", propertyId: "property-1", stage: "Offer placed", order: 1 }),
      buildTask({
        id: "general-team-task",
        propertyId: null,
        stage: "Call electrician",
        order: 15000,
        workflowType: "Team Task",
        subWorkflowType: "General Team Task",
      }),
    ];

    expect(getPrimaryTasksAcrossProperties(tasks).map((task) => task.id)).toEqual([
      "p1-order-1",
      "general-team-task",
    ]);
    expect(getPrimaryTasksAcrossProperties(tasks).find((task) => task.id === "general-team-task")?.propertyId).toBeNull();
  });
});

describe("getConstructionWorkflowTasks", () => {
  it("returns only the construction-related workflow tasks in canonical order", () => {
    const tasks = [
      buildTask({ id: "main", stage: "Make an offer", order: 1 }),
      buildTask({ id: "construction-a", stage: "All items removed", order: 19 }),
      buildTask({ id: "construction-b", stage: "Gutters Installed", order: 48 }),
      buildTask({ id: "construction-c", stage: "garage doors open and shut", order: 59 }),
      buildTask({ id: "checklist", stage: "Tile ordered", order: 61 }),
    ];

    expect(getConstructionWorkflowTasks(tasks).map((task) => task.id)).toEqual([
      "construction-a",
      "construction-b",
      "construction-c",
      "checklist",
    ]);
  });

  it("splits ordering tasks from construction tasks", () => {
    const tasks = [
      buildTask({ id: "main", stage: "Make an offer", order: 1 }),
      buildTask({ id: "demo", stage: "All items removed", order: 19 }),
      buildTask({ id: "order-cabinets", stage: "Cabinets replaced", order: 68 }),
    ];

    const grouped = getConstructionWorkflowTaskGroups(tasks);
    expect(grouped.constructionTasks.map((task) => task.id)).toEqual(["demo"]);
    expect(grouped.orderingTasks.map((task) => task.id)).toEqual(["order-cabinets"]);
    expect(grouped.allTasks.map((task) => task.id)).toEqual(["demo", "order-cabinets"]);
    expect(grouped.constructionSections.map((section) => section.label)).toEqual(["Demolition & Rough-In"]);
    expect(grouped.orderingSections.map((section) => section.label)).toEqual(["Ordering & Scope Checklist"]);
  });
});

describe("getChecklistWorkflowTasks", () => {
  it("returns checklist workflow items in canonical order including glass shower door", () => {
    const tasks = [
      buildTask({ id: "main", stage: "Make an offer", order: 1 }),
      buildTask({ id: "tile", stage: "Tile ordered", order: 61 }),
      buildTask({ id: "glass-shower-door", stage: "glass shower door", order: 74 }),
    ];

    expect(getChecklistWorkflowTasks(tasks).map((task) => task.id)).toEqual([
      "tile",
      "glass-shower-door",
    ]);
  });
});
