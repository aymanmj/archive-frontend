import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getToken } from "../auth";

type OutgoingDetails = {
  id: string;
  outgoingNumber: string;
  issueDate: string;
  sendMethod: string;
  isDelivered: boolean;
  deliveryProofPath: string | null;
  externalParty: {
    name: string | null;
    type: string | null;
  };
  signedBy: string | null;
  document: {
    id: string;
    title: string;
    summary: string | null;
    owningDepartment: { id: number; name: string } | null;
    files: {
      id: string;
      fileNameOriginal: string;
      versionNumber: number;
      uploadedAt: string;
      uploadedBy: string | null;
      url: string;
    }[];
  };
};

function OutgoingDetailsPage() {
  const { id } = useParams(); // هذا id هو outgoing.id (BigInt كسلسلة نصية)
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<OutgoingDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadDetails() {
    setLoading(true);
    setErrorMsg("");

    const token = getToken();
    if (!token) {
      // انتهت الجلسة
      navigate("/");
      return;
    }

    try {
      const resp = await fetch(`http://localhost:3000/outgoing/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        setErrorMsg("تعذر تحميل تفاصيل الصادر");
        setLoading(false);
        return;
      }

      const data = await resp.json();
      setDetails(data);
    } catch (err) {
      console.error(err);
      setErrorMsg("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
      <div className="max-w-4xl mx-auto space-y-6 text-right">
        {/* شريط الأزرار العلوي */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate(-1)}
            className="bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-slate-800"
          >
            ← رجوع
          </button>

          <Link
            to="/dashboard"
            className="bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-slate-800"
          >
            ← لوحة التحكم
          </Link>

          <Link
            to="/outgoing"
            className="bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-slate-800"
          >
            ← الصادر
          </Link>
        </div>

        {/* عنوان الصفحة */}
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            تفاصيل الكتاب الصادر
          </h1>
          {details && (
            <p className="text-sm text-slate-500">
              رقم الصادر:{" "}
              <span className="font-mono text-blue-700 font-medium">
                {details.outgoingNumber}
              </span>
            </p>
          )}
        </div>

        {/* في حالة التحميل */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl shadow p-4 text-sm text-slate-600">
            جارِ التحميل...
          </div>
        )}

        {/* في حالة الخطأ */}
        {errorMsg && !loading && (
          <div className="bg-red-100 border border-red-300 text-red-700 text-sm p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* في حالة وجود البيانات */}
        {!loading && details && (
          <>
            {/* بطاقة معلومات أساسية عن الصادر */}
            <div className="bg-white border border-slate-200 rounded-xl shadow p-4 text-sm leading-relaxed">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex flex-col text-slate-700">
                  <span className="text-slate-500 text-xs">
                    الجهة المستلمة:
                  </span>
                  <span className="font-medium">
                    {details.externalParty.name ?? "—"}
                    {details.externalParty.type
                      ? ` (${details.externalParty.type})`
                      : ""}
                  </span>

                  <span className="text-slate-500 text-xs mt-3">
                    الإدارة المصدرة:
                  </span>
                  <span className="font-medium">
                    {details.document.owningDepartment
                      ? details.document.owningDepartment.name
                      : "—"}
                  </span>

                  <span className="text-slate-500 text-xs mt-3">
                    موقّع بواسطة:
                  </span>
                  <span className="font-medium">
                    {details.signedBy ?? "—"}
                  </span>
                </div>

                <div className="flex flex-col text-slate-700">
                  <span className="text-slate-500 text-xs">
                    طريقة الإرسال:
                  </span>
                  <span className="font-medium">
                    {formatSendMethodLabel(details.sendMethod)}
                  </span>

                  <span className="text-slate-500 text-xs mt-3">
                    تاريخ الإصدار:
                  </span>
                  <span className="font-medium">
                    {new Date(details.issueDate).toLocaleString("ar-LY", { hour12: true })}
                  </span>

                  <span className="text-slate-500 text-xs mt-3">
                    حالة التسليم:
                  </span>
                  <span className="font-medium">
                    {details.isDelivered
                      ? "تم التسليم ✅"
                      : "لم يتم التسليم بعد ⏳"}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 mt-4 pt-4">
                <div className="text-slate-500 text-xs mb-1">
                  الموضوع / ملخص الخطاب:
                </div>
                <div className="text-slate-800 text-sm font-medium whitespace-pre-line">
                  {details.document.summary || details.document.title}
                </div>
              </div>
            </div>

            {/* بطاقة المرفقات */}
            <div className="bg-white border border-slate-200 rounded-xl shadow p-4 text-sm">
              <h2 className="text-base font-semibold text-slate-700 mb-4">
                المرفقات (النسخة الموقعة / PDF / صورة المسح الضوئي)
              </h2>

              {details.document.files.length === 0 ? (
                <div className="text-slate-500 text-sm py-4 text-center">
                  لا توجد مرفقات حتى الآن.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-slate-600 border-b border-slate-200">
                      <tr className="text-right">
                        <th className="py-2 px-3">الإصدار</th>
                        <th className="py-2 px-3">الملف</th>
                        <th className="py-2 px-3">تم الرفع بواسطة</th>
                        <th className="py-2 px-3">تاريخ الرفع</th>
                        <th className="py-2 px-3">تنزيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.document.files.map((f) => (
                        <tr
                          key={f.id}
                          className="border-b border-slate-100 last:border-none align-top"
                        >
                          <td className="py-2 px-3 font-mono text-xs text-slate-700">
                            {f.versionNumber}
                          </td>

                          <td className="py-2 px-3 text-slate-700 break-all">
                            {f.fileNameOriginal}
                          </td>

                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                            {f.uploadedBy ?? "—"}
                          </td>

                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                            {new Date(f.uploadedAt).toLocaleString("ar-LY", { hour12: true })}
                          </td>

                          <td className="py-2 px-3 text-slate-700">
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-slate-700 text-white px-2 py-1 rounded-md hover:bg-slate-800"
                            >
                              <span>⬇</span>
                              <span>تنزيل</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OutgoingDetailsPage;
