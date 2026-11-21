import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, FilePlus2, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import { StatusBadge, UrgencyBadge } from "../components/StatusBadge";
import type { Complaint, NotificationItem } from "../types";

export default function CitizenDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, resolved: 0, unread_notifications: 0 });
  const [categoryStats, setCategoryStats] = useState<Array<{ category: string; count: number }>>([]);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getCitizenDashboard(), api.getNotifications()])
      .then(([dash, notif]) => {
        setStats(dash.stats);
        setCategoryStats(dash.category_stats);
        setRecentComplaints(dash.recent_complaints);
        setNotifications(notif.notifications);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    } catch {
      // ignore transient error
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-slate-600 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your dashboard...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-civic-navy">Citizen Dashboard</h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Overview of your submitted grievances and bilingual status updates.
            </p>
          </div>
          <Link
            to="/citizen/submit"
            className="inline-flex items-center gap-2 bg-civic-saffron hover:bg-amber-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-4 h-4" aria-hidden="true" /> Submit Grievance
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-sm">{error}</div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Total Submitted</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-navy mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Pending Review</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">In Progress</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-blue mt-1">{stats.in_progress}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-500">Resolved</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-green mt-1">{stats.resolved}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-display text-base font-bold text-civic-navy mb-4">Category-wise Grievances</h2>
            {categoryStats.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#143A6B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-slate-500">No grievances submitted yet.</p>
                <Link
                  to="/citizen/submit"
                  className="inline-block text-sm font-semibold text-civic-blue hover:underline"
                >
                  Submit your first grievance
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-bold text-civic-navy flex items-center gap-2">
                <Bell className="w-4 h-4 text-civic-saffron" aria-hidden="true" /> Notifications
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {notifications.filter((n) => !n.is_read).length} unread
              </span>
            </div>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                    className={`w-full text-left p-3 rounded-lg border text-xs transition ${
                      n.is_read
                        ? "bg-slate-50 border-slate-200 text-slate-600"
                        : "bg-amber-50/70 border-amber-200 text-slate-900"
                    }`}
                  >
                    <p className="font-medium leading-relaxed">{n.message_en}</p>
                    <p className="text-slate-500 mt-1 leading-relaxed">{n.message_kn}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-civic-navy">Recent Complaint Activity</h2>
            <Link to="/citizen/track" className="text-xs font-semibold text-civic-blue hover:underline">
              Track & View History
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentComplaints.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">
                No complaints submitted yet. Submit a complaint in Kannada, English, or Kanglish to begin tracking.
              </p>
            ) : (
              recentComplaints.map((c) => (
                <Link
                  key={c.id}
                  to={`/complaints/${c.id}`}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-civic-blue">{c.complaint_code}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.detected_language}</span>
                      <span aria-hidden="true">·</span>
                      <span>{c.location}</span>
                    </div>
                    <p className="font-semibold text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-600">{c.final_category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <UrgencyBadge urgency={c.urgency} />
                    <StatusBadge status={c.status} />
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
