import { ACTIVE_STAGE_ORDER } from '../components/PipelineTracker';
import type { ProjectRow } from '../types/project';

/**
 * Returns true when the given stage key is a valid, displayable pipeline stage.
 * The canonical list is ACTIVE_STAGE_ORDER from PipelineTracker.
 */
export function isValidPipelineStage(stage: string): boolean {
  return ACTIVE_STAGE_ORDER.includes(stage);
}

/**
 * Merges a map of local stage overrides onto a set of project rows.
 *
 * Precedence rule: local override › Flipper Force CSV stage.
 *
 * The function is pure (creates new row objects) and does NOT mutate the raw
 * Flipper Force stage stored in `row.stage` — the original value is preserved
 * so it can be referenced if an override is cleared in the future.
 *
 * @param rows     Array of ProjectRow objects sourced from the CSV pipeline
 * @param overrides Map of { [propertyId]: overriddenStage } from the backend
 * @returns New array of ProjectRow objects with `stage` reflecting any override
 */
export function applyStageOverrides(
  rows: ProjectRow[],
  overrides: Record<string, string>,
): ProjectRow[] {
  return rows.map((row) => {
    const id = row.project_uuid;
    if (!id) return row;
    const override = overrides[id];
    if (!override) return row;
    return { ...row, stage: override };
  });
}

/**
 * Builds the canonical display stage for a single project, honouring the
 * override-first precedence rule.
 *
 * @param row       A single ProjectRow from the CSV
 * @param overrides Map of { [propertyId]: overriddenStage }
 * @returns The effective stage string to use for display / grouping
 */
export function effectiveStage(
  row: ProjectRow,
  overrides: Record<string, string>,
): string | undefined {
  const id = row.project_uuid;
  if (id && overrides[id]) return overrides[id];
  return row.stage;
}
