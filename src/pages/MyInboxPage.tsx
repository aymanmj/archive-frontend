import { useEffect, useState } from "react";
import api from "../api/apiClient";

export default function MyInboxPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const { data } = await api.get("/incoming/my-dept");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "فشل تحميل القائمة");
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-700">وارد إدارتي</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white shadow rounded-2xl overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">رقم الوارد</th>
              <th className="p-3">الجهة</th>
              <th className="p-3">العنوان</th>
              <th className="p-3">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="p-3">{x.incomingNumber}</td>
                <td className="p-3">{x.externalPartyName}</td>
                <td className="p-3">{x.document?.title}</td>
                <td className="p-3">{x.status}</td>
              </tr>
            ))}
            {!items.length && (
              <tr><td className="p-3 text-slate-500" colSpan={4}>لا توجد عناصر</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
