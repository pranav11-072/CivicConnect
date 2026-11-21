import type {
  AuthUser,
  Complaint,
  Department,
  ModelMetricsSummary,
  NlpAnalysisResult,
  NotificationItem,
  OfficerRemark,
  StatusHistoryItem,
} from "../types";

let inMemoryToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  inMemoryToken = token;
}

export function getUploadUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  const safeName = encodeURIComponent(filename.replace(/^.*[\\/]/, ""));
  return `/api/uploads/${safeName}`;
}

async function request<T>(path: string, options: RequestInit & { rawResponse?: boolean } = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(inMemoryToken ? { Authorization: `Bearer ${inMemoryToken}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (options.rawResponse) {
    if (!res.ok) {
      throw new Error("Failed to export CSV report.");
    }
    return res as unknown as T;
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  // Auth
  registerCitizen: (payload: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
    preferred_language: "en" | "kn";
    ward_location: string;
  }) => request<{ token: string; user: AuthUser }>("/auth/citizen/register", { method: "POST", body: JSON.stringify(payload) }),

  loginCitizen: (payload: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/citizen/login", { method: "POST", body: JSON.stringify(payload) }),

  getOfficerStatus: () => request<{ needsSetup: boolean; envConfigured: boolean }>("/auth/officer/status"),

  setupOfficer: (payload: { full_name: string; email: string; employee_id: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/officer/setup", { method: "POST", body: JSON.stringify(payload) }),

  loginOfficer: (payload: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/officer/login", { method: "POST", body: JSON.stringify(payload) }),

  // Citizen
  getCitizenDashboard: () =>
    request<{
      stats: { total: number; pending: number; in_progress: number; resolved: number; unread_notifications: number };
      category_stats: Array<{ category: string; count: number }>;
      recent_complaints: Complaint[];
    }>("/citizen/dashboard"),

  submitComplaint: (formData: FormData) =>
    request<{ message: string; complaint: Complaint; nlp_analysis: NlpAnalysisResult }>("/citizen/complaints", {
      method: "POST",
      body: formData,
    }),

  getCitizenComplaints: (params: Record<string, string> = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""));
    const qs = new URLSearchParams(clean).toString();
    return request<{ complaints: Complaint[] }>(`/citizen/complaints${qs ? `?${qs}` : ""}`);
  },

  trackComplaintByCode: (code: string) =>
    request<{ complaint: Complaint; history: StatusHistoryItem[]; remarks: OfficerRemark[] }>(
      `/citizen/complaints/track/${encodeURIComponent(code)}`
    ),

  getNotifications: () => request<{ notifications: NotificationItem[] }>("/citizen/notifications"),

  markNotificationRead: (id: number) =>
    request<{ message: string }>(`/citizen/notifications/${id}/read`, { method: "PATCH" }),

  // Shared detail
  getComplaintDetail: (id: string | number) =>
    request<{ complaint: Complaint; history: StatusHistoryItem[]; remarks: OfficerRemark[] }>(`/complaints/${id}`),

  // Officer
  getOfficerDashboard: () =>
    request<{
      stats: {
        total: number;
        pending: number;
        assigned: number;
        in_progress: number;
        resolved: number;
        needs_review: number;
        high_urgency_open: number;
      };
      recent_complaints: Complaint[];
      low_confidence_queue: Complaint[];
    }>("/officer/dashboard"),

  getDepartments: () => request<{ departments: Department[] }>("/officer/departments"),

  getOfficerComplaints: (params: Record<string, string> = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""));
    const qs = new URLSearchParams(clean).toString();
    return request<{ complaints: Complaint[] }>(`/officer/complaints${qs ? `?${qs}` : ""}`);
  },

  updateComplaint: (
    id: string | number,
    payload: {
      status?: string;
      final_category?: string;
      department_id?: number | null;
      human_verified?: boolean;
      note?: string;
    }
  ) => request<{ message: string; complaint: Complaint }>(`/officer/complaints/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  addOfficerRemark: (
    id: string | number,
    payload: { remark_en: string; remark_kn?: string; is_resolution_note?: boolean }
  ) => request<{ message: string }>(`/officer/complaints/${id}/remarks`, { method: "POST", body: JSON.stringify(payload) }),

  exportOfficerCsv: (params: Record<string, string> = {}) => {
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""));
    const qs = new URLSearchParams(clean).toString();
    return request<Response>(`/officer/reports/export${qs ? `?${qs}` : ""}`, { rawResponse: true });
  },

  // Analytics
  getAnalyticsOverview: () =>
    request<{
      summary: {
        total_grievances: number;
        pending: number;
        active: number;
        resolved: number;
        avg_confidence: number;
        low_confidence_total: number;
      };
      category_distribution: Array<{ name: string; value: number }>;
      monthly_trends: Array<{ month: string; total: number; resolved: number }>;
      urgency_distribution: Array<{ name: string; value: number }>;
      sentiment_distribution: Array<{ name: string; value: number }>;
      department_performance: Array<{ department: string; total: number; resolved: number; open_cases: number }>;
      location_distribution: Array<{ name: string; count: number }>;
      language_distribution: Array<{ name: string; value: number }>;
      confidence_buckets: Array<{ range: string; count: number }>;
      nlp_model_metrics: ModelMetricsSummary | null;
    }>("/analytics/overview"),
};
