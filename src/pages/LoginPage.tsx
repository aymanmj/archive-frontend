// src/pages/LoginPage.tsx

import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import api from "../api/apiClient";
import { useLocation, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location?.state?.from?.pathname ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== نافذة "نسيت كلمة المرور؟" =====
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetInput, setResetInput] = useState(""); // URL كامل أو token

  const login = useAuthStore((s) => s.login);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data } = await api.post("/auth/login", { username, password });
      const token: string = data?.token;
      if (!token) throw new Error("لم يتم استلام التوكن");

      await login(token);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "فشل تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  };

  // الانتقال إلى صفحة /reset-password عبر رابط/رمز يضعه المستخدم
  const goToReset = (e: React.FormEvent) => {
    e.preventDefault();
    const val = resetInput.trim();
    if (!val) return;

    let token = "";
    try {
      const u = new URL(val);
      token = u.searchParams.get("token") ?? "";
    } catch {
      // ليس URL؛ اعتبره token مباشر
      token = val;
    }
    if (!token) {
      alert("تعذّر استخراج الرمز. ألصق الرابط الكامل الذي وصلك أو الرمز فقط.");
      return;
    }
    navigate(`/reset?token=${encodeURIComponent(token)}`);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100" dir="rtl">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-slate-700">تسجيل الدخول</h1>

        <label className="block">
          <span className="text-sm text-slate-600">اسم المستخدم</span>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-600">كلمة المرور</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          disabled={busy}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {busy ? "جاري الدخول..." : "دخول"}
        </button>

        <div className="text-xs text-slate-600 text-center">
          نسيت كلمة المرور؟{" "}
          <button
            type="button"
            className="text-blue-600 hover:underline"
            onClick={() => setForgotOpen(true)}
          >
            استعادة كلمة المرور
          </button>
        </div>
      </form>

      {/* نافذة نسيت كلمة المرور */}
      {forgotOpen && (
        <div className="fixed inset-0 bg-black/30 grid place-items-center p-4">
          <form
            onSubmit={goToReset}
            className="w-full max-w-lg bg-white rounded-2xl shadow p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">هل لديك رابط/رمز إعادة تعيين؟</h2>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="text-slate-500"
              >
                إغلاق
              </button>
            </div>

            <label className="block">
              <span className="text-sm text-slate-600">
                ألصق الرابط الذي وصلك من مسؤول النظام أو الرمز نفسه
              </span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                placeholder="مثال: https://…/reset-password?token=… أو الرمزالصِرف"
              />
            </label>

            <div className="flex gap-3">
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2">
                متابعة
              </button>
              <button
                type="button"
                onClick={() => setForgotOpen(false)}
                className="border rounded-lg px-4 py-2"
              >
                إلغاء
              </button>
            </div>

            <div className="text-xs text-slate-500">
              لا تملك رابطًا؟ تواصل مع مسؤول النظام لإصدار رابط إعادة التعيين لحسابك.
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


// // src/pages/LoginPage.tsx

// import { useState } from "react";
// import { useAuthStore } from "../stores/authStore";
// import api from "../api/apiClient";
// import { useLocation, useNavigate } from "react-router-dom";

// export default function LoginPage() {
//   const navigate = useNavigate();
//   const location = useLocation() as any;
//   const from = location?.state?.from?.pathname ?? "/dashboard";

//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [busy, setBusy] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const login = useAuthStore((s) => s.login);

//   const onSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     setBusy(true);
//     try {
//       const { data } = await api.post("/auth/login", { username, password });
//       const token: string = data?.token;
//       if (!token) throw new Error("لم يتم استلام التوكن");

//       await login(token);

//       // لو السيرفر يقول لازم يغيّر كلمة المرور:
//       if (data?.mustChangePassword) {
//         navigate("/change-password", { replace: true });
//       } else {
//         navigate(from, { replace: true });
//       }
//     } catch (err: any) {
//       setError(err?.response?.data?.message ?? "فشل تسجيل الدخول");
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <div className="min-h-screen grid place-items-center bg-slate-100" dir="rtl">
//       <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
//         <h1 className="text-xl font-semibold text-slate-700">تسجيل الدخول</h1>

//         <label className="block">
//           <span className="text-sm text-slate-600">اسم المستخدم</span>
//           <input
//             className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring"
//             value={username}
//             onChange={(e) => setUsername(e.target.value)}
//             autoFocus
//           />
//         </label>

//         <label className="block">
//           <span className="text-sm text-slate-600">كلمة المرور</span>
//           <input
//             type="password"
//             className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//           />
//         </label>

//         {error && <div className="text-sm text-red-600">{error}</div>}

//         <button
//           disabled={busy}
//           className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50"
//         >
//           {busy ? "جاري الدخول..." : "دخول"}
//         </button>
//         <div className="text-center">
//           <a className="text-sm text-sky-700 hover:underline" href="/reset">
//             نسيت كلمة المرور؟
//           </a>
//         </div>
//       </form>
//     </div>
//   );
// }

