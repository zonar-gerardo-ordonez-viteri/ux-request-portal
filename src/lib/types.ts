export type Priority = "highest" | "high" | "medium" | "low" | "lowest";

export type RequestStatus = "active" | "completed";

export interface UxRequest {
  id: string;
  product_name: string;
  feature_name: string;
  pm_name: string;
  lead_name: string;
  requester_name: string;
  jira_ticket_key: string;
  priority: Priority;
  primary_user: string;
  feature_purpose: string;
  problem_description: string;
  attachments: string[];
  status: RequestStatus;
  submitter_id: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

export interface AutocompleteOption {
  id: string;
  field_name: string;
  value: string;
  created_at: string;
}

export interface AllowedDomain {
  id: string;
  domain: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "lead" | "requester";
  product_name: string;
  pm_name: string;
  lead_name: string;
  created_at: string;
  updated_at: string;
}

export const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: "highest", label: "Highest", color: "bg-red-500" },
  { value: "high", label: "High", color: "bg-orange-500" },
  { value: "medium", label: "Medium", color: "bg-yellow-500" },
  { value: "low", label: "Low", color: "bg-blue-500" },
  { value: "lowest", label: "Lowest", color: "bg-slate-400" },
];
