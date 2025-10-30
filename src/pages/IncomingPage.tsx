import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "../stores/authStore";
import { Link } from "react-router-dom";
import apiClient from "../apiClient"; // ✨ 1. استيراد العميل المركزي

// --- الأنواع (Types) ---
type IncomingItem = {
  id: string;
  incomingNumber: string;
  receivedDate: string;
  deliveryMethod: string;
  urgencyLevel: string | null;
  requiredAction: string | null;
  externalParty: { name: string | null };
  targetDepartment?: { id: number | null; name: string | null } | null;
  owningDepartment?: { id: number; name: string } | null;
  subject?: string | null;
  documentId: string | null;
  hasFiles: boolean;
};

type Department = {
  id: number;
  name: string;
  status: string;
};

type User = {
  id: number;
  fullName: string;
  department: { id: number; name: string } | null;
  roles: string[];
};

function formatDate(d?: string | Date | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("ar-LY", { hour12: true });
}

function IncomingPage() {
  const token = useAuthStore((state) => state.token);
  const currentUserDeptId = useAuthStore((state) => state.user?.department?.id ?? null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [tab, setTab] = useState<"all" | "dept">("all");
  const [items, setItems] = useState<IncomingItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [externalPartyName, setExternalPartyName] = useState("");
  const [externalPartyType, setExternalPartyType] = useState("جهة خارجية");
  const [deliveryMethod, setDeliveryMethod] = useState("Hand");
  const [urgencyLevel, setUrgencyLevel] = useState("Normal");
  const [requiredAction, setRequiredAction] = useState("للعلم");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msgError, setMsgError] = useState("");
  const [msgInfo, setMsgInfo] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadInfo, setUploadInfo] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadingList(false);
      return;
    }
    const loadPageData = async () => {
      setLoadingList(true);
      await Promise.all([
        (async () => {
          try {
            // ✨ 2. استخدام apiClient.get
            const res = await apiClient.get("/departments");
            const active = res.data.filter((d: any) => d.status === "Active");
            setDepartments(active);
            if (active.length > 0 && departmentId === null) {
              setDepartmentId(active[0].id);
            }
          } catch (err) {
            console.error("loadDepartments error:", err);
          }
        })(),
        (async () => {
          let url = "/incoming";
          if (tab === "dept") {
            if (!currentUserDeptId) {
              setItems([]);
              return;
            }
            url = "/incoming/my-dept";
          }
          try {
            // ✨ 2. استخدام apiClient.get
            const res = await apiClient.get(url);
            setItems(res.data || []);
          } catch (err) {
            console.error(`Failed to load incoming for tab: ${tab}`, err);
            setItems([]);
          }
        })(),
      ]);
      setLoadingList(false);
    };
    loadPageData();
  }, [token, tab, currentUserDeptId, departmentId]);

  const refreshList = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    let url = "/incoming";
    if (tab === "dept" && currentUserDeptId) {
      url = "/incoming/my-dept";
    } else if (tab === "dept") {
      setItems([]); setLoadingList(false); return;
    }
    try {
      // ✨ 2. استخدام apiClient.get
      const res = await apiClient.get(url);
      setItems(res.data || []);
    } catch (e) { setItems([]); } finally { setLoadingList(false); }
  }, [token, tab, currentUserDeptId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsgError("");
    setMsgInfo("");
    if (!externalPartyName.trim() || externalPartyName.trim().length < 2) {
      setMsgError("يرجى إدخال اسم الجهة المرسلة (حرفين على الأقل).");
      return;
    }
    if (!summary.trim() || summary.trim().length < 3) {
      setMsgError("يرجى إدخال ملخص أو عنوان للخطاب (3 أحرف على الأقل).");
      return;
    }
    if (!requiredAction.trim() || requiredAction.trim().length < 3) {
      setMsgError("يرجى إدخال الإجراء المطلوب (3 أحرف على الأقل).");
      return;
    }
    if (!departmentId) {
      setMsgError("يرجى اختيار الإدارة المستهدفة.");
      return;
    }
    setSubmitting(true);
    try {
      // ✨ 3. استخدام apiClient.post
      const res = await apiClient.post("/incoming", {
        externalPartyName, externalPartyType, deliveryMethod,
        urgencyLevel, requiredAction, summary, departmentId,
      });
      const created = res.data;
      setExternalPartyName("");
      setExternalPartyType("جهة خارجية");
      setSummary("");
      setMsgInfo("تم تسجيل الكتاب الوارد بنجاح ✅");
      await refreshList();
      if (created?.document?.id) {
        openUploadModalForDoc(created.document.id);
      }
    } catch (err: any) {
      console.error(err);
      // axios يضع أخطاء الخادم في err.response.data
      const errorMsg = err.response?.data?.message || err.message || "خطأ في الاتصال بالخادم";
      setMsgError(Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  function openUploadModalForDoc(docId: string) {
    setUploadError("");
    setUploadInfo("");
    setSelectedFile(null);
    setSelectedDocId(docId);
    setShowUploadModal(true);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDocId || !selectedFile) {
      setUploadError("بيانات غير مكتملة للرفع.");
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadInfo("");
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      // ✨ 4. استخدام apiClient.post لرفع الملفات
      // ملاحظة: axios يضبط Content-Type لـ multipart/form-data تلقائياً
      const res = await apiClient.post(`/files/upload/${selectedDocId}`, formData);
      await res.data;
      setUploadInfo("تم رفع الملف وربطه بالمعاملة ✅");
      await refreshList();
    } catch (err) {
      console.error(err);
      setUploadError("خطأ في الاتصال بالخادم أثناء الرفع");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-800 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div className="text-right">
            <h1 className="text-2xl font-semibold text-slate-800">الوارد</h1>
            <p className="text-sm text-slate-500">
              تسجيل كتاب وارد جديد وعرض آخر المعاملات الواردة
            </p>
          </div>
          <div className="flex flex-col gap-2 text-left">
            <Link to="/dashboard" className="text-xs bg-slate-500 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600">
              ← لوحة التحكم
            </Link>
            <Link to="/departments" className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800">
              ← إدارات المؤسسة
            </Link>
          </div>
        </div>

        {msgError && <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg text-right">{msgError}</div>}
        {msgInfo && <div className="bg-green-100 text-green-700 text-sm p-3 rounded-lg text-right flex items-start gap-2"><span>✅</span><span>{msgInfo}</span></div>}
        
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow p-4 text-right space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الجهة المرسلة</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={externalPartyName} onChange={(e) => setExternalPartyName(e.target.value)} placeholder="مثال: وزارة المالية" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نوع الجهة</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={externalPartyType} onChange={(e) => setExternalPartyType(e.target.value)} placeholder="وزارة / شركة / سفارة ..." />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">طريقة الاستلام</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)}>
                <option value="Hand">تسليم باليد</option>
                <option value="OfficialEmail">بريد رسمي</option>
                <option value="Courier">مندوب</option>
                <option value="Fax">فاكس رسمي</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">درجة الأهمية</label>
              <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={urgencyLevel} onChange={(e) => setUrgencyLevel(e.target.value)}>
                <option value="Normal">عادي</option>
                <option value="Urgent">عاجل ⚠️</option>
                <option value="VeryUrgent">عاجل جدًا 🔥</option>
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الإجراء المطلوب</label>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={requiredAction} onChange={(e) => setRequiredAction(e.target.value)} placeholder="للعلم / للرد / للدراسة القانونية ..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الإدارة المستهدفة</label>
              {departments.length === 0 && !loadingList ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">لا توجد إدارات نشطة متاحة حاليًا</div>
              ) : (
                <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={departmentId ?? ""} onChange={(e) => setDepartmentId(Number(e.target.value))}>
                  {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ملخص / عنوان الخطاب</label>
            <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="مثال: طلب تزويد بتقارير الربع المالي الأخير..." />
          </div>
          <div>
            <button type="submit" disabled={submitting} className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? "جاري التسجيل..." : "تسجيل الوارد"}
            </button>
          </div>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl shadow p-4 text-right">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-slate-700">آخر المعاملات الواردة</h2>
            <div className="flex items-center gap-2 text-xs">
              <button onClick={() => setTab("all")} className={`px-3 py-1.5 rounded-lg border text-xs ${tab === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"}`}>
                كل الوارد
              </button>
              {currentUserDeptId != null && (
                <button onClick={() => setTab("dept")} className={`px-3 py-1.5 rounded-lg border text-xs ${tab === "dept" ? "bg-slate-800 text-white border-slate-800" : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"}`}>
                  وارد إدارتنا
                </button>
              )}
            </div>
            {loadingList && <span className="text-[11px] text-slate-500">...جاري التحديث</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-600 border-b border-slate-200">
                <tr className="text-right">
                  <th className="py-2 px-3">الرقم الوارد</th>
                  <th className="py-2 px-3">الجهة المرسلة</th>
                  <th className="py-2 px-3">{tab === "dept" ? "المكلف / ملاحظات" : "الإدارة الموجه لها"}</th>
                  <th className="py-2 px-3">الموضوع</th>
                  <th className="py-2 px-3">الأهمية</th>
                  <th className="py-2 px-3">تاريخ الاستلام</th>
                  <th className="py-2 px-3">المرفق</th>
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  <tr><td colSpan={7} className="text-center text-slate-500 py-6 text-sm">...جاري تحميل البيانات</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-500 py-6 text-sm">
                      {tab === "dept" ? (currentUserDeptId == null ? "حسابك غير مرتبط بإدارة محددة." : "لا توجد معاملات واردة مسندة لإدارتك.") : "لا توجد معاملات واردة بعد."}
                    </td>
                  </tr>
                ) : (
                  items.map((rec) => (
                    <tr key={rec.id} className="border-b border-slate-100 last:border-none">
                      <td className="py-2 px-3 font-mono text-xs text-blue-700 underline"><Link to={`/incoming/${rec.id}`}>{rec.incomingNumber}</Link></td>
                      <td className="py-2 px-3">{rec.externalParty?.name || "—"}</td>
                      <td className="py-2 px-3 text-slate-700">{rec.targetDepartment?.name || rec.owningDepartment?.name || "—"}</td>
                      <td className="py-2 px-3">{rec.subject || "—"}</td>
                      <td className="py-2 px-3">{rec.urgencyLevel === "VeryUrgent" ? "عاجل جدًا 🔥" : rec.urgencyLevel === "Urgent" ? "عاجل ⚠️" : "عادي"}</td>
                      <td className="py-2 px-3">{formatDate(rec.receivedDate)}</td>
                      <td className="py-2 px-3">
                        {rec.hasFiles ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-200 text-xs font-medium px-2 py-1 rounded"><span>📎</span><span>مرفق</span></span>
                        ) : rec.documentId ? (
                          <button className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900" onClick={() => openUploadModalForDoc(rec.documentId as string)}>إرفاق</button>
                        ) : ("—")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showUploadModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 text-right space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">إرفاق ملف للمعاملة</h3>
                  <p className="text-xs text-slate-500">يمكن رفع PDF أو صورة مسح ضوئي.</p>
                </div>
                <button className="text-slate-400 hover:text-slate-600 text-lg leading-none" onClick={() => { setShowUploadModal(false); }}>×</button>
              </div>
              {uploadError && <div className="bg-red-100 text-red-700 text-xs p-2 rounded-lg">{uploadError}</div>}
              {uploadInfo && <div className="bg-green-100 text-green-700 text-xs p-2 rounded-lg">{uploadInfo}</div>}
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">اختر ملف</label>
                  <input type="file" className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-800 file:text-white hover:file:bg-slate-900" onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); }} />
                </div>
                <div className="flex items-center justify-between">
                  <button type="submit" disabled={uploading} className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploading ? "جاري الرفع..." : "رفع المرفق"}
                  </button>
                  <button type="button" className="text-xs text-slate-600 hover:text-slate-800" onClick={() => { setShowUploadModal(false); }}>
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default IncomingPage;







// import { useEffect, useState, useCallback } from "react";
// import { useAuthStore } from "../stores/authStore";
// import { Link } from "react-router-dom";


// // --- الأنواع (Types) ---
// type IncomingItem = {
//   id: string;
//   incomingNumber: string;
//   receivedDate: string;
//   deliveryMethod: string;
//   urgencyLevel: string | null;
//   requiredAction: string | null;
//   externalParty: { name: string | null };
//   targetDepartment?: { id: number | null; name: string | null } | null;
//   owningDepartment?: { id: number; name: string } | null;
//   subject?: string | null;
//   documentId: string | null;
//   hasFiles: boolean;
// };

// type Department = {
//   id: number;
//   name: string;
//   status: string;
// };

// type User = {
//   id: number;
//   fullName: string;
//   department: { id: number; name: string } | null;
//   roles: string[];
// };

// function formatDate(d?: string | Date | null) {
//   if (!d) return "—";
//   const dt = new Date(d);
//   if (Number.isNaN(dt.getTime())) return "—";
//   return dt.toLocaleString("ar-LY", { hour12: true });
// }

// function IncomingPage() {
//   const token = useAuthStore((state) => state.token);
//   const currentUserDeptId = useAuthStore((state) => state.user?.department?.id ?? null);

//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [tab, setTab] = useState<"all" | "dept">("all");
//   const [items, setItems] = useState<IncomingItem[]>([]);
//   const [loadingList, setLoadingList] = useState(true);
//   const [departmentId, setDepartmentId] = useState<number | null>(null);
//   const [externalPartyName, setExternalPartyName] = useState("");
//   const [externalPartyType, setExternalPartyType] = useState("جهة خارجية");
//   const [deliveryMethod, setDeliveryMethod] = useState("Hand");
//   const [urgencyLevel, setUrgencyLevel] = useState("Normal");
//   const [requiredAction, setRequiredAction] = useState("للعلم");
//   const [summary, setSummary] = useState("");
//   const [submitting, setSubmitting] = useState(false);
//   const [msgError, setMsgError] = useState("");
//   const [msgInfo, setMsgInfo] = useState("");
//   const [showUploadModal, setShowUploadModal] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [uploadError, setUploadError] = useState("");
//   const [uploadInfo, setUploadInfo] = useState("");
//   const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);

//   useEffect(() => {
//     if (!token) {
//       setLoadingList(false);
//       return;
//     }
//     const loadPageData = async () => {
//       setLoadingList(true);
//       await Promise.all([
//         (async () => {
//           try {
//             const res = await fetch("http://localhost:3000/departments", {
//               headers: { Authorization: `Bearer ${token}` },
//             });
//             if (!res.ok) throw new Error("Failed to fetch departments");
//             const data = await res.json();
//             const active = data.filter((d: any) => d.status === "Active");
//             setDepartments(active);
//             if (active.length > 0 && departmentId === null) {
//               setDepartmentId(active[0].id);
//             }
//           } catch (err) {
//             console.error("loadDepartments error:", err);
//           }
//         })(),
//         (async () => {
//           let url = "http://localhost:3000/incoming";
//           if (tab === "dept") {
//             if (!currentUserDeptId) {
//               setItems([]);
//               return;
//             }
//             url = "http://localhost:3000/incoming/my-dept";
//           }
//           try {
//             const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//             setItems(res.ok ? await res.json() : []);
//           } catch (err) {
//             console.error(`Failed to load incoming for tab: ${tab}`, err);
//             setItems([]);
//           }
//         })(),
//       ]);
//       setLoadingList(false);
//     };
//     loadPageData();
//   }, [token, tab, currentUserDeptId, departmentId]);

//   const refreshList = useCallback(async () => {
//     if (!token) return;
//     setLoadingList(true);
//     let url = "http://localhost:3000/incoming";
//     if (tab === "dept" && currentUserDeptId) {
//       url = "http://localhost:3000/incoming/my-dept";
//     } else if (tab === "dept") {
//       setItems([]); setLoadingList(false); return;
//     }
//     try {
//       const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
//       setItems(res.ok ? await res.json() : []);
//     } catch (e) { setItems([]); } finally { setLoadingList(false); }
//   }, [token, tab, currentUserDeptId]);

//   // ✨ --- تعديل دالة الإرسال --- ✨
//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setMsgError("");
//     setMsgInfo("");

//     // 1. ✅ إعادة التحقق من المدخلات في الواجهة الأمامية
//     if (!externalPartyName.trim()) {
//       setMsgError("يرجى إدخال اسم الجهة المرسلة.");
//       return;
//     }
//     if (!summary.trim()) {
//       setMsgError("يرجى إدخال ملخص أو عنوان للخطاب.");
//       return;
//     }
//     if (!departmentId) {
//       setMsgError("يرجى اختيار الإدارة المستهدفة.");
//       return;
//     }
//     if (!token) {
//       setMsgError("انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.");
//       return;
//     }

//     setSubmitting(true);
//     try {
//       const res = await fetch("http://localhost:3000/incoming", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
//         body: JSON.stringify({
//           externalPartyName, externalPartyType, deliveryMethod,
//           urgencyLevel, requiredAction, summary, departmentId,
//         }),
//       });

//       // 2. ✅ تحسين معالجة أخطاء الخادم
//       if (!res.ok) {
//         const errorData = await res.json().catch(() => null);
//         if (errorData && Array.isArray(errorData.message)) {
//           // عرض رسائل التحقق من الصحة القادمة من NestJS
//           throw new Error(errorData.message.join(", "));
//         }
//         throw new Error(`تعذر تسجيل الوارد. رمز الحالة: ${res.status}`);
//       }

//       const created = await res.json();
//       setExternalPartyName("");
//       setExternalPartyType("جهة خارجية");
//       setSummary("");
//       setMsgInfo("تم تسجيل الكتاب الوارد بنجاح ✅");
//       await refreshList();
//       if (created?.document?.id) {
//         openUploadModalForDoc(created.document.id);
//       }
//     } catch (err: any) {
//       console.error(err);
//       setMsgError(err.message || "خطأ في الاتصال بالخادم أثناء تسجيل الوارد");
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   function openUploadModalForDoc(docId: string) {
//     setUploadError("");
//     setUploadInfo("");
//     setSelectedFile(null);
//     setSelectedDocId(docId);
//     setShowUploadModal(true);
//   }

//   async function handleUpload(e: React.FormEvent) {
//     e.preventDefault();
//     if (!token || !selectedDocId || !selectedFile) {
//       setUploadError("بيانات غير مكتملة للرفع.");
//       return;
//     }
//     setUploading(true);
//     setUploadError("");
//     setUploadInfo("");
//     const formData = new FormData();
//     formData.append("file", selectedFile);
//     try {
//       const res = await fetch(`http://localhost:3000/files/upload/${selectedDocId}`, {
//         method: "POST",
//         headers: { Authorization: `Bearer ${token}` },
//         body: formData,
//       });
//       if (!res.ok) throw new Error("فشل رفع الملف");
//       await res.json();
//       setUploadInfo("تم رفع الملف وربطه بالمعاملة ✅");
//       await refreshList();
//     } catch (err) {
//       console.error(err);
//       setUploadError("خطأ في الاتصال بالخادم أثناء الرفع");
//     } finally {
//       setUploading(false);
//     }
//   }

//   return (
//     <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-800 p-6">
//       <div className="max-w-5xl mx-auto space-y-6">
//         <div className="flex items-start justify-between">
//           <div className="text-right">
//             <h1 className="text-2xl font-semibold text-slate-800">الوارد</h1>
//             <p className="text-sm text-slate-500">
//               تسجيل كتاب وارد جديد وعرض آخر المعاملات الواردة
//             </p>
//           </div>
//           <div className="flex flex-col gap-2 text-left">
//             <Link to="/dashboard" className="text-xs bg-slate-500 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600">
//               ← لوحة التحكم
//             </Link>
//             <Link to="/departments" className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800">
//               ← إدارات المؤسسة
//             </Link>
//           </div>
//         </div>

//         {msgError && <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg text-right">{msgError}</div>}
//         {msgInfo && <div className="bg-green-100 text-green-700 text-sm p-3 rounded-lg text-right flex items-start gap-2"><span>✅</span><span>{msgInfo}</span></div>}
        
//         <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl shadow p-4 text-right space-y-4">
//           <div className="grid md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">الجهة المرسلة</label>
//               <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={externalPartyName} onChange={(e) => setExternalPartyName(e.target.value)} placeholder="مثال: وزارة المالية" />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">نوع الجهة</label>
//               <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={externalPartyType} onChange={(e) => setExternalPartyType(e.target.value)} placeholder="وزارة / شركة / سفارة ..." />
//             </div>
//           </div>
//           <div className="grid md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">طريقة الاستلام</label>
//               <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={deliveryMethod} onChange={(e) => setDeliveryMethod(e.target.value)}>
//                 <option value="Hand">تسليم باليد</option>
//                 <option value="OfficialEmail">بريد رسمي</option>
//                 <option value="Courier">مندوب</option>
//                 <option value="Fax">فاكس رسمي</option>
//               </select>
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">درجة الأهمية</label>
//               <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={urgencyLevel} onChange={(e) => setUrgencyLevel(e.target.value)}>
//                 <option value="Normal">عادي</option>
//                 <option value="Urgent">عاجل ⚠️</option>
//                 <option value="VeryUrgent">عاجل جدًا 🔥</option>
//               </select>
//             </div>
//           </div>
//           <div className="grid md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">الإجراء المطلوب</label>
//               <input className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={requiredAction} onChange={(e) => setRequiredAction(e.target.value)} placeholder="للعلم / للرد / للدراسة القانونية ..." />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">الإدارة المستهدفة</label>
//               {departments.length === 0 && !loadingList ? (
//                 <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">لا توجد إدارات نشطة متاحة حاليًا</div>
//               ) : (
//                 <select className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={departmentId ?? ""} onChange={(e) => setDepartmentId(Number(e.target.value))}>
//                   {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
//                 </select>
//               )}
//             </div>
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-slate-700 mb-1">ملخص / عنوان الخطاب</label>
//             <textarea className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="مثال: طلب تزويد بتقارير الربع المالي الأخير..." />
//           </div>
//           <div>
//             <button type="submit" disabled={submitting} className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
//               {submitting ? "جاري التسجيل..." : "تسجيل الوارد"}
//             </button>
//           </div>
//         </form>

//         <div className="bg-white border border-slate-200 rounded-xl shadow p-4 text-right">
//           <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
//             <h2 className="text-base font-semibold text-slate-700">آخر المعاملات الواردة</h2>
//             <div className="flex items-center gap-2 text-xs">
//               <button onClick={() => setTab("all")} className={`px-3 py-1.5 rounded-lg border text-xs ${tab === "all" ? "bg-slate-800 text-white border-slate-800" : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"}`}>
//                 كل الوارد
//               </button>
//               {currentUserDeptId != null && (
//                 <button onClick={() => setTab("dept")} className={`px-3 py-1.5 rounded-lg border text-xs ${tab === "dept" ? "bg-slate-800 text-white border-slate-800" : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"}`}>
//                   وارد إدارتنا
//                 </button>
//               )}
//             </div>
//             {loadingList && <span className="text-[11px] text-slate-500">...جاري التحديث</span>}
//           </div>
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead className="text-slate-600 border-b border-slate-200">
//                 <tr className="text-right">
//                   <th className="py-2 px-3">الرقم الوارد</th>
//                   <th className="py-2 px-3">الجهة المرسلة</th>
//                   <th className="py-2 px-3">{tab === "dept" ? "المكلف / ملاحظات" : "الإدارة الموجه لها"}</th>
//                   <th className="py-2 px-3">الموضوع</th>
//                   <th className="py-2 px-3">الأهمية</th>
//                   <th className="py-2 px-3">تاريخ الاستلام</th>
//                   <th className="py-2 px-3">المرفق</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {loadingList ? (
//                   <tr><td colSpan={7} className="text-center text-slate-500 py-6 text-sm">...جاري تحميل البيانات</td></tr>
//                 ) : items.length === 0 ? (
//                   <tr>
//                     <td colSpan={7} className="text-center text-slate-500 py-6 text-sm">
//                       {tab === "dept" ? (currentUserDeptId == null ? "حسابك غير مرتبط بإدارة محددة." : "لا توجد معاملات واردة مسندة لإدارتك.") : "لا توجد معاملات واردة بعد."}
//                     </td>
//                   </tr>
//                 ) : (
//                   items.map((rec) => (
//                     <tr key={rec.id} className="border-b border-slate-100 last:border-none">
//                       <td className="py-2 px-3 font-mono text-xs text-blue-700 underline"><Link to={`/incoming/${rec.id}`}>{rec.incomingNumber}</Link></td>
//                       <td className="py-2 px-3">{rec.externalParty?.name || "—"}</td>
//                       <td className="py-2 px-3 text-slate-700">{rec.targetDepartment?.name || rec.owningDepartment?.name || "—"}</td>
//                       <td className="py-2 px-3">{rec.subject || "—"}</td>
//                       <td className="py-2 px-3">{rec.urgencyLevel === "VeryUrgent" ? "عاجل جدًا 🔥" : rec.urgencyLevel === "Urgent" ? "عاجل ⚠️" : "عادي"}</td>
//                       <td className="py-2 px-3">{formatDate(rec.receivedDate)}</td>
//                       <td className="py-2 px-3">
//                         {rec.hasFiles ? (
//                           <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-200 text-xs font-medium px-2 py-1 rounded"><span>📎</span><span>مرفق</span></span>
//                         ) : rec.documentId ? (
//                           <button className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900" onClick={() => openUploadModalForDoc(rec.documentId as string)}>إرفاق</button>
//                         ) : ("—")}
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {showUploadModal && (
//           <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//             <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 text-right space-y-4">
//               <div className="flex items-start justify-between">
//                 <div>
//                   <h3 className="text-lg font-semibold text-slate-800">إرفاق ملف للمعاملة</h3>
//                   <p className="text-xs text-slate-500">يمكن رفع PDF أو صورة مسح ضوئي.</p>
//                 </div>
//                 <button className="text-slate-400 hover:text-slate-600 text-lg leading-none" onClick={() => { setShowUploadModal(false); }}>×</button>
//               </div>
//               {uploadError && <div className="bg-red-100 text-red-700 text-xs p-2 rounded-lg">{uploadError}</div>}
//               {uploadInfo && <div className="bg-green-100 text-green-700 text-xs p-2 rounded-lg">{uploadInfo}</div>}
//               <form onSubmit={handleUpload} className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-slate-700 mb-1">اختر ملف</label>
//                   <input type="file" className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-800 file:text-white hover:file:bg-slate-900" onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); }} />
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <button type="submit" disabled={uploading} className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
//                     {uploading ? "جاري الرفع..." : "رفع المرفق"}
//                   </button>
//                   <button type="button" className="text-xs text-slate-600 hover:text-slate-800" onClick={() => { setShowUploadModal(false); }}>
//                     إلغاء
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default IncomingPage;




// // src/pages/IncomingPage.tsx

// import { useEffect, useState } from "react";
// import { useAuthStore } from "../stores/authStore";
// import { Link } from "react-router-dom";

// // --- الأنواع (Types) ---
// type IncomingItem = {
//   id: string;
//   incomingNumber: string;
//   receivedDate: string;
//   deliveryMethod: string;
//   urgencyLevel: string | null;
//   requiredAction: string | null;
//   externalParty: { name: string | null };
//   targetDepartment?: { id: number | null; name: string | null } | null;
//   owningDepartment?: { id: number; name: string } | null;
//   subject?: string | null;
//   documentId: string | null;
//   hasFiles: boolean;
// };

// type Department = {
//   id: number;
//   name: string;
//   status: string;
// };

// type User = {
//   id: number;
//   fullName: string;
//   department: { id: number; name: string } | null;
//   roles: string[];
// };

// // تنسيق التاريخ للعرض
// function formatDate(d?: string | Date | null) {
//   if (!d) return "—";
//   const dt = new Date(d);
//   if (Number.isNaN(dt.getTime())) return "—";
//   return dt.toLocaleString("ar-LY", { hour12: true });
// }

// function IncomingPage() {
//   // ✅ قراءة الحالة من Zustand بدون إنشاء object جديد كل رندر
//   const token = useAuthStore((state) => state.token);
//   const currentUser = useAuthStore((state) => state.user);

//   // بديل أكثر استقراراً لاستخدام الكائن كامل داخل useEffect deps
//   const currentUserDeptId = useAuthStore(
//     (state) => state.user?.department?.id ?? null
//   );

//   // --- حالة المكون الداخلية ---
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [tab, setTab] = useState<"all" | "dept">("all");
//   const [items, setItems] = useState<IncomingItem[]>([]);
//   const [loadingList, setLoadingList] = useState(true);

//   // حقول إنشاء وارد جديد
//   const [externalPartyName, setExternalPartyName] = useState("");
//   const [externalPartyType, setExternalPartyType] = useState("جهة خارجية");
//   const [deliveryMethod, setDeliveryMethod] = useState("Hand");
//   const [urgencyLevel, setUrgencyLevel] = useState("Normal");
//   const [requiredAction, setRequiredAction] = useState("للعلم");
//   const [summary, setSummary] = useState("");
//   const [departmentId, setDepartmentId] = useState<number | null>(null);

//   // رسائل حالة الإرسال
//   const [submitting, setSubmitting] = useState(false);
//   const [msgError, setMsgError] = useState("");
//   const [msgInfo, setMsgInfo] = useState("");

//   // رفع مرفقات
//   const [showUploadModal, setShowUploadModal] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [uploadError, setUploadError] = useState("");
//   const [uploadInfo, setUploadInfo] = useState("");
//   const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
//   const [selectedFile, setSelectedFile] = useState<File | null>(null);

//   // =========================
//   // 🌀 تحميل البيانات (الإدارات + قائمة الوارد)
//   // =========================
//   useEffect(() => {
//     // إذا ما فيش توكن (المستخدم مش مسجل دخول)، ما نحاولش نجيب بيانات
//     if (!token) {
//       setLoadingList(false);
//       return;
//     }

//     // تحميل الإدارات المتاحة
//     const loadDepartments = async () => {
//       try {
//         const res = await fetch("http://localhost:3000/departments", {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (!res.ok) throw new Error("Failed to fetch departments");

//         const data = await res.json();

//         // ناخذ الإدارات الفعّالة فقط
//         const active = data.filter((d: any) => d.status === "Active");

//         setDepartments(active);

//         // لو مازلنا ما حددناش إدارة مستهدفة، نحدد أول إدارة نشطة كقيمة افتراضية
//         if (active.length > 0 && departmentId === null) {
//           setDepartmentId(active[0].id);
//         }
//       } catch (err) {
//         console.error("loadDepartments error:", err);
//       }
//     };

//     // تحميل قائمة الوارد حسب الـ tab (كل الوارد / وارد إدارتنا)
//     const loadIncomingList = async () => {
//       setLoadingList(true);

//       let url = "http://localhost:3000/incoming"; // افتراضي: "all"

//       if (tab === "dept") {
//         // لو التبويب "وارد إدارتنا" لازم نتاكد فيه إدارة للمستخدم
//         if (!currentUserDeptId) {
//           setItems([]);
//           setLoadingList(false);
//           return;
//         }
//         url = "http://localhost:3000/incoming/my-dept";
//       }

//       try {
//         const res = await fetch(url, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         const data = res.ok ? await res.json() : [];
//         setItems(data);
//       } catch (err) {
//         console.error(`Failed to load incoming for tab: ${tab}`, err);
//         setItems([]);
//       } finally {
//         setLoadingList(false);
//       }
//     };

//     loadDepartments();
//     loadIncomingList();
//   }, [
//     token,
//     tab,
//     currentUserDeptId,
//     departmentId, // تتغير مرة واحدة غالباً من null إلى أول إدارة نشطة
//   ]);

//   // =========================
//   // 🔄 دالة مساعدة لإعادة تحميل القائمة يدويًا بعد الإرسال/الرفع
//   // =========================
//   async function refreshListForTab(
//     t: "all" | "dept",
//     userDeptId: number | null,
//     authToken: string | null
//   ) {
//     if (!authToken) return;

//     setLoadingList(true);

//     let url = "http://localhost:3000/incoming";

//     if (t === "dept" && userDeptId) {
//       url = "http://localhost:3000/incoming/my-dept";
//     } else if (t === "dept" && !userDeptId) {
//       // المستخدم مش مربوط بإدارة
//       setItems([]);
//       setLoadingList(false);
//       return;
//     }

//     try {
//       const res = await fetch(url, {
//         headers: { Authorization: `Bearer ${authToken}` },
//       });
//       const data = res.ok ? await res.json() : [];
//       setItems(data);
//     } catch (e) {
//       setItems([]);
//     } finally {
//       setLoadingList(false);
//     }
//   }

//   // =========================
//   // ✉️ تسجيل وارد جديد
//   // =========================
//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();

//     if (!token || !departmentId) {
//       setMsgError(
//         "يرجى التأكد من تسجيل الدخول واختيار الإدارة المستهدفة قبل التسجيل."
//       );
//       return;
//     }

//     setSubmitting(true);
//     setMsgError("");
//     setMsgInfo("");

//     try {
//       const res = await fetch("http://localhost:3000/incoming", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           externalPartyName,
//           externalPartyType,
//           deliveryMethod,
//           urgencyLevel,
//           requiredAction,
//           summary,
//           departmentId,
//         }),
//       });

//       if (!res.ok) {
//         throw new Error("تعذر تسجيل الوارد");
//       }

//       const created = await res.json();

//       // تصفية الحقول بعد الإرسال
//       setExternalPartyName("");
//       setExternalPartyType("جهة خارجية");
//       setSummary("");

//       setMsgInfo("تم تسجيل الكتاب الوارد بنجاح ✅");

//       // حدّث القائمة في الواجهة مباشرة
//       await refreshListForTab(tab, currentUserDeptId, token);

//       // افتح مودال الرفع لو عندنا document.id
//       if (created?.document?.id) {
//         openUploadModalForDoc(created.document.id);
//       }
//     } catch (err) {
//       console.error(err);
//       setMsgError("خطأ في الاتصال بالخادم أثناء تسجيل الوارد");
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   // =========================
//   // 📎 رفع مرفقات
//   // =========================
//   function openUploadModalForDoc(docId: string) {
//     setUploadError("");
//     setUploadInfo("");
//     setSelectedFile(null);
//     setSelectedDocId(docId);
//     setShowUploadModal(true);
//   }

//   async function handleUpload(e: React.FormEvent) {
//     e.preventDefault();

//     if (!token || !selectedDocId || !selectedFile) {
//       setUploadError("بيانات غير مكتملة للرفع.");
//       return;
//     }

//     setUploading(true);
//     setUploadError("");
//     setUploadInfo("");

//     const formData = new FormData();
//     formData.append("file", selectedFile);

//     try {
//       const res = await fetch(
//         `http://localhost:3000/files/upload/${selectedDocId}`,
//         {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//           body: formData,
//         }
//       );

//       if (!res.ok) throw new Error("فشل رفع الملف");

//       await res.json();

//       setUploadInfo("تم رفع الملف وربطه بالمعاملة ✅");

//       // تحديث القائمة بعد الرفع
//       await refreshListForTab(tab, currentUserDeptId, token);
//     } catch (err) {
//       console.error(err);
//       setUploadError("خطأ في الاتصال بالخادم أثناء الرفع");
//     } finally {
//       setUploading(false);
//     }
//   }

//   // =========================
//   // 🖼️ واجهة العرض
//   // =========================
//   return (
//     <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-800 p-6">
//       <div className="max-w-5xl mx-auto space-y-6">
//         {/* رأس الصفحة */}
//         <div className="flex items-start justify-between">
//           <div className="text-right">
//             <h1 className="text-2xl font-semibold text-slate-800">الوارد</h1>
//             <p className="text-sm text-slate-500">
//               تسجيل كتاب وارد جديد وعرض آخر المعاملات الواردة
//             </p>
//           </div>

//           <div className="flex flex-col gap-2 text-left">
//             <Link
//               to="/dashboard"
//               className="text-xs bg-slate-500 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600"
//             >
//               ← لوحة التحكم
//             </Link>
//             <Link
//               to="/departments"
//               className="text-xs bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800"
//             >
//               ← إدارات المؤسسة
//             </Link>
//           </div>
//         </div>

//         {/* رسائل الحالة العامة */}
//         {msgError && (
//           <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg text-right">
//             {msgError}
//           </div>
//         )}

//         {msgInfo && (
//           <div className="bg-green-100 text-green-700 text-sm p-3 rounded-lg text-right flex items-start gap-2">
//             <span>✅</span>
//             <span>{msgInfo}</span>
//           </div>
//         )}

//         {/* نموذج تسجيل وارد جديد */}
//         <form
//           onSubmit={handleSubmit}
//           className="bg-white border border-slate-200 rounded-xl shadow p-4 text-right space-y-4"
//         >
//           <div className="grid md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">
//                 الجهة المرسلة
//               </label>
//               <input
//                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 value={externalPartyName}
//                 onChange={(e) => setExternalPartyName(e.target.value)}
//                 placeholder="مثال: وزارة المالية"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">
//                 نوع الجهة
//               </label>
//               <input
//                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 value={externalPartyType}
//                 onChange={(e) => setExternalPartyType(e.target.value)}
//                 placeholder="وزارة / شركة / سفارة ..."
//               />
//             </div>
//           </div>

//           <div className="grid md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">
//                 طريقة الاستلام
//               </label>
//               <select
//                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 value={deliveryMethod}
//                 onChange={(e) => setDeliveryMethod(e.target.value)}
//               >
//                 <option value="Hand">تسليم باليد</option>
//                 <option value="OfficialEmail">بريد رسمي</option>
//                 <option value="Courier">مندوب</option>
//                 <option value="Fax">فاكس رسمي</option>
//               </select>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">
//                 درجة الأهمية
//               </label>
//               <select
//                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 value={urgencyLevel}
//                 onChange={(e) => setUrgencyLevel(e.target.value)}
//               >
//                 <option value="Normal">عادي</option>
//                 <option value="Urgent">عاجل ⚠️</option>
//                 <option value="VeryUrgent">عاجل جدًا 🔥</option>
//               </select>
//             </div>
//           </div>

//           <div className="grid md:grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">
//                 الإجراء المطلوب
//               </label>
//               <input
//                 className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 value={requiredAction}
//                 onChange={(e) => setRequiredAction(e.target.value)}
//                 placeholder="للعلم / للرد / للدراسة القانونية ..."
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-slate-700 mb-1">
//                 الإدارة المستهدفة
//               </label>

//               {departments.length === 0 && !loadingList ? (
//                 <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
//                   لا توجد إدارات نشطة متاحة حاليًا
//                 </div>
//               ) : (
//                 <select
//                   className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   value={departmentId ?? ""}
//                   onChange={(e) => setDepartmentId(Number(e.target.value))}
//                 >
//                   {departments.map((d) => (
//                     <option key={d.id} value={d.id}>
//                       {d.name}
//                     </option>
//                   ))}
//                 </select>
//               )}
//             </div>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-slate-700 mb-1">
//               ملخص / عنوان الخطاب
//             </label>
//             <textarea
//               className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               rows={2}
//               value={summary}
//               onChange={(e) => setSummary(e.target.value)}
//               placeholder="مثال: طلب تزويد بتقارير الربع المالي الأخير..."
//             />
//           </div>

//           <div>
//             <button
//               type="submit"
//               disabled={submitting}
//               className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {submitting ? "جاري التسجيل..." : "تسجيل الوارد"}
//             </button>
//           </div>
//         </form>

//         {/* قائمة آخر الوارد */}
//         <div className="bg-white border border-slate-200 rounded-xl shadow p-4 text-right">
//           <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
//             <h2 className="text-base font-semibold text-slate-700">
//               آخر المعاملات الواردة
//             </h2>

//             <div className="flex items-center gap-2 text-xs">
//               <button
//                 onClick={() => setTab("all")}
//                 className={`px-3 py-1.5 rounded-lg border text-xs ${
//                   tab === "all"
//                     ? "bg-slate-800 text-white border-slate-800"
//                     : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
//                 }`}
//               >
//                 كل الوارد
//               </button>

//               {currentUserDeptId != null && (
//                 <button
//                   onClick={() => setTab("dept")}
//                   className={`px-3 py-1.5 rounded-lg border text-xs ${
//                     tab === "dept"
//                       ? "bg-slate-800 text-white border-slate-800"
//                       : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
//                   }`}
//                 >
//                   وارد إدارتنا
//                 </button>
//               )}
//             </div>

//             {loadingList && (
//               <span className="text-[11px] text-slate-500">
//                 ...جاري التحديث
//               </span>
//             )}
//           </div>

//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead className="text-slate-600 border-b border-slate-200">
//                 <tr className="text-right">
//                   <th className="py-2 px-3">الرقم الوارد</th>
//                   <th className="py-2 px-3">الجهة المرسلة</th>
//                   <th className="py-2 px-3">
//                     {tab === "dept"
//                       ? "المكلف / ملاحظات"
//                       : "الإدارة الموجه لها"}
//                   </th>
//                   <th className="py-2 px-3">الموضوع</th>
//                   <th className="py-2 px-3">الأهمية</th>
//                   <th className="py-2 px-3">تاريخ الاستلام</th>
//                   <th className="py-2 px-3">المرفق</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {loadingList ? (
//                   <tr>
//                     <td
//                       colSpan={7}
//                       className="text-center text-slate-500 py-6 text-sm"
//                     >
//                       ...جاري تحميل البيانات
//                     </td>
//                   </tr>
//                 ) : items.length === 0 ? (
//                   <tr>
//                     <td
//                       colSpan={7}
//                       className="text-center text-slate-500 py-6 text-sm"
//                     >
//                       {tab === "dept"
//                         ? currentUserDeptId == null
//                           ? "حسابك غير مرتبط بإدارة محددة."
//                           : "لا توجد معاملات واردة مسندة لإدارتك."
//                         : "لا توجد معاملات واردة بعد."}
//                     </td>
//                   </tr>
//                 ) : (
//                   items.map((rec) => (
//                     <tr
//                       key={rec.id}
//                       className="border-b border-slate-100 last:border-none"
//                     >
//                       <td className="py-2 px-3 font-mono text-xs text-blue-700 underline">
//                         <Link to={`/incoming/${rec.id}`}>
//                           {rec.incomingNumber}
//                         </Link>
//                       </td>

//                       <td className="py-2 px-3">
//                         {rec.externalParty?.name || "—"}
//                       </td>

//                       <td className="py-2 px-3 text-slate-700">
//                         {rec.targetDepartment?.name ||
//                           rec.owningDepartment?.name ||
//                           "—"}
//                       </td>

//                       <td className="py-2 px-3">{rec.subject || "—"}</td>

//                       <td className="py-2 px-3">
//                         {rec.urgencyLevel === "VeryUrgent"
//                           ? "عاجل جدًا 🔥"
//                           : rec.urgencyLevel === "Urgent"
//                           ? "عاجل ⚠️"
//                           : "عادي"}
//                       </td>

//                       <td className="py-2 px-3">
//                         {formatDate(rec.receivedDate)}
//                       </td>

//                       <td className="py-2 px-3">
//                         {rec.hasFiles ? (
//                           <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-200 text-xs font-medium px-2 py-1 rounded">
//                             <span>📎</span>
//                             <span>مرفق</span>
//                           </span>
//                         ) : rec.documentId ? (
//                           <button
//                             className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900"
//                             onClick={() =>
//                               openUploadModalForDoc(rec.documentId as string)
//                             }
//                           >
//                             إرفاق
//                           </button>
//                         ) : (
//                           "—"
//                         )}
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* مودال رفع المرفقات */}
//         {showUploadModal && (
//           <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//             <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 text-right space-y-4">
//               <div className="flex items-start justify-between">
//                 <div>
//                   <h3 className="text-lg font-semibold text-slate-800">
//                     إرفاق ملف للمعاملة
//                   </h3>
//                   <p className="text-xs text-slate-500">
//                     يمكن رفع PDF أو صورة مسح ضوئي.
//                   </p>
//                 </div>

//                 <button
//                   className="text-slate-400 hover:text-slate-600 text-lg leading-none"
//                   onClick={() => {
//                     setShowUploadModal(false);
//                   }}
//                 >
//                   ×
//                 </button>
//               </div>

//               {uploadError && (
//                 <div className="bg-red-100 text-red-700 text-xs p-2 rounded-lg">
//                   {uploadError}
//                 </div>
//               )}

//               {uploadInfo && (
//                 <div className="bg-green-100 text-green-700 text-xs p-2 rounded-lg">
//                   {uploadInfo}
//                 </div>
//               )}

//               <form onSubmit={handleUpload} className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-slate-700 mb-1">
//                     اختر ملف
//                   </label>
//                   <input
//                     type="file"
//                     className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-800 file:text-white hover:file:bg-slate-900"
//                     onChange={(e) => {
//                       setSelectedFile(e.target.files?.[0] ?? null);
//                     }}
//                   />
//                 </div>

//                 <div className="flex items-center justify-between">
//                   <button
//                     type="submit"
//                     disabled={uploading}
//                     className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                   >
//                     {uploading ? "جاري الرفع..." : "رفع المرفق"}
//                   </button>

//                   <button
//                     type="button"
//                     className="text-xs text-slate-600 hover:text-slate-800"
//                     onClick={() => {
//                       setShowUploadModal(false);
//                     }}
//                   >
//                     إلغاء
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default IncomingPage;
