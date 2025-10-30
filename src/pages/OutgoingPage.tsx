import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getToken } from "../auth";

type Department = {
  id: number;
  name: string;
  status: string;
  createdAt?: string;
};

// type OutgoingRecordItem = {
//   id: string;
//   outgoingNumber: string;
//   issueDate: string;
//   sendMethod: string;
//   isDelivered: boolean;
//   externalPartyName: string | null;
//   signedBy: string | null;
//   document: {
//     id: string;
//     title: string;
//     owningDepartment: { id: number; name: string } | null;
//     hasFiles: boolean;
//   };
// };

type OutgoingRecordItem = {
  id: string;
  outgoingNumber: string;
  issueDate: string;
  sendMethod: string;
  isDelivered: boolean;
  deliveryProofPath?: string | null;
  externalParty?: {
    name: string | null;
    type: string | null;
  };
  signedBy: string | null;
  document: {
    id: string;
    title: string;
    owningDepartment: { id: number; name: string } | null;
    hasFiles: boolean;
  };
};


function OutgoingPage() {
  // بيانات الإدارات (لعرضها في القائمة المنسدلة "الإدارة المصدرة")
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  // قائمة آخر الكتب الصادرة
  const [outgoingList, setOutgoingList] = useState<OutgoingRecordItem[]>([]);
  const [loadingOutgoing, setLoadingOutgoing] = useState(true);

  // رسائل نجاح/خطأ بعد تسجيل صادر
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // الحقول الخاصة بإنشاء صادر جديد
  const [externalPartyName, setExternalPartyName] = useState<string>(
    "وزارة المالية"
  );
  const [externalPartyType, setExternalPartyType] = useState<string>("وزارة");
  const [sendMethod, setSendMethod] = useState<string>("OfficialEmail");
  const [subject, setSubject] = useState<string>(
    "رد على كتاب رقم 3434/20 طرفكم"
  );
  const [departmentId, setDepartmentId] = useState<number | "">("");

  // --- [جديد] إدارة مودال رفع المرفق ---
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachDocumentId, setAttachDocumentId] = useState<string>("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState("");
  const [uploadErrorMsg, setUploadErrorMsg] = useState("");

  // تحميل الإدارات
  async function loadDepartments() {
    setLoadingDepartments(true);

    try {
      const token = getToken();
      const resp = await fetch("http://localhost:3000/departments", {
        method: "GET",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : undefined,
      });

      if (!resp.ok) {
        throw new Error("تعذر تحميل الإدارات");
      }

      const raw = await resp.json();
      console.log("Departments API response:", raw);

      let list: Department[] = [];
      if (Array.isArray(raw)) {
        list = raw;
      } else if (Array.isArray(raw?.items)) {
        list = raw.items;
      } else if (Array.isArray(raw?.departments)) {
        list = raw.departments;
      } else {
        console.warn("لم يتمكن من تفسير استجابة الإدارات، القيمة:", raw);
        list = [];
      }

      setDepartments(list);

      if (!departmentId && list.length > 0) {
        setDepartmentId(list[0].id);
      }
    } catch (err) {
      console.error(err);
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  }

  // تحميل آخر الكتب الصادرة
  async function loadOutgoing() {
    setLoadingOutgoing(true);
    try {
      const token = getToken();
      if (!token) {
        window.location.href = "/";
        return;
      }
      const resp = await fetch("http://localhost:3000/outgoing", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!resp.ok) {
        throw new Error("تعذر تحميل الصادر");
      }
      const data = await resp.json();
      setOutgoingList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOutgoing(false);
    }
  }

  useEffect(() => {
    loadDepartments();
    loadOutgoing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إنشاء صادر جديد
  async function handleCreateOutgoing(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const token = getToken();
    if (!token) {
      window.location.href = "/";
      return;
    }

    if (!departmentId) {
      setErrorMsg("الرجاء اختيار الإدارة المصدرة للكتاب.");
      return;
    }

    try {
      const resp = await fetch("http://localhost:3000/outgoing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          externalPartyName,
          externalPartyType,
          sendMethod,
          subject,
          departmentId: departmentId,
        }),
      });

      if (!resp.ok) {
        setErrorMsg("تعذر تسجيل الكتاب الصادر");
        return;
      }

      const data = await resp.json();
      console.log("Created outgoing:", data);

      setSuccessMsg("تم تسجيل الكتاب الصادر بنجاح ✅");

      // إعادة تحميل القائمة حتى يظهر السجل الجديد
      loadOutgoing();

      // بإمكانك هنا لو حاب تصفر الحقول أو تخليها زي ما هي
    } catch (err) {
      console.error(err);
      setErrorMsg("خطأ في الاتصال بالخادم");
    }
  }

  // فتح نافذة الإرفاق لكتاب صادر معيّن
  function openAttachModal(docId: string) {
    setAttachDocumentId(docId);
    setSelectedFile(null);
    setUploadSuccessMsg("");
    setUploadErrorMsg("");
    setShowAttachModal(true);
  }

  // رفع الملف (PDF/صورة) وربطه بالوثيقة الخاصة بالصادر
  async function handleUploadAttachment(e: React.FormEvent) {
    e.preventDefault();
    setUploadSuccessMsg("");
    setUploadErrorMsg("");

    if (!selectedFile) {
      setUploadErrorMsg("الرجاء اختيار ملف قبل الرفع");
      return;
    }

    const token = getToken();
    if (!token) {
      setUploadErrorMsg("انتهت الجلسة. الرجاء تسجيل الدخول من جديد.");
      return;
    }

    try {
      setUploadingFile(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const resp = await fetch(
        `http://localhost:3000/files/upload/${attachDocumentId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!resp.ok) {
        setUploadErrorMsg("تعذر رفع الملف");
        setUploadingFile(false);
        return;
      }

      const data = await resp.json();
      console.log("upload result:", data);

      setUploadSuccessMsg("تم رفع الملف وربطه بالصادر ✅");

      // نحدّث جدول الصادر عشان يتحول "لا يوجد" إلى "📎 مرفق"
      await loadOutgoing();
    } catch (err) {
      console.error(err);
      setUploadErrorMsg("خطأ في الاتصال بالخادم أثناء الرفع");
    } finally {
      setUploadingFile(false);
    }
  }

  function formatSendMethodLabel(method: string) {
    switch (method) {
      case "OfficialEmail":
        return "📧 بريد رسمي";
      case "Hand":
        return "🤝 تسليم باليد";
      case "Courier":
        return "📦 مندوب";
      case "Fax":
        return "📠 فاكس";
      case "RegisteredMail":
        return "✉️ بريد مسجل";
      default:
        return method;
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 p-6 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6 text-right">
        {/* أزرار التنقل العلوية */}
        <div className="flex gap-2 flex-wrap">
          <Link
            to="/dashboard"
            className="bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-slate-800"
          >
            ← لوحة التحكم
          </Link>
          <Link
            to="/incoming"
            className="bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-slate-800"
          >
            ← البريد الوارد
          </Link>
        </div>

        {/* العنوان الرئيسي */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">الصادر</h1>
          <p className="text-sm text-slate-500">
            تسجيل كتاب صادر جديد، مع عرض آخر الكتب الصادرة.
          </p>
        </div>

        {/* تنبيهات النجاح / الفشل */}
        {successMsg && (
          <div className="bg-green-100 text-green-700 text-sm p-3 rounded-lg border border-green-300 flex items-start gap-2">
            <span className="text-green-600 text-lg leading-none">☑</span>
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg border border-red-300">
            {errorMsg}
          </div>
        )}

        {/* بطاقة: تسجيل صادر جديد */}
        <div className="bg-white border border-slate-200 rounded-xl shadow p-4">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            تسجيل صادر جديد
          </h2>

          <form
            onSubmit={handleCreateOutgoing}
            className="grid md:grid-cols-2 gap-4 text-sm text-slate-700"
          >
            {/* الجهة المستلمة */}
            <div className="flex flex-col">
              <label className="text-slate-600 mb-1">
                الجهة المستلمة:
              </label>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="مثال: وزارة المالية"
                value={externalPartyName}
                onChange={(e) => setExternalPartyName(e.target.value)}
              />
              <div className="text-[11px] text-slate-400 mt-1">
                مثل: وزارة المالية / ديوان المحاسبة / الشركة الوطنية...
              </div>
            </div>

            {/* نوع الجهة */}
            <div className="flex flex-col">
              <label className="text-slate-600 mb-1">
                نوع الجهة:
              </label>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="وزارة / شركة / جهة خارجية..."
                value={externalPartyType}
                onChange={(e) => setExternalPartyType(e.target.value)}
              />
            </div>

            {/* طريقة الإرسال */}
            <div className="flex flex-col">
              <label className="text-slate-600 mb-1">
                طريقة الإرسال:
              </label>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sendMethod}
                onChange={(e) => setSendMethod(e.target.value)}
              >
                <option value="OfficialEmail">بريد رسمي</option>
                <option value="Hand">تسليم باليد</option>
                <option value="Courier">مندوب / بريد سريع</option>
                <option value="Fax">فاكس</option>
                <option value="RegisteredMail">بريد مسجل</option>
              </select>
            </div>

            {/* الإدارة المصدرة */}
            <div className="flex flex-col">
              <label className="text-slate-600 mb-1">
                الإدارة المصدرة:
              </label>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={departmentId}
                onChange={(e) =>
                  setDepartmentId(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                disabled={loadingDepartments}
              >
                {loadingDepartments ? (
                  <option>...جارِ التحميل</option>
                ) : (
                  <>
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {/* موضوع / ملخص الخطاب الصادر */}
            <div className="md:col-span-2 flex flex-col">
              <label className="text-slate-600 mb-1">
                موضوع / ملخص الخطاب الصادر:
              </label>
              <textarea
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="مثال: إفادة بخصوص التقرير المالي للربع الأخير..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex justify-start">
              <button
                type="submit"
                className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                تسجيل الصادر
              </button>
            </div>
          </form>
        </div>

        {/* بطاقة: آخر الكتب الصادرة */}
        <div className="bg-white border border-slate-200 rounded-xl shadow p-4">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            آخر الكتب الصادرة
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-600 border-b border-slate-200">
                <tr className="text-right">
                  <th className="py-2 px-3"># الصادر</th>
                  <th className="py-2 px-3">الجهة المستلمة</th>
                  <th className="py-2 px-3">الإدارة المصدرة</th>
                  <th className="py-2 px-3">الموضوع</th>
                  <th className="py-2 px-3">طريقة الإرسال</th>
                  <th className="py-2 px-3">تاريخ الإصدار</th>
                  <th className="py-2 px-3">مرفق</th>
                </tr>
              </thead>

              <tbody>
                {loadingOutgoing ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-6 text-slate-500 text-sm"
                    >
                      جارِ التحميل...
                    </td>
                  </tr>
                ) : outgoingList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-6 text-slate-500 text-sm"
                    >
                      لا توجد كتب صادرة بعد.
                    </td>
                  </tr>
                ) : (
                  outgoingList.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 last:border-none align-top"
                    >
                      <td className="py-2 px-3 font-mono text-xs">
                        <Link
                          to={`/outgoing/${item.id}`}
                          className="text-blue-700 hover:underline"
                        >
                          {item.outgoingNumber}
                        </Link>
                      </td>

                      <td className="py-2 px-3 text-slate-700">
                        <div className="font-medium">
                          {item.externalParty?.name || "—"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {item.signedBy
                            ? `موقّع بواسطة: ${item.signedBy}`
                            : ""}
                        </div>
                      </td>

                      <td className="py-2 px-3 text-slate-700">
                        {item.document.owningDepartment
                          ? item.document.owningDepartment.name
                          : "—"}
                      </td>

                      <td className="py-2 px-3 text-slate-700">
                        {item.document.title}
                      </td>

                      <td className="py-2 px-3 text-slate-700">
                        <span className="inline-flex items-center gap-1 text-xs bg-slate-100 border border-slate-300 text-slate-700 px-2 py-1 rounded-md">
                          <span>{formatSendMethodLabel(item.sendMethod)}</span>
                        </span>
                      </td>

                      <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                        {new Date(item.issueDate).toLocaleString("ar-LY", { hour12: true })}
                      </td>

                      <td className="py-2 px-3 text-slate-700">
                        {item.document.hasFiles ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-800 text-white px-2 py-1 rounded-md">
                            <span>📎</span>
                            <span>مرفق</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => openAttachModal(item.document.id)}
                            className="inline-flex items-center gap-1 text-xs bg-slate-700 text-white px-2 py-1 rounded-md hover:bg-slate-800"
                          >
                            <span>📎</span>
                            <span>إرفاق</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* مودال رفع المرفق للصادر */}
        {showAttachModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md text-right p-4 border border-slate-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="text-lg font-semibold text-slate-800">
                    إرفاق نسخة موقعة (PDF / صورة)
                  </div>
                  <div className="text-xs text-slate-500">
                    يمكن رفع نسخة PDF النهائية أو صورة مسح ضوئي للكتاب
                    الصادر.
                  </div>
                </div>

                <button
                  onClick={() => setShowAttachModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>

              {uploadSuccessMsg && (
                <div className="bg-green-100 text-green-700 text-xs p-2 rounded border border-green-300 mb-2">
                  {uploadSuccessMsg}
                </div>
              )}
              {uploadErrorMsg && (
                <div className="bg-red-100 text-red-700 text-xs p-2 rounded border border-red-300 mb-2">
                  {uploadErrorMsg}
                </div>
              )}

              <form onSubmit={handleUploadAttachment} className="space-y-4 text-sm">
                <div>
                  <label className="block text-slate-600 mb-1">
                    اختر ملف
                  </label>
                  <input
                    type="file"
                    className="block w-full text-sm text-slate-700 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-white file:bg-slate-700 hover:file:bg-slate-800 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  {selectedFile && (
                    <div className="text-xs text-slate-500 mt-1 break-all">
                      {selectedFile.name}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAttachModal(false)}
                    className="text-slate-600 bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs hover:bg-slate-200"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={uploadingFile}
                    className="bg-blue-600 text-white text-xs font-medium rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploadingFile ? "جارِ الرفع..." : "رفع المرفق"}
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

export default OutgoingPage;
