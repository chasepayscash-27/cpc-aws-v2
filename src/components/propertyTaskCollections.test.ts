import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import { filterTasksForTeamTab, getChecklistWorkflowTasks, getConstructionWorkflowTaskGroups, getConstructionWorkflowTasks, getPrimaryTasksAcrossProperties, getTasksForTeamMember, resolveTeamTaskAssignee } from "./propertyTaskCollections";

type PropertyTask = Schema["PropertyTask"]["type"];

function buildTask(overrides: Partial<PropertyTask>): PropertyTask {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    propertyId: "propertyId" in overrides ? (overrides.propertyId ?? null) : "property-1",
    stage: overrides.stage ?? "Task",
    order: overrides.order ?? 1,
    workflowType: overrides.workflowType ?? null,
    subWorkflowType: overrides.subWorkflowType ?? null,
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
      buildTask({ id: "construction-d", stage: "All Windows Open & Close", order: 75 }),
      buildTask({ id: "checklist", stage: "Tile ordered", order: 61 }),
    ];

    expect(getConstructionWorkflowTasks(tasks).map((task) => task.id)).toEqual([
      "construction-a",
      "construction-b",
      "construction-c",
      "construction-d",
    ]);
  });

  it("excludes ordering/scope tasks from the construction workflow", () => {
    const tasks = [
      buildTask({ id: "main", stage: "Make an offer", order: 1 }),
      buildTask({ id: "demo", stage: "All items removed", order: 19 }),
      buildTask({ id: "order-cabinets", stage: "Cabinets replaced", order: 68 }),
    ];

    const grouped = getConstructionWorkflowTaskGroups(tasks);
    expect(grouped.constructionTasks.map((task) => task.id)).toEqual(["demo"]);
    expect(grouped.allTasks.map((task) => task.id)).toEqual(["demo"]);
    expect(grouped.constructionSections.map((section) => section.label)).toEqual(["Demolition & Rough-In"]);
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

describe("filterTasksForTeamTab", () => {
  it("excludes main workflow tasks", () => {
    const tasks = [
      buildTask({ id: "main-1", stage: "Make an offer", order: 1 }),
      buildTask({ id: "main-2", stage: "Staged", order: 11 }),
    ];

    expect(filterTasksForTeamTab(tasks)).toHaveLength(0);
  });

  it("excludes construction workflow tasks", () => {
    const tasks = [
      buildTask({ id: "construction-1", stage: "All items removed", order: 19 }),
      buildTask({ id: "construction-2", stage: "Gutters Installed", order: 48 }),
    ];

    expect(filterTasksForTeamTab(tasks)).toHaveLength(0);
  });

  it("includes checklist workflow tasks", () => {
    const tasks = [
      buildTask({ id: "checklist-1", stage: "Tile ordered", order: 61 }),
      buildTask({ id: "checklist-2", stage: "Appliances Ordered", order: 69 }),
    ];

    expect(filterTasksForTeamTab(tasks).map((task) => task.id)).toEqual([
      "checklist-1",
      "checklist-2",
    ]);
  });

  it("includes Team Task entries created from the Team tab", () => {
    const tasks = [
      buildTask({
        id: "team-task-1",
        propertyId: null,
        stage: "Call title company",
        order: 10001,
        workflowType: "Team Task",
        subWorkflowType: "General Team Task",
      }),
      buildTask({
        id: "team-task-personal",
        propertyId: null,
        stage: "Review inbox",
        order: 10002,
        workflowType: "Team Task",
        subWorkflowType: "Personal Task",
      }),
    ];

    expect(filterTasksForTeamTab(tasks).map((task) => task.id)).toEqual([
      "team-task-1",
      "team-task-personal",
    ]);
  });

  it("excludes main and construction tasks while keeping checklist and team tasks", () => {
    const tasks = [
      buildTask({ id: "main", stage: "Make an offer", order: 1 }),
      buildTask({ id: "construction", stage: "All items removed", order: 19 }),
      buildTask({ id: "checklist", stage: "Tile ordered", order: 61 }),
      buildTask({
        id: "team-task",
        propertyId: null,
        stage: "Call contractor",
        order: 10001,
        workflowType: "Team Task",
        subWorkflowType: "General Team Task",
      }),
    ];

    expect(filterTasksForTeamTab(tasks).map((task) => task.id)).toEqual([
      "checklist",
      "team-task",
    ]);
  });

  it("includes checklist tasks resolved by workflowType field", () => {
    const tasks = [
      buildTask({ id: "checklist-explicit", workflowType: "Check List Workflow", order: 9999 }),
    ];

    expect(filterTasksForTeamTab(tasks).map((task) => task.id)).toEqual(["checklist-explicit"]);
  });
});

describe("team member task derivation", () => {
  it("links checklist tasks to the correct employee using assigneeId or owner fallback", () => {
    const teamTasks = filterTasksForTeamTab(getPrimaryTasksAcrossProperties([
      buildTask({ id: "checklist-kim", stage: "Tile ordered", order: 61, assigneeId: "", owner: "Kim" }),
      buildTask({ id: "checklist-lee", stage: "Appliances Ordered", order: 69, assigneeId: "Lee", owner: null }),
      buildTask({ id: "construction", stage: "All items removed", order: 19, assigneeId: "Kim" }),
    ]));

    expect(getTasksForTeamMember(teamTasks, "Kim").map((task) => task.id)).toEqual(["checklist-kim"]);
    expect(getTasksForTeamMember(teamTasks, "Lee").map((task) => task.id)).toEqual(["checklist-lee"]);
  });

  it("keeps manual team tasks alongside checklist tasks for the same employee", () => {
    const teamTasks = filterTasksForTeamTab(getPrimaryTasksAcrossProperties([
      buildTask({ id: "checklist", stage: "Tile ordered", order: 61, assigneeId: "Kim" }),
      buildTask({
        id: "manual-team-task",
        propertyId: null,
        stage: "Call title company",
        order: 10001,
        workflowType: "Team Task",
        subWorkflowType: "General Team Task",
        assigneeId: "Kim",
        owner: "Kim",
      }),
      buildTask({ id: "main", stage: "Make an offer", order: 1, assigneeId: "Kim" }),
    ]));

    expect(getTasksForTeamMember(teamTasks, "Kim").map((task) => task.id)).toEqual([
      "checklist",
      "manual-team-task",
    ]);
  });

  it("resolves direct workflowType checklist edge cases for team grouping", () => {
    const task = buildTask({
      id: "checklist-explicit-owner",
      workflowType: "Check List Workflow",
      subWorkflowType: "Ordering & Scope Checklist",
      order: 9999,
      assigneeId: "   ",
      owner: "Kevin & Matt",
    });

    expect(resolveTeamTaskAssignee(task)).toBe("Kevin/Matt");
    expect(getTasksForTeamMember([task], "Kevin")).toEqual([task]);
    expect(getTasksForTeamMember([task], "Matt")).toEqual([task]);
  });
});
