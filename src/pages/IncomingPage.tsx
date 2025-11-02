// src/pages/IncomingPage.tsx
import { useEffect, useMemo, useState } from 'react';
import api from '../api/apiClient'; // لو ملفك في مسار آخر عدّل الاستيراد
import { useAuthStore } from '../stores/authStore';

type IncomingRow = {
  id: string;
  incomingNumber: string;
  receivedDate: string;
  externalPartyName: string;
  document?: { id: string; title: string } | null;
  hasFiles?: boolean;
};

type Department = {
  id: number;
  name: string;
  status: 'Active' | 'Inactive' | string;
};

export default function IncomingPage() {
  const [rows, setRows] = useState<IncomingRow[]>([]);
  const [loading, setLoading] = useState(false);

  // الإدارات
  const [departments, setDepartments] = useState<Department[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);

  // form
  const [documentTitle, setDocumentTitle] = useState('');
  const [owningDepartmentId, setOwningDepartmentId] = useState<number | ''>('');
  const [externalPartyName, setExternalPartyName] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('Hand');

  // filters
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // toast
  const [toast, setToast] = useState<{ type: 'success'|'error', msg: string }|null>(null);
  const showToast = (t: 'success'|'error', msg: string) => {
    setToast({ type: t, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // تحميل الإدارات
  const loadDepartments = async () => {
    setDepsLoading(true);
    try {
      const res = await api.get<Department[]>('/departments');
      const list = Array.isArray(res.data) ? res.data : [];
      // نرشّح الإدارات الفعّالة فقط
      const active = list.filter(d => (d.status || '').toLowerCase() === 'active');
      setDepartments(active);
      // إن لم يكن هناك اختيار مسبق، حاول ضبط أول إدارة افتراضيًا
      if (!owningDepartmentId && active.length > 0) {
        setOwningDepartmentId(active[0].id);
      }
    } catch (e: any) {
      console.error('[IncomingPage] loadDepartments error:', e?.response?.data || e?.message || e);
      showToast('error', 'تعذّر تحميل الإدارات');
    } finally {
      setDepsLoading(false);
    }
  };

  // تحميل الواردات
  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/incoming/my-latest', { params: {} });
      setRows(res.data || []);
    } catch (e: any) {
      console.error('[IncomingPage] load error:', e?.response?.data || e?.message || e);
      const msg = e?.response?.data?.message || e?.message || 'فشل تحميل البيانات';
      showToast('error', Array.isArray(msg) ? msg.join(' | ') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // نحمّل الإدارات والواردات معًا
    loadDepartments();
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const inRange = (() => {
        if (!dateFrom && !dateTo) return true;
        const d = new Date(r.receivedDate).getTime();
        if (dateFrom && d < new Date(dateFrom).getTime()) return false;
        if (dateTo && d > new Date(dateTo).getTime()) return false;
        return true;
      })();
      const qq = q.trim().toLowerCase();
      const hit = !qq || r.incomingNumber.toLowerCase().includes(qq) ||
        (r.externalPartyName ?? '').toLowerCase().includes(qq) ||
        (r.document?.title ?? '').toLowerCase().includes(qq);
      return inRange && hit;
    });
  }, [rows, q, dateFrom, dateTo]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentTitle.trim()) return showToast('error', 'يرجى إدخال العنوان');
    if (!owningDepartmentId) return showToast('error', 'يرجى اختيار القسم المالِك');
    if (!externalPartyName.trim()) return showToast('error', 'يرجى إدخال اسم الجهة');

    try {
      const body = {
        documentTitle,
        owningDepartmentId: Number(owningDepartmentId),
        externalPartyName,
        deliveryMethod,
      };
      const res = await api.post('/incoming', body);
      showToast('success', `تم إنشاء وارد رقم ${res.data?.incomingNumber}`);
      setDocumentTitle('');
      // نترك اختيار القسم كما هو — غالبًا سيستمر المستخدم على نفس الإدارة
      setExternalPartyName('');
      setDeliveryMethod('Hand');
      await loadRows();
    } catch (e: any) {
      console.error('[IncomingPage] create error:', e?.response?.data || e?.message || e);
      const msg = e?.response?.data?.message ?? 'فشل إنشاء الوارد';
      showToast('error', Array.isArray(msg) ? msg.join(' | ') : String(msg));
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الوارد</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة المعاملات الواردة وعرض آخر التحديثات</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadDepartments(); loadRows(); }}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            تحديث
          </button>
        </div>
      </header>

      {/* بطاقة الإنشاء السريع */}
      <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
        <h2 className="text-lg font-semibold mb-4">إنشاء وارد سريع</h2>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">الموضوع/عنوان الوثيقة</label>
            <input
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={documentTitle}
              onChange={e => setDocumentTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">طريقة التسليم</label>
            <select
              className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={deliveryMethod}
              onChange={e => setDeliveryMethod(e.target.value)}
            >
              <option value="Hand">تسليم باليد</option>
              <option value="Mail">بريد رسمي</option>
              <option value="Email">بريد إلكتروني</option>
              <option value="Courier">مندوب/ساعي</option>
              <option value="Fax">فاكس</option>
              <option value="ElectronicSystem">عن طريق المنظومة</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">القسم المالِك</label>
            <select
              className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={owningDepartmentId === '' ? '' : String(owningDepartmentId)}
              onChange={e => {
                const v = e.target.value;
                setOwningDepartmentId(v === '' ? '' : Number(v));
              }}
              disabled={depsLoading}
            >
              <option value="">{depsLoading ? 'جاري التحميل…' : 'اختر القسم'}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {(!depsLoading && departments.length === 0) && (
              <p className="text-xs text-amber-600 mt-1">لا توجد إدارات فعّالة.</p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">الجهة</label>
            <input
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={externalPartyName}
              onChange={e => setExternalPartyName(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
              disabled={depsLoading || departments.length === 0}
            >
              إنشاء
            </button>
          </div>
        </form>
      </section>

      {/* بطاقة الجدول + الفلاتر */}
      <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">بحث برقم/جهة/عنوان</label>
            <input
              placeholder="ابحث هنا…"
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">من تاريخ</label>
            <input
              type="date"
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">إلى تاريخ</label>
            <input
              type="date"
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setQ(''); setDateFrom(''); setDateTo(''); }}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
            مسح الفلاتر
          </button>
          <div className="text-xs text-gray-500">نتائج: {filtered.length}</div>
        </div>

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-right p-2">رقم الوارد</th>
                <th className="text-right p-2">التاريخ</th>
                <th className="text-right p-2">الجهة</th>
                <th className="text-right p-2">العنوان</th>
                <th className="text-right p-2">ملفات؟</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="p-4 text-center">جاري التحميل...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center">لا توجد بيانات</td></tr>
              )}
              {!loading && filtered.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-mono">{r.incomingNumber}</td>
                  <td className="p-2">
                    {new Date(r.receivedDate).toLocaleString('ar-LY', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="p-2">{r.externalPartyName}</td>
                  <td className="p-2">{r.document?.title ?? '—'}</td>
                  <td className="p-2">{r.hasFiles ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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




// import { useEffect, useMemo, useState } from 'react';
// import api from '../api/apiClient';
// import { useAuthStore } from '../stores/authStore';

// type IncomingRow = {
//   id: string;
//   incomingNumber: string;
//   receivedDate: string;
//   externalPartyName: string;
//   document?: { id: string; title: string } | null;
//   hasFiles?: boolean;
// };

// export default function IncomingPage() {
//   const [rows, setRows] = useState<IncomingRow[]>([]);
//   const [loading, setLoading] = useState(false);

//   // form
//   const [documentTitle, setDocumentTitle] = useState('');
//   const [owningDepartmentId, setOwningDepartmentId] = useState<number | ''>('');
//   const [externalPartyName, setExternalPartyName] = useState('');
//   const [deliveryMethod, setDeliveryMethod] = useState('Hand');

//   // filters
//   const [q, setQ] = useState('');
//   const [dateFrom, setDateFrom] = useState('');
//   const [dateTo, setDateTo] = useState('');

//   // toast
//   const [toast, setToast] = useState<{ type: 'success'|'error', msg: string }|null>(null);
//   const showToast = (t: 'success'|'error', msg: string) => {
//     setToast({ type: t, msg });
//     setTimeout(() => setToast(null), 3500);
//   };

//   const load = async () => {
//     setLoading(true);
//     try {
//       const res = await api.get('/incoming/my-latest', { params: {} });
//       setRows(res.data || []);
//     } catch (e: any) {
//       console.error('[IncomingPage] load error:', e?.response?.data || e?.message || e);
//       const msg = e?.response?.data?.message || e?.message || 'فشل تحميل البيانات';
//       showToast('error', Array.isArray(msg) ? msg.join(' | ') : String(msg));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

//   const filtered = useMemo(() => {
//     return rows.filter(r => {
//       const inRange = (() => {
//         if (!dateFrom && !dateTo) return true;
//         const d = new Date(r.receivedDate).getTime();
//         if (dateFrom && d < new Date(dateFrom).getTime()) return false;
//         if (dateTo && d > new Date(dateTo).getTime()) return false;
//         return true;
//       })();
//       const qq = q.trim().toLowerCase();
//       const hit = !qq || r.incomingNumber.toLowerCase().includes(qq) ||
//         (r.externalPartyName ?? '').toLowerCase().includes(qq) ||
//         (r.document?.title ?? '').toLowerCase().includes(qq);
//       return inRange && hit;
//     });
//   }, [rows, q, dateFrom, dateTo]);

//   const handleCreate = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!documentTitle.trim()) return showToast('error', 'يرجى إدخال العنوان');
//     if (!owningDepartmentId) return showToast('error', 'يرجى اختيار القسم المالِك');
//     if (!externalPartyName.trim()) return showToast('error', 'يرجى إدخال اسم الجهة');

//     try {
//       const body = { documentTitle, owningDepartmentId: Number(owningDepartmentId), externalPartyName, deliveryMethod };
//       const res = await api.post('/incoming', body);
//       showToast('success', `تم إنشاء وارد رقم ${res.data?.incomingNumber}`);
//       setDocumentTitle('');
//       setOwningDepartmentId('');
//       setExternalPartyName('');
//       setDeliveryMethod('Hand');
//       await load();
//     } catch (e: any) {
//       console.error('[IncomingPage] create error:', e?.response?.data || e?.message || e);
//       const msg = e?.response?.data?.message ?? 'فشل إنشاء الوارد';
//       showToast('error', Array.isArray(msg) ? msg.join(' | ') : String(msg));
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <header className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">الوارد</h1>
//           <p className="text-sm text-gray-500 mt-1">إدارة المعاملات الواردة وعرض آخر التحديثات</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={load}
//             className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
//           >
//             تحديث
//           </button>
//         </div>
//       </header>

//       {/* بطاقة الإنشاء السريع */}
//       <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
//         <h2 className="text-lg font-semibold mb-4">إنشاء وارد سريع</h2>

//         <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm mb-1">الموضوع/عنوان الوثيقة</label>
//             <input
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={documentTitle}
//               onChange={e => setDocumentTitle(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">طريقة التسليم</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={deliveryMethod}
//               onChange={e => setDeliveryMethod(e.target.value)}
//             >
//               <option value="Hand">تسليم باليد</option>
//               <option value="Mail">بريد رسمي</option>
//               <option value="Email">بريد إلكتروني</option>
//               <option value="Courier">مندوب/ساعي</option>
//               <option value="Fax">فاكس</option>
//               <option value="ElectronicSystem">عن طريق المنظومة</option>
//             </select>
//           </div>

//           <div>
//             <label className="block text-sm mb-1">القسم المالِك</label>
//             <input
//               type="number"
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={owningDepartmentId}
//               onChange={e => setOwningDepartmentId(e.target.value === '' ? '' : Number(e.target.value))}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">الجهة</label>
//             <input
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={externalPartyName}
//               onChange={e => setExternalPartyName(e.target.value)}
//             />
//           </div>

//           <div className="md:col-span-2">
//             <button
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
//             >
//               إنشاء
//             </button>
//           </div>
//         </form>
//       </section>

//       {/* بطاقة الجدول + الفلاتر */}
//       <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5 space-y-4">
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
//           <div className="md:col-span-2">
//             <label className="block text-sm mb-1">بحث برقم/جهة/عنوان</label>
//             <input
//               placeholder="ابحث هنا…"
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={q}
//               onChange={e => setQ(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">من تاريخ</label>
//             <input
//               type="date"
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={dateFrom}
//               onChange={e => setDateFrom(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">إلى تاريخ</label>
//             <input
//               type="date"
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={dateTo}
//               onChange={e => setDateTo(e.target.value)}
//             />
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             type="button"
//             onClick={() => { setQ(''); setDateFrom(''); setDateTo(''); }}
//             className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
//           >
//             مسح الفلاتر
//           </button>
//           <div className="text-xs text-gray-500">نتائج: {filtered.length}</div>
//         </div>

//         <div className="overflow-auto rounded-xl border">
//           <table className="min-w-full text-sm">
//             <thead>
//               <tr className="bg-gray-100">
//                 <th className="text-right p-2">رقم الوارد</th>
//                 <th className="text-right p-2">التاريخ</th>
//                 <th className="text-right p-2">الجهة</th>
//                 <th className="text-right p-2">العنوان</th>
//                 <th className="text-right p-2">ملفات؟</th>
//               </tr>
//             </thead>
//             <tbody>
//               {loading && (
//                 <tr><td colSpan={5} className="p-4 text-center">جاري التحميل...</td></tr>
//               )}
//               {!loading && filtered.length === 0 && (
//                 <tr><td colSpan={5} className="p-4 text-center">لا توجد بيانات</td></tr>
//               )}
//               {!loading && filtered.map(r => (
//                 <tr key={r.id} className="border-t hover:bg-gray-50">
//                   <td className="p-2 font-mono">{r.incomingNumber}</td>
//                   <td className="p-2">{new Date(r.receivedDate).toLocaleString('ar-LY', {
//                     year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
//                   })}</td>
//                   <td className="p-2">{r.externalPartyName}</td>
//                   <td className="p-2">{r.document?.title ?? '—'}</td>
//                   <td className="p-2">{r.hasFiles ? '✅' : '—'}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </section>

//       {toast && (
//         <div
//           className={`fixed bottom-4 left-4 right-4 md:right-auto md:left-auto md:bottom-6 md:start-6 z-40
//             rounded-xl px-4 py-3 shadow-lg border
//             ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}
//         >
//           {toast.msg}
//         </div>
//       )}
//     </div>
//   );
// }

