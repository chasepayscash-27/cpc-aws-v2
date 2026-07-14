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
  { order: 1, stage: "Make An Offer", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 2, stage: "Close On Property", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 3, stage: "Put Keys In Lockbox", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 4, stage: "Get Utilities Turned On", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 5, stage: "Verify All Utilities Are On And Not Locked", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 6, stage: "Initial Walk Through", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 7, stage: "Contractor Walk Through", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 8, stage: "Material Ordered", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 9, stage: "Construction", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 10, stage: "Final Walk Through", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 11, stage: "Staging", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 12, stage: "Cleaned", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 13, stage: "Pictures", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 14, stage: "Offer Accepted", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 15, stage: "Repair Addendum Sent", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 16, stage: "Repaired Addendum Finished", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 17, stage: "Closed On Property", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 18, stage: "Got Lockbox Back", workflowType: "Main Workflow", subWorkflowType: "Main Workflow", owner: "", responsibilities: "", notes: "" },
  { order: 19, stage: "All Items Removed", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 20, stage: "All Flooring Out", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 21, stage: "Bathrooms Demo", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 22, stage: "Cabinets Out", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 23, stage: "Walls Taken Out?", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "Yes/No" },
  { order: 24, stage: "Rough In", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 25, stage: "Plumbers Rough", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 26, stage: "Electricians Rough", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 27, stage: "HVAC Rough", workflowType: "Construction Workflow", subWorkflowType: "Demolition & Rough-In", owner: "", responsibilities: "", notes: "" },
  { order: 28, stage: "Durarock Bathrooms", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 29, stage: "Water Proof Bathrooms", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 30, stage: "Prep Interior For Paint", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 31, stage: "Replace/Repair Baseboard Trim Etc", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 32, stage: "Repair Subflooring", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 33, stage: "Repair Bad Wood Exterior", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 34, stage: "Repair Siding", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 35, stage: "Prep Exterior For Paint", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 36, stage: "Grading Away From House", workflowType: "Construction Workflow", subWorkflowType: "Prep & Repairs", owner: "", responsibilities: "", notes: "" },
  { order: 37, stage: "Interior Painted", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 38, stage: "Exterior Painted", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 39, stage: "Bathrooms Tiled", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 40, stage: "Flooring Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 41, stage: "Cabinets Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 42, stage: "Countertops Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 43, stage: "Backsplash Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 44, stage: "Hardware On Cabinets", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 45, stage: "Light Fixtures Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 46, stage: "Plumbing Fixtures Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 47, stage: "Door Hardware Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 48, stage: "Gutters Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 49, stage: "Appliances Installed", workflowType: "Construction Workflow", subWorkflowType: "Install & Finishes", owner: "", responsibilities: "", notes: "" },
  { order: 50, stage: "Appliances Working", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 51, stage: "Plumbing Fixtures All Work", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 52, stage: "All Lights And Fixtures Work", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 53, stage: "All Windows Open", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 54, stage: "Water Heater Is On", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 55, stage: "HVAC Working", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 56, stage: "No Paint On Windows", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 57, stage: "All Doors Shut And Lock", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 58, stage: "Grass Is Cut", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 59, stage: "Garage Doors Open And Shut", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 75, stage: "All Windows Open & Close", workflowType: "Construction Workflow", subWorkflowType: "Final Walkthrough", owner: "", responsibilities: "", notes: "" },
  { order: 60, stage: "Initial Order Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 61, stage: "Tile Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 62, stage: "Flooring Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 63, stage: "Paint Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 64, stage: "Amazon Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 65, stage: "Fireplace", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "Fireplace working" },
  { order: 66, stage: "Roof Replaced", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "Roof ordered" },
  { order: 67, stage: "Windows Replaced", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "windows ordered" },
  { order: 68, stage: "Cabinets Replaced", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "cabinets ordered" },
  { order: 69, stage: "Appliances Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 70, stage: "Countertops Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 71, stage: "Pool", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "Pool started" },
  { order: 72, stage: "Foundation Work", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "Crack guys scheduled" },
  { order: 73, stage: "Gutters Ordered", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
  { order: 74, stage: "Glass Shower Door", workflowType: "Check List Workflow", subWorkflowType: "Ordering & Scope Checklist", owner: "", responsibilities: "", notes: "" },
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
