import React from 'react';
import { useAuthStore } from '../../stores/authStore';

export default function Topbar() {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500" />
          <div>
            <div className="font-semibold">السرايا للتقنية</div>
            <div className="text-xs text-gray-500">نظام الوارد والصادر والأرشفة</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {user?.fullName ? `مرحبًا، ${user.fullName}` : '—'}
          </div>
          <button
            onClick={logout}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="تسجيل الخروج"
          >
            خروج
          </button>
        </div>
      </div>
    </header>
  );
}
