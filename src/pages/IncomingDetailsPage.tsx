import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { getToken } from "../auth";

// أنواع المرفقات
type FileItem = {
  id: string;
  fileNameOriginal: string;
  storagePath: string;
  versionNumber: number;
  uploadedAt: string;
  uploadedBy: string | null;
};

// أنواع عناصر المتابعة (الحالة الحالية أو سجل التعديلات)
type FollowupItem =
  | {
      type: "state";
      distributionId: string;
      status: string;
      notes: string | null;
      at: string;
      targetDepartment: { id: number; name: string } | null;
      assignedToUser:
        | {
            id: number;
            fullName: string;
          }
        | null;
    }
  | {
      type: "log";
      logId: string;
      at: string;
      oldStatus: string | null;
      newStatus: string;
      note: string | null;
      updatedBy:
        | {
            id: number;
            fullName: string;
          }
        | null;
    };

// تفاصيل الوارد
type IncomingDetails = {
  id: string;
  incomingNumber: string;
  receivedDate: string;
  receivedAt: string;
  deliveryMethod: string;
  urgencyLevel: string;
  requiredAction: string;
  dueDateForResponse: string | null;
  externalParty: {
    name: string | null;
    type: string | null;
  };
  receivedByUser: string | null;
  document: {
    id: string;
    title: string;
    summary: string | null;
    owningDepartment: { id: number; name: string } | null;
    files: FileItem[];
  } | null;
  internalFollowup: FollowupItem[];
};

// معلومات /users/me
type CurrentUserInfo = {
  id: number;
  fullName: string;
  username: string;
  isActive: boolean;
  department: { id: number; name: string } | null;
  roles: string[];
};

// قسم
type DepartmentOption = {
  id: number;
  name: string;
};

// مستخدم للتكليف
type BasicUserOption = {
  id: number;
  fullName: string;
  departmentId: number | null;
};

