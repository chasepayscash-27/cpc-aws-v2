import { describe, expect, it } from "vitest";
import type { Schema } from "../../amplify/data/resource";
import { groupTasksByProperty } from "./PropertyTasksContext";

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

describe("groupTasksByProperty", () => {
  it("indexes tasks once by property id and skips blank ids", () => {
    const grouped = groupTasksByProperty([
      buildTask({ id: "a", propertyId: "property-1" }),
      buildTask({ id: "b", propertyId: "property-1" }),
      buildTask({ id: "c", propertyId: "property-2" }),
      buildTask({ id: "d", propertyId: "   " }),
      buildTask({ id: "e", propertyId: null }),
    ]);

    expect(Object.keys(grouped)).toEqual(["property-1", "property-2"]);
    expect(grouped["property-1"]?.map((task) => task.id)).toEqual(["a", "b"]);
    expect(grouped["property-2"]?.map((task) => task.id)).toEqual(["c"]);
  });
});
