import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Button from './ui/Button';
import { useAuthStore } from '../stores/authStore';
import React from 'react';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'block rounded-xl px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-700 hover:bg-gray-100',
        ].join(' ')
      }
    >
      {children}
    </NavLink>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const onLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header (بسيط جدًا – بدون روابط ملاحة) */}
      <header className="sticky top-0 z-30 bg-white border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="font-bold text-lg">
              السرايا للأرشفة
            </Link>
            <span className="text-xs text-gray-500">نسخة تجريبية</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 hidden sm:block">
              مرحبًا، {user?.fullName ?? 'مستخدم'}
            </span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Layout: Sidebar + Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="bg-white border rounded-2xl p-3 h-max sticky top-[76px]">
            <nav className="space-y-1">
              <NavItem to="/dashboard">لوحة التحكم</NavItem>
              <NavItem to="/incoming">الوارد</NavItem>
              <NavItem to="/outgoing">الصادر</NavItem>
              <NavItem to="/departments">الأقسام</NavItem>
            </nav>
          </aside>

          {/* Content */}
          <main>
            <Outlet />
          </main>
        </div>
      </div>

      <footer className="border-t py-4 mt-8 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} السرايا للتقنية — جميع الحقوق محفوظة
      </footer>
    </div>
  );
}
