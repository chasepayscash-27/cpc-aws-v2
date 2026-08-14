export type CustomAttachmentType = "photo" | "video" | "file";

export interface CustomProjectAttachment {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  attachment_type: CustomAttachmentType;
  data_url: string;
  created_at: string;
}

export interface ProjectRow {
  project_uuid?: string;
  workspace_uuid?: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string;
  completed_at?: string;
  name?: string;
  full_address?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  lat?: string;
  lng?: string;
  investment_strategy?: string;
  stage?: string;
  type?: string;
  style?: string;
  square_feet?: string;
  beds?: string;
  baths?: string;
  year_built?: string;
  featured_image_url?: string;
  permissions_json?: string;
  custom_project?: string;
  custom_attachments_json?: string;
}