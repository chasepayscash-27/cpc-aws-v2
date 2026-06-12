import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import { deriveRecipientFromRow, getTasksForTab, getWorkflowTabs, normalizeAlertRecipient, normalizePhoneToE164, updateTask } from "./propertyWorkflowTabs";

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
    alertRecipientId: overrides.alertRecipientId ?? null,
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

  it("moves a task between employee tabs when assignee changes", () => {
    const tasks = [
      buildTask({ id: "1", stage: "A", assigneeId: "Alice" }),
      buildTask({ id: "2", stage: "B", assigneeId: "Bob" }),
    ];

    const afterReassign = updateTask(tasks, "1", { assigneeId: "Bob" });
    const tabs = getWorkflowTabs(afterReassign);
    const bobTab = tabs.find((tab) => tab.label === "Bob");
    const aliceTab = tabs.find((tab) => tab.label === "Alice");

    expect(aliceTab).toBeUndefined();
    expect(bobTab).toBeDefined();
    expect(getTasksForTab(afterReassign, bobTab!).map((task) => task.id)).toEqual(["1", "2"]);
  });

  it("hides employee tabs when that employee has no assigned items", () => {
    const tasks = [buildTask({ id: "1", assigneeId: "Alice" }), buildTask({ id: "2", assigneeId: null })];

    const tabs = getWorkflowTabs(tasks);

    expect(tabs.some((tab) => tab.label === "Bob")).toBe(false);
    expect(tabs.map((tab) => tab.label)).toEqual(["Main Workflow", "Alice"]);
  });

  it("normalizes alert recipient values", () => {
    expect(normalizeAlertRecipient(" alex ")).toBe("alex");
    expect(normalizeAlertRecipient("")).toBeNull();
    expect(normalizeAlertRecipient(null)).toBeNull();
  });
});

describe("normalizePhoneToE164", () => {
  it("handles dashed 10-digit format", () => {
    expect(normalizePhoneToE164("205-500-1784")).toBe("+12055001784");
  });
  it("handles parenthesized format", () => {
    expect(normalizePhoneToE164("(205) 500-1784")).toBe("+12055001784");
  });
  it("preserves already-E.164 input", () => {
    expect(normalizePhoneToE164("+12055001784")).toBe("+12055001784");
  });
  it("returns null for empty / invalid input", () => {
    expect(normalizePhoneToE164("")).toBeNull();
    expect(normalizePhoneToE164(null)).toBeNull();
    expect(normalizePhoneToE164("not a number")).toBeNull();
    expect(normalizePhoneToE164("123")).toBeNull();
  });
});

describe("deriveRecipientFromRow", () => {
  it("derives id from first name lowercased and label from first name as-is", () => {
    expect(
      deriveRecipientFromRow({
        employee_name: "Chase Smith",
        employee_email: "chase@chasepayscash.com",
        phone_number: "205-500-1784",
      })
    ).toEqual({
      id: "chase",
      label: "Chase",
      email: "chase@chasepayscash.com",
      phone: "+12055001784",
    });
  });
  it("returns null when phone is missing or invalid", () => {
    expect(
      deriveRecipientFromRow({
        employee_name: "Foo Bar",
        employee_email: "foo@example.com",
        phone_number: "",
      })
    ).toBeNull();
  });
  it("tolerates the BOM-prefixed header", () => {
    expect(
      deriveRecipientFromRow({
        "\uFEFFemployee_name": "Alex Henderson",
        employee_email: "ahenderson@chasepayscash.com",
        phone_number: "205-914-1329",
      })
    ).toEqual({
      id: "alex",
      label: "Alex",
      email: "ahenderson@chasepayscash.com",
      phone: "+12059141329",
    });
  });
});
