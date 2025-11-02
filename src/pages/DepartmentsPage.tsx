import { useEffect, useState } from "react";
import api from "../api/apiClient";

type Dept = { id: number; name: string; status: "Active" | "Inactive"; createdAt: string; updatedAt: string; _count?: { users: number } };

export default function DepartmentsPage() {
  const [items, setItems] = useState<Dept[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const { data } = await api.get("/departments");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "فشل تحميل الإدارات");
    }
  };

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/departments", { name: name.trim() });
      setName("");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "فشل إضافة الإدارة");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (id: number, status: "Active" | "Inactive") => {
    setBusy(true);
    setError(null);
    try {
      const next = status === "Active" ? "Inactive" : "Active";
      await api.patch(`/departments/${id}/status`, { status: next });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "فشل تعديل الحالة");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-700">الإدارات</h1>

      <div className="bg-white shadow rounded-2xl p-4 flex gap-2">
        <input
          className="border rounded-lg px-3 py-2 flex-1"
          placeholder="اسم الإدارة"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button onClick={add} disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">
          إضافة
        </button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="bg-white shadow rounded-2xl overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">الاسم</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">المستخدمون</th>
              <th className="p-3">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3">{d.id}</td>
                <td className="p-3">{d.name}</td>
                <td className="p-3">{d.status}</td>
                <td className="p-3">{d._count?.users ?? "—"}</td>
                <td className="p-3">
                  <button onClick={() => toggleStatus(d.id, d.status)} className="px-3 py-1 rounded bg-slate-700 text-white">
                    تبديل الحالة
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={5}>لا توجد إدارات</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

