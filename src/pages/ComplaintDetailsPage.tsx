import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Loader2, MessageSquarePlus, Save } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api, getUploadUrl } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { StatusBadge, UrgencyBadge } from "../components/StatusBadge";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import type { Complaint, Department, OfficerRemark, StatusHistoryItem } from "../types";

export default function ComplaintDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const isOfficer = user?.role === "officer";

  const [detail, setDetail] = useState<{
    complaint: Complaint;
    history: StatusHistoryItem[];
    remarks: OfficerRemark[];
  } | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState("Pending");
  const [finalCategory, setFinalCategory] = useState("Water Supply");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [humanVerified, setHumanVerified] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  const [remarkEn, setRemarkEn] = useState("");
  const [remarkKn, setRemarkKn] = useState("");
  const [isResolution, setIsResolution] = useState(false);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getComplaintDetail(id);
      setDetail(res);
      setStatus(res.complaint.status);
      setFinalCategory(res.complaint.final_category);
      setDepartmentId(res.complaint.department_id ? String(res.complaint.department_id) : "");
      setHumanVerified(Boolean(res.complaint.human_verified));

      if (isOfficer) {
        const deptRes = await api.getDepartments();
        setDepartments(deptRes.departments);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load complaint details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleUpdateComplaint = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setMessage("");
    setError("");
    try {
      await api.updateComplaint(id, {
        status,
        final_category: finalCategory,
        department_id: departmentId ? Number(departmentId) : null,
        human_verified: humanVerified,
        note: statusNote,
      });
      setStatusNote("");
      setMessage("Complaint status and department routing saved.");
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update complaint.");
    }
  };

  const handleAddRemark = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setMessage("");
    setError("");
    try {
      await api.addOfficerRemark(id, {
        remark_en: remarkEn,
        remark_kn: remarkKn,
        is_resolution_note: isResolution,
      });
      setRemarkEn("");
      setRemarkKn("");
      setIsResolution(false);
      setMessage("Official remark posted.");
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post remark.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-slate-600 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading complaint details...
        </div>
      </DashboardLayout>
    );
  }

  if (!detail) {
    return (
      <DashboardLayout>
        <div className="p-6 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 text-sm">
          {error || "Complaint not found."}
        </div>
      </DashboardLayout>
    );
  }

  const { complaint, history, remarks } = detail;
  const uploadUrl = getUploadUrl(complaint.image_path);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {message && (
          <div className="p-4 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-sm">{message}</div>
        )}
        {error && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-civic-blue">{complaint.complaint_code}</span>
                <span aria-hidden="true">·</span>
                <span>{complaint.citizen_name}</span>
                <span aria-hidden="true">·</span>
                <span>{complaint.location}</span>
                <span aria-hidden="true">·</span>
                <span>{complaint.detected_language}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{complaint.created_at}</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-civic-navy">{complaint.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <UrgencyBadge urgency={complaint.urgency} />
              <StatusBadge status={complaint.status} />
              <ConfidenceBadge
                confidence={complaint.nlp_confidence}
                needsReview={complaint.needs_human_review}
                humanVerified={complaint.human_verified}
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-800 whitespace-pre-line leading-relaxed">
            {complaint.description}
          </div>

          {uploadUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Uploaded Evidence</p>
              <img
                src={uploadUrl}
                alt="Citizen submitted evidence"
                referrerPolicy="no-referrer"
                className="max-h-72 rounded-lg border border-slate-200 object-contain"
              />
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-xs font-semibold text-civic-blue">Automated Response (English)</p>
              <p className="text-sm text-slate-800 mt-1">{complaint.auto_response_en}</p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50">
              <p className="text-xs font-semibold text-amber-800">ಸ್ವಯಂಚಾಲಿತ ಪ್ರತಿಕ್ರಿಯೆ (ಕನ್ನಡ)</p>
              <p className="text-sm text-slate-800 mt-1">{complaint.auto_response_kn}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 block">Predicted Category</span>
              <strong className="text-slate-900">{complaint.predicted_category}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Final Category</span>
              <strong className="text-slate-900">{complaint.final_category}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Assigned Department</span>
              <strong className="text-slate-900">{complaint.department_name || "Unassigned"}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Sentiment · Model</span>
              <strong className="text-slate-900">
                {complaint.sentiment} · {complaint.nlp_model_used || "NLP"}
              </strong>
            </div>
          </div>
        </div>

        {isOfficer && (
          <div className="grid lg:grid-cols-2 gap-6">
            <form onSubmit={handleUpdateComplaint} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="font-display font-bold text-civic-navy">Officer Triage & Status Update</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Verified Category</label>
                  <select
                    value={finalCategory}
                    onChange={(e) => setFinalCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="Water Supply">Water Supply</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Roads and Infrastructure">Roads and Infrastructure</option>
                    <option value="Sanitation and Waste Management">Sanitation and Waste Management</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Department</label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Auto-match by Category</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status Audit Note</label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional note recorded in status history"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={humanVerified}
                  onChange={(e) => setHumanVerified(e.target.checked)}
                />
                Confirm NLP category prediction as human-verified
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-civic-navy hover:bg-civic-blue text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
              >
                <Save className="w-4 h-4" aria-hidden="true" /> Save Updates
              </button>
            </form>

            <form onSubmit={handleAddRemark} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <h2 className="font-display font-bold text-civic-navy">Add Official Remark / Resolution Note</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Remark (English)</label>
                <textarea
                  required
                  rows={2}
                  value={remarkEn}
                  onChange={(e) => setRemarkEn(e.target.value)}
                  placeholder="Field engineering team dispatched..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Remark (Kannada · Optional)</label>
                <textarea
                  rows={2}
                  value={remarkKn}
                  onChange={(e) => setRemarkKn(e.target.value)}
                  placeholder="ದುರಸ್ತಿ ಕಾರ್ಯಕ್ಕಾಗಿ ತಂಡವನ್ನು ಕಳುಹಿಸಲಾಗಿದೆ..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isResolution}
                  onChange={(e) => setIsResolution(e.target.checked)}
                />
                Mark as official resolution note
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-civic-saffron hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition"
              >
                <MessageSquarePlus className="w-4 h-4" aria-hidden="true" /> Post Remark
              </button>
            </form>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-display font-bold text-civic-navy mb-4">Status History</h2>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="pb-3 border-b border-slate-100 last:border-b-0 last:pb-0 text-xs space-y-1">
                  <p className="font-semibold text-slate-900">
                    {h.old_status ? `${h.old_status} → ${h.new_status}` : h.new_status}
                  </p>
                  <p className="text-slate-600">{h.note}</p>
                  <p className="text-slate-400 font-mono tabular-nums">
                    {h.changed_by_role} · {h.created_at}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-display font-bold text-civic-navy mb-4">Officer Remarks</h2>
            {remarks.length === 0 ? (
              <p className="text-sm text-slate-500">No officer remarks posted yet.</p>
            ) : (
              <div className="space-y-3">
                {remarks.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-lg bg-slate-50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-civic-navy">{r.officer_name}</span>
                      {Boolean(r.is_resolution_note) && (
                        <span className="font-semibold text-civic-green">Resolution Note</span>
                      )}
                    </div>
                    <p className="text-slate-800">{r.remark_en}</p>
                    {r.remark_kn && <p className="text-slate-600">{r.remark_kn}</p>}
                    <p className="text-slate-400 font-mono tabular-nums">{r.created_at}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
