import { useEffect, useState } from "react";
import { getToken } from "../auth";

type Department = {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
};

function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  async function loadDepartments() {
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");

    const token = getToken();
    if (!token) {
      window.location.href = "/";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/departments", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        setErrorMsg("تعذر تحميل الإدارات");
        setLoading(false);
        return;
      }

      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      setErrorMsg("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("يرجى إدخال اسم الإدارة");
      return;
    }

    const token = getToken();
    if (!token) {
      window.location.href = "/";
      return;
    }

    try {
      const res = await fetch("http://localhost:3000/departments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        setErrorMsg("تعذر إضافة الإدارة");
        return;
      }

      setName("");
      setInfoMsg("تمت إضافة الإدارة بنجاح ✅");
      await loadDepartments();
    } catch (err) {
      setErrorMsg("خطأ في الاتصال بالخادم");
    }
  }

  async function toggleStatus(dep: Department) {
    const token = getToken();
    if (!token) {
      window.location.href = "/";
      return;
    }

    const newStatus = dep.status === "Active" ? "Inactive" : "Active";

    try {
      const res = await fetch(
        `http://localhost:3000/departments/${dep.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!res.ok) {
        setErrorMsg("تعذر تحديث حالة الإدارة");
        return;
      }

      setInfoMsg("تم تحديث الحالة ✅");
      await loadDepartments();
    } catch (err) {
      setErrorMsg("خطأ في الاتصال بالخادم");
    }
  }

  useEffect(() => {
    loadDepartments();
  }, []);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-100 text-slate-800 p-6"
    >
      <div className="max-w-4xl mx-auto space-y-6">

        {/* العنوان + رجوع للداشبورد */}
        <div className="flex items-start justify-between">
          <div className="text-right">
            <h1 className="text-2xl font-semibold text-slate-800">
              إدارات المؤسسة
            </h1>
            <p className="text-sm text-slate-500">
              إضافة وتفعيل/تعطيل الإدارات
            </p>
          </div>

          <a
            href="/dashboard"
            className="text-xs bg-slate-500 text-white px-3 py-1.5 rounded-lg hover:bg-slate-600"
          >
            ← الرجوع للوحة التحكم
          </a>
        </div>

        {/* رسائل التنبيه */}
        {errorMsg && (
          <div className="bg-red-100 text-red-700 text-sm p-3 rounded-lg text-right">
            {errorMsg}
          </div>
        )}
        {infoMsg && (
          <div className="bg-green-100 text-green-700 text-sm p-3 rounded-lg text-right">
            {infoMsg}
          </div>
        )}

        {/* فورم إضافة إدارة */}
        <form
          onSubmit={handleAdd}
          className="bg-white border border-slate-200 rounded-xl shadow p-4 text-right space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              اسم الإدارة الجديدة
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: إدارة الشؤون القانونية"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition"
          >
            إضافة الإدارة
          </button>
        </form>

        {/* جدول الإدارات */}
        <div className="bg-white border border-slate-200 rounded-xl shadow p-4 text-right">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700">
              قائمة الإدارات
            </h2>
            {loading && (
              <span className="text-xs text-slate-500">...جاري التحديث</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-600 border-b border-slate-200">
                <tr className="text-right">
                  <th className="py-2 px-3">المعرف</th>
                  <th className="py-2 px-3">الاسم</th>
                  <th className="py-2 px-3">الحالة</th>
                  <th className="py-2 px-3">عدد الموظفين</th>
                  <th className="py-2 px-3">تاريخ الإنشاء</th>
                  <th className="py-2 px-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dep) => (
                  <tr
                    key={dep.id}
                    className="border-b border-slate-100 last:border-none"
                  >
                    <td className="py-2 px-3">{dep.id}</td>
                    <td className="py-2 px-3">{dep.name}</td>
                    <td className="py-2 px-3">
                      {dep.status === "Active" ? (
                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 text-xs font-medium px-2 py-0.5 rounded">
                          نشط <span>✅</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-200 text-xs font-medium px-2 py-0.5 rounded">
                          موقوف <span>⏸</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {dep._count?.users ?? 0}
                    </td>
                    <td className="py-2 px-3">
                      {new Date(dep.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => toggleStatus(dep)}
                        className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-900"
                      >
                        {dep.status === "Active" ? "تعطيل" : "تفعيل"}
                      </button>
                    </td>
                  </tr>
                ))}

                {departments.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center text-slate-500 py-6"
                    >
                      لا توجد إدارات بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

export default DepartmentsPage;
