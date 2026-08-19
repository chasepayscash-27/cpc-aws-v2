import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import {
  appendTaskNote,
  createTaskNotePayload,
  createTaskNoteUpdatePayload,
  deriveRecipientFromRow,
  getTasksForTab,
  getWorkflowTabs,
  normalizeAlertRecipient,
  normalizePhoneToE164,
  parseTaskNotes,
  removeTaskNote,
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

  describe("parseTaskNotes", () => {
    it("returns empty array for null", () => {
      expect(parseTaskNotes(null)).toEqual([]);
    });

    it("returns empty array for whitespace-only string", () => {
      expect(parseTaskNotes("   ")).toEqual([]);
    });

    it("parses a JSON array of note entries", () => {
      const notes = JSON.stringify([
        { text: "Note one", createdAt: "2026-01-01T00:00:00.000Z" },
        { text: "Note two", createdAt: "2026-01-02T00:00:00.000Z" },
      ]);
      expect(parseTaskNotes(notes)).toEqual([
        { text: "Note one", createdAt: "2026-01-01T00:00:00.000Z" },
        { text: "Note two", createdAt: "2026-01-02T00:00:00.000Z" },
      ]);
    });

    it("treats a legacy plain string as a single entry using taskNoteCreatedAt", () => {
      expect(parseTaskNotes("Legacy note", "2026-03-01T00:00:00.000Z")).toEqual([
        { text: "Legacy note", createdAt: "2026-03-01T00:00:00.000Z" },
      ]);
    });

    it("falls back gracefully for invalid JSON (non-array)", () => {
      expect(parseTaskNotes('{"text":"bad"}', "2026-03-01T00:00:00.000Z")).toEqual([
        { text: '{"text":"bad"}', createdAt: "2026-03-01T00:00:00.000Z" },
      ]);
    });
  });

  describe("appendTaskNote", () => {
    it("appends to an empty note field", () => {
      const timestamp = new Date("2026-06-25T18:30:00.000Z");
      const result = JSON.parse(appendTaskNote(null, "First note", null, timestamp));
      expect(result).toEqual([{ text: "First note", createdAt: "2026-06-25T18:30:00.000Z" }]);
    });

    it("appends to an existing JSON array", () => {
      const existing = JSON.stringify([{ text: "Existing", createdAt: "2026-01-01T00:00:00.000Z" }]);
      const timestamp = new Date("2026-06-25T18:30:00.000Z");
      const result = JSON.parse(appendTaskNote(existing, "  New note  ", null, timestamp));
      expect(result).toEqual([
        { text: "Existing", createdAt: "2026-01-01T00:00:00.000Z" },
        { text: "New note", createdAt: "2026-06-25T18:30:00.000Z" },
      ]);
    });

    it("migrates a legacy plain-string note before appending", () => {
      const timestamp = new Date("2026-06-25T18:30:00.000Z");
      const result = JSON.parse(appendTaskNote("Old plain note", "New note", "2026-01-01T00:00:00.000Z", timestamp));
      expect(result).toEqual([
        { text: "Old plain note", createdAt: "2026-01-01T00:00:00.000Z" },
        { text: "New note", createdAt: "2026-06-25T18:30:00.000Z" },
      ]);
    });

    it("throws when new text is empty", () => {
      expect(() => appendTaskNote(null, "   ")).toThrow();
    });
  });

  describe("removeTaskNote", () => {
    it("returns null when removing the only note", () => {
      const existing = JSON.stringify([{ text: "Only note", createdAt: "2026-01-01T00:00:00.000Z" }]);
      expect(removeTaskNote(existing, 0)).toBeNull();
    });

    it("removes the note at the specified index", () => {
      const existing = JSON.stringify([
        { text: "First", createdAt: "2026-01-01T00:00:00.000Z" },
        { text: "Second", createdAt: "2026-01-02T00:00:00.000Z" },
        { text: "Third", createdAt: "2026-01-03T00:00:00.000Z" },
      ]);
      const result = JSON.parse(removeTaskNote(existing, 1)!);
      expect(result).toEqual([
        { text: "First", createdAt: "2026-01-01T00:00:00.000Z" },
        { text: "Third", createdAt: "2026-01-03T00:00:00.000Z" },
      ]);
    });

    it("migrates a legacy plain-string note before removing it", () => {
      expect(removeTaskNote("Legacy note", 0, "2026-01-01T00:00:00.000Z")).toBeNull();
    });

    it("returns null when removing from null", () => {
      expect(removeTaskNote(null, 0)).toBeNull();
    });
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

  describe("createTaskNoteUpdatePayload", () => {
    it("creates a trimmed note payload when note text is provided", () => {
      const timestamp = new Date("2026-06-25T18:30:00.000Z");
      expect(createTaskNoteUpdatePayload("  Need permit follow-up  ", null, timestamp)).toEqual({
        taskNote: "Need permit follow-up",
        taskNoteCreatedAt: "2026-06-25T18:30:00.000Z",
      });
    });

    it("returns a clear payload when draft is blank and a note already exists", () => {
      expect(createTaskNoteUpdatePayload("   ", "Existing note")).toEqual({
        taskNote: null,
        taskNoteCreatedAt: null,
      });
    });

    it("returns null when draft is blank and no note exists", () => {
      expect(createTaskNoteUpdatePayload("   ", null)).toBeNull();
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
