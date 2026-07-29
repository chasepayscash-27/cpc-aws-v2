import type { EmployeeChecklistItem } from '../data/defaultEmployeeChecklist';

export interface ExistingChecklistTask {
  propertyId?: string | null;
  stage?: string | null;
}

export interface PropertyChecklistAssignmentTask {
  propertyId: string;
  stage: string;
  assignee: string;
}

export interface PropertyChecklistAssignmentPlan {
  toCreate: PropertyChecklistAssignmentTask[];
  alreadyExistsCount: number;
  propertyCount: number;
  hasNoDefaults: boolean;
  hasNoProperties: boolean;
}

function normalizeStage(stage: string): string {
  return stage.trim().toLowerCase();
}

function buildPropertyStageKey(propertyId: string, stage: string): string {
  return `${propertyId}::${normalizeStage(stage)}`;
}

export function buildPropertyChecklistAssignmentPlan(
  propertyIds: string[],
  checklistItems: EmployeeChecklistItem[],
  existingTasks: ExistingChecklistTask[],
): PropertyChecklistAssignmentPlan {
  const uniquePropertyIds = [...new Set(propertyIds.map((id) => id.trim()).filter(Boolean))];
  const normalizedChecklistItems = checklistItems
    .map((item) => ({
      task: item.task.trim(),
      owner: item.owner.trim(),
    }))
    .filter((item) => item.task && item.owner);

  if (normalizedChecklistItems.length === 0) {
    return {
      toCreate: [],
      alreadyExistsCount: 0,
      propertyCount: uniquePropertyIds.length,
      hasNoDefaults: true,
      hasNoProperties: false,
    };
  }

  if (uniquePropertyIds.length === 0) {
    return {
      toCreate: [],
      alreadyExistsCount: 0,
      propertyCount: 0,
      hasNoDefaults: false,
      hasNoProperties: true,
    };
  }

  const existingKeys = new Set(
    existingTasks
      .map((task) => {
        const propertyId = task.propertyId?.trim() ?? '';
        const stage = task.stage?.trim() ?? '';
        if (!propertyId || !stage) return '';
        return buildPropertyStageKey(propertyId, stage);
      })
      .filter(Boolean),
  );

  const pendingKeys = new Set<string>();
  const toCreate: PropertyChecklistAssignmentTask[] = [];
  let alreadyExistsCount = 0;

  for (const propertyId of uniquePropertyIds) {
    for (const item of normalizedChecklistItems) {
      const key = buildPropertyStageKey(propertyId, item.task);
      if (existingKeys.has(key) || pendingKeys.has(key)) {
        alreadyExistsCount += 1;
        continue;
      }

      pendingKeys.add(key);
      toCreate.push({
        propertyId,
        stage: item.task,
        assignee: item.owner,
      });
    }
  }

  return {
    toCreate,
    alreadyExistsCount,
    propertyCount: uniquePropertyIds.length,
    hasNoDefaults: false,
    hasNoProperties: false,
  };
}
