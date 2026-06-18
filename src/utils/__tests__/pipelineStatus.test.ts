import { describe, it, expect } from 'vitest';
import {
  isArchivedStage,
  NEGOTIATION_STAGES,
  normalizePipelineStatus,
  getPipelineStatusColor,
  getPipelineStatusLabel,
  PIPELINE_STATUS_COLORS,
} from '../pipelineStatus';

describe('isArchivedStage', () => {
  it('returns true for "archived"', () => {
    expect(isArchivedStage('archived')).toBe(true);
  });

  it('returns true for "archive"', () => {
    expect(isArchivedStage('archive')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isArchivedStage('Archived')).toBe(true);
    expect(isArchivedStage('ARCHIVED')).toBe(true);
  });

  it('returns false for active pipeline stages', () => {
    expect(isArchivedStage('negotiation')).toBe(false);
    expect(isArchivedStage('under_construction')).toBe(false);
    expect(isArchivedStage('lead')).toBe(false);
    expect(isArchivedStage('offer_made')).toBe(false);
  });

  it('returns false for null or undefined', () => {
    expect(isArchivedStage(null)).toBe(false);
    expect(isArchivedStage(undefined)).toBe(false);
    expect(isArchivedStage('')).toBe(false);
  });
});

describe('NEGOTIATION_STAGES', () => {
  it('contains all Flipper Force negotiation-bucket stage values', () => {
    expect(NEGOTIATION_STAGES.has('negotiation')).toBe(true);
    expect(NEGOTIATION_STAGES.has('under negotiation')).toBe(true);
    expect(NEGOTIATION_STAGES.has('lead')).toBe(true);
    expect(NEGOTIATION_STAGES.has('contacting seller')).toBe(true);
    expect(NEGOTIATION_STAGES.has('appointment set')).toBe(true);
    expect(NEGOTIATION_STAGES.has('offer made')).toBe(true);
  });

  it('does not contain non-negotiation stages', () => {
    expect(NEGOTIATION_STAGES.has('under construction')).toBe(false);
    expect(NEGOTIATION_STAGES.has('active listing')).toBe(false);
    expect(NEGOTIATION_STAGES.has('completed')).toBe(false);
    expect(NEGOTIATION_STAGES.has('archived')).toBe(false);
  });
});

describe('normalizePipelineStatus', () => {
  it('lowercases, trims, collapses whitespace and replaces underscores/hyphens with spaces', () => {
    expect(normalizePipelineStatus('under_construction')).toBe('under construction');
    expect(normalizePipelineStatus('Under-Construction')).toBe('under construction');
    expect(normalizePipelineStatus('  Lead  ')).toBe('lead');
    expect(normalizePipelineStatus('offer_made')).toBe('offer made');
    expect(normalizePipelineStatus('contacting_seller')).toBe('contacting seller');
    expect(normalizePipelineStatus('appointment_set')).toBe('appointment set');
  });

  it('returns empty string for falsy input', () => {
    expect(normalizePipelineStatus(null)).toBe('');
    expect(normalizePipelineStatus(undefined)).toBe('');
    expect(normalizePipelineStatus('')).toBe('');
  });
});

describe('getPipelineStatusColor – negotiation bucket', () => {
  const negotiationColor = PIPELINE_STATUS_COLORS.negotiation;

  it('maps "lead" to negotiation color', () => {
    expect(getPipelineStatusColor('lead')).toBe(negotiationColor);
  });

  it('maps "offer_made" to negotiation color', () => {
    expect(getPipelineStatusColor('offer_made')).toBe(negotiationColor);
  });

  it('maps "contacting_seller" to negotiation color', () => {
    expect(getPipelineStatusColor('contacting_seller')).toBe(negotiationColor);
  });

  it('maps "appointment_set" to negotiation color', () => {
    expect(getPipelineStatusColor('appointment_set')).toBe(negotiationColor);
  });
});

describe('getPipelineStatusLabel', () => {
  it('returns "Lead" for "lead"', () => {
    expect(getPipelineStatusLabel('lead')).toBe('Lead');
  });

  it('returns "Offer Made" for "offer_made"', () => {
    expect(getPipelineStatusLabel('offer_made')).toBe('Offer Made');
  });

  it('returns "Under Negotiation" for "under_negotiation"', () => {
    expect(getPipelineStatusLabel('under_negotiation')).toBe('Under Negotiation');
  });

  it('returns "Unknown" for empty input', () => {
    expect(getPipelineStatusLabel('')).toBe('Unknown');
    expect(getPipelineStatusLabel(null)).toBe('Unknown');
  });
});
