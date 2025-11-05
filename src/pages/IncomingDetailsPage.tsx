import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/apiClient";
import FilePreview from "../components/files/FilePreview";
import type { PreviewFile } from "../components/files/FilePreview";

type Department = { id: number; name: string; status?: string };
type UserLite   = { id: number; fullName: string; departmentId: number|null };

type Dist = {
  id: string;
  status: "Open"|"InProgress"|"Closed"|"Escalated";
  targetDepartmentName: string;
  assignedToUserName: string|null;
  lastUpdateAt: string;
  notes: string|null;
};

type Details = {
  id: string;
  incomingNumber: string;
  receivedDate: string;
  deliveryMethod: string;
  urgencyLevel: string | null;
  externalPartyName: string;
  document: {
    id: string;
    title: string;
    currentStatus: string;
    createdAt: string;
    owningDepartmentName: string;
  } | null;
  files: {
    id: string;
    fileNameOriginal: string;
    fileUrl: string;
    fileExtension?: string;
    fileSizeBytes: number;
    uploadedAt: string;
    versionNumber: number;
  }[];
  distributions: Dist[];
};

type TimelineItem = {
  type: "file" | "distribution" | "audit";
  at: string;
  title: string;
  by?: string;
  details?: string;
  link?: string;
};

function fmtDT(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-LY", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function IncomingDetailsPage() {
  const { id } = useParams();

  const [details, setDetails] = useState<Details | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"forward"|"assign"|"files"|"timeline">("overview");

  // ملفات (معاينة)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  // إدارات
  const [departments, setDepartments] = useState<Department[]>([]);

  // ——— اختيار التوزيع الهدف لأوامر CRUD ———
  const [selectedDistId, setSelectedDistId] = useState<string>("");

  // تبويب الإحالة
  const [fwdDept, setFwdDept] = useState<string>("");
  const [fwdUsers, setFwdUsers] = useState<UserLite[]>([]);
  const [fwdUsersLoading, setFwdUsersLoading] = useState(false);
  const [fwdUser, setFwdUser] = useState<string>("");
  const [fwdClosePrev, setFwdClosePrev] = useState(true);
  const [fwdNote, setFwdNote] = useState("");

  // تبويب التعيين
  const [assignDept, setAssignDept] = useState<string>("");
  const [assignUsers, setAssignUsers] = useState<UserLite[]>([]);
  const [assignUsersLoading, setAssignUsersLoading] = useState(false);
  const [assignUser, setAssignUser] = useState<string>("");
  const [assignNote, setAssignNote] = useState("");

  // تبويب "تغيير الحالة" + "ملاحظة"
  const [newStatus, setNewStatus] = useState<"Open"|"InProgress"|"Closed"|"Escalated">("InProgress");
  const [statusNote, setStatusNote] = useState("");
  const [plainNote, setPlainNote]   = useState("");
  const [busy, setBusy] = useState(false);

  // تحميل البيانات الأساسية
  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [det, tl, deps] = await Promise.all([
          api.get<Details>(`/incoming/${id}`),
          api.get<{items: TimelineItem[]}>(`/incoming/${id}/timeline`),
          api.get<Department[]>('/departments', { params: { status: 'Active' } }),
        ]);
        setDetails(det.data);
        setTimeline(tl.data.items ?? []);
        setDepartments(Array.isArray(deps.data) ? deps.data : []);
        // اختر توزيع تلقائي: المفتوح/قيد الإجراء، وإلا الأحدث
        const auto =
          det.data.distributions?.find(d => d.status==="Open" || d.status==="InProgress")
          ?? det.data.distributions?.[0];
        if (auto) setSelectedDistId(auto.id);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [id]);

  // جلب المستخدمين عند اختيار إدارة (تبويب الإحالة)
  useEffect(() => {
    (async () => {
      setFwdUsers([]); setFwdUser("");
      if (!fwdDept) return;
      setFwdUsersLoading(true);
      try {
        const res = await api.get<UserLite[]>(`/users/by-department/${fwdDept}`);
        setFwdUsers(Array.isArray(res.data) ? res.data : []);
      } catch {}
      finally { setFwdUsersLoading(false); }
    })();
  }, [fwdDept]);

  // جلب المستخدمين عند اختيار إدارة (تبويب التعيين)
  useEffect(() => {
    (async () => {
      setAssignUsers([]); setAssignUser("");
      if (!assignDept) return;
      setAssignUsersLoading(true);
      try {
        const res = await api.get<UserLite[]>(`/users/by-department/${assignDept}`);
        setAssignUsers(Array.isArray(res.data) ? res.data : []);
      } catch {}
      finally { setAssignUsersLoading(false); }
    })();
  }, [assignDept]);

  const refreshDetails = async () => {
    if (!id) return;
    try {
      const det = await api.get<Details>(`/incoming/${id}`);
      setDetails(det.data);
      // حافظ على التوزيع الحالي إن بقي موجودًا
      if (det.data.distributions?.length) {
        const keep = det.data.distributions.find(d => d.id === selectedDistId);
        if (!keep) {
          const auto =
            det.data.distributions.find(d => d.status==="Open" || d.status==="InProgress")
            ?? det.data.distributions[0];
          if (auto) setSelectedDistId(auto.id);
        }
      } else {
        setSelectedDistId("");
      }
    } catch {}
  };

  // ——— Handlers ———
  const submitForward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!fwdDept) return alert("اختر القسم المستهدف");
    setBusy(true);
    try {
      await api.post(`/incoming/${id}/forward`, {
        targetDepartmentId: Number(fwdDept),
        assignedToUserId: fwdUser ? Number(fwdUser) : undefined,
        note: fwdNote || null,
        closePrevious: !!fwdClosePrev,
      });
      setFwdNote("");
      await refreshDetails();
      alert("تمت الإحالة");
      setTab("overview");
    } catch (e:any) {
      alert(e?.response?.data?.message ?? "فشل الإحالة");
    } finally { setBusy(false); }
  };

  const submitAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistId) return alert("اختر التوزيع أولًا");
    if (!assignDept) return alert("اختر الإدارة");
    if (!assignUser) return alert("اختر المكلّف");
    setBusy(true);
    try {
      await api.patch(`/incoming/distributions/${selectedDistId}/assign`, {
        assignedToUserId: Number(assignUser),
        note: assignNote || null,
      });
      setAssignNote("");
      await refreshDetails();
      alert("تم التعيين");
      setTab("overview");
    } catch (e:any) {
      alert(e?.response?.data?.message ?? "فشل التعيين");
    } finally { setBusy(false); }
  };

  const submitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistId) return alert("اختر التوزيع أولًا");
    setBusy(true);
    try {
      await api.patch(`/incoming/distributions/${selectedDistId}/status`, {
        status: newStatus,
        note: statusNote || null,
      });
      setStatusNote("");
      await refreshDetails();
      alert("تم تغيير الحالة");
    } catch (e:any) {
      alert(e?.response?.data?.message ?? "فشل تغيير الحالة");
    } finally { setBusy(false); }
  };

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDistId) return alert("اختر التوزيع أولًا");
    if (!plainNote.trim()) return alert("اكتب ملاحظة");
    setBusy(true);
    try {
      // إن كان الراوت عندك POST /note أو PATCH /note عدّله هنا حسب الكنترولر لديك
      await api.post(`/incoming/distributions/${selectedDistId}/note`, {
        note: plainNote.trim(),
      });
      setPlainNote("");
      await refreshDetails();
      alert("تمت إضافة الملاحظة");
    } catch (e:any) {
      alert(e?.response?.data?.message ?? "فشل إضافة الملاحظة");
    } finally { setBusy(false); }
  };

  const openPreview = (f: PreviewFile) => {
    setPreviewFile(f);
    setPreviewOpen(true);
  };

  const header = useMemo(() => {
    if (!details) return null;
    return (
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold">
          وارد {details.incomingNumber}
        </h1>
        <div className="text-sm text-gray-600">
          الجهة: {details.externalPartyName} — التاريخ: {fmtDT(details.receivedDate)}
        </div>
        {details.document && (
          <div className="text-sm text-gray-600">
            الوثيقة: {details.document.title} — القسم المالِك: {details.document.owningDepartmentName}
          </div>
        )}
      </div>
    );
  }, [details]);

  if (loading) return <div className="p-6" dir="rtl">...جاري التحميل</div>;
  if (!details) return <div className="p-6" dir="rtl">لم يتم العثور على الوارد</div>;

  return (
    <div className="space-y-6" dir="rtl">
      {header}

      {/* اختيار توزيع هدف عام لكل CRUD */}
      <section className="bg-white border rounded-2xl shadow-sm p-4">
        <label className="text-xs text-gray-500">اختر التوزيع (Target)</label>
        <select
          className="w-full border rounded-xl p-2 bg-white mt-1"
          value={selectedDistId}
          onChange={(e)=>setSelectedDistId(e.target.value)}
        >
          <option value="">— اختر —</option>
          {details.distributions?.map(d => (
            <option key={d.id} value={d.id}>
              {`#${d.id} — ${d.targetDepartmentName} — ${d.status} — ${fmtDT(d.lastUpdateAt)}`}
            </option>
          ))}
        </select>
        <div className="text-xs text-gray-500 mt-1">
          (هذا الاختيار يُستخدم في “تغيير الحالة” و“التعيين” و“ملاحظة”)
        </div>
      </section>

      {/* تبويبات */}
      <div className="flex items-center gap-2 border-b">
        {(["overview","forward","assign","files","timeline"] as const).map(t => (
          <button
            key={t}
            onClick={()=>setTab(t)}
            className={[
              "px-3 py-2 -mb-px border-b-2 text-sm",
              tab===t ? "border-blue-600 text-blue-700 font-semibold" : "border-transparent text-gray-600 hover:text-gray-800"
            ].join(" ")}
          >
            {t==="overview" ? "نظرة عامة" :
             t==="forward" ? "إحالة" :
             t==="assign" ? "تعيين" :
             t==="files" ? "الملفات" :
             "السجل الزمني"}
          </button>
        ))}
      </div>

      {tab==="overview" && (
        <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-3 text-sm">
            <div><div className="text-gray-500">طريقة التسليم</div><div>{details.deliveryMethod}</div></div>
            <div><div className="text-gray-500">درجة الأهمية</div><div>{details.urgencyLevel ?? "—"}</div></div>
            <div><div className="text-gray-500">الحالة الحالية</div><div>{details.document?.currentStatus ?? "—"}</div></div>
          </div>

          <div className="pt-3">
            <div className="text-sm font-semibold mb-2">التوزيعات</div>
            <div className="overflow-auto rounded-xl border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-right">القسم</th>
                    <th className="p-2 text-right">المكلّف</th>
                    <th className="p-2 text-right">الحالة</th>
                    <th className="p-2 text-right">ملاحظة</th>
                    <th className="p-2 text-right">آخر تحديث</th>
                  </tr>
                </thead>
                <tbody>
                  {details.distributions?.length ? details.distributions.map(d => (
                    <tr key={d.id} className="border-t">
                      <td className="p-2">{d.targetDepartmentName}</td>
                      <td className="p-2">{d.assignedToUserName ?? "—"}</td>
                      <td className="p-2">{d.status}</td>
                      <td className="p-2">{d.notes ?? "—"}</td>
                      <td className="p-2">{fmtDT(d.lastUpdateAt)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="p-3 text-center text-gray-500">لا توجد توزيعات</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* مصغّر: تغيير الحالة + ملاحظة */}
          <div className="grid md:grid-cols-2 gap-4">
            <form onSubmit={submitStatus} className="border rounded-2xl p-3 space-y-2">
              <div className="font-semibold text-sm">تغيير الحالة</div>
              <div className="text-xs text-gray-500 -mt-1">يطبّق على التوزيع المختار أعلاه</div>
              <div>
                <label className="text-xs text-gray-500">الحالة الجديدة</label>
                <select className="w-full border rounded-xl p-2 bg-white"
                  value={newStatus}
                  onChange={(e)=>setNewStatus(e.target.value as any)}>
                  <option value="Open">Open</option>
                  <option value="InProgress">InProgress</option>
                  <option value="Closed">Closed</option>
                  <option value="Escalated">Escalated</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">ملاحظة</label>
                <input className="w-full border rounded-xl p-2" value={statusNote} onChange={(e)=>setStatusNote(e.target.value)} placeholder="اختياري" />
              </div>
              <button disabled={busy || !selectedDistId} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 disabled:opacity-50">
                {busy ? "..." : "تطبيق الحالة"}
              </button>
            </form>

            <form onSubmit={submitNote} className="border rounded-2xl p-3 space-y-2">
              <div className="font-semibold text-sm">إضافة ملاحظة</div>
              <div className="text-xs text-gray-500 -mt-1">للتوزيع المختار أعلاه</div>
              <div>
                <label className="text-xs text-gray-500">ملاحظة</label>
                <input className="w-full border rounded-xl p-2" value={plainNote} onChange={(e)=>setPlainNote(e.target.value)} placeholder="..." />
              </div>
              <button disabled={busy || !selectedDistId || !plainNote.trim()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 disabled:opacity-50">
                {busy ? "..." : "حفظ الملاحظة"}
              </button>
            </form>
          </div>
        </section>
      )}

      {tab==="forward" && (
        <form onSubmit={submitForward} className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
          <div className="text-sm text-gray-600 mb-1">
            إحالة الوارد {details.incomingNumber} إلى قسم آخر (مع إمكانية تعيين مكلّف اختياريًا).
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">القسم المستهدف</label>
              <select className="w-full border rounded-xl p-2 bg-white"
                value={fwdDept}
                onChange={(e)=>setFwdDept(e.target.value)}>
                <option value="">اختر قسمًا</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">المكلّف (اختياري)</label>
              <select className="w-full border rounded-xl p-2 bg-white"
                value={fwdUser}
                onChange={(e)=>setFwdUser(e.target.value)}
                disabled={!fwdDept || fwdUsersLoading}>
                <option value="">{fwdUsersLoading ? "جاري التحميل..." : "—"}</option>
                {fwdUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <input id="closePrev" type="checkbox" checked={fwdClosePrev} onChange={(e)=>setFwdClosePrev(e.target.checked)} />
              <label htmlFor="closePrev" className="text-sm">إغلاق التوزيع السابق تلقائيًا</label>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">ملاحظة (اختياري)</label>
            <input className="w-full border rounded-xl p-2" value={fwdNote} onChange={(e)=>setFwdNote(e.target.value)} placeholder="..." />
          </div>
          <div>
            <button disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2">
              {busy ? "..." : "تنفيذ الإحالة"}
            </button>
          </div>
        </form>
      )}

      {tab==="assign" && (
        <form onSubmit={submitAssign} className="bg-white border rounded-2xl shadow-sm p-4 space-y-3">
          <div className="text-sm text-gray-600 mb-1">
            تعيين مكلّف للتوزيع المختار أعلاه.
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500">الإدارة</label>
              <select className="w-full border rounded-xl p-2 bg-white"
                value={assignDept}
                onChange={(e)=>setAssignDept(e.target.value)}>
                <option value="">اختر قسمًا</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">المكلّف</label>
              <select className="w-full border rounded-xl p-2 bg-white"
                value={assignUser}
                onChange={(e)=>setAssignUser(e.target.value)}
                disabled={!assignDept || assignUsersLoading}>
                <option value="">{assignUsersLoading ? "جاري التحميل..." : "اختر مستخدمًا"}</option>
                {assignUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">ملاحظة</label>
              <input className="w-full border rounded-xl p-2" value={assignNote} onChange={(e)=>setAssignNote(e.target.value)} placeholder="اختياري" />
            </div>
          </div>
          <div>
            <button disabled={busy || !selectedDistId} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 disabled:opacity-50">
              {busy ? "..." : "تطبيق التعيين"}
            </button>
          </div>
        </form>
      )}

      {tab==="files" && (
        <section className="bg-white border rounded-2xl shadow-sm p-4">
          <div className="overflow-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-right">اسم الملف</th>
                  <th className="p-2 text-right">الحجم</th>
                  <th className="p-2 text-right">نسخة</th>
                  <th className="p-2 text-right">تاريخ الرفع</th>
                  <th className="p-2 text-right">عرض</th>
                </tr>
              </thead>
              <tbody>
                {details.files?.length ? details.files.map(f => (
                  <tr key={f.id} className="border-t">
                    <td className="p-2">{f.fileNameOriginal}</td>
                    <td className="p-2">{(f.fileSizeBytes/1024).toFixed(1)} KB</td>
                    <td className="p-2">v{f.versionNumber}</td>
                    <td className="p-2">{fmtDT(f.uploadedAt)}</td>
                    <td className="p-2">
                      <button
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                        onClick={() => openPreview({
                          id: f.id,
                          fileNameOriginal: f.fileNameOriginal,
                          fileUrl: f.fileUrl,
                          fileExtension: f.fileExtension,
                        })}
                      >
                        معاينة
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="p-3 text-center text-gray-500">لا توجد ملفات</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab==="timeline" && (
        <section className="bg-white border rounded-2xl shadow-sm p-4">
          <div className="space-y-3">
            {timeline.length ? timeline.map((t, i) => (
              <div key={i} className="border rounded-xl p-3">
                <div className="text-xs text-gray-500">{fmtDT(t.at)}</div>
                <div className="font-semibold">{t.title}</div>
                {t.by && <div className="text-sm text-gray-600">بواسطة: {t.by}</div>}
                {t.details && <div className="text-sm">{t.details}</div>}
                {t.link && (
                  <div className="mt-1">
                    <a href={t.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">فتح</a>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-sm text-gray-500">لا يوجد سجل زمني</div>
            )}
          </div>
        </section>
      )}

      {/* Preview modal */}
      <FilePreview open={previewOpen} onClose={()=>setPreviewOpen(false)} file={previewFile} />
    </div>
  );
}




// import React, { useEffect, useMemo, useState, Suspense } from 'react';
// import { Link, useParams } from 'react-router-dom';
// import api from '../api/apiClient';
// import type { PreviewFile } from '../components/files/types';
// import IncomingActions from '../components/incoming/IncomingActions';
// import IncomingTimeline from '../components/incoming/IncomingTimeline';

// // تحميل كسول لمودال المعاينة
// const FilePreviewModal = React.lazy(() => import('../components/files/FilePreviewModal'));

// type DocFile = {
//   id: string | number;
//   fileNameOriginal: string;
//   fileSizeBytes?: number;
//   uploadedAt?: string;
//   fileUrl?: string; // سنملؤها من API إن وُجد
// };

// type DistributionRow = {
//   id: string | number;
//   status: string;
//   targetDepartmentName?: string;
//   assignedToUserName?: string | null;
//   lastUpdateAt?: string;
//   notes?: string | null;
// };

// type IncomingDetails = {
//   id: string | number;
//   incomingNumber: string;
//   receivedDate: string;
//   deliveryMethod?: string;
//   urgencyLevel?: string | null;
//   externalPartyName?: string;
//   document?: {
//     id: string | number;
//     title: string;
//     currentStatus?: string;
//     createdAt?: string;
//     owningDepartmentName?: string;
//   } | null;
//   files?: DocFile[];
//   distributions?: DistributionRow[];
// };

// const tryPaths = (id: string | number) => [
//   `/incoming/${id}`,
//   `/incoming/details/${id}`,
//   `/incoming/summary/${id}`,
// ];

// function formatDT(v?: string) {
//   if (!v) return '—';
//   const d = new Date(v);
//   if (isNaN(d.getTime())) return '—';
//   return d.toLocaleString('ar-LY', {
//     year: 'numeric', month: '2-digit', day: '2-digit',
//     hour: '2-digit', minute: '2-digit'
//   });
// }

// function formatBytes(b?: number) {
//   if (!b && b !== 0) return '—';
//   const u = ['B', 'KB', 'MB', 'GB']; let i = 0; let x = b!;
//   while (x >= 1024 && i < u.length - 1) { x /= 1024; i++; }
//   return `${x.toFixed(1)} ${u[i]}`;
// }

// export default function IncomingDetailsPage() {
//   const { id } = useParams<{ id: string }>();
//   const [data, setData] = useState<IncomingDetails | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   // 👇 حالتا المعاينة (اللتان حذفتهما) — عادتا الآن بشكل آمن
//   const [previewOpen, setPreviewOpen] = useState(false);
//   const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       setLoading(true); setErr(null);
//       const candidates = tryPaths(id!);
//       for (const path of candidates) {
//         try {
//           const res = await api.get<IncomingDetails>(path);
//           if (mounted) { setData(res.data); setLoading(false); }
//           return;
//         } catch {
//           // جرّب التالي
//         }
//       }
//       if (mounted) {
//         setErr('لم يتم العثور على تفاصيل هذا الوارد.');
//         setLoading(false);
//       }
//     })();
//     return () => { mounted = false; };
//   }, [id]);

//   const hasFiles = useMemo(() => (data?.files?.length ?? 0) > 0, [data]);

//   const onOpenPreview = (f: DocFile) => {
//     const pf: PreviewFile = {
//       id: f.id,
//       fileNameOriginal: f.fileNameOriginal,
//       fileSizeBytes: f.fileSizeBytes,
//       uploadedAt: f.uploadedAt,
//       fileUrl: f.fileUrl, // لو API يرجع /files/<relative>
//     };
//     setPreviewFile(pf);
//     setPreviewOpen(true);
//   };

//   return (
//     <div className="space-y-6" dir="rtl">
//       <header className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">تفاصيل الوارد</h1>
//           <p className="text-sm text-gray-500 mt-1">عرض كل المعلومات المتعلقة بالمعاملة الواردة</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <Link to="/incoming" className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">رجوع للوارد</Link>
//         </div>
//       </header>

//       {loading && <div className="text-sm text-gray-500">جاري التحميل…</div>}
//       {err && <div className="text-sm text-red-600">{err}</div>}

//       {!loading && !err && data && (
//         <>
//           {/* معلومات أساسية */}
//           <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div>
//                 <div className="text-xs text-gray-500">رقم الوارد</div>
//                 <div className="font-mono text-lg">{data.incomingNumber}</div>
//               </div>
//               <div>
//                 <div className="text-xs text-gray-500">التاريخ</div>
//                 <div>{formatDT(data.receivedDate)}</div>
//               </div>
//               <div>
//                 <div className="text-xs text-gray-500">طريقة التسليم</div>
//                 <div>{data.deliveryMethod ?? '—'}</div>
//               </div>
//               <div>
//                 <div className="text-xs text-gray-500">درجة الأهمية</div>
//                 <div>{data.urgencyLevel ?? '—'}</div>
//               </div>
//               <div>
//                 <div className="text-xs text-gray-500">الجهة</div>
//                 <div>{data.externalPartyName ?? '—'}</div>
//               </div>
//               <div>
//                 <div className="text-xs text-gray-500">ملفات مرفقة</div>
//                 <div>{hasFiles ? 'نعم' : 'لا'}</div>
//               </div>
//             </div>
//           </section>

//           {/* الوثيقة */}
//           <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
//             <h2 className="text-lg font-semibold mb-3">الوثيقة</h2>
//             {data.document ? (
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                 <div>
//                   <div className="text-xs text-gray-500">العنوان</div>
//                   <div className="font-semibold">{data.document.title}</div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-gray-500">الحالة</div>
//                   <div>{data.document.currentStatus ?? '—'}</div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-gray-500">القسم المالِك</div>
//                   <div>{data.document.owningDepartmentName ?? '—'}</div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-gray-500">تاريخ الإنشاء</div>
//                   <div>{formatDT(data.document.createdAt)}</div>
//                 </div>
//               </div>
//             ) : (
//               <div className="text-sm text-gray-500">لا توجد معلومات وثيقة.</div>
//             )}
//           </section>

//           {/* الملفات */}
//           <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
//             <h2 className="text-lg font-semibold mb-3">الملفات</h2>
//             {hasFiles ? (
//               <div className="overflow-auto rounded-xl border">
//                 <table className="min-w-full text-sm">
//                   <thead>
//                     <tr className="bg-gray-100">
//                       <th className="text-right p-2">الاسم</th>
//                       <th className="text-right p-2">الحجم</th>
//                       <th className="text-right p-2">تاريخ الرفع</th>
//                       <th className="text-right p-2">إجراءات</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {data.files!.map(f => (
//                       <tr key={String(f.id)} className="border-t">
//                         <td className="p-2">{f.fileNameOriginal}</td>
//                         <td className="p-2">{formatBytes(f.fileSizeBytes)}</td>
//                         <td className="p-2">{formatDT(f.uploadedAt)}</td>
//                         <td className="p-2">
//                           <button
//                             className="rounded-xl border px-3 py-1.5 text-xs hover:bg-gray-50"
//                             onClick={() => onOpenPreview(f)}
//                           >
//                             معاينة
//                           </button>
//                           {f.fileUrl && (
//                             <a
//                               className="ml-2 rounded-xl bg-slate-800 text-white px-3 py-1.5 text-xs"
//                               href={f.fileUrl}
//                               target="_blank"
//                               rel="noreferrer"
//                             >
//                               تنزيل
//                             </a>
//                           )}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             ) : (
//               <div className="text-sm text-gray-500">لا توجد ملفات مرفقة.</div>
//             )}
//           </section>

//           {/* التوزيعات */}
//           <section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">
//             <h2 className="text-lg font-semibold mb-3">التوزيعات</h2>
//             {(data.distributions?.length ?? 0) > 0 ? (
//               <div className="overflow-auto rounded-xl border">
//                 <table className="min-w-full text-sm">
//                   <thead>
//                     <tr className="bg-gray-100">
//                       <th className="text-right p-2">الحالة</th>
//                       <th className="text-right p-2">القسم المستهدف</th>
//                       <th className="text-right p-2">المكلّف</th>
//                       <th className="text-right p-2">آخر تحديث</th>
//                       <th className="text-right p-2">ملاحظات</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {data.distributions!.map(d => (
//                       <tr key={String(d.id)} className="border-t">
//                         <td className="p-2">{d.status}</td>
//                         <td className="p-2">{d.targetDepartmentName ?? '—'}</td>
//                         <td className="p-2">{d.assignedToUserName ?? '—'}</td>
//                         <td className="p-2">{formatDT(d.lastUpdateAt)}</td>
//                         <td className="p-2">{d.notes ?? '—'}</td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             ) : (
//               <div className="text-sm text-gray-500">لا توجد توزيعات.</div>
//             )}
//           </section>
//           {/*<section className="bg-white rounded-2xl border shadow-sm p-4 md:p-5">*/}
//             <IncomingActions
//               incomingId={id!}
//               onDone={() => {
//                 // أعد تحميل التفاصيل والتوزيعات إن أردت (يعتمد على كودك الحالي)
//                 // مثال سريع:
//                 // loadDetailsAgain();
//                 window.location.reload(); // أبسط حل مؤقت
//               }}
//             />
//             <IncomingTimeline incomingId={id!} />
//           {/*</section>*/}
//         </>
//       )}

//       {/* مودال المعاينة (تحميل كسول + حارس) */}
//       <Suspense fallback={null}>
//         <FilePreviewModal
//           open={previewOpen}
//           file={previewFile}
//           onClose={() => setPreviewOpen(false)}
//         />
//       </Suspense>
//     </div>
//   );
// }


