import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import { StatusBadge, UrgencyBadge } from "../components/StatusBadge";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import type { Complaint } from "../types";

export default function OfficerDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
    needs_review: 0,
    high_urgency_open: 0,
  });
  const [recent, setRecent] = useState<Complaint[]>([]);
  const [lowConf, setLowConf] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getOfficerDashboard()
      .then((res) => {
        setStats(res.stats);
        setRecent(res.recent_complaints);
        setLowConf(res.low_confidence_queue);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load officer dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-slate-600 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading officer console...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-civic-navy">Officer Redressal Overview</h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Live complaint triage queue and low-confidence NLP predictions awaiting verification.
            </p>
          </div>
          <Link
            to="/officer/complaints"
            className="bg-civic-navy hover:bg-civic-blue text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap shrink-0"
          >
            Manage All Grievances
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Total Grievances</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-navy mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Pending</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">High Urgency Open</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-rose-700 mt-1">{stats.high_urgency_open}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Low-Confidence Queue</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-saffron mt-1">{stats.needs_review}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Resolved</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-green mt-1">{stats.resolved}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-display font-bold text-civic-navy text-base">Human Verification Queue (&lt;55%)</h2>
              <Link to="/officer/complaints?needs_review=true" className="text-xs font-semibold text-civic-blue hover:underline">
                View Queue
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {lowConf.length === 0 ? (
                <p className="p-6 text-sm text-slate-500 text-center">No unverified low-confidence predictions.</p>
              ) : (
                lowConf.map((c) => (
                  <Link key={c.id} to={`/complaints/${c.id}`} className="block px-6 py-4 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-civic-blue">{c.complaint_code}</span>
                      <ConfidenceBadge
                        confidence={c.nlp_confidence}
                        needsReview={c.needs_human_review}
                        humanVerified={c.human_verified}
                      />
                    </div>
                    <p className="font-semibold text-slate-900 mt-1">{c.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Predicted: {c.predicted_category} · {c.location}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-display font-bold text-civic-navy text-base">Recent Incoming Grievances</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recent.length === 0 ? (
                <p className="p-6 text-sm text-slate-500 text-center">No grievances recorded in database yet.</p>
              ) : (
                recent.map((c) => (
                  <Link
                    key={c.id}
                    to={`/complaints/${c.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-semibold text-civic-blue">{c.complaint_code}</span>
                      <p className="font-semibold text-slate-900 truncate mt-0.5">{c.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {c.citizen_name} · {c.final_category}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <StatusBadge status={c.status} />
                      <UrgencyBadge urgency={c.urgency} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
