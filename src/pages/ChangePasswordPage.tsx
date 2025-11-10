// src/pages/ChangePasswordPage.tsx

import { useState } from 'react';
import { changeOwnPassword } from '../api/users';
import { useNavigate } from 'react-router-dom';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      nav('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'تعذر تغيير كلمة المرور');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-100" dir="rtl">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-lg font-semibold">تغيير كلمة المرور</h1>

        <label className="block">
          <span className="text-sm text-slate-600">كلمة المرور الحالية</span>
          <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required />
        </label>

        <label className="block">
          <span className="text-sm text-slate-600">كلمة المرور الجديدة</span>
          <input type="password" className="mt-1 w-full border rounded-lg px-3 py-2" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength={6}/>
        </label>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">
          {busy ? 'جاري الحفظ…' : 'حفظ'}
        </button>
      </form>
    </div>
  );
}
