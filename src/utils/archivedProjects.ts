import type { ProjectRow } from "../types/project";

const STORAGE_KEY = "cpc_archived_projects_v1";

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

export function saveArchivedProjects(rows: ProjectRow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
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
