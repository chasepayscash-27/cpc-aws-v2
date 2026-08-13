import { beforeEach, describe, expect, it } from "vitest";
import {
  getArchivedProjectUuidSet,
  isProjectArchived,
  saveArchivedProjects,
} from "./archivedProjects";
import type { ProjectRow } from "../types/project";

describe("archivedProjects helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns archived project UUIDs as a set", () => {
    const rows: ProjectRow[] = [
      { project_uuid: "p-1", name: "One" },
      { project_uuid: "p-2", name: "Two" },
      { project_uuid: undefined, name: "No UUID" },
    ];

    saveArchivedProjects(rows);
    const archivedUuids = getArchivedProjectUuidSet();

    expect(archivedUuids.has("p-1")).toBe(true);
    expect(archivedUuids.has("p-2")).toBe(true);
    expect(archivedUuids.size).toBe(2);
  });

  it("checks whether a project UUID is archived", () => {
    saveArchivedProjects([{ project_uuid: "p-100", name: "Archived" }]);

    expect(isProjectArchived("p-100")).toBe(true);
    expect(isProjectArchived("p-200")).toBe(false);
    expect(isProjectArchived(undefined)).toBe(false);
  });
});
