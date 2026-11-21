import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, Filter } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import { StatusBadge, UrgencyBadge } from "../components/StatusBadge";
import { ConfidenceBadge } from "../components/ConfidenceBadge";
import type { Complaint } from "../types";

export default function ComplaintManagementPage() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    category: "",
    status: "",
    urgency: "",
    sentiment: "",
    location: "",
    date_from: "",
    date_to: "",
    search: "",
    needs_review: searchParams.get("needs_review") || "",
  });
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadComplaints = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getOfficerComplaints(filters);
      setComplaints(res.complaints);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load complaints.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.exportOfficerCsv(filters);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "civicconnect_grievances_report.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-civic-navy">Grievance Management</h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Filter by category, urgency, sentiment, date, or location, verify NLP routing, and export CSV reports.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 bg-civic-green hover:bg-emerald-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" /> Export CSV Report
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-sm">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search ID, title, citizen..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Categories</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Electricity">Electricity</option>
            <option value="Roads and Infrastructure">Roads and Infrastructure</option>
            <option value="Sanitation and Waste Management">Sanitation and Waste Management</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            value={filters.urgency}
            onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Urgencies</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={filters.sentiment}
            onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Sentiments</option>
            <option value="Negative">Negative</option>
            <option value="Neutral">Neutral</option>
            <option value="Positive">Positive</option>
          </select>
          <input
            type="text"
            placeholder="Location (e.g., Indiranagar)"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            aria-label="Filter from date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.needs_review === "true"}
                onChange={(e) => setFilters({ ...filters, needs_review: e.target.checked ? "true" : "" })}
              />
              Review Queue
            </label>
            <button
              type="button"
              onClick={loadComplaints}
              className="inline-flex items-center gap-1.5 bg-civic-navy hover:bg-civic-blue text-white px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0"
            >
              <Filter className="w-3.5 h-3.5" aria-hidden="true" /> Apply
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Complaint ID</th>
                <th className="px-4 py-3 font-semibold">Citizen & Subject</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Urgency · Sentiment</th>
                <th className="px-4 py-3 font-semibold">NLP Confidence</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading grievances...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No grievances match the selected filters.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono tabular-nums font-semibold text-civic-blue text-xs whitespace-nowrap">
                      {c.complaint_code}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-500">
                        {c.citizen_name} · {c.location} · {c.detected_language}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">{c.final_category}</td>
                    <td className="px-4 py-3 space-y-1">
                      <div>
                        <UrgencyBadge urgency={c.urgency} />
                      </div>
                      <p className="text-xs text-slate-500">{c.sentiment}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge
                        confidence={c.nlp_confidence}
                        needsReview={c.needs_human_review}
                        humanVerified={c.human_verified}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/complaints/${c.id}`}
                        className="text-xs font-semibold text-civic-blue hover:underline whitespace-nowrap"
                      >
                        Review & Update
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
