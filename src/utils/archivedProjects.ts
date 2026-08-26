import type { ProjectRow } from "../types/project";
import { loadCustomProjects, saveCustomProjects } from "./customProjects";

export const ARCHIVED_PROJECTS_STORAGE_KEY = "cpc_archived_projects_v1";
const STORAGE_KEY = ARCHIVED_PROJECTS_STORAGE_KEY;

export function loadArchivedProjects(): ProjectRow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is ProjectRow => !!row && typeof row === "object");
  } catch {
    return [];
  }
}

export const ARCHIVE_CHANGE_EVENT = "cpc:archivechange";

export function saveArchivedProjects(rows: ProjectRow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  // Dispatch a same-tab custom event so components that are mounted (or will
  // mount after navigation) can react immediately.  Cross-tab updates are
  // already handled via the native `window.storage` event.
  window.dispatchEvent(new CustomEvent(ARCHIVE_CHANGE_EVENT));
}

export function getArchivedProjectUuidSet(): Set<string> {
  const archived = loadArchivedProjects();
  return new Set(
    archived
      .map((row) => row.project_uuid)
      .filter((projectUuid): projectUuid is string => typeof projectUuid === "string" && projectUuid.length > 0)
  );
}

export function isProjectArchived(projectUuid?: string): boolean {
  if (!projectUuid) return false;
  return getArchivedProjectUuidSet().has(projectUuid);
}

export function archiveProject(project: ProjectRow): void {
  const archived = loadArchivedProjects();
  const alreadyArchived = archived.some((r) => r.project_uuid && r.project_uuid === project.project_uuid);
  if (!alreadyArchived) {
    const now = new Date().toISOString();
    saveArchivedProjects([{ ...project, archived_at: project.archived_at ?? now }, ...archived]);
  }
}

export function unarchiveProject(projectUuid: string): void {
  const archived = loadArchivedProjects();
  saveArchivedProjects(archived.filter((r) => r.project_uuid !== projectUuid));
}

/**
 * Permanently delete a project: removes it from the archived list and, if it
 * was a custom-uploaded project, also removes it from the custom projects list
 * so it no longer appears anywhere in the app.
 */
export function deleteArchivedProject(projectUuid: string): void {
  unarchiveProject(projectUuid);
  const custom = loadCustomProjects();
  const filtered = custom.filter((r) => r.project_uuid !== projectUuid);
  if (filtered.length !== custom.length) {
    saveCustomProjects(filtered);
  }
}