export default function IncomingDetailsPage() {
  const { id } = useParams<{ id: string }>();

  // حالة الصفحة العامة
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<IncomingDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // بيانات المستخدم الحالي (عشان الصلاحيات)
  const [me, setMe] = useState<CurrentUserInfo | null>(null);

  // البيانات المرجعية (الإدارات / المستخدمين)
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [usersList, setUsersList] = useState<BasicUserOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // حالة نموذج "إضافة متابعة"
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>(""); // إحالة
  const [assignedToUserId, setAssignedToUserId] = useState<string>(""); // تكليف موظف
  const [submittingFollowup, setSubmittingFollowup] = useState(false);
  const [followupError, setFollowupError] = useState<string | null>(null);

  // صلاحية المدير / الأدمن؟
  const isPrivileged = useMemo(() => {
    if (!me?.roles) return false;
    return (
      me.roles.includes("SystemAdmin") || me.roles.includes("DepartmentManager")
    );
  }, [me]);

  // دالة لعرض التاريخ/الوقت بالعربي
  function formatDateTime(v: string | null | undefined) {
    if (!v) return "—";
    const d = new Date(v);
    return d.toLocaleString("ar-LY", {
      hour12: true,
      dateStyle: "short",
      timeStyle: "medium",
    });
  }

  // تحميل بيانات الصفحات (تفاصيل الوارد + بيانات المستخدم + القوائم المساعدة)
  useEffect(() => {
    async function loadAll() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);

        const token = getToken();
        if (!token) {
          setError("انتهت الجلسة. يرجى تسجيل الدخول من جديد.");
          return;
        }

        // طلب تفاصيل المعاملة
        const recReq = fetch(`http://localhost:3000/incoming/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // طلب بيانات المستخدم الحالي (roles, department, ...)
        const meReq = fetch("http://localhost:3000/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // طلب الإدارات
        const depReq = fetch("http://localhost:3000/departments", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // طلب قائمة المستخدمين المختصرة
        const usersReq = fetch("http://localhost:3000/users/list-basic", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setLoadingMeta(true);
        const [recRes, meRes, depRes, usersRes] = await Promise.all([
          recReq,
          meReq,
          depReq,
          usersReq,
        ]);

        if (!recRes.ok) throw new Error("فشل في جلب تفاصيل المعاملة");
        if (!meRes.ok) throw new Error("فشل في جلب بيانات المستخدم الحالي");
        if (!depRes.ok) throw new Error("فشل في تحميل الإدارات");
        if (!usersRes.ok) throw new Error("فشل في تحميل المستخدمين");

        const recData = await recRes.json();
        const meData = await meRes.json();
        const depData = await depRes.json();
        const usrData = await usersRes.json();

        setDetails(recData);
        setMe(meData);

        // نخزن الإدارات (فقط الفعّالة لو تحب، الآن ناخذ الكل ونرشح بالمستقبل)
        const deps: DepartmentOption[] = Array.isArray(depData)
          ? depData
              .filter((d: any) => d.status === "Active")
              .map((d: any) => ({
                id: d.id,
                name: d.name,
              }))
          : [];

        setDepartments(deps);

        // نخزن المستخدمين
        const usersOpts: BasicUserOption[] = Array.isArray(usrData)
          ? usrData.map((u: any) => ({
              id: u.id,
              fullName: u.fullName,
              departmentId: u.departmentId ?? null,
            }))
          : [];
        setUsersList(usersOpts);

        // تعبئة الحالة الحالية في السلكت
        const latestState = recData.internalFollowup.find(
          (item: FollowupItem) => item.type === "state"
        ) as FollowupItem | undefined;

        if (latestState && latestState.type === "state") {
          setNewStatus(latestState.status || "");

          // مبدئياً لو فيه إحالة حالياً نخليها ظاهر في السلكت
          if (latestState.targetDepartment) {
            setTargetDepartmentId(String(latestState.targetDepartment.id));
          }

          // ولو فيه مكلف حالياً نعبيه
          if (latestState.assignedToUser) {
            setAssignedToUserId(String(latestState.assignedToUser.id));
          }
        }
      } catch (err: any) {
        setError(err.message || "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
        setLoadingMeta(false);
      }
    }

    loadAll();
  }, [id]);

  // إرسال متابعة جديدة (تحديث الحالة / إحالة / تكليف / ملاحظة)
  async function handleAddFollowup(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingFollowup(true);
    setFollowupError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error("انتهت الجلسة. الرجاء تسجيل الدخول من جديد.");
      }

      const bodyToSend: Record<string, any> = {
        status: newStatus || undefined,
        note: note || undefined,
      };

      // فقط لو المستخدم له صلاحية إدارية نرسل هذه
      if (isPrivileged) {
        if (targetDepartmentId) {
          bodyToSend.targetDepartmentId = Number(targetDepartmentId);
        }
        if (assignedToUserId) {
          bodyToSend.assignedToUserId = Number(assignedToUserId);
        }
      }

      const res = await fetch(
        `http://localhost:3000/incoming/${id}/followup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyToSend),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(
          errJson?.message ||
            "تعذر إضافة المتابعة. ربما ليست لديك صلاحية."
        );
      }

      // أبسط حل لتحديث التايملاين بعد الحفظ:
      window.location.reload();
    } catch (err: any) {
      setFollowupError(err.message || "تعذر إضافة المتابعة");
    } finally {
      setSubmittingFollowup(false);
    }
  }

  // ---------- واجهة التحميل / الأخطاء ----------
  if (loading) {
    return (
      <div
        className="bg-slate-100 min-h-screen p-4 flex flex-col items-center text-center text-gray-600"
        dir="rtl"
      >
        ...جاري التحميل
      </div>
    );
  }

  if (error || !details) {
    return (
      <div
        className="bg-slate-100 min-h-screen p-4 flex flex-col items-center text-center text-red-600"
        dir="rtl"
      >
        {error || "تعذر جلب البيانات"}
      </div>
    );
  }

  // -------------------------------------------------------------------
  // الـ JSX الرئيسي
  // -------------------------------------------------------------------
  return (
    <div
      className="bg-slate-100 min-h-screen p-4 flex flex-col items-center"
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto space-y-6 w-full">
        {/* العنوان + أزرار العودة */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">
            تفاصيل المعاملة
          </h1>
          <div className="flex gap-2">
            <Link
              to="/incoming"
              className="text-xs bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700"
            >
              ← العودة للوارد
            </Link>
            <Link
              to="/dashboard"
              className="text-xs bg-slate-500 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600"
            >
              ← لوحة التحكم
            </Link>
          </div>
        </div>

        {/* بطاقة تفاصيل المعاملة */}
        <div className="w-full bg-white rounded-lg shadow border border-slate-300 p-4 text-right text-slate-800">
          <div className="text-sm text-slate-500">
            رقم الوارد:{" "}
            <span className="font-mono text-blue-700">
              {details.incomingNumber}
            </span>
          </div>

          <br />

          <div className="flex flex-col md:flex-row md:justify-between text-sm text-slate-700 leading-relaxed">
            {/* العمود الأول */}
            <div className="md:w-1/2 md:pr-4 md:border-l md:border-slate-300 md:ml-4">
              <div className="mb-2">
                <span className="text-slate-500">الجهة المرسلة:</span>{" "}
                <span className="font-semibold">
                  {details.externalParty?.name || "—"}
                </span>
              </div>

              <div className="mb-2">
                <span className="text-slate-500">درجة الأهمية:</span>{" "}
                <span className="font-semibold">
                  {details.urgencyLevel === "VeryUrgent"
                    ? "عاجل جداً"
                    : details.urgencyLevel === "Urgent"
                    ? "عاجل"
                    : "عادي"}
                </span>
              </div>

              <div className="mb-2">
                <span className="text-slate-500">الإجراء المطلوب:</span>{" "}
                <span className="font-semibold">
                  {details.requiredAction || "—"}
                </span>
              </div>
            </div>

            {/* العمود الثاني */}
            <div className="md:w-1/2 md:pl-4">
              <div className="mb-2">
                <span className="text-slate-500">طريقة الاستلام:</span>{" "}
                <span className="font-semibold">
                  {details.deliveryMethod}
                </span>
              </div>

              <div className="mb-2">
                <span className="text-slate-500">تاريخ الاستلام:</span>{" "}
                <span className="font-semibold">
                  {formatDateTime(details.receivedAt)}
                </span>
              </div>

              <div className="mb-2">
                <span className="text-slate-500">مستلم المعاملة:</span>{" "}
                <span className="font-semibold">
                  {details.receivedByUser || "—"}
                </span>
              </div>
            </div>
          </div>

          <hr className="my-2" />

          <div className="text-right">
            <div className="text-sm text-slate-500">الموضوع / ملخص:</div>
            <div className="text-base font-medium">
              {details.document?.title ||
                details.document?.summary ||
                "—"}
            </div>
          </div>
        </div>

        {/* بطاقة المرفقات */}
        <div className="w-full bg-white rounded-lg shadow border border-slate-300 text-slate-800">
          <div className="border-b border-slate-300 px-4 py-2 bg-slate-50 rounded-t text-center">
            <h3 className="text-lg font-semibold">
              المرفقات (النسخة الموقعة / PDF / صورة المسح الضوئي)
            </h3>
          </div>

          <div className="overflow-x-auto p-4 pt-2">
            <table className="w-full text-sm border-collapse text-right">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 text-slate-600">
                  <th className="p-2 font-semibold">الإصدار</th>
                  <th className="p-2 font-semibold">الملف</th>
                  <th className="p-2 font-semibold">تم الرفع بواسطة</th>
                  <th className="p-2 font-semibold">تاريخ الرفع</th>
                  <th className="p-2 font-semibold text-center">
                    تنزيل
                  </th>
                </tr>
              </thead>
              <tbody>
                {details.document?.files?.length ? (
                  details.document.files.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-slate-200 last:border-b-0"
                    >
                      <td className="p-2">{f.versionNumber}</td>
                      <td className="p-2 font-mono text-sm break-all">
                        {f.fileNameOriginal}
                      </td>
                      <td className="p-2">{f.uploadedBy || "—"}</td>
                      <td className="p-2">
                        {formatDateTime(f.uploadedAt)}
                      </td>
                      <td className="p-2 text-center">
                        <a
                          className="bg-slate-700 text-white text-xs px-3 py-1 rounded"
                          href={`http://localhost:3000/files/${f.id}/download`}
                        >
                          تنزيل
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      className="p-4 text-center text-slate-400"
                      colSpan={5}
                    >
                      لا توجد مرفقات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* بطاقة سجل المتابعة */}
        <div className="w-full bg-white rounded-lg shadow border border-slate-300 text-slate-800">
          <div className="border-b border-slate-300 px-4 py-2 bg-slate-50 rounded-t text-center">
            <h3 className="text-lg font-semibold">سجل المتابعة</h3>
          </div>

          <div className="p-4 text-sm text-slate-700 leading-relaxed">
            {details.internalFollowup.length === 0 ? (
              <div className="text-slate-500 text-center">
                لا توجد أي متابعات بعد.
              </div>
            ) : (
              <div className="space-y-4">
                {details.internalFollowup.map((item, idx) => {
                  if (item.type === "state") {
                    return (
                      <div
                        key={`state-${idx}`}
                        className="border border-slate-300 bg-slate-50 rounded p-3"
                      >
                        <div className="text-slate-500 text-xs mb-2 text-left md:text-right">
                          {formatDateTime(item.at)}
                        </div>

                        <div className="mb-1">
                          <span className="text-slate-500">
                            حالة المعاملة الآن:
                          </span>{" "}
                          <span className="font-semibold text-slate-800">
                            {item.status}
                          </span>
                        </div>

                        <div className="mb-1">
                          <span className="text-slate-500">
                            ملاحظات:
                          </span>{" "}
                          {item.notes ? (
                            <span className="text-slate-800">
                              {item.notes}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              لا توجد ملاحظات
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 mt-2 leading-loose">
                          <div>
                            <span className="text-slate-500">
                              الإدارة المتابعة:
                            </span>{" "}
                            <span>
                              {item.targetDepartment
                                ? item.targetDepartment.name
                                : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">
                              المكلَّف:
                            </span>{" "}
                            <span>
                              {item.assignedToUser
                                ? item.assignedToUser.fullName
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // item.type === "log"
                    return (
                      <div
                        key={`log-${idx}`}
                        className="border border-slate-300 rounded p-3"
                      >
                        <div className="text-slate-500 text-xs mb-2 text-left md:text-right">
                          {formatDateTime(item.at)}
                        </div>

                        <div className="mb-1">
                          <span className="text-slate-500">
                            تحديث متابعة
                          </span>
                        </div>

                        <div className="mb-1">
                          <span className="text-slate-500">
                            الحالة:
                          </span>{" "}
                          <span className="font-semibold text-slate-800">
                            {item.oldStatus
                              ? `${item.oldStatus} → ${item.newStatus}`
                              : item.newStatus}
                          </span>
                        </div>

                        <div className="mb-1">
                          <span className="text-slate-500">
                            ملاحظة:
                          </span>{" "}
                          {item.note ? (
                            <span className="text-slate-800">
                              {item.note}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 mt-2 leading-loose">
                          <span className="text-slate-500">
                            تم التحديث بواسطة:
                          </span>{" "}
                          <span>
                            {item.updatedBy
                              ? item.updatedBy.fullName
                              : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>

        {/* بطاقة إضافة متابعة / تحديث حالة */}
        <div className="w-full bg-white rounded-lg shadow border border-slate-300 mb-16 text-slate-800">
          <div className="border-b border-slate-300 px-4 py-2 bg-slate-50 rounded-t text-center">
            <h3 className="text-lg font-semibold">
              إضافة متابعة / تحديث حالة
            </h3>
          </div>

          <div className="p-4 text-sm text-slate-700 leading-relaxed">
            {followupError && (
              <div className="text-red-600 text-sm mb-3 text-center">
                {followupError}
              </div>
            )}

            <form
              className="grid md:grid-cols-2 gap-4"
              onSubmit={handleAddFollowup}
            >
              {/* الحالة الجديدة */}
              <div className="flex flex-col">
                <label className="text-slate-600 mb-1">الحالة</label>
                <select
                  className="border border-slate-300 rounded px-2 py-1 text-sm"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  <option value="">-- بدون تغيير --</option>
                  <option value="Open">Open - مفتوح</option>
                  <option value="InProgress">
                    InProgress - جاري المتابعة
                  </option>
                  <option value="Completed">
                    Completed - مُنجز / للعلم
                  </option>
                  <option value="Closed">Closed - مغلق</option>
                </select>
              </div>

              {/* إحالة لإدارة أخرى (تظهر فقط للمدير / الأدمن) */}
              {isPrivileged && (
                <div className="flex flex-col">
                  <label className="text-slate-600 mb-1">
                    إحالة إلى إدارة
                  </label>
                  <select
                    className="border border-slate-300 rounded px-2 py-1 text-sm"
                    value={targetDepartmentId}
                    onChange={(e) =>
                      setTargetDepartmentId(e.target.value)
                    }
                    disabled={loadingMeta}
                  >
                    <option value="">-- بدون تغيير --</option>
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    في حال تحويل المعاملة لإدارة أخرى رسمياً.
                  </div>
                </div>
              )}

              {/* تكليف موظف محدد (يظهر فقط للمدير / الأدمن) */}
              {isPrivileged && (
                <div className="flex flex-col md:col-span-2">
                  <label className="text-slate-600 mb-1">
                    المكلَّف بمتابعة الموضوع
                  </label>
                  <select
                    className="border border-slate-300 rounded px-2 py-1 text-sm"
                    value={assignedToUserId}
                    onChange={(e) =>
                      setAssignedToUserId(e.target.value)
                    }
                    disabled={loadingMeta}
                  >
                    <option value="">-- بدون تعيين --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                        {u.departmentId
                          ? ` (إدارة ${u.departmentId})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    يُسجل كمسؤول متابعة رسمي لهذه المعاملة.
                  </div>
                </div>
              )}

              {/* الملاحظة */}
              <div className="flex flex-col md:col-span-2">
                <label className="text-slate-600 mb-1">
                  ملاحظة المتابعة
                </label>
                <textarea
                  className="border border-slate-300 rounded px-2 py-1 text-sm min-h-[80px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="مثال: تم إرسال الخطاب لإدارة الشؤون القانونية للرد المبدئي..."
                />
              </div>

              {/* زر الحفظ */}
              <div className="md:col-span-2 flex justify-center md:justify-end">
                <button
                  type="submit"
                  disabled={submittingFollowup}
                  className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {submittingFollowup
                    ? "جاري الحفظ..."
                    : "حفظ المتابعة"}
                </button>
              </div>
            </form>

            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed text-center md:text-right">
              ملاحظة: فقط الإدارة المسؤولة حاليًا أو المستخدم صاحب صلاحية{" "}
              <span className="font-semibold text-slate-600">
                SystemAdmin / DepartmentManager
              </span>{" "}
              يمكنهم تغيير الإدارة أو تكليف موظف.
              كل تغيير يُسجَّل بالاسم والتوقيت.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



// import React, { useEffect, useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import { getToken } from "../auth";

// // أنواع المرفقات
// type FileItem = {
//   id: string;
//   fileNameOriginal: string;
//   storagePath: string;
//   versionNumber: number;
//   uploadedAt: string;
//   uploadedBy: string | null;
// };

// // أنواع عناصر المتابعة (الحالة الحالية أو سجل التعديلات)
// type FollowupItem =
//   | {
//       type: "state";
//       distributionId: string;
//       status: string;
//       notes: string | null;
//       at: string;
//       targetDepartment: { id: number; name: string } | null;
//       assignedToUser:
//         | {
//             id: number;
//             fullName: string;
//           }
//         | null;
//     }
//   | {
//       type: "log";
//       logId: string;
//       at: string;
//       oldStatus: string | null;
//       newStatus: string;
//       note: string | null;
//       updatedBy:
//         | {
//             id: number;
//             fullName: string;
//           }
//         | null;
//     };

// // تفاصيل الوارد
// type IncomingDetails = {
//   id: string;
//   incomingNumber: string;
//   receivedDate: string;
//   receivedAt: string;
//   deliveryMethod: string;
//   urgencyLevel: string;
//   requiredAction: string;
//   dueDateForResponse: string | null;
//   externalParty: {
//     name: string | null;
//     type: string | null;
//   };
//   receivedByUser: string | null;
//   document: {
//     id: string;
//     title: string;
//     summary: string | null;
//     owningDepartment: { id: number; name: string } | null;
//     files: FileItem[];
//   } | null;
//   internalFollowup: FollowupItem[];
// };

// export default function IncomingDetailsPage() {
//   const { id } = useParams<{ id: string }>();

//   // حالة الصفحة العامة
//   const [loading, setLoading] = useState(true);
//   const [details, setDetails] = useState<IncomingDetails | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   // حالة نموذج "إضافة متابعة"
//   const [newStatus, setNewStatus] = useState("");
//   const [note, setNote] = useState("");
//   const [submittingFollowup, setSubmittingFollowup] = useState(false);
//   const [followupError, setFollowupError] = useState<string | null>(null);

//   // دالة لعرض التاريخ/الوقت بالعربي
//   function formatDateTime(v: string | null | undefined) {
//     if (!v) return "—";
//     const d = new Date(v);
//     return d.toLocaleString("ar-LY", {
//       hour12: true,
//       dateStyle: "short",
//       timeStyle: "medium",
//     });
//   }

//   // 1) تحميل تفاصيل المعاملة من الـ API
//   useEffect(() => {
//     async function fetchDetails() {
//       try {
//         setLoading(true);
//         setError(null);

//         const token = getToken();
//         const res = await fetch(`http://localhost:3000/incoming/${id}`, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (!res.ok) {
//           throw new Error("فشل في جلب تفاصيل المعاملة");
//         }

//         const data = await res.json();
//         setDetails(data);

//         // عشان نعبي الـ select بالحالة الحالية (لو فيه عنصر type:"state")
//         const latestState = data.internalFollowup.find(
//           (item: FollowupItem) => item.type === "state"
//         ) as FollowupItem | undefined;
//         if (latestState && latestState.type === "state") {
//           setNewStatus(latestState.status || "");
//         }
//       } catch (err: any) {
//         setError(err.message || "حدث خطأ غير متوقع");
//       } finally {
//         setLoading(false);
//       }
//     }

//     if (id) {
//       fetchDetails();
//     }
//   }, [id]);

//   // 2) إرسال متابعة جديدة (تحديث الحالة / إضافة ملاحظة)
//   async function handleAddFollowup(e: React.FormEvent) {
//     e.preventDefault();
//     setSubmittingFollowup(true);
//     setFollowupError(null);

//     try {
//       const token = getToken();

//       const bodyToSend = {
//         status: newStatus || undefined,
//         note: note || undefined,
//         // لو لاحقاً نبي نضيف تحويل لادارة ثانية أو تكليف موظف:
//         targetDepartmentId: selectedDeptId || undefined,
//         assignedToUserId: selectedUserId || undefined,
//       };

//       const res = await fetch(
//         `http://localhost:3000/incoming/${id}/followup`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//           },
//           body: JSON.stringify(bodyToSend),
//         }
//       );

//       if (!res.ok) {
//         const errJson = await res.json().catch(() => null);
//         throw new Error(
//           errJson?.message ||
//             "تعذر إضافة المتابعة. ربما ليست لديك صلاحية."
//         );
//       }

//       // أبسط حل الآن: إعادة تحميل الصفحة لتحديث البيانات
//       window.location.reload();
//     } catch (err: any) {
//       setFollowupError(err.message || "تعذر إضافة المتابعة");
//     } finally {
//       setSubmittingFollowup(false);
//     }
//   }

//   // ---------- واجهة التحميل / الأخطاء ----------
//   if (loading) {
//     return (
//       <div
//         className="bg-slate-100 min-h-screen p-4 flex flex-col items-center text-center text-gray-600"
//         dir="rtl"
//       >
//         ...جاري التحميل
//       </div>
//     );
//   }

//   if (error || !details) {
//     return (
//       <div
//         className="bg-slate-100 min-h-screen p-4 flex flex-col items-center text-center text-red-600"
//         dir="rtl"
//       >
//         {error || "تعذر جلب البيانات"}
//       </div>
//     );
//   }

//   // -------------------------------------------------------------------
//   // الـ JSX الرئيسي
//   // ستايل عام مطابق لستايلك الحالي (كروت ذات حدود خفيفة ولون خلفية أبيض)
//   // -------------------------------------------------------------------
//   return (
//     <div
//       className="bg-slate-100 min-h-screen p-4 flex flex-col items-center"
//       dir="rtl"

//     >
//      <div className="max-w-4xl mx-auto space-y-6">
//         <div className="flex items-center justify-between">
//           <h1 className="text-xl font-semibold">تفاصيل المعاملة</h1>
//           <div className="flex gap-2">
//             <Link to="/incoming" className="text-xs bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700">
//               ← العودة للوارد
//             </Link>
//             <Link to="/dashboard" className="text-xs bg-slate-500 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600">
//               ← لوحة التحكم
//             </Link>
//           </div>
//         </div>

//       {/* بطاقة تفاصيل المعاملة */}
//       <div className="w-full max-w-4xl bg-white rounded rounded-lg shadow border border-slate-300 p-4 mb-4 text-right text-slate-800">

//         <div className="text-sm text-slate-500">
//           رقم الوارد: <span className="font-mono text-blue-700">{details.incomingNumber}</span>
//         </div>
//         <br/>

//         {/* بنفس الأسلوب القديم: عمود يمين وعمود يسار داخل نفس البطاقة */}
//         <div className="flex flex-col md:flex-row md:justify-between text-sm text-slate-700 leading-relaxed">
//           {/* العمود الأيسر بصرياً (لكن مع RTL هذا يكون معلومات عامة) */}
//           <div className="md:w-1/2 md:pr-4 md:border-l md:border-slate-300 md:ml-4">
//             <div className="mb-2">
//               <span className="text-slate-500">الجهة المرسلة:</span>{" "}
//               <span className="font-semibold">
//                 {details.externalParty?.name || "—"}
//               </span>
//             </div>

//             <div className="mb-2">
//               <span className="text-slate-500">درجة الأهمية:</span>{" "}
//               <span className="font-semibold">{details.urgencyLevel === "VeryUrgent" ? "عاجل جداً" : details.urgencyLevel === "Urgent" ? "عاجل" : "عادي"}</span>
//             </div>

//             <div className="mb-2">
//               <span className="text-slate-500">الإجراء المطلوب:</span>{" "}
//               <span className="font-semibold">
//                 {details.requiredAction || "—"}
//               </span>
//             </div>

//           </div>

//           {/* العمود الأيمن: بيانات الوارد ورقمه */}
//           <div className="md:w-1/2 md:pl-4">
//           {/*  <div className="mb-2">
//               <span className="text-slate-500">رقم الوارد:</span>{" "}
//               <span className="font-semibold">
//                 {details.incomingNumber || "—"}
//               </span>
//             </div>*/}

//             <div className="mb-2">
//               <span className="text-slate-500">طريقة الاستلام:</span>{" "}
//               <span className="font-semibold">{details.deliveryMethod}</span>
//             </div>

//             <div className="mb-2">
//               <span className="text-slate-500">تاريخ الاستلام:</span>{" "}
//               <span className="font-semibold">
//                 {formatDateTime(details.receivedAt)}
//               </span>
//             </div>

//             <div className="mb-2">
//               <span className="text-slate-500">مستلم المعاملة:</span>{" "}
//               <span className="font-semibold">
//                 {details.receivedByUser || "—"}
//               </span>
//             </div>
//           </div>
//         </div>

//                <hr className="my-2" />

//               <div className="text-right">
//                 <div className="text-sm text-slate-500">الموضوع / ملخص:</div>
//                 <div className="text-base font-medium">{details.document.title}</div>
//               </div>
//       </div>

//       {/* بطاقة المرفقات */}
//       <div className="w-full max-w-4xl bg-white rounded rounded-lg shadow border border-slate-300 p-0 mb-4 text-slate-800">
//         <div className="border-b border-slate-300 px-4 py-2 bg-slate-50 rounded-t text-center">
//           <h3 className="text-lg font-semibold">
//             المرفقات (النسخة الموقعة / PDF / صورة المسح الضوئي)
//           </h3>
//         </div>

//         <div className="overflow-x-auto p-4 pt-2">
//           <table className="w-full text-sm border-collapse text-right">
//             <thead>
//               <tr className="border-b border-slate-300 bg-slate-100 text-slate-600">
//                 <th className="p-2 font-semibold">الإصدار</th>
//                 <th className="p-2 font-semibold">الملف</th>
//                 <th className="p-2 font-semibold">تم الرفع بواسطة</th>
//                 <th className="p-2 font-semibold">تاريخ الرفع</th>
//                 <th className="p-2 font-semibold text-center">تنزيل</th>
//               </tr>
//             </thead>
//             <tbody>
//               {details.document?.files?.length ? (
//                 details.document.files.map((f) => (
//                   <tr
//                     key={f.id}
//                     className="border-b border-slate-200 last:border-b-0"
//                   >
//                     <td className="p-2 text-rigt">{f.versionNumber}</td>
//                     <td className="p-2 font-mono text-sm break-all">
//                       {f.fileNameOriginal}
//                     </td>
//                     <td className="p-2">{f.uploadedBy || "—"}</td>
//                     <td className="p-2">{formatDateTime(f.uploadedAt)}</td>
//                     <td className="p-2 text-center">
//                       <a
//                         className="bg-slate-700 text-white text-xs px-3 py-1 rounded"
//                         href={`http://localhost:3000/files/${f.id}/download`}
//                       >
//                         تنزيل
//                       </a>
//                     </td>
//                   </tr>
//                 ))
//               ) : (
//                 <tr>
//                   <td
//                     className="p-4 text-center text-slate-400"
//                     colSpan={5}
//                   >
//                     لا توجد مرفقات
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* بطاقة سجل المتابعة */}
//       <div className="w-full max-w-4xl bg-white rounded rounded-lg shadow border border-slate-300 mb-4 text-slate-800">
//         <div className="border-b border-slate-300 px-4 py-2 bg-slate-50 rounded-t text-center">
//           <h3 className="text-lg font-semibold">سجل المتابعة</h3>
//         </div>

//         <div className="p-4 text-sm text-slate-700 leading-relaxed">
//           {details.internalFollowup.length === 0 ? (
//             <div className="text-slate-500 text-center">
//               لا توجد أي متابعات بعد.
//             </div>
//           ) : (
//             <div className="space-y-4">
//               {details.internalFollowup.map((item, idx) => {
//                 if (item.type === "state") {
//                   return (
//                     <div
//                       key={`state-${idx}`}
//                       className="border border-slate-300 bg-slate-50 rounded p-3"
//                     >
//                       <div className="text-slate-500 text-xs mb-2 text-left md:text-right">
//                         {formatDateTime(item.at)}
//                       </div>

//                       <div className="mb-1">
//                         <span className="text-slate-500">
//                           حالة المعاملة الآن:
//                         </span>{" "}
//                         <span className="font-semibold text-slate-800">
//                           {item.status}
//                         </span>
//                       </div>

//                       <div className="mb-1">
//                         <span className="text-slate-500">ملاحظات:</span>{" "}
//                         {item.notes ? (
//                           <span className="text-slate-800">
//                             {item.notes}
//                           </span>
//                         ) : (
//                           <span className="text-slate-400">
//                             لا توجد ملاحظات
//                           </span>
//                         )}
//                       </div>

//                       <div className="text-xs text-slate-600 mt-2 leading-loose">
//                         <div>
//                           <span className="text-slate-500">
//                             الإدارة المتابعة:
//                           </span>{" "}
//                           <span>
//                             {item.targetDepartment
//                               ? item.targetDepartment.name
//                               : "—"}
//                           </span>
//                         </div>
//                         <div>
//                           <span className="text-slate-500">المكلَّف:</span>{" "}
//                           <span>
//                             {item.assignedToUser
//                               ? item.assignedToUser.fullName
//                               : "—"}
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 } else {
//                   // item.type === "log"
//                   return (
//                     <div
//                       key={`log-${idx}`}
//                       className="border border-slate-300 rounded p-3"
//                     >
//                       <div className="text-slate-500 text-xs mb-2 text-left md:text-right">
//                         {formatDateTime(item.at)}
//                       </div>

//                       <div className="mb-1">
//                         <span className="text-slate-500">تحديث متابعة</span>
//                       </div>

//                       <div className="mb-1">
//                         <span className="text-slate-500">الحالة:</span>{" "}
//                         <span className="font-semibold text-slate-800">
//                           {item.oldStatus
//                             ? `${item.oldStatus} → ${item.newStatus}`
//                             : item.newStatus}
//                         </span>
//                       </div>

//                       <div className="mb-1">
//                         <span className="text-slate-500">ملاحظة:</span>{" "}
//                         {item.note ? (
//                           <span className="text-slate-800">
//                             {item.note}
//                           </span>
//                         ) : (
//                           <span className="text-slate-400">—</span>
//                         )}
//                       </div>

//                       <div className="text-xs text-slate-600 mt-2 leading-loose">
//                         <span className="text-slate-500">
//                           تم التحديث بواسطة:
//                         </span>{" "}
//                         <span>
//                           {item.updatedBy
//                             ? item.updatedBy.fullName
//                             : "—"}
//                         </span>
//                       </div>
//                     </div>
//                   );
//                 }
//               })}
//             </div>
//           )}
//         </div>
//       </div>

//       {/* بطاقة إضافة متابعة / تحديث حالة */}
//       <div className="w-full max-w-4xl bg-white rounded rounded-lg shadow border border-slate-300 mb-16 text-slate-800">
//         <div className="border-b border-slate-300 px-4 py-2 bg-slate-50 rounded-t text-center">
//           <h3 className="text-lg font-semibold">
//             إضافة متابعة / تحديث حالة
//           </h3>
//         </div>

//         <div className="p-4 text-sm text-slate-700 leading-relaxed">
//           {followupError && (
//             <div className="text-red-600 text-sm mb-3 text-center">
//               {followupError}
//             </div>
//           )}

//           <form
//             className="grid md:grid-cols-2 gap-4"
//             onSubmit={handleAddFollowup}
//           >
//             {/* اختيار الحالة */}
//             <div className="flex flex-col">
//               <label className="text-slate-600 mb-1">الحالة</label>
//               <select
//                 className="border border-slate-300 rounded px-2 py-1 text-sm"
//                 value={newStatus}
//                 onChange={(e) => setNewStatus(e.target.value)}
//               >
//                 <option value="">-- بدون تغيير --</option>
//                 <option value="Open">Open - مفتوح</option>
//                 <option value="InProgress">InProgress - جاري المتابعة</option>
//                 <option value="Completed">Completed - مُنجز / للعلم</option>
//                 <option value="Closed">Closed - مغلق</option>
//               </select>
//             </div>

//             {/* ملاحظة المتابعة */}
//             <div className="flex flex-col md:col-span-2">
//               <label className="text-slate-600 mb-1">ملاحظة المتابعة</label>
//               <textarea
//                 className="border border-slate-300 rounded px-2 py-1 text-sm min-h-[80px]"
//                 value={note}
//                 onChange={(e) => setNote(e.target.value)}
//                 placeholder="مثال: تم إرسال الخطاب لإدارة الشؤون القانونية للرد المبدئي..."
//               />
//             </div>

//             {/* زر الحفظ */}
//             <div className="md:col-span-2 flex justify-center md:justify-end">
//               <button
//                 type="submit"
//                 disabled={submittingFollowup}
//                 className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
//               >
//                 {submittingFollowup ? "جاري الحفظ..." : "حفظ المتابعة"}
//               </button>
//             </div>
//           </form>

//           <p className="text-[11px] text-slate-400 mt-4 leading-relaxed text-center md:text-right">
//             ملاحظة: فقط الإدارة المسؤولة حاليًا أو المستخدم صاحب صلاحية
//             <span className="font-semibold text-slate-600">
//               {" "}
//               SystemAdmin / DepartmentManager{" "}
//             </span>
//             يمكنهم إضافة متابعة. يتم تسجيل كل تغيير بالاسم والتوقيت.
//           </p>
//         </div>
//       </div>
//     </div>
//     </div>
//   );
// }



// import { useEffect, useState } from "react";
// import { useParams, Link } from "react-router-dom";
// import { getToken } from "../auth";

// type FileItem = {
//   id: string;
//   fileNameOriginal: string;
//   versionNumber: number;
//   uploadedAt: string;
//   uploadedBy: string | null;
//   url: string; // جاهز للتنزيل
// };

// type Detail = {
//   id: string;
//   incomingNumber: string;
//   receivedDate: string;
//   deliveryMethod: string;
//   urgencyLevel: string;
//   requiredAction: string | null;
//   dueDateForResponse: string | null;
//   externalParty: { name: string | null; type: string | null };
//   receivedBy: string | null;
//   document: {
//     id: string;
//     title: string;
//     summary: string | null;
//     owningDepartment: { id: number; name: string } | null;
//     files: FileItem[];
//   };
//   internalFollowup: Array<{
//     id: string;
//     status: string;
//     notes: string | null;
//     lastUpdateAt: string;
//     targetDepartment: { id: number; name: string } | null;
//     assignedToUser: { id: number; fullName: string } | null;
//   }>;
// };

// function fmt(d?: string | null) {
//   if (!d) return "—";
//   const dt = new Date(d);
//   if (Number.isNaN(dt.getTime())) return "—";
//   return dt.toLocaleString("ar-LY", { hour12: true });
// }

// export default function IncomingDetailsPage() {
//   const { id } = useParams<{ id: string }>();
//   const [data, setData] = useState<Detail | null>(null);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     const token = getToken();
//     if (!token) {
//       window.location.href = "/";
//       return;
//     }
//     (async () => {
//       try {
//         const res = await fetch(`http://localhost:3000/incoming/${id}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (!res.ok) {
//           setError("تعذر تحميل تفاصيل المعاملة");
//           return;
//         }
//         const json: Detail = await res.json();
//         setData(json);
//       } catch {
//         setError("تعذر تحميل تفاصيل المعاملة");
//       }
//     })();
//   }, [id]);

//   return (
//     <div dir="rtl" className="min-h-screen bg-slate-100 text-slate-800 p-6">
//       <div className="max-w-4xl mx-auto space-y-6">
//         <div className="flex items-center justify-between">
//           <h1 className="text-xl font-semibold">تفاصيل المعاملة</h1>
//           <div className="flex gap-2">
//             <Link to="/incoming" className="text-xs bg-slate-600 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700">
//               ← العودة للوارد
//             </Link>
//             <Link to="/dashboard" className="text-xs bg-slate-500 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600">
//               ← لوحة التحكم
//             </Link>
//           </div>
//         </div>

//         {error && (
//           <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg">{error}</div>
//         )}

//         {!error && !data && (
//           <div className="text-sm text-slate-600">...جاري التحميل</div>
//         )}

//         {data && (
//           <>
//             <div className="bg-white border border-slate-200 rounded-xl shadow p-4 space-y-2">
//               <div className="text-sm text-slate-500">
//                 رقم الوارد: <span className="font-mono text-blue-700">{data.incomingNumber}</span>
//               </div>
//               <div className="grid md:grid-cols-2 gap-3 text-sm">
//                 <div>الجهة المرسلة: <span className="font-medium">{data.externalParty?.name || "—"}</span></div>
//                 <div>طريقة الاستلام: <span className="font-medium">{data.deliveryMethod}</span></div>
//                 <div>تاريخ الاستلام: <span className="font-medium">{fmt(data.receivedDate)}</span></div>
//                 <div>درجة الأهمية: <span className="font-medium">
//                   {data.urgencyLevel === "VeryUrgent" ? "عاجل جدًا" : data.urgencyLevel === "Urgent" ? "عاجل" : "عادي"}
//                 </span></div>
//                 <div>الإجراء المطلوب: <span className="font-medium">{data.requiredAction || "—"}</span></div>
//                 <div>مستلم المعاملة: <span className="font-medium">{data.receivedBy || "—"}</span></div>
//               </div>

//               <hr className="my-2" />

//               <div className="text-right">
//                 <div className="text-sm text-slate-500">الموضوع / ملخص:</div>
//                 <div className="text-base font-medium">{data.document.title}</div>
//               </div>
//             </div>

//             <div className="bg-white border border-slate-200 rounded-xl shadow p-4 space-y-3">
//               <div className="text-base font-semibold">المرفقات (النسخة الموقعة / PDF / صورة المسح الضوئي)</div>
//               <div className="overflow-x-auto">
//                 <table className="w-full text-sm">
//                   <thead className="text-slate-600 border-b border-slate-200">
//                     <tr className="text-right">
//                       <th className="py-2 px-3">الإصدار</th>
//                       <th className="py-2 px-3">الملف</th>
//                       <th className="py-2 px-3">تم الرفع بواسطة</th>
//                       <th className="py-2 px-3">تاريخ الرفع</th>
//                       <th className="py-2 px-3">تنزيل</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {data.document.files.map((f) => (
//                       <tr key={f.id} className="border-b border-slate-100 last:border-none">
//                         <td className="py-2 px-3">{f.versionNumber}</td>
//                         <td className="py-2 px-3">{f.fileNameOriginal}</td>
//                         <td className="py-2 px-3">{f.uploadedBy || "—"}</td>
//                         <td className="py-2 px-3">{fmt(f.uploadedAt)}</td>
//                         <td className="py-2 px-3">
//                           <a
//                             className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900"
//                             href={f.url}
//                             download
//                           >
//                             تنزيل
//                           </a>
//                         </td>
//                       </tr>
//                     ))}
//                     {data.document.files.length === 0 && (
//                       <tr>
//                         <td className="py-4 px-3 text-center text-slate-500" colSpan={5}>
//                           لا توجد مرفقات بعد
//                         </td>
//                       </tr>
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }
