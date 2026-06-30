const TEAM_TASK_WORKFLOW_TYPE = 'Team Task';
const TEAM_TASK_GENERAL_SUBTYPE = 'General Team Task';
const TEAM_TASK_PERSONAL_SUBTYPE = 'Personal Task';

interface BuildTeamTaskCreatePayloadInput {
  propertyId: string;
  stage: string;
  order: number;
  isPersonal: boolean;
  assignee: string;
  createdById: string | null;
}

export function buildTeamTaskCreatePayload({
  propertyId,
  stage,
  order,
  isPersonal,
  assignee,
  createdById,
}: BuildTeamTaskCreatePayloadInput) {
  const trimmedPropertyId = propertyId.trim();

  return {
    ...(trimmedPropertyId ? { propertyId: trimmedPropertyId } : {}),
    stage,
    order,
    workflowType: TEAM_TASK_WORKFLOW_TYPE,
    subWorkflowType: isPersonal ? TEAM_TASK_PERSONAL_SUBTYPE : TEAM_TASK_GENERAL_SUBTYPE,
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

