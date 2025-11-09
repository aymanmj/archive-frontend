// src/pages/IncomingPage.tsx

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/apiClient";
import { toast } from "sonner";
import { Plus, Upload, Search, RefreshCw, FileText, CheckSquare } from "lucide-react";
import UploadFilesDialog from "../components/UploadFilesDialog";
import PermissionsGate from "../components/PermissionsGate";

// ------------ Types ------------
type Department = { id: number; name: string; status?: string };

type IncomingRow = {
  id: string;
  incomingNumber: string;
  receivedDate: string;
  externalPartyName: string;
  document: { id: string; title: string } | null;
  hasFiles?: boolean;
};

type Paged<T> = {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  rows: T[];
};

// ------------ Page ------------
export default function IncomingPage() {
  // quick create
  const [title, setTitle] = useState("");
  const [deptId, setDeptId] = useState<string>("");
  const [party, setParty] = useState("جهة خارجية");
  const [delivery, setDelivery] = useState("Hand");

  // departments for combobox
  const [departments, setDepartments] = useState<Department[]>([]);
  const [depsLoading, setDepsLoading] = useState(false);

  // list
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [data, setData] = useState<Paged<IncomingRow>>({
    page: 1, pageSize: 10, total: 0, pages: 1, rows: [],
  });

  // upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDocId, setUploadDocId] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    return title.trim().length > 0 && !!deptId && party.trim().length > 0 && delivery.trim().length > 0;
  }, [title, deptId, party, delivery]);

  // fetch departments once
  async function loadDepartments() {
    setDepsLoading(true);
    try {
      const res = await api.get<Department[]>("/departments", { params: { status: "Active" } });
      const list = Array.isArray(res.data) ? res.data : [];
      setDepartments(list);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "تعذّر تحميل الإدارات");
    } finally {
      setDepsLoading(false);
    }
  }

  async function loadList(p = page) {
    setLoading(true);
    try {
      const res = await api.get<Paged<IncomingRow>>("/incoming/search", {
        params: {
          page: p,
          pageSize,
          q: q.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      });
      setData(res.data);
      setPage(res.data.page);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "تعذّر تحميل الوارد");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepartments();
    loadList(1);
  }, []);

  // create + open upload dialog
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    try {
      const res = await api.post("/incoming", {
        documentTitle: title.trim(),
        owningDepartmentId: Number(deptId),
        externalPartyName: party.trim(),
        deliveryMethod: delivery,
      });
      toast.success("تم إنشاء الوارد بنجاح");
      const docId = res?.data?.document?.id;
      if (docId) {
        setUploadDocId(String(docId));
        setUploadOpen(true);
      }
      setTitle("");
      setParty("جهة خارجية");
      setDelivery("Hand");
      await loadList(1);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "فشل إنشاء الوارد");
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">الوارد</h1>
          <p className="text-sm text-gray-500">إنشاء وارد جديد واستعراض القائمة</p>
        </div>
        <button
          onClick={() => { loadDepartments(); loadList(); }}
          className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="size-4" />
          تحديث
        </button>
      </div>

      {/* Quick Create (مخفاة لمن لا يملك incoming.create) */}
      <PermissionsGate one="incoming.create">
        <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Plus className="size-4 text-sky-700" />
            إنشاء وارد سريع
          </div>
          <form onSubmit={handleCreate} className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs">عنوان الوثيقة</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-xl p-2"
                placeholder="اكتب عنوانًا واضحًا"
              />
            </div>

            <div>
              <label className="text-xs">القسم المالِك</label>
              <select
                className="w-full border rounded-xl p-2 bg-white"
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                disabled={depsLoading}
              >
                <option value="">{depsLoading ? "جاري التحميل..." : "اختر قسمًا"}</option>
                {departments.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs">طريقة التسليم</label>
              <select
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                className="w-full border rounded-xl p-2 bg-white"
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
              <label className="text-xs">الجهة الخارجية</label>
              <input
                value={party}
                onChange={(e) => setParty(e.target.value)}
                className="w-full border rounded-xl p-2"
                placeholder="اسم الجهة"
              />
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                disabled={!canCreate}
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-4 py-2 disabled:opacity-60"
              >
                إنشاء الوارد
              </button>
            </div>
          </form>
        </section>
      </PermissionsGate>

      {/* Filters */}
      <section className="bg-white border rounded-2xl shadow-sm p-4">
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-xs">بحث برقم/جهة/عنوان</label>
            <div className="flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full border rounded-xl p-2"
                placeholder="ابحث هنا..."
              />
              <button
                onClick={() => loadList(1)}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
              >
                <Search className="size-4" />
                بحث
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs">من تاريخ</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border rounded-xl p-2" />
          </div>
          <div>
            <label className="text-xs">إلى تاريخ</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border rounded-xl p-2" />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setFrom(""); setTo(""); setQ(""); loadList(1); }}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            >
              مسح الفلاتر
            </button>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" dir="rtl">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-right">رقم الوارد</th>
                <th className="px-4 py-3 text-right">التاريخ</th>
                <th className="px-4 py-3 text-right">الجهة</th>
                <th className="px-4 py-3 text-right">العنوان</th>
                <th className="px-4 py-3 text-center">ملفات؟</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={6}>... جاري التحميل</td></tr>
              ) : data.rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={6}>لا توجد نتائج</td></tr>
              ) : (
                data.rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2">
                      <Link to={`/incoming/${r.id}`} className="text-sky-700 hover:underline">
                        {r.incomingNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{new Date(r.receivedDate).toLocaleString("ar-LY")}</td>
                    <td className="px-4 py-2">{r.externalPartyName || "—"}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <FileText className="size-4 text-gray-500" />
                        <span>{r.document?.title ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {r.hasFiles ? (
                        <CheckSquare className="inline size-4 text-emerald-600" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <PermissionsGate one="files.upload">
                        {r.document?.id ? (
                          <button
                            className="inline-flex items-center gap-1 text-sky-700 hover:underline"
                            onClick={() => { setUploadDocId(r.document!.id); setUploadOpen(true); }}
                          >
                            <Upload className="size-4" />
                            رفع ملف
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </PermissionsGate>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <div>النتائج: {data.total}</div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => loadList(page - 1)}
              className="rounded-xl border px-3 py-1.5 disabled:opacity-50"
            >
              السابق
            </button>
            <div className="px-2 py-1.5">صفحة {data.page} من {data.pages}</div>
            <button
              disabled={page >= data.pages || loading}
              onClick={() => loadList(page + 1)}
              className="rounded-xl border px-3 py-1.5 disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        </div>
      </section>

      {/* Upload dialog */}
      <UploadFilesDialog
        documentId={uploadDocId}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => loadList(page)}
      />
    </div>
  );
}





// // src/pages/IncomingPage.tsx

// import { useEffect, useMemo, useState } from "react";
// import { Link } from "react-router-dom";
// import api from "../api/apiClient";
// import { toast } from "sonner";
// import { Plus, Upload, Search, RefreshCw, FileText, CheckSquare } from "lucide-react";
// import UploadFilesDialog from "../components/UploadFilesDialog";

// // ------------ Types ------------
// type Department = { id: number; name: string; status?: string };

// type IncomingRow = {
//   id: string;
//   incomingNumber: string;
//   receivedDate: string;
//   externalPartyName: string;
//   document: { id: string; title: string } | null;
//   hasFiles?: boolean;
// };

// type Paged<T> = {
//   page: number;
//   pageSize: number;
//   total: number;
//   pages: number;
//   rows: T[];
// };

// // ------------ Page ------------
// export default function IncomingPage() {
//   // quick create
//   const [title, setTitle] = useState("");
//   const [deptId, setDeptId] = useState<string>(""); // <-- صار select
//   const [party, setParty] = useState("جهة خارجية");
//   const [delivery, setDelivery] = useState("Hand");

//   // departments for combobox
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [depsLoading, setDepsLoading] = useState(false);

//   // list
//   const [loading, setLoading] = useState(false);
//   const [page, setPage] = useState(1);
//   const [pageSize] = useState(10);
//   const [q, setQ] = useState("");
//   const [from, setFrom] = useState<string>("");
//   const [to, setTo] = useState<string>("");
//   const [data, setData] = useState<Paged<IncomingRow>>({
//     page: 1, pageSize: 10, total: 0, pages: 1, rows: [],
//   });

//   // upload dialog
//   const [uploadOpen, setUploadOpen] = useState(false);
//   const [uploadDocId, setUploadDocId] = useState<string | null>(null);

//   const canCreate = useMemo(() => {
//     return title.trim().length > 0 && !!deptId && party.trim().length > 0 && delivery.trim().length > 0;
//   }, [title, deptId, party, delivery]);

//   // fetch departments once
//   async function loadDepartments() {
//     setDepsLoading(true);
//     try {
//       const res = await api.get<Department[]>("/departments", { params: { status: "Active" } });
//       const list = Array.isArray(res.data) ? res.data : [];
//       setDepartments(list);
//       // لو تحب تختار أول قسم تلقائياً:
//       // if (!deptId && list.length) setDeptId(String(list[0].id));
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message ?? "تعذّر تحميل الإدارات");
//     } finally {
//       setDepsLoading(false);
//     }
//   }

//   async function loadList(p = page) {
//     setLoading(true);
//     try {
//       const res = await api.get<Paged<IncomingRow>>("/incoming/search", {
//         params: {
//           page: p,
//           pageSize,
//           q: q.trim() || undefined,
//           from: from || undefined,
//           to: to || undefined,
//         },
//       });
//       setData(res.data);
//       setPage(res.data.page);
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message ?? "تعذّر تحميل الوارد");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadDepartments();
//     loadList(1);
//   }, []);

//   // create + open upload dialog
//   async function handleCreate(e: React.FormEvent) {
//     e.preventDefault();
//     if (!canCreate) return;
//     try {
//       const res = await api.post("/incoming", {
//         documentTitle: title.trim(),
//         owningDepartmentId: Number(deptId), // <-- من الـ combobox
//         externalPartyName: party.trim(),
//         deliveryMethod: delivery,
//       });
//       toast.success("تم إنشاء الوارد بنجاح");
//       const docId = res?.data?.document?.id;
//       if (docId) {
//         setUploadDocId(String(docId));
//         setUploadOpen(true);
//       }
//       // reset form (اترك الإدارة كما هي إذا تحب)
//       setTitle("");
//       setParty("جهة خارجية");
//       setDelivery("Hand");
//       await loadList(1);
//     } catch (e: any) {
//       toast.error(e?.response?.data?.message ?? "فشل إنشاء الوارد");
//     }
//   }

//   return (
//     <div className="space-y-6" dir="rtl">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div className="space-y-1">
//           <h1 className="text-2xl font-bold">الوارد</h1>
//           <p className="text-sm text-gray-500">إنشاء وارد جديد واستعراض القائمة</p>
//         </div>
//         <button
//           onClick={() => { loadDepartments(); loadList(); }}
//           className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
//         >
//           <RefreshCw className="size-4" />
//           تحديث
//         </button>
//       </div>

//       {/* Quick Create */}
//       <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
//         <div className="flex items-center gap-2 text-sm font-semibold">
//           <Plus className="size-4 text-sky-700" />
//           إنشاء وارد سريع
//         </div>
//         <form onSubmit={handleCreate} className="grid md:grid-cols-4 gap-3">
//           <div className="md:col-span-2">
//             <label className="text-xs">عنوان الوثيقة</label>
//             <input
//               value={title}
//               onChange={(e) => setTitle(e.target.value)}
//               className="w-full border rounded-xl p-2"
//               placeholder="اكتب عنوانًا واضحًا"
//             />
//           </div>

//           {/* ✅ Combobox للـ Department */}
//           <div>
//             <label className="text-xs">القسم المالِك</label>
//             <select
//               className="w-full border rounded-xl p-2 bg-white"
//               value={deptId}
//               onChange={(e) => setDeptId(e.target.value)}
//               disabled={depsLoading}
//             >
//               <option value="">{depsLoading ? "جاري التحميل..." : "اختر قسمًا"}</option>
//               {departments.map((d) => (
//                 <option key={d.id} value={String(d.id)}>
//                   {d.name}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="text-xs">طريقة التسليم</label>
//             <select
//               value={delivery}
//               onChange={(e) => setDelivery(e.target.value)}
//               className="w-full border rounded-xl p-2 bg-white"
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
//             <label className="text-xs">الجهة الخارجية</label>
//             <input
//               value={party}
//               onChange={(e) => setParty(e.target.value)}
//               className="w-full border rounded-xl p-2"
//               placeholder="اسم الجهة"
//             />
//           </div>

//           <div className="md:col-span-2 flex items-end">
//             <button
//               disabled={!canCreate}
//               className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-4 py-2 disabled:opacity-60"
//             >
//               إنشاء الوارد
//             </button>
//           </div>
//         </form>
//       </section>

//       {/* Filters */}
//       <section className="bg-white border rounded-2xl shadow-sm p-4">
//         <div className="grid md:grid-cols-5 gap-3 items-end">
//           <div className="md:col-span-2">
//             <label className="text-xs">بحث برقم/جهة/عنوان</label>
//             <div className="flex items-center gap-2">
//               <input
//                 value={q}
//                 onChange={(e) => setQ(e.target.value)}
//                 className="w-full border rounded-xl p-2"
//                 placeholder="ابحث هنا..."
//               />
//               <button
//                 onClick={() => loadList(1)}
//                 className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
//               >
//                 <Search className="size-4" />
//                 بحث
//               </button>
//             </div>
//           </div>
//           <div>
//             <label className="text-xs">من تاريخ</label>
//             <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border rounded-xl p-2" />
//           </div>
//           <div>
//             <label className="text-xs">إلى تاريخ</label>
//             <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border rounded-xl p-2" />
//           </div>
//           <div className="flex gap-2">
//             <button
//               onClick={() => { setFrom(""); setTo(""); setQ(""); loadList(1); }}
//               className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
//             >
//               مسح الفلاتر
//             </button>
//           </div>
//         </div>
//       </section>

//       {/* List */}
//       <section className="bg-white border rounded-2xl shadow-sm p-0 overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="min-w-full text-sm" dir="rtl">
//             <thead className="bg-gray-50 text-gray-600">
//               <tr>
//                 <th className="px-4 py-3 text-right">رقم الوارد</th>
//                 <th className="px-4 py-3 text-right">التاريخ</th>
//                 <th className="px-4 py-3 text-right">الجهة</th>
//                 <th className="px-4 py-3 text-right">العنوان</th>
//                 <th className="px-4 py-3 text-center">ملفات؟</th>
//                 <th className="px-4 py-3 text-center">إجراءات</th>
//               </tr>
//             </thead>
//             <tbody>
//               {loading ? (
//                 <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={6}>... جاري التحميل</td></tr>
//               ) : data.rows.length === 0 ? (
//                 <tr><td className="px-4 py-6 text-center text-gray-500" colSpan={6}>لا توجد نتائج</td></tr>
//               ) : (
//                 data.rows.map((r) => (
//                   <tr key={r.id} className="border-t">
//                     <td className="px-4 py-2">
//                       <Link to={`/incoming/${r.id}`} className="text-sky-700 hover:underline">
//                         {r.incomingNumber}
//                       </Link>
//                     </td>
//                     <td className="px-4 py-2">{new Date(r.receivedDate).toLocaleString("ar-LY")}</td>
//                     <td className="px-4 py-2">{r.externalPartyName || "—"}</td>
//                     <td className="px-4 py-2">
//                       <div className="flex items-center gap-1">
//                         <FileText className="size-4 text-gray-500" />
//                         <span>{r.document?.title ?? "—"}</span>
//                       </div>
//                     </td>
//                     <td className="px-4 py-2 text-center">
//                       {r.hasFiles ? (
//                         <CheckSquare className="inline size-4 text-emerald-600" />
//                       ) : (
//                         <span className="text-gray-400">—</span>
//                       )}
//                     </td>
//                     <td className="px-4 py-2 text-center">
//                       {r.document?.id ? (
//                         <button
//                           className="inline-flex items-center gap-1 text-sky-700 hover:underline"
//                           onClick={() => { setUploadDocId(r.document!.id); setUploadOpen(true); }}
//                         >
//                           <Upload className="size-4" />
//                           رفع ملف
//                         </button>
//                       ) : (
//                         <span className="text-gray-400">—</span>
//                       )}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         {/* Pagination */}
//         <div className="flex items-center justify-between px-4 py-3 text-sm">
//           <div>النتائج: {data.total}</div>
//           <div className="flex gap-2">
//             <button
//               disabled={page <= 1 || loading}
//               onClick={() => loadList(page - 1)}
//               className="rounded-xl border px-3 py-1.5 disabled:opacity-50"
//             >
//               السابق
//             </button>
//             <div className="px-2 py-1.5">صفحة {data.page} من {data.pages}</div>
//             <button
//               disabled={page >= data.pages || loading}
//               onClick={() => loadList(page + 1)}
//               className="rounded-xl border px-3 py-1.5 disabled:opacity-50"
//             >
//               التالي
//             </button>
//           </div>
//         </div>
//       </section>

//       {/* Upload dialog */}
//       <UploadFilesDialog
//         documentId={uploadDocId}
//         open={uploadOpen}
//         onClose={() => setUploadOpen(false)}
//         onUploaded={() => loadList(page)}
//       />
//     </div>
//   );
// }

