import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCompletedProjectUuidSet,
  isProjectCompleted,
  saveCompletedProjects,
  markProjectCompleted,
  unmarkProjectCompleted,
  COMPLETED_CHANGE_EVENT,
} from "./completedProjects";
import type { ProjectRow } from "../types/project";

describe("completedProjects helpers", () => {
  const localStorageMock = {
    store: new Map<string, string>(),
    getItem(key: string) {
      return this.store.has(key) ? this.store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      this.store.set(key, value);
    },
    removeItem(key: string) {
      this.store.delete(key);
    },
    clear() {
      this.store.clear();
    },
  };

  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    localStorage.clear();
  });

  it("returns completed project UUIDs as a set", () => {
    const rows: ProjectRow[] = [
      { project_uuid: "p-1", name: "One" },
      { project_uuid: "p-2", name: "Two" },
      { project_uuid: undefined, name: "No UUID" },
    ];

    saveCompletedProjects(rows);
    const completedUuids = getCompletedProjectUuidSet();

    expect(completedUuids.has("p-1")).toBe(true);
    expect(completedUuids.has("p-2")).toBe(true);
    expect(completedUuids.size).toBe(2);
  });

  it("checks whether a project UUID is completed", () => {
    saveCompletedProjects([{ project_uuid: "p-100", name: "Completed" }]);

    expect(isProjectCompleted("p-100")).toBe(true);
    expect(isProjectCompleted("p-200")).toBe(false);
    expect(isProjectCompleted(undefined)).toBe(false);
  });

  it("dispatches COMPLETED_CHANGE_EVENT on the window when saving", () => {
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");
    saveCompletedProjects([{ project_uuid: "p-1", name: "One" }]);
    const customEvents = dispatchSpy.mock.calls
      .map((args) => args[0])
      .filter((e): e is CustomEvent => e instanceof CustomEvent);
    expect(customEvents.some((e) => e.type === COMPLETED_CHANGE_EVENT)).toBe(true);
    dispatchSpy.mockRestore();
  });

  it("markProjectCompleted adds a project with completed_at timestamp", () => {
    const project: ProjectRow = { project_uuid: "p-42", name: "Test" };
    markProjectCompleted(project);

    const set = getCompletedProjectUuidSet();
    expect(set.has("p-42")).toBe(true);
  });

  it("markProjectCompleted does not duplicate an already-completed project", () => {
    const project: ProjectRow = { project_uuid: "p-42", name: "Test" };
    markProjectCompleted(project);
    markProjectCompleted(project);

    const set = getCompletedProjectUuidSet();
    expect(set.size).toBe(1);
  });

  it("unmarkProjectCompleted removes a project from completed list", () => {
    saveCompletedProjects([{ project_uuid: "p-10", name: "Alpha" }]);
    unmarkProjectCompleted("p-10");

    expect(isProjectCompleted("p-10")).toBe(false);
  });
});
