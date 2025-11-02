import { useEffect, useMemo, useState } from 'react';
import api from '../api/apiClient';
import Input from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import Button from '../components/ui/Button';

type Row = {
  id: string;                 // distribution id
  distributionId: string;
  status: string;
  lastUpdateAt: string;
  incomingId: string;
  incomingNumber: string;
  receivedDate: string;
  externalPartyName: string;
  document?: { id: string; title: string } | null;
};

type Resp = {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  rows: Row[];
};

export default function MyInboxPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (p = page) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<Resp>('/incoming/my-desk', {
        params: { page: p, pageSize, q, from, to },
      });
      setRows(res.data.rows);
      setPage(res.data.page);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, []);
  const applyFilters = () => load(1);

  const canPrev = page > 1;
  const canNext = rows.length === pageSize; // تبسيط

  return (
    <div className="space-y-4" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold">على طاولتي</h1>
        <p className="text-sm text-gray-500">المعاملات المحالة إليّ شخصيًا أو إلى الإدارة التي أنتمي لها</p>
      </header>

      <div className="bg-white border rounded-2xl p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm block mb-1">بحث (رقم/جهة/عنوان)</label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث هنا..." />
          </div>
          <div>
            <label className="text-sm block mb-1">من تاريخ</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1">إلى تاريخ</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={applyFilters}>تطبيق الفلاتر</Button>
            <Button variant="outline" onClick={() => { setQ(''); setFrom(''); setTo(''); load(1); }}>مسح</Button>
          </div>
        </div>
      </div>

      {err && <div className="text-red-700 bg-red-100 rounded-xl p-3">{err}</div>}
      {loading && <div className="text-sm text-gray-500">جاري التحميل…</div>}

      <div className="bg-white border rounded-2xl overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-right">رقم الوارد</th>
              <th className="p-2 text-right">التاريخ</th>
              <th className="p-2 text-right">الجهة</th>
              <th className="p-2 text-right">العنوان</th>
              <th className="p-2 text-right">حالة التوزيع</th>
              <th className="p-2 text-right">آخر تحديث</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-center">لا توجد عناصر</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="p-2">{r.incomingNumber}</td>
                <td className="p-2">{new Date(r.receivedDate).toLocaleString()}</td>
                <td className="p-2">{r.externalPartyName}</td>
                <td className="p-2">{r.document?.title ?? '—'}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{new Date(r.lastUpdateAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <Button variant="outline" disabled={!canPrev} onClick={() => canPrev && load(page - 1)}>السابق</Button>
        <div className="text-xs text-gray-500">صفحة {page}</div>
        <Button variant="outline" disabled={!canNext} onClick={() => canNext && load(page + 1)}>التالي</Button>
      </div>
    </div>
  );
}




// import { useEffect, useState } from "react";
// import api from "../api/apiClient";

// export default function MyInboxPage() {
//   const [items, setItems] = useState<any[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   const load = async () => {
//     setError(null);
//     try {
//       const { data } = await api.get("/incoming/my-dept");
//       setItems(Array.isArray(data) ? data : []);
//     } catch (e: any) {
//       setError(e?.response?.data?.message ?? "فشل تحميل القائمة");
//     }
//   };

//   useEffect(() => { load(); }, []);

//   return (
//     <div className="p-4 space-y-4" dir="rtl">
//       <h1 className="text-2xl font-bold text-slate-700">وارد إدارتي</h1>
//       {error && <div className="text-sm text-red-600">{error}</div>}

//       <div className="bg-white shadow rounded-2xl overflow-hidden">
//         <table className="w-full text-right">
//           <thead className="bg-slate-50">
//             <tr>
//               <th className="p-3">رقم الوارد</th>
//               <th className="p-3">الجهة</th>
//               <th className="p-3">العنوان</th>
//               <th className="p-3">الحالة</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((x) => (
//               <tr key={x.id} className="border-t">
//                 <td className="p-3">{x.incomingNumber}</td>
//                 <td className="p-3">{x.externalPartyName}</td>
//                 <td className="p-3">{x.document?.title}</td>
//                 <td className="p-3">{x.status}</td>
//               </tr>
//             ))}
//             {!items.length && (
//               <tr><td className="p-3 text-slate-500" colSpan={4}>لا توجد عناصر</td></tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }
