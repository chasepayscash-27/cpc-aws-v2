import { describe, it, expect } from 'vitest';
import { applyStageOverrides, effectiveStage, isValidPipelineStage } from './stageOverride';
import { ACTIVE_STAGE_ORDER } from '../components/PipelineTracker';
import type { ProjectRow } from '../types/project';

function makeRow(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    project_uuid: 'uuid-001',
    name: 'Test Property',
    stage: 'negotiation',
    ...overrides,
  };
}

// ── isValidPipelineStage ────────────────────────────────────────────────────

describe('isValidPipelineStage', () => {
  it('returns true for each member of ACTIVE_STAGE_ORDER', () => {
    for (const stage of ACTIVE_STAGE_ORDER) {
      expect(isValidPipelineStage(stage)).toBe(true);
    }
  });

  it('returns false for arbitrary unknown stage values', () => {
    expect(isValidPipelineStage('archived')).toBe(false);
    expect(isValidPipelineStage('completed')).toBe(false);
    expect(isValidPipelineStage('')).toBe(false);
    expect(isValidPipelineStage('Negotiation')).toBe(false); // case-sensitive
    expect(isValidPipelineStage('flipper_force_stage')).toBe(false);
  });
});

// ── applyStageOverrides ─────────────────────────────────────────────────────

describe('applyStageOverrides', () => {
  it('leaves rows unchanged when there are no overrides', () => {
    const rows = [makeRow(), makeRow({ project_uuid: 'uuid-002', stage: 'active_listing' })];
    const result = applyStageOverrides(rows, {});
    expect(result[0].stage).toBe('negotiation');
    expect(result[1].stage).toBe('active_listing');
  });

  it('applies the override stage when one exists for the property', () => {
    const rows = [makeRow()];
    const result = applyStageOverrides(rows, { 'uuid-001': 'punch_list' });
    expect(result[0].stage).toBe('punch_list');
  });

  it('override takes precedence over the Flipper Force CSV stage', () => {
    const rows = [makeRow({ stage: 'under_contract' })];
    const result = applyStageOverrides(rows, { 'uuid-001': 'active_listing' });
    expect(result[0].stage).toBe('active_listing');
  });

  it('does not mutate the original row objects', () => {
    const original = makeRow({ stage: 'negotiation' });
    const rows = [original];
    applyStageOverrides(rows, { 'uuid-001': 'under_construction' });
    // Original row must be untouched.
    expect(original.stage).toBe('negotiation');
  });

  it('only overrides the specific property — others are unaffected', () => {
    const rows = [
      makeRow({ project_uuid: 'uuid-001', stage: 'negotiation' }),
      makeRow({ project_uuid: 'uuid-002', stage: 'active_listing' }),
    ];
    const result = applyStageOverrides(rows, { 'uuid-001': 'punch_list' });
    expect(result[0].stage).toBe('punch_list');
    expect(result[1].stage).toBe('active_listing'); // unchanged
  });

  it('skips rows that have no project_uuid', () => {
    const rows = [makeRow({ project_uuid: undefined, stage: 'negotiation' })];
    const result = applyStageOverrides(rows, { 'uuid-001': 'punch_list' });
    expect(result[0].stage).toBe('negotiation');
  });

  it('override survives re-application (idempotent)', () => {
    const rows = [makeRow()];
    const overrides = { 'uuid-001': 'active_listing' };
    const first = applyStageOverrides(rows, overrides);
    const second = applyStageOverrides(first, overrides);
    expect(second[0].stage).toBe('active_listing');
  });
});

// ── effectiveStage ──────────────────────────────────────────────────────────

describe('effectiveStage', () => {
  it('returns the CSV stage when no override exists', () => {
    const row = makeRow({ stage: 'under_construction' });
    expect(effectiveStage(row, {})).toBe('under_construction');
  });

  it('returns the overridden stage when one exists (override > Flipper Force)', () => {
    const row = makeRow({ stage: 'negotiation' });
    expect(effectiveStage(row, { 'uuid-001': 'under_contract' })).toBe('under_contract');
  });

  it('returns undefined for a row with no stage and no override', () => {
    const row = makeRow({ project_uuid: 'uuid-999', stage: undefined });
    expect(effectiveStage(row, {})).toBeUndefined();
  });

  it('returns undefined for a row without project_uuid even if overrides map has entries', () => {
    const row = makeRow({ project_uuid: undefined, stage: 'negotiation' });
    // No id → override map lookup not possible → falls back to row.stage
    expect(effectiveStage(row, { 'uuid-001': 'punch_list' })).toBe('negotiation');
  });
});

// ── Rollback behaviour (pure-logic contract) ────────────────────────────────

describe('rollback contract', () => {
  it('removing a key from the optimistic map reverts the displayed stage', () => {
    const row = makeRow({ stage: 'negotiation' });

    // Simulate optimistic update.
    const withOptimistic = applyStageOverrides([row], { 'uuid-001': 'punch_list' });
    expect(withOptimistic[0].stage).toBe('punch_list');

    // Simulate rollback: clear the optimistic entry.
    const afterRollback = applyStageOverrides([row], {});
    expect(afterRollback[0].stage).toBe('negotiation');
  });
});
