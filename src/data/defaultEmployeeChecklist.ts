/**
 * Default employee checklist data sourced from checklist_new_07092026.xlsx (Sheet2).
 * Maps checklist tasks to the employee responsible for each item.
 */

export interface EmployeeChecklistItem {
  task: string;
  owner: string;
}

/** Path to the source XLSX file relative to the public directory. */
export const EMPLOYEE_CHECKLIST_SOURCE_PATH = '/data/checklist_new_07092026.xlsx';

/**
 * Default checklist items per employee.
 * Sourced from checklist_new_07092026.xlsx, Sheet2 columns: checklist_task, check_list_owner.
 */
export const defaultEmployeeChecklist: EmployeeChecklistItem[] = [
  { task: 'Initial Order', owner: 'Zach Cato' },
  { task: 'Tile', owner: 'Zach Cato' },
  { task: 'Flooring', owner: 'Zach Cato' },
  { task: 'Paint', owner: 'Zach Cato' },
  { task: 'Amazon', owner: 'Zach Cato' },
  { task: 'Cabinets', owner: 'Zach Cato' },
  { task: 'Appliances', owner: 'Zach Cato' },
  { task: 'Counter Tops', owner: 'Zach Cato' },
  { task: 'Pool', owner: 'Matt Cody' },
  { task: 'Foundation', owner: 'Matt Cody' },
  { task: 'Gutters', owner: 'Matt Cody' },
  { task: 'Glass Shower Door', owner: 'Matt Cody' },
  { task: 'Fireplace', owner: 'Matt Cody' },
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
