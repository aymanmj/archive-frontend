// src/pages/ResetPasswordPage.tsx

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { completePasswordReset } from "../api/users";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setErr("الرمز مفقود أو غير صالح.");
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!token) return setErr("الرمز مفقود.");
    if (!newPwd || newPwd.length < 6) return setErr("الرجاء إدخال كلمة مرور من 6 أحرف على الأقل.");
    if (newPwd !== confirmPwd) return setErr("كلمتا المرور غير متطابقتين.");

    try {
      setBusy(true);
      await completePasswordReset(token, newPwd);
      setMsg("تم تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.");
      setTimeout(() => navigate("/"), 1200);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? "تعذّر إكمال العملية.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100" dir="rtl">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold text-slate-700">إعادة تعيين كلمة المرور</h1>

        {!token && <div className="text-sm text-red-600">الرمز مفقود أو غير صالح.</div>}

        <label className="block">
          <span className="text-sm text-slate-600">كلمة المرور الجديدة</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            minLength={6}
            disabled={!token}
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-600">تأكيد كلمة المرور الجديدة</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            minLength={6}
            disabled={!token}
          />
        </label>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-emerald-700">{msg}</div>}

        <button
          disabled={busy || !token}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 disabled:opacity-50"
        >
          {busy ? "جارِ التعين…" : "تعيين كلمة المرور"}
        </button>

        <div className="text-xs text-slate-600 text-center">
          <Link className="text-blue-600 hover:underline" to="/">العودة لتسجيل الدخول</Link>
        </div>
      </form>
    </div>
  );
}




// // src/pages/ResetPasswordPage.tsx

// import { useSearchParams, useNavigate } from "react-router-dom";
// import { useState } from "react";
// import { consumePasswordReset } from "../api/users";
// import { requestPasswordResetByUsername } from "../api/users";

// export default function ResetPasswordPage() {
//   const [params] = useSearchParams();
//   const navigate = useNavigate();
//   const token = params.get("token") ?? "";

//   const [pwd, setPwd] = useState("");
//   const [busy, setBusy] = useState(false);
//   const [msg, setMsg] = useState<string | null>(null);

//   const submit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!token || !pwd) return;
//     try {
//       setBusy(true);
//       await consumePasswordReset(token, pwd);
//       setMsg("تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن.");
//       setTimeout(() => navigate("/"), 1200);
//     } catch (e: any) {
//       setMsg("تعذّر تغيير كلمة المرور. تأكد من صلاحية الرابط.");
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <div className="min-h-screen grid place-items-center bg-slate-100" dir="rtl">
//       <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
//         <h1 className="text-xl font-semibold text-slate-700">تعيين كلمة مرور جديدة</h1>
//         <div className="text-xs text-slate-500 break-all">رمز الطلب: <code>{token || "—"}</code></div>

//         <label className="block">
//           <span className="text-sm text-slate-600">كلمة المرور الجديدة</span>
//           <input
//             type="password"
//             className="mt-1 w-full border rounded-lg px-3 py-2 outline-none focus:ring"
//             value={pwd}
//             onChange={(e) => setPwd(e.target.value)}
//           />
//         </label>

//         {msg && <div className="text-sm">{msg}</div>}

//         <button
//           disabled={busy || !token || !pwd}
//           className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 disabled:opacity-50"
//         >
//           {busy ? "جاري الحفظ..." : "حفظ"}
//         </button>
//       </form>
//     </div>
//   );
// }


