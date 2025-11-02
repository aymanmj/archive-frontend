import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/apiClient";

const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/,"");

export default function IncomingDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const { data } = await api.get(`/incoming/${id}`);
      setData(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "فشل تحميل التفاصيل");
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-700">تفاصيل الوارد</h1>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!data ? <div>...جاري التحميل</div> : (
        <div className="bg-white shadow rounded-2xl p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><div className="text-slate-500 text-sm">الرقم</div><div>{data.incomingNumber}</div></div>
            <div><div className="text-slate-500 text-sm">التاريخ</div><div>{new Date(data.receivedDate).toLocaleString()}</div></div>
            <div><div className="text-slate-500 text-sm">الجهة</div><div>{data.externalParty?.name}</div></div>
            <div><div className="text-slate-500 text-sm">الوثيقة</div><div>{data.document?.title}</div></div>
          </div>

          <div className="pt-2">
            <div className="text-slate-600 font-semibold mb-2">المرفقات</div>
            {!data.files?.length && <div className="text-slate-500 text-sm">لا توجد مرفقات</div>}
            {data.files?.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between border rounded-lg p-2 mb-2">
                <div>
                  <div className="font-medium">{f.fileNameOriginal}</div>
                  <div className="text-xs text-slate-500">الإصدار {f.versionNumber} — {new Date(f.uploadedAt).toLocaleString()}</div>
                </div>
                <a
                  className="px-3 py-1 rounded bg-slate-700 text-white"
                  href={`${API}/files/${f.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                >
                  تنزيل
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
