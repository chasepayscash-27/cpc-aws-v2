import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import {
  createTaskNotePayload,
  deriveRecipientFromRow,
  getTasksForTab,
  getWorkflowTabs,
  normalizeAlertRecipient,
  normalizePhoneToE164,
} from "./propertyWorkflowTabs";

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
    workflowType: overrides.workflowType ?? null,
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

describe("PropertyWorkflow tab helpers", () => {
  it("renders main tab and construction tab when construction tasks exist", () => {
    const tasks = [
      buildTask({ id: "1", order: 1 }),
      buildTask({ id: "2", order: 19 }),
    ];

    const tabs = getWorkflowTabs(tasks);

    expect(tabs.map((tab) => tab.label)).toEqual(["Main Workflow", "Construction Workflow"]);
  });

  it("main tab excludes construction and checklist tasks", () => {
    const tasks = [
      buildTask({ id: "main", order: 1 }),
      buildTask({ id: "construction", order: 19 }),
      buildTask({ id: "checklist", order: 60 }),
    ];

    const mainTab = getWorkflowTabs(tasks).find((tab) => tab.id === "main");
    expect(mainTab).toBeDefined();

    const filtered = getTasksForTab(tasks, mainTab!);
    expect(filtered.map((task) => task.id)).toEqual(["main"]);
  });

  it("construction tab excludes main tasks and includes construction/checklist tasks", () => {
    const tasks = [
      buildTask({ id: "main", order: 1 }),
      buildTask({ id: "construction", order: 19 }),
      buildTask({ id: "checklist", order: 60 }),
    ];

    const constructionTab = getWorkflowTabs(tasks).find((tab) => tab.id === "construction");
    expect(constructionTab).toBeDefined();

    const filtered = getTasksForTab(tasks, constructionTab!);
    expect(filtered.map((task) => task.id)).toEqual(["construction", "checklist"]);
  });

  it("falls back to canonical order when workflowType is missing on records", () => {
    const tasks = [buildTask({ id: "1", order: 1, workflowType: null }), buildTask({ id: "2", order: 19, workflowType: null })];
    const mainTab = getWorkflowTabs(tasks).find((tab) => tab.id === "main")!;
    const constructionTab = getWorkflowTabs(tasks).find((tab) => tab.id === "construction")!;
    expect(getTasksForTab(tasks, mainTab).map((task) => task.id)).toEqual(["1"]);
    expect(getTasksForTab(tasks, constructionTab).map((task) => task.id)).toEqual(["2"]);
  });

  it("normalizes alert recipient values", () => {
    expect(normalizeAlertRecipient(" alex ")).toBe("alex");
    expect(normalizeAlertRecipient("")).toBeNull();
    expect(normalizeAlertRecipient(null)).toBeNull();
  });

  describe("createTaskNotePayload", () => {
    it("returns a persisted note with timestamp", () => {
      const timestamp = new Date("2026-06-25T18:30:00.000Z");
      expect(createTaskNotePayload("  Need permit follow-up  ", timestamp)).toEqual({
        taskNote: "Need permit follow-up",
        taskNoteCreatedAt: "2026-06-25T18:30:00.000Z",
      });
    });

    it("returns null for empty drafts", () => {
      expect(createTaskNotePayload("   ")).toBeNull();
    });
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
