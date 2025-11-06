// src/layout/AppLayout.tsx

import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Button from "./ui/Button";
import { useAuthStore } from "../stores/authStore";
import React, { useEffect, useState } from "react";
import { Toaster } from "sonner";
import ThemeToggle from "../components/ThemeToggle";
import { useThemeStore } from "../stores/themeStore";
import { Menu, X } from "lucide-react";

function NavItem({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "block rounded-xl px-3 py-2 text-sm transition-colors",
          "hover:bg-gray-100 dark:hover:bg-white/10",
          isActive ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-200",
        ].join(" ")
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
  const { mode, resolved, setMode } = useThemeStore();

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  // تطبيق الثيم عند أول تحميل (إن لم يُطبّق بعد)
  useEffect(() => {
    setMode(mode);
    const root = document.documentElement;
    const saved = localStorage.getItem("theme");
    if (saved === "dark") root.classList.add("dark");
    if (saved === "light") root.classList.remove("dark");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  function toggleTheme(mode: "light" | "dark") {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }


  // Drawer للموبايل
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-slate-100 transition-colors" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* زر القائمة للموبايل */}
            <button
              className="md:hidden rounded-xl border px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20"
              onClick={() => setOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="size-5" />
            </button>

            <Link to="/dashboard" className="font-bold text-lg">
              السرايا للأرشفة الإلكترونية
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400">نسخة تجريبية</span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
              مرحبًا، {user?.fullName ?? "مستخدم"}
            </span>
            <Button variant="outline" size="sm" onClick={onLogout}>
              خروج
            </Button>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar Desktop */}
          <aside className="hidden md:block bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-3 h-max sticky top-[76px]">
            <nav className="space-y-1">
              <NavItem to="/dashboard">لوحة التحكم</NavItem>
              <NavItem to="/incoming">الوارد</NavItem>
              <NavItem to="/outgoing">الصادر</NavItem>
              <NavItem to="/departments">الأقسام</NavItem>
              <NavItem to="/my-desk">طاولتي</NavItem>
            </nav>
          </aside>

          {/* Content */}
          <main>
            <Outlet />
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t dark:border-white/10 py-4 mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} السرايا للتقنية — جميع الحقوق محفوظة
      </footer>

      {/* Drawer Sidebar (Mobile) */}
      {open && (
        <div className="md:hidden">
          {/* خلفية معتمة */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* اللوحة */}
          <aside
            className="fixed top-0 bottom-0 right-0 w-[78%] max-w-[320px] bg-white dark:bg-slate-950 border-l dark:border-white/10 p-4 z-40"
            role="dialog"
            aria-label="القائمة الجانبية"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">القائمة</div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20"
                aria-label="إغلاق القائمة"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="space-y-1">
              <NavItem to="/dashboard" onClick={() => setOpen(false)}>لوحة التحكم</NavItem>
              <NavItem to="/incoming" onClick={() => setOpen(false)}>الوارد</NavItem>
              <NavItem to="/outgoing" onClick={() => setOpen(false)}>الصادر</NavItem>
              <NavItem to="/departments" onClick={() => setOpen(false)}>الأقسام</NavItem>
              <NavItem to="/my-desk" onClick={() => setOpen(false)}>طاولتي</NavItem>
            </nav>
          </aside>
        </div>
      )}

      {/* Toaster عام مع الثيم */}
      <Toaster
        position="top-center"
        duration={3000}
        dir="rtl"
        richColors
        expand
        theme={resolved === "dark" ? "dark" : "light"}
      />
    </div>
  );
}




// import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
// import Button from './ui/Button';
// import { useAuthStore } from '../stores/authStore';
// import React from 'react';
// import { Toaster } from "sonner";

// function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
//   return (
//     <NavLink
//       to={to}
//       className={({ isActive }) =>
//         [
//           'block rounded-xl px-3 py-2 text-sm transition-colors',
//           isActive
//             ? 'bg-blue-600 text-white'
//             : 'text-gray-700 hover:bg-gray-100',
//         ].join(' ')
//       }
//     >
//       {children}
//     </NavLink>
//   );
// }

// export default function AppLayout() {
//   const navigate = useNavigate();
//   const logout = useAuthStore((s) => s.logout);
//   const user = useAuthStore((s) => s.user);

//   const onLogout = () => {
//     logout();
//     navigate('/', { replace: true });
//   };

//   return (
//     <div className="min-h-screen bg-slate-50" dir="rtl">
//       {/* Header (بسيط جدًا – بدون روابط ملاحة) */}
//       <header className="sticky top-0 z-30 bg-white border-b">
//         <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
//           <div className="flex items-center gap-3">
//             <Link to="/dashboard" className="font-bold text-lg">
//               السرايا للأرشفة الإلكترونية
//             </Link>
//             <span className="text-xs text-gray-500">نسخة تجريبية</span>
//           </div>

//           <div className="flex items-center gap-2">
//             <span className="text-sm text-gray-600 hidden sm:block">
//               مرحبًا، {user?.fullName ?? 'مستخدم'}
//             </span>
//             <Button variant="outline" size="sm" onClick={onLogout}>
//               خروج
//             </Button>
//           </div>
//         </div>
//       </header>

//       {/* Layout: Sidebar + Content */}
//       <div className="container mx-auto px-4 py-6">
//         <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
//           {/* Sidebar */}
//           <aside className="bg-white border rounded-2xl p-3 h-max sticky top-[76px]">
//             <nav className="space-y-1">
//               <NavItem to="/dashboard">لوحة التحكم</NavItem>
//               <NavItem to="/incoming">الوارد</NavItem>
//               <NavItem to="/outgoing">الصادر</NavItem>
//               <NavItem to="/departments">الأقسام</NavItem>
//               <NavItem to="/my-desk">طاولتي</NavItem>
//             </nav>
//           </aside>

//           {/* Content */}
//           <main>
//             <Outlet />
//           </main>
//         </div>
//       </div>

//       <footer className="border-t py-4 mt-8 text-center text-xs text-gray-500">
//         © {new Date().getFullYear()} السرايا للتقنية — جميع الحقوق محفوظة
//       </footer>

//       {/* ✅ Toaster عام للتطبيق كله */}
//       <Toaster
//         position="top-center"
//         duration={3000}
//         dir="rtl"
//         richColors
//         expand
//       />
//     </div>
//   );
// }
