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
      </form>
    </div>
  );
}

