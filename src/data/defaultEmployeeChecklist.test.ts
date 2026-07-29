import { describe, expect, it } from 'vitest';
import {
  defaultEmployeeChecklist,
  getDefaultChecklistForEmployee,
  EMPLOYEE_CHECKLIST_SOURCE_PATH,
} from './defaultEmployeeChecklist';

describe('defaultEmployeeChecklist', () => {
  it('contains at least one item per known employee', () => {
    const owners = new Set(defaultEmployeeChecklist.map((item) => item.owner));
    expect(owners.has('Zach Cato')).toBe(true);
    expect(owners.has('Matt Cody')).toBe(true);
  });

  it('exports the correct source path constant', () => {
    expect(EMPLOYEE_CHECKLIST_SOURCE_PATH).toBe('/data/checklist_new_07092026.xlsx');
  });

  it('every item has a non-empty task and owner', () => {
    for (const item of defaultEmployeeChecklist) {
      expect(item.task.trim()).not.toBe('');
      expect(item.owner.trim()).not.toBe('');
    }
  });
});

describe('getDefaultChecklistForEmployee', () => {
  it('returns all items for Zach Cato', () => {
    const items = getDefaultChecklistForEmployee('Zach Cato');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.owner === 'Zach Cato')).toBe(true);
    expect(items.map((item) => item.task)).toContain('Initial Order');
    expect(items.map((item) => item.task)).toContain('Tile');
  });

  it('returns all items for Matt Cody', () => {
    const items = getDefaultChecklistForEmployee('Matt Cody');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => item.owner === 'Matt Cody')).toBe(true);
    expect(items.map((item) => item.task)).toContain('Pool');
    expect(items.map((item) => item.task)).toContain('Fireplace');
  });

  it('is case-insensitive', () => {
    const lower = getDefaultChecklistForEmployee('zach cato');
    const upper = getDefaultChecklistForEmployee('ZACH CATO');
    const mixed = getDefaultChecklistForEmployee('Zach Cato');
    expect(lower.length).toBe(mixed.length);
    expect(upper.length).toBe(mixed.length);
  });

  it('trims whitespace from the employee name', () => {
    const trimmed = getDefaultChecklistForEmployee('  Zach Cato  ');
    expect(trimmed.length).toBe(getDefaultChecklistForEmployee('Zach Cato').length);
  });

  it('returns an empty array for an unknown employee', () => {
    expect(getDefaultChecklistForEmployee('Unknown Person')).toHaveLength(0);
    expect(getDefaultChecklistForEmployee('')).toHaveLength(0);
  });
});
