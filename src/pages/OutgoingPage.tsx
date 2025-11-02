import { useEffect, useState } from "react";
import api from "../api/apiClient";

export default function OutgoingPage() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // إنشاء صادر مبسّط
  const [subject, setSubject] = useState("");
  const [externalPartyName, setExternalPartyName] = useState("");
  const [externalPartyType, setExternalPartyType] = useState("");
  const [sendMethod, setSendMethod] = useState("Hand");
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setError(null);
    try {
      const { data } = await api.get("/outgoing");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "فشل تحميل الصادر");
    }
  };

  const loadDeps = async () => {
    try {
      const { data } = await api.get("/departments");
      setDepartments(data?.map((d: any) => ({ id: d.id, name: d.name })) ?? []);
    } catch {}
  };

  const createOutgoing = async () => {
    if (!subject.trim() || !externalPartyName.trim() || !departmentId) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post("/outgoing", {
        subject: subject.trim(),
        externalPartyName: externalPartyName.trim(),
        externalPartyType: externalPartyType.trim() || undefined,
        sendMethod,
        departmentId,
      });
      const docId: string = data?.documentId;
      if (file && docId) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/files/upload/${docId}`, fd);
      }
      setSubject("");
      setExternalPartyName("");
      setExternalPartyType("");
      setFile(null);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "فشل إنشاء الصادر");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); loadDeps(); }, []);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-700">الصادر</h1>

      <div className="bg-white shadow rounded-2xl p-4 space-y-3">
        <div className="text-slate-600 font-semibold">إنشاء صادر سريع</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="border rounded-lg px-3 py-2" placeholder="العنوان" value={subject} onChange={(e)=>setSubject(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder="الجهة" value={externalPartyName} onChange={(e)=>setExternalPartyName(e.target.value)} />
          <input className="border rounded-lg px-3 py-2" placeholder="نوع الجهة (اختياري)" value={externalPartyType} onChange={(e)=>setExternalPartyType(e.target.value)} />
          <select className="border rounded-lg px-3 py-2" value={sendMethod} onChange={(e)=>setSendMethod(e.target.value)}>
            <option value="Hand">Hand</option>
            <option value="Mail">Mail</option>
            <option value="Email">Email</option>
            <option value="Courier">Courier</option>
            <option value="Fax">Fax</option>
            <option value="ElectronicSystem">ElectronicSystem</option>
          </select>
          <select className="border rounded-lg px-3 py-2" value={departmentId ?? ""} onChange={(e)=>setDepartmentId(Number(e.target.value)||null)}>
            <option value="">القسم المالِك</option>
            {departments.map((d)=> <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input type="file" className="border rounded-lg px-3 py-2 col-span-full" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
        </div>
        <button onClick={createOutgoing} disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">
          {busy ? "جارٍ الإنشاء..." : "إنشاء"}
        </button>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      <div className="bg-white shadow rounded-2xl overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">رقم الصادر</th>
              <th className="p-3">التاريخ</th>
              <th className="p-3">العنوان</th>
              <th className="p-3">الجهة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id} className="border-t">
                <td className="p-3">{x.outgoingNumber}</td>
                <td className="p-3">{new Date(x.issueDate).toLocaleString()}</td>
                <td className="p-3">{x.document?.title}</td>
                <td className="p-3">{x.externalPartyName}</td>
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
