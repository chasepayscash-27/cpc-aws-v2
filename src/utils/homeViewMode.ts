export type HomeViewMode = 'current' | 'table';

export const HOME_VIEW_MODE_STORAGE_KEY = 'cpc_home_view_mode_v1';

/** Reads the persisted Home view mode preference, defaulting to 'current' if unset or invalid. */
export function loadHomeViewMode(): HomeViewMode {
  try {
    const raw = localStorage.getItem(HOME_VIEW_MODE_STORAGE_KEY);
    return raw === 'table' ? 'table' : 'current';
  } catch {
    return 'current';
  }
}

/** Persists the Home view mode preference. Silently ignores storage failures (e.g. private browsing). */
export function saveHomeViewMode(mode: HomeViewMode): void {
  try {
    localStorage.setItem(HOME_VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage may be unavailable; ignore.
  }
}
