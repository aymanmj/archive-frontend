import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getToken } from "../auth";

type DeptIncomingItem = {
  id: string;
  incomingNumber: string;
  subject: string | null;
  externalPartyName: string | null;
  urgencyLevel: string | null;
  receivedDate: string;
  requiredAction: string | null;

  currentStatus: string | null; // Open / InProgress / Completed / Closed
  assignedTo: string | null;
  notes: string | null;

  hasFiles: boolean;
  documentId: string | null;
};

function formatDateTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("ar-LY", {
    hour12: true,
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function MyInboxPage() {
  const [items, setItems] = useState<DeptIncomingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  async function loadMyInbox() {
    setLoading(true);
    setErrMsg("");

    const token = getToken();
    if (!token) {
      window.location.href = "/";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/incoming/my-dept", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("تعذر تحميل وارد الإدارة");
      }

      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error(err);
      setErrMsg(err.message || "خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyInbox();
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6 text-right">
        {/* شريط الأزرار العلوي */}
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/dashboard"
            className="bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-slate-800"
          >
            ← لوحة التحكم
          </Link>
          <Link
            to="/incoming"
            className="bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-slate-800"
          >
            ← البريد الوارد (الكل)
          </Link>
        </div>

        {/* العنوان */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            وارد إدارتي
          </h1>
          <p className="text-sm text-slate-500">
            المعاملات الموجَّهة حالياً لإدارتك والمسؤولة عنها.
          </p>
        </div>

        {/* أخطاء */}
        {errMsg && (
          <div className="bg-red-100 border border-red-300 text-red-700 text-sm p-3 rounded-xl">
            {errMsg}
          </div>
        )}

        {/* الجدول */}
        <div className="bg-white border border-slate-200 rounded-xl shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700">
              المعاملات الجارية
            </h2>
            {loading && (
              <span className="text-xs text-slate-500">...جاري التحديث</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-600 border-b border-slate-200">
                <tr className="text-right">
                  <th className="py-2 px-3">الرقم الوارد</th>
                  <th className="py-2 px-3">الموضوع / الملخص</th>
                  <th className="py-2 px-3">الجهة المرسلة</th>
                  <th className="py-2 px-3">الأهمية</th>
                  <th className="py-2 px-3">الحالة الحالية</th>
                  <th className="py-2 px-3">المكلَّف</th>
                  <th className="py-2 px-3">تاريخ الاستلام</th>
                  <th className="py-2 px-3">ملف</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-6 text-slate-500 text-sm"
                    >
                      جاري التحميل...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-6 text-slate-500 text-sm"
                    >
                      لا توجد معاملات حالياً على إدارتك.
                    </td>
                  </tr>
                ) : (
                  items.map((rec) => (
                    <tr
                      key={rec.id}
                      className="border-b border-slate-100 last:border-none align-top"
                    >
                      {/* الرقم الوارد */}
                      <td className="py-2 px-3 font-mono text-xs">
                        <Link
                          to={`/incoming/${rec.id}`}
                          className="text-blue-700 hover:underline"
                        >
                          {rec.incomingNumber}
                        </Link>
                      </td>

                      {/* الموضوع */}
                      <td className="py-2 px-3 text-slate-700">
                        <div className="font-medium">{rec.subject || "—"}</div>
                        <div className="text-[11px] text-slate-500">
                          {rec.requiredAction
                            ? `الإجراء المطلوب: ${rec.requiredAction}`
                            : ""}
                        </div>
                      </td>

                      {/* الجهة المرسلة */}
                      <td className="py-2 px-3 text-slate-700">
                        {rec.externalPartyName || "—"}
                      </td>

                      {/* الأهمية */}
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {rec.urgencyLevel === "VeryUrgent"
                          ? "عاجل جدًا 🔥"
                          : rec.urgencyLevel === "Urgent"
                          ? "عاجل ⚠️"
                          : "عادي"}
                      </td>

                      {/* الحالة الحالية */}
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-300 text-xs px-2 py-1 rounded-md text-slate-700">
                          <span className="font-semibold">
                            {rec.currentStatus || "—"}
                          </span>
                        </div>
                        {rec.notes && (
                          <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {rec.notes}
                          </div>
                        )}
                      </td>

                      {/* المكلَّف */}
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {rec.assignedTo || "—"}
                      </td>

                      {/* تاريخ الاستلام */}
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {formatDateTime(rec.receivedDate)}
                      </td>

                      {/* ملف */}
                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {rec.hasFiles ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-800 text-white px-2 py-1 rounded-md">
                            <span>📎</span>
                            <span>موجود</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            لا يوجد
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
