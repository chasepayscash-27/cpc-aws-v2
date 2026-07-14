export interface DefaultWorkflowTask {
  order: number;
  stage: string;
  workflowType: WorkflowType;
  subWorkflowType: string;
  owner: string;
  responsibilities: string;
  notes: string;
}

export type WorkflowType = "Main Workflow" | "Construction Workflow" | "Check List Workflow";

export const WORKFLOW_DEFINITION_SOURCE_PATH = "/data/Workflow_New_June_25_2026.xlsx";

export const defaultWorkflow: DefaultWorkflowTask[] = [
  { order: 1, stage: "Make an offer", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 2, stage: "Close On property", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 3, stage: "Put keys in lockbox", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 4, stage: "Get utilities Turned on", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 5, stage: "Verify all utilities are on and not locked", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 6, stage: "Initial Walk through", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 7, stage: "Contractor walk through", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 8, stage: "Material Ordered", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 9, stage: "Construction", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 10, stage: "Final Walk through", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 11, stage: "Staging", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 12, stage: "Cleaned", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 13, stage: "Pictures", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 14, stage: "Offer Accepted", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 15, stage: "Repair Addendum Sent", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 16, stage: "Repaired Addendum Finished", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 17, stage: "Closed on property", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 18, stage: "Got lockbox back", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 19, stage: "All items removed", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 20, stage: "all flooring out", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 21, stage: "bathrooms demo", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 22, stage: "Cabinets out", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 23, stage: "Walls taken out?", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "Yes/No" },
  { order: 24, stage: "ROUGH IN", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 25, stage: "plumbers rough", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 26, stage: "Electricians rough", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 27, stage: "hvac rough", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 28, stage: "Durarock bathrooms", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 29, stage: "Water proof bathrooms", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 30, stage: "Prep interior for paint", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 31, stage: "Replace/repair baseboard trim etc", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 32, stage: "repair subflooring", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 33, stage: "repair bad wood exterior", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 34, stage: "repair siding", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 35, stage: "prep exterior for paint", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 36, stage: "Grading away from house", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 37, stage: "interior painted", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 38, stage: "exterior painted", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 39, stage: "bathrooms tiled", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 40, stage: "flooring installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 41, stage: "cabinets installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 42, stage: "countertops installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 43, stage: "backsplash installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 44, stage: "hardware on cabinets", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 45, stage: "light fixtures installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 46, stage: "plumbing fixtures installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 47, stage: "door hardware installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 48, stage: "Gutters Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 49, stage: "Appliances installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 50, stage: "Appliances working", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 51, stage: "Plumbing fixtures all work", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 52, stage: "All lights and fixtures work", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 53, stage: "all windows open", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 54, stage: "water heater is on", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 55, stage: "HVAC working", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 56, stage: "No paint on windows", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 57, stage: "all doors shut and lock", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 58, stage: "grass is cut", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 59, stage: "garage doors open and shut", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 75, stage: "All Windows Open & Close", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 60, stage: "Initial order ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 61, stage: "Tile ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 62, stage: "Flooring ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 63, stage: "Paint ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 64, stage: "Amazon ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 65, stage: "Fireplace", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "Fireplace working" },
  { order: 66, stage: "Roof replaced", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "Roof ordered" },
  { order: 67, stage: "Windows replaced", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "windows ordered" },
  { order: 68, stage: "Cabinets replaced", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "cabinets ordered" },
  { order: 69, stage: "Appliances Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 70, stage: "Countertops ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 71, stage: "Pool", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "Pool started" },
  { order: 72, stage: "Foundation work", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "Crack guys scheduled" },
  { order: 73, stage: "Gutters Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 74, stage: "glass shower door", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
];

export const workflowDefinitionByOrder = new Map(defaultWorkflow.map((task) => [task.order, task]));
const workflowTypeByStage = new Map(defaultWorkflow.map((task) => [task.stage, task.workflowType]));

export function resolveTaskWorkflowType(task: { order?: number | null; stage?: string | null; workflowType?: string | null }): WorkflowType | null {
  if (task.workflowType === "Main Workflow" || task.workflowType === "Construction Workflow" || task.workflowType === "Check List Workflow") {
    return task.workflowType;
  }
  if (typeof task.order === "number") {
    const byOrder = workflowDefinitionByOrder.get(task.order);
    if (byOrder) return byOrder.workflowType;
  }
  const stage = task.stage?.trim();
  if (!stage) return null;
  return workflowTypeByStage.get(stage) ?? null;
}
