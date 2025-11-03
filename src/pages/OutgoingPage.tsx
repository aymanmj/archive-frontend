import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/apiClient';
import { useAuthStore } from '../stores/authStore';

type OutgoingRow = {
  id: string;
  outgoingNumber: string;
  issueDate: string;
  externalPartyName: string;
  document?: { id: string; title: string } | null;
  hasFiles?: boolean;
  isDelivered?: boolean;
};

type PagedOutgoing = {
  total: number;
  items?: OutgoingRow[]; // لـ my-latest
  rows?: OutgoingRow[];  // لـ search
  page: number;
  pageSize: number;
  pages?: number;
};

type Department = { id: number; name: string; status: string };

const SEND_METHODS = [
  { value: 'Hand', label: 'تسليم باليد' },
  { value: 'Mail', label: 'بريد رسمي' },
  { value: 'Email', label: 'بريد إلكتروني' },
  { value: 'Courier', label: 'مندوب/ساعي' },
  { value: 'Fax', label: 'فاكس' },
  { value: 'ElectronicSystem', label: 'عن طريق المنظومة' },
] as const;

export default function OutgoingPage() {
  // من المخزن (لازم يكون فيه user.id)
  const user = useAuthStore((s) => s.user);

  // جدول
  const [rows, setRows] = useState<OutgoingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(false);

  // الإدارات
  const [departments, setDepartments] = useState<Department[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);

  // form (إنشاء سريع)
  const [documentTitle, setDocumentTitle] = useState('');
  const [owningDepartmentId, setOwningDepartmentId] = useState<number | ''>('');
  const [externalPartyName, setExternalPartyName] = useState('');
  const [sendMethod, setSendMethod] = useState<string>('Hand');
  const [issueDate, setIssueDate] = useState<string>(''); // اختياري

  // filters
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const showToast = (t: 'success' | 'error', msg: string) => {
    setToast({ type: t, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const usingFilters = useMemo(() => !!q || !!dateFrom || !!dateTo, [q, dateFrom, dateTo]);

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

  const loadRows = async (pg = page) => {
    setLoading(true);
    try {
      if (usingFilters) {
        // البحث مع الفلاتر
        const res = await api.get<PagedOutgoing>('/outgoing/search', {
          params: {
            page: pg,
            pageSize,
            q: q || undefined,
            from: dateFrom || undefined,
            to: dateTo || undefined,
          },
        });
        const data = res.data;
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? pg);
      } else {
        // آخر الصادرات
        const res = await api.get<PagedOutgoing>('/outgoing/my-latest', {
          params: { page: pg, pageSize },
        });
        const data = res.data;
        setRows(data.items ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? pg);
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

  const applyFilters = () => {
    loadRows(1);
  };

  const clearFilters = () => {
    setQ('');
    setDateFrom('');
    setDateTo('');
    loadRows(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentTitle.trim()) return showToast('error', 'يرجى إدخال العنوان');
    if (!owningDepartmentId) return showToast('error', 'يرجى اختيار القسم المالِك');
    if (!externalPartyName.trim()) return showToast('error', 'يرجى إدخال اسم الجهة');
    if (!user?.id) return showToast('error', 'لا يمكن تحديد الموقّع (signedByUserId).');

    try {
      const body = {
        documentTitle,
        owningDepartmentId: Number(owningDepartmentId),
        externalPartyName,
        sendMethod,
        issueDate: issueDate || undefined,
        signedByUserId: Number(user.id),
      };
      const res = await api.post('/outgoing', body);
      showToast('success', `تم إنشاء صادر رقم ${res.data?.outgoingNumber}`);
      // reset
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

  const toggleDelivered = async (row: OutgoingRow, delivered: boolean) => {
    try {
      await api.post(`/outgoing/${row.id}/delivered`, {
        delivered,
        // proofPath يمكن ربطه لاحقًا من صفحة التفاصيل بعد رفع إيصال
        proofPath: null,
      });
      showToast('success', delivered ? 'تم وسم الصادر كمسلَّم' : 'تم إلغاء وسم التسليم');
      // حدّث الصف محليًا بدون إعادة تحميل كاملة
      setRows((old) =>
        old.map((r) => (r.id === row.id ? { ...r, isDelivered: delivered } : r)),
      );
    } catch (e: any) {
      console.error('[OutgoingPage] delivered error:', e?.response?.data || e?.message || e);
      const msg = e?.response?.data?.message ?? 'فشل تحديث حالة التسليم';
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
          <button
            onClick={() => loadRows(page)}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
          >
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
              onChange={(e) => setDocumentTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">طريقة الإرسال</label>
            <select
              className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={sendMethod}
              onChange={(e) => setSendMethod(e.target.value)}
            >
              {SEND_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">القسم المالِك</label>
            <select
              className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={owningDepartmentId === '' ? '' : String(owningDepartmentId)}
              onChange={(e) =>
                setOwningDepartmentId(e.target.value === '' ? '' : Number(e.target.value))
              }
              disabled={depsLoading}
            >
              <option value="">{depsLoading ? 'جاري التحميل…' : 'اختر القسم'}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">الجهة</label>
            <input
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={externalPartyName}
              onChange={(e) => setExternalPartyName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">تاريخ الإصدار (اختياري)</label>
            <input
              type="date"
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
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

      {/* الفلاتر + الجدول */}
      <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">بحث برقم/جهة/عنوان</label>
            <input
              placeholder="ابحث هنا…"
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters();
              }}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">من تاريخ</label>
            <input
              type="date"
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">إلى تاريخ</label>
            <input
              type="date"
              className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            >
              تطبيق الفلاتر
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            >
              مسح الفلاتر
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          النتائج: {rows.length} / {total} — صفحة {page} من {Math.max(1, Math.ceil(total / pageSize))}
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
                <th className="text-right p-2">تم التسليم؟</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    جاري التحميل...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center">
                    لا توجد بيانات
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono">
                      <Link
                        to={`/outgoing/${r.id}`}
                        className="text-blue-600 hover:underline"
                        title="عرض التفاصيل"
                      >
                        {r.outgoingNumber}
                      </Link>
                    </td>
                    <td className="p-2">
                      {new Date(r.issueDate).toLocaleString('ar-LY', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-2">{r.externalPartyName}</td>
                    <td className="p-2">{r.document?.title ?? '—'}</td>
                    <td className="p-2">{r.hasFiles ? '✅' : '—'}</td>
                    <td className="p-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!r.isDelivered}
                          onChange={(e) => toggleDelivered(r, e.target.checked)}
                        />
                        <span className="text-xs text-gray-600">تبديل</span>
                      </label>
                    </td>
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
          <div className="text-xs text-gray-500">
            صفحة {page} من {Math.max(1, Math.ceil(total / pageSize))}
          </div>
          <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => loadRows(Math.min(Math.max(1, Math.ceil(total / pageSize)), page + 1))}
            disabled={page >= Math.max(1, Math.ceil(total / pageSize))}
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
// import { useEffect, useMemo, useState } from 'react';
// import { Link } from 'react-router-dom';
// import api from '../api/apiClient';

// type OutgoingRow = {
//   id: string;
//   outgoingNumber: string;
//   issueDate: string;
//   externalPartyName: string;
//   document?: { id: string; title: string } | null;
//   hasFiles?: boolean;
// };

// type PagedOutgoing =
//   | { items: OutgoingRow[]; total: number; page: number; pageSize: number } // من /outgoing/my-latest
//   | { rows: OutgoingRow[]; total: number; page: number; pageSize: number; pages: number }; // من /outgoing/search

// type Department = { id: number; name: string; status: string };

// export default function OutgoingPage() {
//   // جدول
//   const [rows, setRows] = useState<OutgoingRow[]>([]);
//   const [total, setTotal] = useState(0);
//   const [page, setPage] = useState(1);
//   const [pageSize] = useState(20);
//   const [loading, setLoading] = useState(false);

//   // الإدارات (لإنشاء سريع)
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [depsLoading, setDepsLoading] = useState(false);

//   // form (إنشاء صادر سريع)
//   const [documentTitle, setDocumentTitle] = useState('');
//   const [owningDepartmentId, setOwningDepartmentId] = useState<number | ''>('');
//   const [externalPartyName, setExternalPartyName] = useState('');
//   const [sendMethod, setSendMethod] = useState<'Hand'|'Mail'|'Email'|'Courier'|'Fax'|'ElectronicSystem'>('Hand');
//   const [issueDate, setIssueDate] = useState<string>('');

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

//   const useSearch = useMemo(() => {
//     // لو فيه أي فلتر/بحث نفعل /search (نفس منطق Incoming)
//     return (q?.trim() || dateFrom || dateTo) ? true : false;
//   }, [q, dateFrom, dateTo]);

//   const loadRows = async (pg = page) => {
//     setLoading(true);
//     try {
//       if (useSearch) {
//         const res = await api.get('/outgoing/search', {
//           params: {
//             page: pg,
//             pageSize,
//             q: q || undefined,
//             from: dateFrom || undefined,
//             to: dateTo || undefined,
//           },
//         });
//         const data = res.data as any;
//         setRows(Array.isArray(data.rows) ? data.rows : []);
//         setTotal(Number(data.total ?? 0));
//         setPage(Number(data.page ?? pg));
//       } else {
//         const res = await api.get('/outgoing/my-latest', {
//           params: {
//             page: pg,
//             pageSize,
//           },
//         });
//         const data = res.data as any;
//         setRows(Array.isArray(data.items) ? data.items : []);
//         setTotal(Number(data.total ?? 0));
//         setPage(Number(data.page ?? pg));
//       }
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

//   // تطبيق الفلاتر → نرجع للصفحة 1
//   const applyFilters = () => loadRows(1);
//   const clearFilters = () => {
//     setQ(''); setDateFrom(''); setDateTo('');
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
//         sendMethod,          // يطابق Prisma.$Enums.DeliveryMethod
//         issueDate: issueDate || undefined,
//         signedByUserId: 1,   // TODO: اربطه باليوزر الحالي من الـ token
//       };
//       const res = await api.post('/outgoing', body);
//       showToast('success', `تم إنشاء صادر رقم ${res.data?.outgoingNumber}`);
//       setDocumentTitle('');
//       setExternalPartyName('');
//       setSendMethod('Hand');
//       setIssueDate('');
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
//           <button onClick={() => loadRows(page)} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
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
//               onChange={e => setDocumentTitle(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">تاريخ الإصدار</label>
//             <input
//               type="datetime-local"
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={issueDate}
//               onChange={e => setIssueDate(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">القسم المالِك</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={owningDepartmentId === '' ? '' : String(owningDepartmentId)}
//               onChange={e => setOwningDepartmentId(e.target.value === '' ? '' : Number(e.target.value))}
//               disabled={depsLoading}
//             >
//               <option value="">{depsLoading ? 'جاري التحميل…' : 'اختر القسم'}</option>
//               {departments.map((d) => (
//                 <option key={d.id} value={d.id}>{d.name}</option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="block text-sm mb-1">الجهة</label>
//             <input
//               className="w-full border rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={externalPartyName}
//               onChange={e => setExternalPartyName(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="block text-sm mb-1">طريقة الإرسال</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
//               value={sendMethod}
//               onChange={e => setSendMethod(e.target.value as any)}
//             >
//               <option value="Hand">تسليم باليد</option>
//               <option value="Mail">بريد رسمي</option>
//               <option value="Email">بريد إلكتروني</option>
//               <option value="Courier">مندوب/ساعي</option>
//               <option value="Fax">فاكس</option>
//               <option value="ElectronicSystem">عن طريق المنظومة</option>
//             </select>
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
//               onChange={e => setQ(e.target.value)}
//               onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
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
//           <button type="button" onClick={applyFilters} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
//             تطبيق الفلاتر
//           </button>
//           <button type="button" onClick={clearFilters} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
//             مسح الفلاتر
//           </button>
//           <div className="text-xs text-gray-500">النتائج: {rows.length} / {total} — صفحة {page} من {Math.max(1, Math.ceil(total / pageSize))}</div>
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
//                 <tr><td colSpan={5} className="p-4 text-center">جاري التحميل...</td></tr>
//               )}
//               {!loading && rows.length === 0 && (
//                 <tr><td colSpan={5} className="p-4 text-center">لا توجد بيانات</td></tr>
//               )}
//               {!loading && rows.map(r => (
//                 <tr key={r.id} className="border-t hover:bg-gray-50">
//                   <td className="p-2 font-mono">
//                     <Link className="text-blue-600 hover:underline" to={`/outgoing/${r.id}`}>
//                       {r.outgoingNumber}
//                     </Link>
//                   </td>
//                   <td className="p-2">
//                     {new Date(r.issueDate).toLocaleString('ar-LY', {
//                       year: 'numeric', month: '2-digit', day: '2-digit',
//                       hour: '2-digit', minute: '2-digit'
//                     })}
//                   </td>
//                   <td className="p-2">{r.externalPartyName}</td>
//                   <td className="p-2">{r.document?.title ?? '—'}</td>
//                   <td className="p-2">{r.hasFiles ? '✅' : '—'}</td>
//                 </tr>
//               ))}
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
//           <div className="text-xs text-gray-500">صفحة {page} من {totalPages}</div>
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

