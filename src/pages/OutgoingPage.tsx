// src/pages/OutgoingPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/apiClient';

type OutgoingRow = {
  id: string;
  outgoingNumber: string;
  issueDate: string;
  externalPartyName: string;
  document?: { id: string; title: string } | null;
  hasFiles?: boolean;
};

type PagedOutgoing =
  | { items: OutgoingRow[]; total: number; page: number; pageSize: number } // من /outgoing/my-latest
  | { rows: OutgoingRow[]; total: number; page: number; pageSize: number; pages: number }; // من /outgoing/search

type Department = { id: number; name: string; status: string };

export default function OutgoingPage() {
  // جدول
  const [rows, setRows] = useState<OutgoingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // الإدارات (لإنشاء سريع)
  const [departments, setDepartments] = useState<Department[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);

  // form (إنشاء صادر سريع)
  const [documentTitle, setDocumentTitle] = useState('');
  const [owningDepartmentId, setOwningDepartmentId] = useState<number | ''>('');
  const [externalPartyName, setExternalPartyName] = useState('');
  const [sendMethod, setSendMethod] = useState<'Hand'|'Mail'|'Email'|'Courier'|'Fax'|'ElectronicSystem'>('Hand');
  const [issueDate, setIssueDate] = useState<string>('');

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

  const loadDepartments = async () => {
    setDepsLoading(true);
    try {
      const res = await api.get<Department[]>('/departments', { params: { status: 'Active' } });
      const list = Array.isArray(res.data) ? res.data : [];
      setDepartments(list);
      if (!owningDepartmentId && list.length > 0) {
        setOwningDepartmentId(list[0].id);
      }
    } catch (e: any) {
      console.error('[OutgoingPage] loadDepartments error:', e?.response?.data || e?.message || e);
      showToast('error', 'تعذّر تحميل الإدارات');
    } finally {
      setDepsLoading(false);
    }
  };

  const useSearch = useMemo(() => {
    // لو فيه أي فلتر/بحث نفعل /search (نفس منطق Incoming)
    return (q?.trim() || dateFrom || dateTo) ? true : false;
  }, [q, dateFrom, dateTo]);

  const loadRows = async (pg = page) => {
    setLoading(true);
    try {
      if (useSearch) {
        const res = await api.get('/outgoing/search', {
          params: {
            page: pg,
            pageSize,
            q: q || undefined,
            from: dateFrom || undefined,
            to: dateTo || undefined,
          },
        });
        const data = res.data as any;
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setTotal(Number(data.total ?? 0));
        setPage(Number(data.page ?? pg));
      } else {
        const res = await api.get('/outgoing/my-latest', {
          params: {
            page: pg,
            pageSize,
          },
        });
        const data = res.data as any;
        setRows(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total ?? 0));
        setPage(Number(data.page ?? pg));
      }
    } catch (e: any) {
      console.error('[OutgoingPage] load error:', e?.response?.data || e?.message || e);
      const msg = e?.response?.data?.message || e?.message || 'فشل تحميل البيانات';
      showToast('error', Array.isArray(msg) ? msg.join(' | ') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تطبيق الفلاتر → نرجع للصفحة 1
  const applyFilters = () => loadRows(1);
  const clearFilters = () => {
    setQ(''); setDateFrom(''); setDateTo('');
    loadRows(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
        sendMethod,          // يطابق Prisma.$Enums.DeliveryMethod
        issueDate: issueDate || undefined,
        signedByUserId: 1,   // TODO: اربطه باليوزر الحالي من الـ token
      };
      const res = await api.post('/outgoing', body);
      showToast('success', `تم إنشاء صادر رقم ${res.data?.outgoingNumber}`);
      setDocumentTitle('');
      setExternalPartyName('');
      setSendMethod('Hand');
      setIssueDate('');
      await loadRows(1);
    } catch (e: any) {
      console.error('[OutgoingPage] create error:', e?.response?.data || e?.message || e);
      const msg = e?.response?.data?.message ?? 'فشل إنشاء الصادر';
      showToast('error', Array.isArray(msg) ? msg.join(' | ') : String(msg));
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الصادر</h1>
          <p className="text-sm text-gray-500 mt-1">إدارة المعاملات الصادرة وعرض آخر التحديثات</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadRows(page)} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
            تحديث
          </button>
        </div>
      </header>

      {/* الإنشاء السريع */}
      <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
        <h2 className="text-lg font-semibold mb-4">إنشاء صادر سريع</h2>
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
            <label className="block text-sm mb-1">تاريخ الإصدار</label>
            <input
              type="datetime-local"
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={issueDate}
              onChange={e => setIssueDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">القسم المالِك</label>
            <select
              className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={owningDepartmentId === '' ? '' : String(owningDepartmentId)}
              onChange={e => setOwningDepartmentId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={depsLoading}
            >
              <option value="">{depsLoading ? 'جاري التحميل…' : 'اختر القسم'}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">الجهة</label>
            <input
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={externalPartyName}
              onChange={e => setExternalPartyName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">طريقة الإرسال</label>
            <select
              className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={sendMethod}
              onChange={e => setSendMethod(e.target.value as any)}
            >
              <option value="Hand">تسليم باليد</option>
              <option value="Mail">بريد رسمي</option>
              <option value="Email">بريد إلكتروني</option>
              <option value="Courier">مندوب/ساعي</option>
              <option value="Fax">فاكس</option>
              <option value="ElectronicSystem">عن طريق المنظومة</option>
            </select>
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

      {/* الفلاتر + الجدول */}
      <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">بحث برقم/جهة/عنوان</label>
            <input
              placeholder="ابحث هنا…"
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
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
          <button type="button" onClick={applyFilters} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
            تطبيق الفلاتر
          </button>
          <button type="button" onClick={clearFilters} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
            مسح الفلاتر
          </button>
          <div className="text-xs text-gray-500">النتائج: {rows.length} / {total} — صفحة {page} من {Math.max(1, Math.ceil(total / pageSize))}</div>
        </div>

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-right p-2">رقم الصادر</th>
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
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center">لا توجد بيانات</td></tr>
              )}
              {!loading && rows.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-mono">
                    <Link className="text-blue-600 hover:underline" to={`/outgoing/${r.id}`}>
                      {r.outgoingNumber}
                    </Link>
                  </td>
                  <td className="p-2">
                    {new Date(r.issueDate).toLocaleString('ar-LY', {
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

        {/* ترقيم الصفحات */}
        <div className="flex items-center justify-between pt-3">
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => loadRows(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            السابق
          </button>
          <div className="text-xs text-gray-500">صفحة {page} من {totalPages}</div>
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => loadRows(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            التالي
          </button>
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



// // src/pages/OutgoingPage.tsx
// import { useEffect, useState } from 'react';
// import api from '../api/apiClient';

// type OutgoingRow = {
//   id: string;
//   outgoingNumber: string;
//   issueDate: string;
//   externalPartyName: string;
//   document?: { id: string; title: string } | null;
//   hasFiles?: boolean;
// };

// type PagedOutgoing = {
//   total: number;
//   items: OutgoingRow[];
//   page: number;
//   pageSize: number;
// };

// type Department = { id: number; name: string; status: string };

// export default function OutgoingPage() {
//   // الجدول
//   const [rows, setRows] = useState<OutgoingRow[]>([]);
//   const [total, setTotal] = useState(0);
//   const [page, setPage] = useState(1);
//   const [pageSize] = useState(20);
//   const [loading, setLoading] = useState(false);

//   // الإدارات
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [depsLoading, setDepsLoading] = useState(false);

//   // النموذج
//   const [documentTitle, setDocumentTitle] = useState('');
//   const [owningDepartmentId, setOwningDepartmentId] = useState<number | ''>('');
//   const [externalPartyName, setExternalPartyName] = useState('');
//   const [sendMethod, setSendMethod] = useState('Hand'); // مطابق للـ DeliveryMethod

//   // الفلاتر
//   const [q, setQ] = useState('');
//   const [dateFrom, setDateFrom] = useState('');
//   const [dateTo, setDateTo] = useState('');

//   // toast
//   const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
//   const showToast = (type: 'success' | 'error', msg: string) => {
//     setToast({ type, msg });
//     setTimeout(() => setToast(null), 3500);
//   };

//   const loadDepartments = async () => {
//     setDepsLoading(true);
//     try {
//       const res = await api.get<Department[]>('/departments', { params: { status: 'Active' } });
//       const list = Array.isArray(res.data) ? res.data : [];
//       setDepartments(list);
//       if (!owningDepartmentId && list.length > 0) {
//         setOwningDepartmentId(list[0].id);
//       }
//     } catch (e: any) {
//       console.error('[OutgoingPage] loadDepartments error:', e?.response?.data || e?.message || e);
//       showToast('error', 'تعذّر تحميل الإدارات');
//     } finally {
//       setDepsLoading(false);
//     }
//   };

//   const loadRows = async (pg = page) => {
//     setLoading(true);
//     try {
//       const res = await api.get<PagedOutgoing>('/outgoing/my-latest', {
//         params: {
//           page: pg,
//           pageSize,
//           q: q || undefined,
//           dateFrom: dateFrom || undefined,
//           dateTo: dateTo || undefined,
//         },
//       });
//       const data = res.data as any;
//       setRows(data.items ?? []);
//       setTotal(data.total ?? 0);
//       setPage(data.page ?? pg);
//     } catch (e: any) {
//       console.error('[OutgoingPage] load error:', e?.response?.data || e?.message || e);
//       const msg = e?.response?.data?.message || e?.message || 'فشل تحميل البيانات';
//       showToast('error', Array.isArray(msg) ? msg.join(' | ') : String(msg));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     loadDepartments();
//     loadRows(1);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const applyFilters = () => loadRows(1);

//   const clearFilters = () => {
//     setQ('');
//     setDateFrom('');
//     setDateTo('');
//     loadRows(1);
//   };

//   const totalPages = Math.max(1, Math.ceil(total / pageSize));

//   const handleCreate = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!documentTitle.trim()) return showToast('error', 'يرجى إدخال العنوان');
//     if (!owningDepartmentId) return showToast('error', 'يرجى اختيار القسم المالِك');
//     if (!externalPartyName.trim()) return showToast('error', 'يرجى إدخال اسم الجهة');

//     try {
//       const body = {
//         documentTitle,
//         owningDepartmentId: Number(owningDepartmentId),
//         externalPartyName,
//         sendMethod, // مطابق للخادم
//       };
//       const res = await api.post('/outgoing', body);
//       showToast('success', `تم إنشاء صادر رقم ${res.data?.outgoingNumber}`);
//       setDocumentTitle('');
//       setExternalPartyName('');
//       setSendMethod('Hand');
//       await loadRows(1);
//     } catch (e: any) {
//       console.error('[OutgoingPage] create error:', e?.response?.data || e?.message || e);
//       const msg = e?.response?.data?.message ?? 'فشل إنشاء الصادر';
//       showToast('error', Array.isArray(msg) ? msg.join(' | ') : String(msg));
//     }
//   };

//   return (
//     <div className="space-y-6" dir="rtl">
//       <header className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">الصادر</h1>
//           <p className="text-sm text-gray-500 mt-1">إدارة المعاملات الصادرة وعرض آخر التحديثات</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => loadRows(page)}
//             className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
//           >
//             تحديث
//           </button>
//         </div>
//       </header>

//       {/* الإنشاء السريع */}
//       <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
//         <h2 className="text-lg font-semibold mb-4">إنشاء صادر سريع</h2>

//         <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm mb-1">الموضوع/عنوان الوثيقة</label>
//             <input
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={documentTitle}
//               onChange={(e) => setDocumentTitle(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">طريقة الإرسال</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={sendMethod}
//               onChange={(e) => setSendMethod(e.target.value)}
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
//             <select
//               className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={owningDepartmentId === '' ? '' : String(owningDepartmentId)}
//               onChange={(e) => setOwningDepartmentId(e.target.value === '' ? '' : Number(e.target.value))}
//               disabled={depsLoading}
//             >
//               <option value="">{depsLoading ? 'جاري التحميل…' : 'اختر القسم'}</option>
//               {departments.map((d) => (
//                 <option key={d.id} value={d.id}>
//                   {d.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="block text-sm mb-1">الجهة</label>
//             <input
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={externalPartyName}
//               onChange={(e) => setExternalPartyName(e.target.value)}
//             />
//           </div>

//           <div className="md:col-span-2">
//             <button
//               className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2"
//               disabled={depsLoading || departments.length === 0}
//             >
//               إنشاء
//             </button>
//           </div>
//         </form>
//       </section>

//       {/* الفلاتر + الجدول */}
//       <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5 space-y-4">
//         <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
//           <div className="md:col-span-3">
//             <label className="block text-sm mb-1">بحث برقم/جهة/عنوان</label>
//             <input
//               placeholder="ابحث هنا…"
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={q}
//               onChange={(e) => setQ(e.target.value)}
//               onKeyDown={(e) => {
//                 if (e.key === 'Enter') applyFilters();
//               }}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">من تاريخ</label>
//             <input
//               type="date"
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={dateFrom}
//               onChange={(e) => setDateFrom(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">إلى تاريخ</label>
//             <input
//               type="date"
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={dateTo}
//               onChange={(e) => setDateTo(e.target.value)}
//             />
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             type="button"
//             onClick={applyFilters}
//             className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
//           >
//             تطبيق الفلاتر
//           </button>
//           <button
//             type="button"
//             onClick={clearFilters}
//             className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
//           >
//             مسح الفلاتر
//           </button>
//           <div className="text-xs text-gray-500">
//             النتائج: {rows.length} / {total} — صفحة {page} من {totalPages}
//           </div>
//         </div>

//         <div className="overflow-auto rounded-xl border">
//           <table className="min-w-full text-sm">
//             <thead>
//               <tr className="bg-gray-100">
//                 <th className="text-right p-2">رقم الصادر</th>
//                 <th className="text-right p-2">التاريخ</th>
//                 <th className="text-right p-2">الجهة</th>
//                 <th className="text-right p-2">العنوان</th>
//                 <th className="text-right p-2">ملفات؟</th>
//               </tr>
//             </thead>
//             <tbody>
//               {loading && (
//                 <tr>
//                   <td colSpan={5} className="p-4 text-center">
//                     جاري التحميل...
//                   </td>
//                 </tr>
//               )}
//               {!loading && rows.length === 0 && (
//                 <tr>
//                   <td colSpan={5} className="p-4 text-center">
//                     لا توجد بيانات
//                   </td>
//                 </tr>
//               )}
//               {!loading &&
//                 rows.map((r) => (
//                   <tr key={r.id} className="border-t hover:bg-gray-50">
//                     <td className="p-2 font-mono">{r.outgoingNumber}</td>
//                     <td className="p-2">
//                       {new Date(r.issueDate).toLocaleString('ar-LY', {
//                         year: 'numeric',
//                         month: '2-digit',
//                         day: '2-digit',
//                         hour: '2-digit',
//                         minute: '2-digit',
//                       })}
//                     </td>
//                     <td className="p-2">{r.externalPartyName}</td>
//                     <td className="p-2">{r.document?.title ?? '—'}</td>
//                     <td className="p-2">{r.hasFiles ? '✅' : '—'}</td>
//                   </tr>
//                 ))}
//             </tbody>
//           </table>
//         </div>

//         {/* ترقيم الصفحات */}
//         <div className="flex items-center justify-between pt-3">
//           <button
//             className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
//             onClick={() => loadRows(Math.max(1, page - 1))}
//             disabled={page <= 1}
//           >
//             السابق
//           </button>
//           <div className="text-xs text-gray-500">
//             صفحة {page} من {totalPages}
//           </div>
//           <button
//             className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
//             onClick={() => loadRows(Math.min(totalPages, page + 1))}
//             disabled={page >= totalPages}
//           >
//             التالي
//           </button>
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





// import { useEffect, useState } from "react";
// import api from "../api/apiClient";

// export default function OutgoingPage() {
//   const [items, setItems] = useState<any[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [busy, setBusy] = useState(false);

//   // إنشاء صادر مبسّط
//   const [subject, setSubject] = useState("");
//   const [externalPartyName, setExternalPartyName] = useState("");
//   const [externalPartyType, setExternalPartyType] = useState("");
//   const [sendMethod, setSendMethod] = useState("Hand");
//   const [departmentId, setDepartmentId] = useState<number | null>(null);
//   const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
//   const [file, setFile] = useState<File | null>(null);

//   const load = async () => {
//     setError(null);
//     try {
//       const { data } = await api.get("/outgoing");
//       setItems(Array.isArray(data) ? data : []);
//     } catch (e: any) {
//       setError(e?.response?.data?.message ?? "فشل تحميل الصادر");
//     }
//   };

//   const loadDeps = async () => {
//     try {
//       const { data } = await api.get("/departments");
//       setDepartments(data?.map((d: any) => ({ id: d.id, name: d.name })) ?? []);
//     } catch {}
//   };

//   const createOutgoing = async () => {
//     if (!subject.trim() || !externalPartyName.trim() || !departmentId) return;
//     setBusy(true);
//     setError(null);
//     try {
//       const { data } = await api.post("/outgoing", {
//         subject: subject.trim(),
//         externalPartyName: externalPartyName.trim(),
//         externalPartyType: externalPartyType.trim() || undefined,
//         sendMethod,
//         departmentId,
//       });
//       const docId: string = data?.documentId;
//       if (file && docId) {
//         const fd = new FormData();
//         fd.append("file", file);
//         await api.post(`/files/upload/${docId}`, fd);
//       }
//       setSubject("");
//       setExternalPartyName("");
//       setExternalPartyType("");
//       setFile(null);
//       await load();
//     } catch (e: any) {
//       setError(e?.response?.data?.message ?? "فشل إنشاء الصادر");
//     } finally {
//       setBusy(false);
//     }
//   };

//   useEffect(() => { load(); loadDeps(); }, []);

//   return (
//     <div className="p-4 space-y-4" dir="rtl">
//       <h1 className="text-2xl font-bold text-slate-700">الصادر</h1>

//       <div className="bg-white shadow rounded-2xl p-4 space-y-3">
//         <div className="text-slate-600 font-semibold">إنشاء صادر سريع</div>
//         <div className="grid gap-3 sm:grid-cols-2">
//           <input className="border rounded-lg px-3 py-2" placeholder="العنوان" value={subject} onChange={(e)=>setSubject(e.target.value)} />
//           <input className="border rounded-lg px-3 py-2" placeholder="الجهة" value={externalPartyName} onChange={(e)=>setExternalPartyName(e.target.value)} />
//           <input className="border rounded-lg px-3 py-2" placeholder="نوع الجهة (اختياري)" value={externalPartyType} onChange={(e)=>setExternalPartyType(e.target.value)} />
//           <select className="border rounded-lg px-3 py-2" value={sendMethod} onChange={(e)=>setSendMethod(e.target.value)}>
//             <option value="Hand">Hand</option>
//             <option value="Mail">Mail</option>
//             <option value="Email">Email</option>
//             <option value="Courier">Courier</option>
//             <option value="Fax">Fax</option>
//             <option value="ElectronicSystem">ElectronicSystem</option>
//           </select>
//           <select className="border rounded-lg px-3 py-2" value={departmentId ?? ""} onChange={(e)=>setDepartmentId(Number(e.target.value)||null)}>
//             <option value="">القسم المالِك</option>
//             {departments.map((d)=> <option key={d.id} value={d.id}>{d.name}</option>)}
//           </select>
//           <input type="file" className="border rounded-lg px-3 py-2 col-span-full" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
//         </div>
//         <button onClick={createOutgoing} disabled={busy} className="bg-blue-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">
//           {busy ? "جارٍ الإنشاء..." : "إنشاء"}
//         </button>
//         {error && <div className="text-sm text-red-600">{error}</div>}
//       </div>

//       <div className="bg-white shadow rounded-2xl overflow-hidden">
//         <table className="w-full text-right">
//           <thead className="bg-slate-50">
//             <tr>
//               <th className="p-3">رقم الصادر</th>
//               <th className="p-3">التاريخ</th>
//               <th className="p-3">العنوان</th>
//               <th className="p-3">الجهة</th>
//             </tr>
//           </thead>
//           <tbody>
//             {items.map((x) => (
//               <tr key={x.id} className="border-t">
//                 <td className="p-3">{x.outgoingNumber}</td>
//                 <td className="p-3">{new Date(x.issueDate).toLocaleString()}</td>
//                 <td className="p-3">{x.document?.title}</td>
//                 <td className="p-3">{x.externalPartyName}</td>
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
