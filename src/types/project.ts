export interface ProjectRow {
  project_name?: string;
  house?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
  purchase_date?: string;
  sale_date?: string;
  budget?: string | number;
  actual_cost?: string | number;
  profit?: string | number;
  days_in_inventory?: string | number;
}