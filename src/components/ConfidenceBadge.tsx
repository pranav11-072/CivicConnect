import { AlertTriangle, CheckCircle2, Cpu } from "lucide-react";

export function ConfidenceBadge({
  confidence,
  needsReview,
  humanVerified,
}: {
  confidence: number;
  needsReview: number | boolean;
  humanVerified: number | boolean;
}) {
  const pct = Math.round((confidence || 0) * 100);

  if (humanVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono tabular-nums whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        Verified · {pct}%
      </span>
    );
  }

  if (needsReview || confidence < 0.55) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-900 border border-amber-300 font-mono tabular-nums whitespace-nowrap shrink-0">
        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
        Review Required · {pct}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 font-mono tabular-nums whitespace-nowrap shrink-0">
      <Cpu className="w-3.5 h-3.5 text-civic-blue" aria-hidden="true" />
      Confidence · {pct}%
    </span>
  );
}
