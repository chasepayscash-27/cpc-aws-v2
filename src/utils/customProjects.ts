import type { ProjectRow } from "../types/project";

const STORAGE_KEY = "cpc_custom_projects_v1";

export function loadCustomProjects(): ProjectRow[] {
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

export function saveCustomProjects(rows: ProjectRow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}
