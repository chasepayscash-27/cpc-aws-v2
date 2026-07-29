const TEAM_TASK_WORKFLOW_TYPE = 'Team Task';
const TEAM_TASK_GENERAL_SUBTYPE = 'General Team Task';
const TEAM_TASK_PERSONAL_SUBTYPE = 'Personal Task';
export const TEAM_TASK_EMPLOYEE_CHECKLIST_SUBTYPE = 'Employee Checklist';
export const TEAM_TASK_PROPERTY_CHECKLIST_SUBTYPE = 'Property Checklist';

interface BuildTeamTaskCreatePayloadInput {
  propertyId: string;
  stage: string;
  order: number;
  isPersonal: boolean;
  assignee: string;
  createdById: string | null;
  /** Optional subWorkflowType override. Defaults to 'Personal Task' or 'General Team Task'. */
  subWorkflowType?: string;
}

export function buildTeamTaskCreatePayload({
  propertyId,
  stage,
  order,
  isPersonal,
  assignee,
  createdById,
  subWorkflowType,
}: BuildTeamTaskCreatePayloadInput) {
  const trimmedPropertyId = propertyId.trim();
  const resolvedSubWorkflowType =
    subWorkflowType ?? (isPersonal ? TEAM_TASK_PERSONAL_SUBTYPE : TEAM_TASK_GENERAL_SUBTYPE);

  return {
    ...(trimmedPropertyId ? { propertyId: trimmedPropertyId } : {}),
    stage,
    order,
    workflowType: TEAM_TASK_WORKFLOW_TYPE,
    subWorkflowType: resolvedSubWorkflowType,
    owner: assignee,
    responsibilities: null,
    notes: null,
    isComplete: false,
    assigneeId: assignee,
    alertRecipientId: null,
    taskNote: null,
    taskNoteCreatedAt: null,
    createdById,
  };
}
