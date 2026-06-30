import { describe, expect, it } from 'vitest';
import { buildTeamTaskCreatePayload } from './teamTaskCreatePayload';

describe('buildTeamTaskCreatePayload', () => {
  it('omits propertyId for general team tasks when no property is selected', () => {
    const payload = buildTeamTaskCreatePayload({
      propertyId: '   ',
      stage: 'Call title company',
      order: 10001,
      isPersonal: false,
      assignee: 'Alex',
      createdById: 'owner@example.com',
    });

    expect(payload).not.toHaveProperty('propertyId');
    expect(payload.subWorkflowType).toBe('General Team Task');
  });

  it('omits propertyId for personal tasks when no property is selected', () => {
    const payload = buildTeamTaskCreatePayload({
      propertyId: '',
      stage: 'Review inbox',
      order: 10002,
      isPersonal: true,
      assignee: 'Alex',
      createdById: 'owner@example.com',
    });

    expect(payload).not.toHaveProperty('propertyId');
    expect(payload.subWorkflowType).toBe('Personal Task');
  });

  it('includes trimmed propertyId for property-linked tasks', () => {
    const payload = buildTeamTaskCreatePayload({
      propertyId: ' property-123 ',
      stage: 'Submit permit',
      order: 10003,
      isPersonal: false,
      assignee: 'Alex',
      createdById: 'owner@example.com',
    });

    expect(payload.propertyId).toBe('property-123');
  });
});

