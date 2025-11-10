// src/pages/AuditPage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { searchAudit, type AuditItem } from "../api/audit";
import PermissionsGate from "../components/PermissionsGate";

function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function AuditPage() {
  const [q, setQ] = useState("");
  const qDeb = useDebounced(q, 350);

  const [userId, setUserId] = useState<string>("");
  const [actionType, setActionType] = useState("");
  const [from, setFrom] = useState(""); // YYYY-MM-DD
  const [to, setTo] = useState("");     // YYYY-MM-DD

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [rows, setRows] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toastRef = useRef<HTMLDivElement>(null);
  const showToast = (msg: string, danger = false) => {
    if (!toastRef.current) return;
    toastRef.current.textContent = msg;
    toastRef.current.style.opacity = "1";
    toastRef.current.style.background = danger ? "#b00020" : "#0f766e";
    setTimeout(() => {
      if (toastRef.current) toastRef.current.style.opacity = "0";
    }, 1800);
  };

  // تحميل البيانات
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await searchAudit({
          page,
          pageSize,
          q: qDeb,
          userId: userId ? Number(userId) : undefined,
          actionType: actionType || undefined,
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(new Date(to).setHours(23, 59, 59, 999)).toISOString() : undefined,
        });
        if (!mounted) return;
        setRows(res.items);
        setTotal(res.total);
        setPages(res.pages);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setErr("تعذّر تحميل سجل التدقيق.");
          setRows([]);
          setTotal(0);
          setPages(1);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [page, pageSize, qDeb, userId, actionType, from, to]);

  const onClear = () => {
    setQ("");
    setUserId("");
    setActionType("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const canPrev = page > 1;
  const canNext = page < pages;

  const summary = useMemo(() => {
    const fromTxt = from ? `من ${from}` : "";
    const toTxt = to ? `إلى ${to}` : "";
    const parts = [
      q ? `بحث: "${q}"` : "",
      userId ? `المستخدم: #${userId}` : "",
      actionType ? `الإجراء: ${actionType}` : "",
      fromTxt || toTxt ? `${fromTxt} ${toTxt}`.trim() : "",
    ].filter(Boolean);
    return parts.length ? parts.join(" — ") : "كل السجل";
  }, [q, userId, actionType, from, to]);

  return (
    <PermissionsGate one="audit.read">
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">سجل التدقيق</h2>
          <div className="text-sm text-gray-500">{summary}</div>
        </div>

        {/* فلاتر */}
        <div className="grid md:grid-cols-5 gap-3 bg-white dark:bg-slate-950 border dark:border-white/10 p-3 rounded-2xl">
          <div>
            <label className="block text-xs mb-1 opacity-70">بحث</label>
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="كلمات البحث…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">رقم المستخدم</label>
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="مثال: 1"
              inputMode="numeric"
              value={userId}
              onChange={(e) => { setUserId(e.target.value.replace(/[^\d]/g, "")); setPage(1); }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">نوع الإجراء</label>
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="CREATE / UPDATE / DELETE / …"
              value={actionType}
              onChange={(e) => { setActionType(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">من تاريخ</label>
            <input
              type="date"
              className="w-full border rounded-xl px-3 py-2"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1 opacity-70">إلى تاريخ</label>
            <input
              type="date"
              className="w-full border rounded-xl px-3 py-2"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1); }}
            />
          </div>
          <div className="md:col-span-5 flex gap-2 justify-end">
            <button
              onClick={onClear}
              className="px-3 py-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-white/10"
            >
              تفريغ الفلاتر
            </button>
          </div>
        </div>

        {/* الجدول */}
        <div className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/10">
              <tr>
                <th className="text-right p-3">#</th>
                <th className="text-right p-3">الوقت</th>
                <th className="text-right p-3">المستخدم</th>
                <th className="text-right p-3">الإجراء</th>
                <th className="text-right p-3">الوصف</th>
                <th className="text-right p-3">الوثيقة</th>
                <th className="text-right p-3">IP</th>
                <th className="text-right p-3">المحطة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center">جارِ التحميل…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">لا توجد سجلات.</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t dark:border-white/10">
                    <td className="p-3 font-mono">{r.id}</td>
                    <td className="p-3">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                    <td className="p-3">{r.userName ?? (r.userId ? `#${r.userId}` : "—")}</td>
                    <td className="p-3">{r.actionType}</td>
                    <td className="p-3 whitespace-pre-wrap">{r.actionDescription ?? "—"}</td>
                    <td className="p-3">
                      {r.documentTitle
                        ? r.documentTitle
                        : r.documentId
                        ? `#${r.documentId}`
                        : "—"}
                    </td>
                    <td className="p-3">{r.fromIP ?? "—"}</td>
                    <td className="p-3">{r.workstationName ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ترقيم الصفحات */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            المجموع: {total} — صفحة {page} من {pages}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="border rounded-xl px-2 py-1"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>{n} / صفحة</option>
              ))}
            </select>

            <button
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`px-3 py-2 rounded-xl border ${!canPrev ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-white/10"}`}
            >
              السابق
            </button>
            <button
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className={`px-3 py-2 rounded-xl border ${!canNext ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-white/10"}`}
            >
              التالي
            </button>
          </div>
        </div>

        {/* Toast */}
        <div
          ref={toastRef}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#0f766e",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 12,
            boxShadow: "0 6px 20px rgba(0,0,0,.18)",
            opacity: 0,
            transition: "opacity .2s ease",
            pointerEvents: "none",
          }}
        />
        {err && (
          <div className="text-rose-600 text-sm">{err}</div>
        )}
      </div>
    </PermissionsGate>
  );
}
