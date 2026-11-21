import { CheckCircle2, Clock, Wrench, UserCheck, XCircle, AlertCircle, CircleDot } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: typeof Clock }> = {
    Pending: { cls: "bg-amber-50 text-amber-800 border-amber-200", icon: Clock },
    Assigned: { cls: "bg-blue-50 text-blue-800 border-blue-200", icon: UserCheck },
    "In Progress": { cls: "bg-indigo-50 text-indigo-800 border-indigo-200", icon: Wrench },
    Resolved: { cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
    Rejected: { cls: "bg-rose-50 text-rose-800 border-rose-200", icon: XCircle },
  };
  const cfg = map[status] || { cls: "bg-slate-100 text-slate-700 border-slate-200", icon: CircleDot };
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border whitespace-nowrap shrink-0 ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {status}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, string> = {
    High: "text-rose-700 bg-rose-50 border-rose-200",
    Medium: "text-amber-800 bg-amber-50 border-amber-200",
    Low: "text-slate-700 bg-slate-100 border-slate-200",
  };
  const cls = map[urgency] || map.Low;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border whitespace-nowrap shrink-0 ${cls}`}>
      <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
      {urgency} Urgency
    </span>
  );
}
