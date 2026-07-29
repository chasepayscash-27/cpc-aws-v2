import { describe, expect, it } from 'vitest';
import {
  buildTeamTaskCreatePayload,
  TEAM_TASK_EMPLOYEE_CHECKLIST_SUBTYPE,
  TEAM_TASK_PROPERTY_CHECKLIST_SUBTYPE,
} from './teamTaskCreatePayload';

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

  it('uses the provided subWorkflowType override when supplied', () => {
    const payload = buildTeamTaskCreatePayload({
      propertyId: '',
      stage: 'Initial Order',
      order: 10004,
      isPersonal: false,
      assignee: 'Zach Cato',
      createdById: 'owner@example.com',
      subWorkflowType: TEAM_TASK_EMPLOYEE_CHECKLIST_SUBTYPE,
    });

    expect(payload.subWorkflowType).toBe('Employee Checklist');
    expect(payload.workflowType).toBe('Team Task');
    expect(payload.assigneeId).toBe('Zach Cato');
  });

  it('falls back to General Team Task when subWorkflowType is not provided and isPersonal is false', () => {
    const payload = buildTeamTaskCreatePayload({
      propertyId: '',
      stage: 'Check in',
      order: 10005,
      isPersonal: false,
      assignee: 'Sam',
      createdById: null,
    });

    expect(payload.subWorkflowType).toBe('General Team Task');
  });

  it('supports property-level checklist subtype overrides', () => {
    const payload = buildTeamTaskCreatePayload({
      propertyId: 'property-xyz',
      stage: 'Tile',
      order: 10006,
      isPersonal: false,
      assignee: 'Zach Cato',
      createdById: 'owner@example.com',
      subWorkflowType: TEAM_TASK_PROPERTY_CHECKLIST_SUBTYPE,
    });

    expect(payload.propertyId).toBe('property-xyz');
    expect(payload.subWorkflowType).toBe('Property Checklist');
  });
});

