export type UserRole = "citizen" | "officer";

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  preferred_language?: "en" | "kn";
  ward_location?: string;
  employee_id?: string;
  department_id?: number | null;
  department_name?: string;
  officer_role?: string;
}

export interface Complaint {
  id: number;
  complaint_code: string;
  user_id: number;
  title: string;
  description: string;
  detected_language: string;
  location: string;
  image_path: string | null;
  predicted_category: string;
  final_category: string;
  department_id: number | null;
  department_name?: string | null;
  sentiment: "Positive" | "Neutral" | "Negative";
  urgency: "High" | "Medium" | "Low";
  nlp_confidence: number;
  needs_human_review: number;
  human_verified: number;
  status: "Pending" | "Assigned" | "In Progress" | "Resolved" | "Rejected";
  auto_response_en: string;
  auto_response_kn: string;
  nlp_probabilities_json?: string | null;
  nlp_model_used?: string | null;
  citizen_name?: string;
  citizen_email?: string;
  citizen_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryItem {
  id: number;
  complaint_id: number;
  old_status: string | null;
  new_status: string;
  changed_by_role: string;
  changed_by_id: number;
  note: string | null;
  created_at: string;
}

export interface OfficerRemark {
  id: number;
  complaint_id: number;
  officer_id: number;
  officer_name: string;
  employee_id?: string;
  remark_en: string;
  remark_kn?: string | null;
  is_resolution_note: number;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  complaint_id: number;
  complaint_code: string;
  message_en: string;
  message_kn: string;
  is_read: number;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description: string;
  contact_email: string;
}

export interface NlpAnalysisResult {
  predicted_category: string;
  confidence: number;
  needs_human_review: boolean;
  detected_language: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  urgency: "High" | "Medium" | "Low";
  class_probabilities: Record<string, number>;
  model_used: string;
  normalized_preview?: string;
}

export interface ModelMetricsSummary {
  selected_model: string;
  dataset_rows: number;
  train_rows: number;
  test_rows: number;
  source: string;
  models: Record<
    string,
    {
      accuracy: number;
      macro_f1: number;
      per_class: Record<
        string,
        {
          precision: number;
          recall: number;
          f1_score: number;
          support: number;
        }
      >;
    }
  >;
}
