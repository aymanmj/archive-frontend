import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/apiClient';

type DocFile = {
  id: string | number;
  fileNameOriginal: string;
  fileSizeBytes?: number;
  uploadedAt?: string;
};

type DistributionRow = {
  id: string | number;
  status: string;
  targetDepartmentName?: string;
  assignedToUserName?: string | null;
  lastUpdateAt?: string;
  notes?: string | null;
};

type IncomingDetails = {
  id: string | number;
  incomingNumber: string;
  receivedDate: string;
  deliveryMethod?: string;
  urgencyLevel?: string | null;
  externalPartyName?: string;
  document?: {
    id: string | number;
    title: string;
    currentStatus?: string;
    createdAt?: string;
    owningDepartmentName?: string;
  } | null;
  files?: DocFile[];
  distributions?: DistributionRow[];
};

const tryPaths = (id: string | number) => [
  `/incoming/${id}`,              // مفضّل
  `/incoming/details/${id}`,      // احتمال
  `/incoming/summary/${id}`,      // احتمال
];

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
  const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let x = b;
  while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
  return `${x.toFixed(1)} ${u[i]}`;
}

export default function IncomingDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<IncomingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErr(null);
      const candidates = tryPaths(id!);
      for (const path of candidates) {
        try {
          const res = await api.get<IncomingDetails>(path);
          if (mounted) { setData(res.data); setLoading(false); }
          return;
        } catch (e: any) {
          // جرّب التالي
        }
      }
      if (mounted) {
        setErr('لم يتم العثور على تفاصيل هذا الوارد.');
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  const hasFiles = useMemo(() => (data?.files?.length ?? 0) > 0, [data]);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تفاصيل الوارد</h1>
          <p className="text-sm text-gray-500 mt-1">عرض كل المعلومات المتعلقة بالمعاملة الواردة</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/incoming" className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">رجوع للوارد</Link>
        </div>
      </header>

      {loading && <div className="text-sm text-gray-500">جاري التحميل…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

      {!loading && !err && data && (
        <>
          {/* معلومات أساسية */}
          <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">رقم الوارد</div>
                <div className="font-mono text-lg">{data.incomingNumber}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">التاريخ</div>
                <div>{formatDT(data.receivedDate)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">طريقة التسليم</div>
                <div>{data.deliveryMethod ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">درجة الأهمية</div>
                <div>{data.urgencyLevel ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">الجهة</div>
                <div>{data.externalPartyName ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">ملفات مرفقة</div>
                <div>{hasFiles ? 'نعم' : 'لا'}</div>
              </div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {data.files!.map(f => (
                      <tr key={String(f.id)} className="border-t">
                        <td className="p-2">{f.fileNameOriginal}</td>
                        <td className="p-2">{formatBytes(f.fileSizeBytes)}</td>
                        <td className="p-2">{formatDT(f.uploadedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500">لا توجد ملفات مرفقة.</div>
            )}
          </section>

          {/* التوزيعات */}
          <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
            <h2 className="text-lg font-semibold mb-3">التوزيعات</h2>
            {(data.distributions?.length ?? 0) > 0 ? (
              <div className="overflow-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="text-right p-2">الحالة</th>
                      <th className="text-right p-2">القسم المستهدف</th>
                      <th className="text-right p-2">المكلّف</th>
                      <th className="text-right p-2">آخر تحديث</th>
                      <th className="text-right p-2">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.distributions!.map(d => (
                      <tr key={String(d.id)} className="border-t">
                        <td className="p-2">{d.status}</td>
                        <td className="p-2">{d.targetDepartmentName ?? '—'}</td>
                        <td className="p-2">{d.assignedToUserName ?? '—'}</td>
                        <td className="p-2">{formatDT(d.lastUpdateAt)}</td>
                        <td className="p-2">{d.notes ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-gray-500">لا توجد توزيعات.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}




// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../api/apiClient";

// const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/,"");

// export default function IncomingDetailsPage() {
//   const { id } = useParams();
//   const [data, setData] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);

//   const load = async () => {
//     setError(null);
//     try {
//       const { data } = await api.get(`/incoming/${id}`);
//       setData(data);
//     } catch (e: any) {
//       setError(e?.response?.data?.message ?? "فشل تحميل التفاصيل");
//     }
//   };

//   useEffect(() => { if (id) load(); }, [id]);

//   return (
//     <div className="p-4 space-y-4" dir="rtl">
//       <h1 className="text-2xl font-bold text-slate-700">تفاصيل الوارد</h1>
//       {error && <div className="text-sm text-red-600">{error}</div>}
//       {!data ? <div>...جاري التحميل</div> : (
//         <div className="bg-white shadow rounded-2xl p-4 space-y-4">
//           <div className="grid sm:grid-cols-2 gap-3">
//             <div><div className="text-slate-500 text-sm">الرقم</div><div>{data.incomingNumber}</div></div>
//             <div><div className="text-slate-500 text-sm">التاريخ</div><div>{new Date(data.receivedDate).toLocaleString()}</div></div>
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
