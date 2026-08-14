import type { ProjectRow } from "../types/project";

export const COMPLETED_PROJECTS_STORAGE_KEY = "cpc_completed_projects_v1";
const STORAGE_KEY = COMPLETED_PROJECTS_STORAGE_KEY;

export function loadCompletedProjects(): ProjectRow[] {
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

export const COMPLETED_CHANGE_EVENT = "cpc:completedchange";

export function saveCompletedProjects(rows: ProjectRow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  // Dispatch a same-tab custom event so components that are mounted (or will
  // mount after navigation) can react immediately.  Cross-tab updates are
  // already handled via the native `window.storage` event.
  window.dispatchEvent(new CustomEvent(COMPLETED_CHANGE_EVENT));
}

export function getCompletedProjectUuidSet(): Set<string> {
  const completed = loadCompletedProjects();
  return new Set(
    completed
      .map((row) => row.project_uuid)
      .filter((projectUuid): projectUuid is string => typeof projectUuid === "string" && projectUuid.length > 0)
  );
}

export function isProjectCompleted(projectUuid?: string): boolean {
  if (!projectUuid) return false;
  return getCompletedProjectUuidSet().has(projectUuid);
}

export function markProjectCompleted(project: ProjectRow): void {
  const completed = loadCompletedProjects();
  const alreadyCompleted = completed.some((r) => r.project_uuid && r.project_uuid === project.project_uuid);
  if (!alreadyCompleted) {
    const now = new Date().toISOString();
    saveCompletedProjects([{ ...project, completed_at: project.completed_at ?? now }, ...completed]);
  }
}

export function unmarkProjectCompleted(projectUuid: string): void {
  const completed = loadCompletedProjects();
  saveCompletedProjects(completed.filter((r) => r.project_uuid !== projectUuid));
}
