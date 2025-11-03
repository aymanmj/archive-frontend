// src/pages/OutgoingDetailsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/apiClient";

const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/,"");

function formatDT(v?: string) {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-LY', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatBytes(b?: number) {
  if (!b && b !== 0) return '—';
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let x = b as number;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(1)} ${u[i]}`;
}

export default function OutgoingDetailsPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error', msg:string}|null>(null);

  const showToast = (t:'success'|'error', msg:string) => {
    setToast({type:t, msg});
    setTimeout(()=>setToast(null), 3000);
  };

  const hasFiles = useMemo(() => (data?.files?.length ?? 0) > 0, [data]);

  const load = async () => {
    setError(null);
    try {
      const { data } = await api.get(`/outgoing/${id}`);
      setData(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "فشل تحميل التفاصيل");
    }
  };

  const markDelivered = async () => {
    if (!id) return;
    try {
      setSaving(true);
      await api.post(`/outgoing/${id}/delivered`, { delivered: true, proofPath: null });
      showToast('success', 'تم تحديث الحالة: مُسلّم');
      await load();
    } catch (e:any) {
      showToast('error', e?.response?.data?.message ?? 'تعذّر تحديث حالة التسليم');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  return (
    <div className="space-y-6 p-4" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">تفاصيل الصادر</h1>
          <p className="text-sm text-gray-500 mt-1">عرض كل المعلومات المتعلقة بالمعاملة الصادرة</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/outgoing" className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">رجوع للصادر</Link>
        </div>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {!data ? <div className="text-sm text-gray-500">...جاري التحميل</div> : (
        <>
          {/* معلومات أساسية */}
          <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">رقم الصادر</div>
                <div className="font-mono text-lg">{data.outgoingNumber}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">تاريخ الإصدار</div>
                <div>{formatDT(data.issueDate)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">طريقة الإرسال</div>
                <div>{data.sendMethod ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">الجهة</div>
                <div>{data.externalPartyName ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">حالة التسليم</div>
                <div>{data.isDelivered ? 'مُسلّم ✅' : 'غير مُسلّم —'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">إثبات التسليم</div>
                <div>{data.deliveryProofPath ?? '—'}</div>
              </div>
            </div>

            <div className="mt-4">
              {!data.isDelivered ? (
                <button
                  onClick={markDelivered}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-2 disabled:opacity-50"
                >
                  {saving ? 'جارٍ التحديث…' : 'تحديد كمُسَلَّم'}
                </button>
              ) : (
                <span className="text-sm text-green-700">تم التسليم بالفعل</span>
              )}
            </div>
          </section>

          {/* الوثيقة */}
          <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
            <h2 className="text-lg font-semibold mb-3">الوثيقة</h2>
            {data.document ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500">العنوان</div>
                  <div className="font-semibold">{data.document.title}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">الحالة</div>
                  <div>{data.document.currentStatus ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">القسم المالِك</div>
                  <div>{data.document.owningDepartmentName ?? '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">تاريخ الإنشاء</div>
                  <div>{formatDT(data.document.createdAt)}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">لا توجد معلومات وثيقة.</div>
            )}
          </section>

          {/* الملفات */}
          <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
            <h2 className="text-lg font-semibold mb-3">الملفات</h2>
            {hasFiles ? (
              <div className="overflow-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-right p-2">الاسم</th>
                      <th className="text-right p-2">الحجم</th>
                      <th className="text-right p-2">تاريخ الرفع</th>
                      <th className="text-right p-2">تنزيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.files!.map((f: any) => (
                      <tr key={String(f.id)} className="border-t">
                        <td className="p-2">{f.fileNameOriginal}</td>
                        <td className="p-2">{formatBytes(f.fileSizeBytes)}</td>
                        <td className="p-2">{formatDT(f.uploadedAt)}</td>
                        <td className="p-2">
                          <a
                            className="px-3 py-1 rounded bg-slate-700 text-white"
                            href={`${API}${f.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            تنزيل
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500">لا توجد ملفات مرفقة.</div>
            )}
          </section>
        </>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 md:right-auto md:left-auto md:bottom-6 md:start-6 z-40
            rounded-xl px-4 py-3 shadow-lg border
            ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}



// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../api/apiClient";

// const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/,"");

// export default function OutgoingDetailsPage() {
//   const { id } = useParams();
//   const [data, setData] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);

//   const load = async () => {
//     setError(null);
//     try {
//       const { data } = await api.get(`/outgoing/${id}`);
//       setData(data);
//     } catch (e: any) {
//       setError(e?.response?.data?.message ?? "فشل تحميل التفاصيل");
//     }
//   };

//   useEffect(() => { if (id) load(); }, [id]);

//   return (
//     <div className="p-4 space-y-4" dir="rtl">
//       <h1 className="text-2xl font-bold text-slate-700">تفاصيل الصادر</h1>
//       {error && <div className="text-sm text-red-600">{error}</div>}
//       {!data ? <div>...جاري التحميل</div> : (
//         <div className="bg-white shadow rounded-2xl p-4 space-y-4">
//           <div className="grid sm:grid-cols-2 gap-3">
//             <div><div className="text-slate-500 text-sm">الرقم</div><div>{data.outgoingNumber}</div></div>
//             <div><div className="text-slate-500 text-sm">التاريخ</div><div>{new Date(data.issueDate).toLocaleString()}</div></div>
//             <div><div className="text-slate-500 text-sm">الجهة</div><div>{data.externalParty?.name}</div></div>
//             <div><div className="text-slate-500 text-sm">الوثيقة</div><div>{data.document?.title}</div></div>
//           </div>

//           <div className="pt-2">
//             <div className="text-slate-600 font-semibold mb-2">المرفقات</div>
//             {!data.files?.length && <div className="text-slate-500 text-sm">لا توجد مرفقات</div>}
//             {data.files?.map((f: any) => (
//               <div key={f.id} className="flex items-center justify-between border rounded-lg p-2 mb-2">
//                 <div>
//                   <div className="font-medium">{f.fileNameOriginal}</div>
//                   <div className="text-xs text-slate-500">الإصدار {f.versionNumber} — {new Date(f.uploadedAt).toLocaleString()}</div>
//                 </div>
//                 <a
//                   className="px-3 py-1 rounded bg-slate-700 text-white"
//                   href={`${API}/files/${f.id}/download`}
//                   target="_blank"
//                   rel="noreferrer"
//                 >
//                   تنزيل
//                 </a>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
