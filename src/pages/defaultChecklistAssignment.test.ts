import { describe, expect, it } from 'vitest';
import { buildPropertyChecklistAssignmentPlan } from './defaultChecklistAssignment';

const DEFAULTS = [
  { task: 'Initial Order', owner: 'Zach Cato' },
  { task: 'Tile', owner: 'Matt Cody' },
];

describe('buildPropertyChecklistAssignmentPlan', () => {
  it('plans checklist assignments for every property', () => {
    const plan = buildPropertyChecklistAssignmentPlan(['property-a', 'property-b'], DEFAULTS, []);

    expect(plan.propertyCount).toBe(2);
    expect(plan.toCreate).toHaveLength(4);
    expect(plan.toCreate).toEqual(
      expect.arrayContaining([
        { propertyId: 'property-a', stage: 'Initial Order', assignee: 'Zach Cato' },
        { propertyId: 'property-a', stage: 'Tile', assignee: 'Matt Cody' },
        { propertyId: 'property-b', stage: 'Initial Order', assignee: 'Zach Cato' },
        { propertyId: 'property-b', stage: 'Tile', assignee: 'Matt Cody' },
      ]),
    );
  });

  it('dedupes by normalized property+stage and is idempotent on rerun', () => {
    const existingTasks = [
      { propertyId: 'property-a', stage: ' initial order ' },
      { propertyId: 'property-b', stage: 'TILE' },
    ];
    const firstPlan = buildPropertyChecklistAssignmentPlan(['property-a', 'property-b'], DEFAULTS, existingTasks);

    expect(firstPlan.toCreate).toEqual(
      expect.arrayContaining([
        { propertyId: 'property-a', stage: 'Tile', assignee: 'Matt Cody' },
        { propertyId: 'property-b', stage: 'Initial Order', assignee: 'Zach Cato' },
      ]),
    );
    expect(firstPlan.toCreate).toHaveLength(2);
    expect(firstPlan.alreadyExistsCount).toBe(2);

    const rerunPlan = buildPropertyChecklistAssignmentPlan(
      ['property-a', 'property-b'],
      DEFAULTS,
      [...existingTasks, ...firstPlan.toCreate],
    );

    expect(rerunPlan.toCreate).toHaveLength(0);
    expect(rerunPlan.alreadyExistsCount).toBe(4);
  });

  it('handles empty defaults and empty property lists', () => {
    const emptyDefaults = buildPropertyChecklistAssignmentPlan(['property-a'], [], []);
    expect(emptyDefaults.hasNoDefaults).toBe(true);
    expect(emptyDefaults.toCreate).toHaveLength(0);

    const emptyProperties = buildPropertyChecklistAssignmentPlan([], DEFAULTS, []);
    expect(emptyProperties.hasNoProperties).toBe(true);
    expect(emptyProperties.toCreate).toHaveLength(0);
  });
});
