// src/components/dashboard/SlaSummaryCards.tsx

import { useEffect, useState } from "react";
import apiClient from "../../api/apiClient";

type SlaSummary = {
  total: number;
  noSla: number;
  onTrack: number;
  dueSoon: number;
  overdue: number;
  escalated: number;
};

type State = {
  data?: SlaSummary;
  loading: boolean;
  error?: string;
};

export default function SlaSummaryCards() {
  const [state, setState] = useState<State>({
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await apiClient.get<SlaSummary>(
          "/incoming/my-desk/sla-summary"
        );
        if (cancelled) return;
        setState({ data: res.data, loading: false });
      } catch (err) {
        console.error("Failed to load SLA summary", err);
        if (cancelled) return;
        setState({
          loading: false,
          error: "تعذر تحميل ملخص SLA لمعاملات مكتبي",
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-white dark:bg-slate-950 border border-gray-100 dark:border-white/10 p-3 animate-pulse"
          >
            <div className="h-3 w-16 rounded bg-gray-100 dark:bg-white/10 mb-2" />
            <div className="h-6 w-10 rounded bg-gray-100 dark:bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (!state.data) {
    return null;
  }

  const d = state.data;

  const cards = [
    {
      label: "الإجمالي (مكتبي)",
      value: d.total,
      tone: "neutral" as const,
      sub: "",
    },
    {
      label: "بدون SLA",
      value: d.noSla,
      tone: "muted" as const,
      sub: "تحتاج ضبط مدة استحقاق",
    },
    {
      label: "على المسار الصحيح",
      value: d.onTrack,
      tone: "good" as const,
      sub: "",
    },
    {
      label: "قريبة من الانتهاء",
      value: d.dueSoon,
      tone: "warn" as const,
      sub: "",
    },
    {
      label: "متأخرة",
      value: d.overdue,
      tone: "bad" as const,
      sub: "",
    },
    {
      label: "تم تصعيدها",
      value: d.escalated,
      tone: "alert" as const,
      sub: "",
    },
  ];

  const toneClass = (tone: string) => {
    switch (tone) {
      case "good":
        return "border-emerald-100 bg-emerald-50/60 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200";
      case "warn":
        return "border-amber-100 bg-amber-50/60 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200";
      case "bad":
        return "border-rose-100 bg-rose-50/60 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200";
      case "alert":
        return "border-indigo-100 bg-indigo-50/60 text-indigo-800 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200";
      case "muted":
        return "border-slate-100 bg-slate-50/70 text-slate-700 dark:border-slate-500/40 dark:bg-slate-800/60 dark:text-slate-200";
      default:
        return "border-slate-100 bg-white text-slate-800 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100";
    }
  };

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
          ملخص SLA لمعاملات مكتبي
        </h2>
        {state.error && (
          <span className="text-[11px] text-rose-500">{state.error}</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className={
              "rounded-2xl border p-3 flex flex-col justify-between " +
              toneClass(c.tone)
            }
          >
            <div className="text-[11px] mb-1">{c.label}</div>
            <div className="text-2xl font-bold tabular-nums mb-1">
              {c.value}
            </div>
            {c.sub && (
              <div className="text-[10px] opacity-80 leading-snug">{c.sub}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
