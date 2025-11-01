// src/pages/LoginPage.tsx

import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useNavigate, useLocation } from "react-router-dom";

function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // من المخزن: login (يوحّد حفظ التوكن + بيانات المستخدم + localStorage)
  const login = useAuthStore((s) => s.login);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // لو المستخدم أصلاً مسجّل دخول، ودخل صفحة /login بالغلط—نرجعه لوجهته
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo =
        (location.state as any)?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1) طلب تسجيل الدخول
      const res = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setError("بيانات الدخول غير صحيحة");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const token = data?.accessToken;
      if (!token) {
        setError("استجابة غير متوقعة من الخادم (لا يوجد accessToken).");
        setLoading(false);
        return;
      }

      // 2) مباشرة بعد الحصول على التوكن -> جلب /users/me
      //   ملاحظة: ممكن نستخدم /auth/profile لو عندك، لكن /users/me مطابق لتدفقنا
      const meRes = await fetch("http://localhost:3000/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meRes.ok) {
        setError("فشل جلب بيانات المستخدم بعد تسجيل الدخول.");
        setLoading(false);
        return;
      }

      const meData = await meRes.json();

      // 3) نادِ أكشن واحد من المخزن يوحّد (token + user + localStorage)
      login(token, meData);

      // 4) إعادة التوجيه: إن وُجد مسار سابق (ProtectedRoute) رجّع له، وإلا للداشبورد
      const redirectTo =
        (location.state as any)?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 border border-slate-200">
        <h1 className="text-xl font-semibold text-slate-800 text-center mb-4">
          نظام الأرشيف المؤسسي
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              اسم المستخدم
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              كلمة المرور
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              dir="ltr"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 mt-6">
          © الأرشيف المؤسسي - نسخة تجريبية
        </p>
      </div>
    </div>
  );
}

export default LoginPage;



// // src/pages/LoginPage.tsx

// import { useState } from 'react';
// import { useAuthStore } from '../stores/authStore';
// import { useNavigate } from 'react-router-dom'; // ✨ سنستخدم useNavigate للتوجيه الأفضل

// function LoginPage() {
//   const [username, setUsername] = useState('admin');
//   const [password, setPassword] = useState('admin123');
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const navigate = useNavigate(); // ✨ هوك التوجيه
//   // نستدعي الإجراءات من المخزن
//   const setToken = useAuthStore((state) => state.setToken);
//   const setUser = useAuthStore((state) => state.setUser); // ✨ نحتاج setUser أيضاً

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setError('');
//     setLoading(true);

//     try {
//       // 1. طلب تسجيل الدخول
//       const res = await fetch('http://localhost:3000/auth/login', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ username, password }),
//       });

//       if (!res.ok) {
//         setError('بيانات الدخول غير صحيحة');
//         setLoading(false);
//         return;
//       }

//       const data = await res.json();
//       const token = data.accessToken;

//       // 2. تخزين التوكن
//       setToken(token);

//       // ✨ 3. جلب بيانات المستخدم فوراً
//       // نستخدم التوكن الجديد لعمل الطلب
//       const meRes = await fetch('http://localhost:3000/users/me', {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       if (meRes.ok) {
//         const userData = await meRes.json();
//         // ✨ 4. تخزين بيانات المستخدم في المخزن
//         setUser(userData);
//         // ✨ 5. التوجيه للداشبورد
//         navigate('/dashboard');
//       } else {
//         setError('فشل في جلب بيانات المستخدم');
//       }

//     } catch (err) {
//       console.error(err);
//       setError('تعذر الاتصال بالخادم');
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div dir="rtl" className="min-h-screen flex items-center justify-center p-4">
//       <div className="w-full max-w-sm bg-white rounded-xl shadow p-6 border border-slate-200">
//         <h1 className="text-xl font-semibold text-slate-800 text-center mb-4">
//           نظام الأرشيف المؤسسي
//         </h1>

//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <label className="block text-sm font-medium text-slate-700 mb-1">
//               اسم المستخدم
//             </label>
//             <input
//               className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               value={username}
//               onChange={(e) => setUsername(e.target.value)}
//               dir="ltr"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-slate-700 mb-1">
//               كلمة المرور
//             </label>
//             <input
//               className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               type="password"
//               dir="ltr"
//             />
//           </div>

//           {error && (
//             <div className="text-sm text-red-600 text-center">{error}</div>
//           )}

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
//           >
//             {loading ? 'جاري الدخول...' : 'دخول'}
//           </button>
//         </form>

//         <p className="text-[11px] text-center text-slate-400 mt-6">
//           © الأرشيف المؤسسي - نسخة تجريبية
//         </p>
//       </div>
//     </div>
//   );
// }

// export default LoginPage;

