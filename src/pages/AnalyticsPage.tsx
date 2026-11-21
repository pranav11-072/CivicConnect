import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardLayout from "../layouts/DashboardLayout";
import { api } from "../services/api";
import type { ModelMetricsSummary } from "../types";

const COLORS = ["#143A6B", "#D97706", "#15803D", "#4F46E5", "#BE123C"];

export default function AnalyticsPage() {
  const [data, setData] = useState<{
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
    confidence_buckets: Array<{ range: string; count: number }>;
    nlp_model_metrics: ModelMetricsSummary | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getAnalyticsOverview()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 text-slate-600 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading live analytics...
        </div>
      </DashboardLayout>
    );
  }

  const s = data?.summary;
  const metrics = data?.nlp_model_metrics;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-civic-navy">Civic & NLP Analytics</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Real-time SQLite database aggregations alongside verified holdout NLP model evaluations.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">Total Grievances</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-navy mt-1">{s?.total_grievances ?? 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-amber-700 mt-1">{s?.pending ?? 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">Assigned / Progress</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-blue mt-1">{s?.active ?? 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">Resolved</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-green mt-1">{s?.resolved ?? 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <p className="text-xs text-slate-500">Avg NLP Confidence</p>
            <p className="font-mono tabular-nums text-2xl font-bold text-civic-navy mt-1">
              {Math.round((s?.avg_confidence ?? 0) * 100)}%
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h2 className="font-display font-bold text-civic-navy mb-4">Category Distribution</h2>
            {data?.category_distribution.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.category_distribution} dataKey="value" nameKey="name" outerRadius={92} label>
                      {data.category_distribution.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-20 text-center text-sm text-slate-500">No complaints recorded yet.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h2 className="font-display font-bold text-civic-navy mb-4">Monthly Complaint Trends</h2>
            {data?.monthly_trends.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.monthly_trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#143A6B" strokeWidth={2} name="Submitted" />
                    <Line type="monotone" dataKey="resolved" stroke="#15803D" strokeWidth={2} name="Resolved" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-20 text-center text-sm text-slate-500">No monthly trend data yet.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h2 className="font-display font-bold text-civic-navy mb-4">Department-wise Performance</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.department_performance || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="resolved" fill="#15803D" name="Resolved" />
                  <Bar dataKey="open_cases" fill="#D97706" name="Open Cases" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h2 className="font-display font-bold text-civic-navy mb-4">Location-wise Distribution</h2>
            {data?.location_distribution.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.location_distribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={115} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#143A6B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-20 text-center text-sm text-slate-500">No location records yet.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h2 className="font-display font-bold text-civic-navy mb-4">Urgency & Sentiment Distribution</h2>
            {data?.urgency_distribution.length ? (
              <div className="grid grid-cols-2 gap-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.urgency_distribution}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#D97706" name="Urgency" />
                  </BarChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.sentiment_distribution}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4F46E5" name="Sentiment" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-20 text-center text-sm text-slate-500">No urgency or sentiment records yet.</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h2 className="font-display font-bold text-civic-navy mb-4">NLP Confidence Buckets</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.confidence_buckets || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0B1F3A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {metrics && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display font-bold text-civic-navy">
                Verified Holdout Evaluation · Selected Model: {metrics.selected_model}
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Train rows: {metrics.train_rows} · Test rows: {metrics.test_rows}
              </span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(metrics.models).map(([name, m]) => (
                <div key={name} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="font-semibold text-sm text-civic-navy">{name}</p>
                  <p className="text-xs text-slate-600 mt-1 font-mono tabular-nums">
                    Holdout Accuracy: <strong>{(m.accuracy * 100).toFixed(1)}%</strong>
                  </p>
                  <p className="text-xs text-slate-600 font-mono tabular-nums">
                    Macro F1: <strong>{(m.macro_f1 * 100).toFixed(1)}%</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
