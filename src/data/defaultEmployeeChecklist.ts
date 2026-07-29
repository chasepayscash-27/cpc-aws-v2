/**
 * Default employee checklist data sourced from checklist_new_07092026.xlsx (Sheet2).
 * Maps checklist tasks to the employee responsible for each item.
 */

export interface EmployeeChecklistItem {
  task: string;
  owner: string;
  /** Optional notes or context for the checklist item (e.g. ordering hints, scope reminders). */
  notes?: string;
}

/** Path to the source XLSX file relative to the public directory. */
export const EMPLOYEE_CHECKLIST_SOURCE_PATH = '/data/checklist_new_07092026.xlsx';

/**
 * Default checklist items per employee.
 * Sourced from checklist_new_07092026.xlsx, Sheet2 columns: checklist_task, check_list_owner.
 * Notes sourced from 07/20/2026 sales meeting decisions.
 */
export const defaultEmployeeChecklist: EmployeeChecklistItem[] = [
  { task: 'Initial Order', owner: 'Zach Cato', notes: 'Place initial material order at project start' },
  { task: 'Tile', owner: 'Zach Cato' },
  { task: 'Flooring', owner: 'Zach Cato' },
  { task: 'Paint', owner: 'Zach Cato' },
  { task: 'Amazon', owner: 'Zach Cato', notes: 'Hardware, fixtures, and misc. items via Amazon' },
  { task: 'Cabinets', owner: 'Zach Cato', notes: 'Order or confirm cabinets; countertops must be ordered immediately after cabinets are confirmed ready' },
  { task: 'Appliances', owner: 'Zach Cato', notes: 'Verify sizing (especially stove/oven) before ordering; confirm delivery timing early' },
  { task: 'Counter Tops', owner: 'Zach Cato', notes: 'Order as soon as cabinets are installed or confirmed; do not wait' },
  { task: 'Roof', owner: 'Matt Cody', notes: 'Confirm if replacement is required; order roofing materials and schedule crew' },
  { task: 'Windows', owner: 'Matt Cody', notes: 'Verify window sizes and lead time; order early to avoid end-of-project delays' },
  { task: 'Pool', owner: 'Matt Cody', notes: 'Confirm pool is started and operational before listing' },
  { task: 'Foundation', owner: 'Matt Cody', notes: 'Schedule crack repair crew; verify waterproofing and drainage' },
  { task: 'Gutters', owner: 'Matt Cody' },
  { task: 'Glass Shower Door', owner: 'Matt Cody', notes: 'Confirm style and glass type with project plan before ordering' },
  { task: 'Fireplace', owner: 'Matt Cody', notes: 'Verify fireplace is functional before listing' },
];

/**
 * Returns the default checklist items for the given employee name (case-insensitive).
 * Returns an empty array if no checklist items are defined for that employee.
 */
export function getDefaultChecklistForEmployee(employeeName: string): EmployeeChecklistItem[] {
  const normalized = employeeName.trim().toLowerCase();
  return defaultEmployeeChecklist.filter(
    (item) => item.owner.trim().toLowerCase() === normalized,
  );
}
