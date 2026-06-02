import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import { getTasksForTab, getWorkflowTabs, updateTask } from "./propertyWorkflowTabs";

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

describe("PropertyWorkflow tab helpers", () => {
  it("renders main tab plus one tab per assigned employee", () => {
    const tasks = [
      buildTask({ id: "1", assigneeId: "Alice" }),
      buildTask({ id: "2", assigneeId: "Bob" }),
      buildTask({ id: "3", assigneeId: "Alice" }),
      buildTask({ id: "4", assigneeId: null }),
    ];

    const tabs = getWorkflowTabs(tasks);

    expect(tabs.map((tab) => tab.label)).toEqual(["Main Workflow", "Alice", "Bob"]);
  });

  it("filters employee tab to only that employee's tasks", () => {
    const tasks = [
      buildTask({ id: "1", stage: "A", assigneeId: "Alice" }),
      buildTask({ id: "2", stage: "B", assigneeId: "Bob" }),
      buildTask({ id: "3", stage: "C", assigneeId: null }),
    ];

    const aliceTab = getWorkflowTabs(tasks).find((tab) => tab.label === "Alice");
    expect(aliceTab).toBeDefined();

    const filtered = getTasksForTab(tasks, aliceTab!);
    expect(filtered.map((task) => task.id)).toEqual(["1"]);
  });

  it("keeps one underlying record so main and employee views stay in sync", () => {
    const tasks = [
      buildTask({ id: "1", stage: "A", assigneeId: "Alice", isComplete: false }),
      buildTask({ id: "2", stage: "B", assigneeId: "Bob", isComplete: false }),
    ];

    const aliceTab = getWorkflowTabs(tasks).find((tab) => tab.label === "Alice")!;

    const afterToggle = updateTask(tasks, "1", { isComplete: true, completedBy: "Alice" });

    const mainTask = getTasksForTab(afterToggle, { id: "main", label: "Main Workflow", assigneeId: null }).find(
      (task) => task.id === "1"
    );
    const aliceTask = getTasksForTab(afterToggle, aliceTab).find((task) => task.id === "1");

    expect(mainTask?.isComplete).toBe(true);
    expect(aliceTask?.isComplete).toBe(true);
    expect(mainTask?.completedBy).toBe("Alice");
    expect(aliceTask?.completedBy).toBe("Alice");
  });

  it("hides employee tabs when that employee has no assigned items", () => {
    const tasks = [buildTask({ id: "1", assigneeId: "Alice" }), buildTask({ id: "2", assigneeId: null })];

    const tabs = getWorkflowTabs(tasks);

    expect(tabs.some((tab) => tab.label === "Bob")).toBe(false);
    expect(tabs.map((tab) => tab.label)).toEqual(["Main Workflow", "Alice"]);
  });
});
