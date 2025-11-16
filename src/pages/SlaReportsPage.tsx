// src/pages/SlaReportsPage.tsx

import { useEffect, useMemo, useState } from "react";
import api from "../api/apiClient";

type DeptSlaRow = {
  departmentId: number | null;
  departmentName: string;
  total: number;
  noSla: number;
  onTrack: number;
  dueSoon: number;
  overdue: number;
  escalated: number;
};

type SlaReportResp = {
  generatedAt: string;
  totalItems: number;
  departments: DeptSlaRow[];
};

function fmtDT(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-LY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SlaReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<SlaReportResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await api.get<SlaReportResp>(
        `/incoming/stats/sla-by-department?${params.toString()}`
      );
      setData(res.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "فشل تحميل تقرير SLA");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const base = {
      total: 0,
      noSla: 0,
      onTrack: 0,
      dueSoon: 0,
      overdue: 0,
      escalated: 0,
    };
    if (!data?.departments?.length) return base;
    for (const d of data.departments) {
      base.total += d.total;
      base.noSla += d.noSla;
      base.onTrack += d.onTrack;
      base.dueSoon += d.dueSoon;
      base.overdue += d.overdue;
      base.escalated += d.escalated;
    }
    return base;
  }, [data]);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تقارير SLA</h1>
          <p className="text-sm text-gray-500 mt-1">
            نظرة عامة على التزام الإدارات باتفاقيات مستوى الخدمة
            (SLA) للمعاملات المفتوحة وتحت الإجراء والمصعّدة.
          </p>
        </div>
        {data && (
          <div className="text-xs text-gray-500">
            آخر تحديث: {fmtDT(data.generatedAt)}
          </div>
        )}
      </header>

      {/* فلاتر التاريخ */}
      <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
        <div className="grid sm:grid-cols-4 gap-3 text-sm">
          <div>
            <label className="text-xs text-gray-500">من تاريخ استلام الوارد</label>
            <input
              type="date"
              className="w-full border rounded-xl p-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">إلى تاريخ استلام الوارد</label>
            <input
              type="date"
              className="w-full border rounded-xl p-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={load}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 w-full sm:w-auto"
            >
              تطبيق الفلتر
            </button>
            <button
              onClick={() => {
                setFrom("");
                setTo("");
                load();
              }}
              className="border rounded-xl px-4 py-2 text-sm bg-white hover:bg-gray-50 w-full sm:w-auto"
            >
              إعادة تعيين
            </button>
          </div>
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          * يعتمد الفلتر على تاريخ استلام الوارد (receivedDate) للتوزيعات
          المفتوحة وتحت الإجراء والمصعّدة فقط.
        </div>
      </section>

      {/* كروت إجمالي الملخّص */}
      <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
        {err && <div className="text-sm text-red-600">{err}</div>}
        {loading && <div className="text-sm text-gray-500">...جاري التحميل</div>}

        {!loading && (
          <>
            <div className="grid sm:grid-cols-6 gap-3 text-sm">
              <div className="rounded-xl border p-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">
                  إجمالي التوزيعات في التقرير
                </div>
                <div className="text-lg font-bold">{totals.total}</div>
              </div>

              <div className="rounded-xl border p-3 bg-emerald-50">
                <div className="text-xs text-gray-500 mb-1">ضمن الوقت</div>
                <div className="text-lg font-bold">{totals.onTrack}</div>
              </div>

              <div className="rounded-xl border p-3 bg-amber-50">
                <div className="text-xs text-gray-500 mb-1">
                  قريبة من الانتهاء
                </div>
                <div className="text-lg font-bold">{totals.dueSoon}</div>
              </div>

              <div className="rounded-xl border p-3 bg-red-50">
                <div className="text-xs text-gray-500 mb-1">متأخرة</div>
                <div className="text-lg font-bold">{totals.overdue}</div>
              </div>

              <div className="rounded-xl border p-3 bg-rose-50">
                <div className="text-xs text-gray-500 mb-1">تم التصعيد</div>
                <div className="text-lg font-bold">{totals.escalated}</div>
              </div>

              <div className="rounded-xl border p-3 bg-slate-50">
                <div className="text-xs text-gray-500 mb-1">بدون SLA محدد</div>
                <div className="text-lg font-bold">{totals.noSla}</div>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 mt-2">
              * يُحسب الملخص فقط للتوزيعات بحالة Open / InProgress / Escalated.
            </div>
          </>
        )}
      </section>

      {/* جدول حسب الإدارة */}
      <section className="bg-white border rounded-2xl shadow-sm p-4">
        <h3 className="text-sm font-semibold mb-3">حسب الإدارة / القسم</h3>

        {loading ? (
          <div className="text-sm text-gray-500">...جاري التحميل</div>
        ) : (
          <div className="overflow-auto rounded-xl border text-sm">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-right">الإدارة</th>
                  <th className="p-2 text-right">إجمالي التوزيعات</th>
                  <th className="p-2 text-right">ضمن الوقت</th>
                  <th className="p-2 text-right">قريبة من الانتهاء</th>
                  <th className="p-2 text-right">متأخرة</th>
                  <th className="p-2 text-right">تم التصعيد</th>
                  <th className="p-2 text-right">بدون SLA</th>
                </tr>
              </thead>
              <tbody>
                {data?.departments?.length ? (
                  data.departments.map((d) => (
                    <tr key={d.departmentId ?? -1} className="border-t">
                      <td className="p-2">{d.departmentName}</td>
                      <td className="p-2">{d.total}</td>
                      <td className="p-2 text-emerald-700">{d.onTrack}</td>
                      <td className="p-2 text-amber-700">{d.dueSoon}</td>
                      <td className="p-2 text-red-700">{d.overdue}</td>
                      <td className="p-2 text-rose-700">{d.escalated}</td>
                      <td className="p-2 text-slate-700">{d.noSla}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-4 text-center text-gray-500"
                    >
                      لا توجد بيانات في هذا النطاق الزمني.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
