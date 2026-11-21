import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import { StatusBadge, UrgencyBadge } from "../components/StatusBadge";
import type { Complaint, OfficerRemark, StatusHistoryItem } from "../types";

export default function ComplaintTrackingPage() {
  const [codeInput, setCodeInput] = useState("");
  const [tracked, setTracked] = useState<{
    complaint: Complaint;
    history: StatusHistoryItem[];
    remarks: OfficerRemark[];
  } | null>(null);
  const [trackError, setTrackError] = useState("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.getCitizenComplaints({ status: statusFilter, search });
      setComplaints(res.complaints);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter]);

  const handleTrackSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTrackError("");
    setTracked(null);
    if (!codeInput.trim()) return;
    try {
      const res = await api.trackComplaintByCode(codeInput.trim());
      setTracked(res);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : "Complaint not found.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-civic-navy">Track Your Complaints</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Look up a specific Complaint ID or filter your complete grievance history.
          </p>
        </div>

        <form onSubmit={handleTrackSubmit} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" aria-hidden="true" />
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Enter Complaint ID (e.g., CC-2026-0001)"
              className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-civic-blue"
            />
          </div>
          <button
            type="submit"
            className="bg-civic-navy hover:bg-civic-blue text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition whitespace-nowrap shrink-0"
          >
            Track Status
          </button>
        </form>

        {trackError && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-sm">{trackError}</div>
        )}

        {tracked && (
          <div className="bg-white rounded-xl border border-civic-blue/30 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-semibold text-civic-blue">{tracked.complaint.complaint_code}</span>
                <h2 className="font-display text-lg font-bold text-slate-900 mt-0.5">{tracked.complaint.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <UrgencyBadge urgency={tracked.complaint.urgency} />
                <StatusBadge status={tracked.complaint.status} />
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-700">
              <p>{tracked.complaint.auto_response_en}</p>
              <p className="text-slate-600">{tracked.complaint.auto_response_kn}</p>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold text-slate-500 mb-3">Status Timeline</h3>
              <div className="space-y-2.5">
                {tracked.history.map((h) => (
                  <div key={h.id} className="text-xs flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold text-slate-900">{h.new_status}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-600">{h.note}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums text-slate-400">{h.created_at}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, ID, or location..."
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm flex-1"
              />
              <button
                type="button"
                onClick={fetchComplaints}
                className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-800"
              >
                Search
              </button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <p className="p-8 text-center text-sm text-slate-500">Loading complaint history...</p>
            ) : complaints.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No complaints match your filter.</p>
            ) : (
              complaints.map((c) => (
                <Link
                  key={c.id}
                  to={`/complaints/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-civic-blue">{c.complaint_code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.final_category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.location}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{c.created_at}</span>
                    </div>
                    <p className="font-semibold text-slate-900">{c.title}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={c.status} />
                    <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
