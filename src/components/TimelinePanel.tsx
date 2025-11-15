// src/components/TimelinePanel.tsx

import React, { useMemo } from "react";


export type TimelineItem = {
  at: string | Date;
  actionType?: string | null;
  actionLabel?: string | null;
  by?: string | null;
  details?: string | null;
  link?: string | null;
};

type TimelinePanelProps = {
  // يدعم:
  // - Array<TimelineItem>
  // - { items: TimelineItem[] }
  // - undefined/null
  items: TimelineItem[] | { items: TimelineItem[] } | null | undefined;
  title?: string;
  emptyMessage?: string;
};

function fmtDT(v?: string | Date | null) {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return "—";
  try {
    return d.toLocaleString("ar-LY", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}

export default function TimelinePanel({
  items,
  title = "السجل الزمني",
  emptyMessage = "لا يوجد سجل زمني",
}: TimelinePanelProps) {
  // ✅ نطبع الشكل مرة واحدة لتشخيص أي استدعاء خاطئ
  // console.log("TimelinePanel items raw =", items);

  const normalized: TimelineItem[] = useMemo(() => {
    // لو جاله Array جاهز
    if (Array.isArray(items)) return items;

    // لو جاله Object فيه items
    if (items && typeof items === "object" && Array.isArray((items as any).items)) {
      return (items as any).items;
    }

    // أي شيء آخر نعتبره فارغ
    return [];
  }, [items]);

  if (!normalized.length) {
    return (
      <section className="bg-white border rounded-2xl shadow-sm p-4" dir="rtl">
        <div className="text-sm font-semibold mb-2">{title}</div>
        <div className="text-sm text-gray-500">{emptyMessage}</div>
      </section>
    );
  }

  return (
    <section className="bg-white border rounded-2xl shadow-sm p-4" dir="rtl">
      <div className="text-sm font-semibold mb-3">{title}</div>
      <div className="space-y-3">
        {normalized.map((t, i) => (
          <div key={i} className="border rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">{fmtDT(t.at)}</div>
            <div className="font-semibold">
              {t.actionLabel ?? t.actionType ?? "حدث"}
            </div>
            {t.by && (
              <div className="text-xs text-gray-600 mt-0.5">
                بواسطة: {t.by}
              </div>
            )}
            {t.details && (
              <div className="text-sm mt-1 whitespace-pre-wrap">
                {t.details}
              </div>
            )}
            {t.link && (
              <div className="mt-2">
                <a
                  href={t.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  فتح الرابط
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
