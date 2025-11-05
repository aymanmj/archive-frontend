// src/components/incoming/IncomingTimeline.tsx

import { useEffect, useState } from "react";
import api from "../../api/apiClient";

type TimelineItem = {
  type: 'file'|'distribution'|'audit';
  at: string;
  title: string;
  by?: string;
  details?: string;
  link?: string;
};

export default function IncomingTimeline({ incomingId }: { incomingId: string | number }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{items: TimelineItem[]}>(`/incoming/${incomingId}/timeline`);
        if (mounted) setItems(res.data.items || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [incomingId]);

  return (
    <section className="bg-white border rounded-2xl shadow-sm p-4" dir="rtl">
      <h2 className="text-lg font-semibold mb-3">السجل الزمني</h2>
      {loading ? (
        <div className="text-sm text-slate-500">...جاري التحميل</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-slate-500">لا يوجد عناصر في السجل</div>
      ) : (
        <ul className="space-y-3">
          {items.map((it, idx) => (
            <li key={idx} className="p-3 bg-gray-50 rounded-xl border">
              <div className="text-xs text-slate-500">{new Date(it.at).toLocaleString('ar-LY')}</div>
              <div className="font-semibold">{it.title}</div>
              <div className="text-sm text-slate-600">{it.by ? `بواسطة: ${it.by}` : ''}</div>
              {it.details && <div className="text-sm text-slate-700 mt-1">{it.details}</div>}
              {it.link && (
                <div className="mt-2">
                  <a href={it.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">فتح العنصر</a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
