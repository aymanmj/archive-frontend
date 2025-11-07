// src/layout/AppLayout.tsx

import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Button from "./ui/Button";
import { useAuthStore } from "../stores/authStore";
import React, { useEffect, useState, useRef } from "react";
import { Toaster } from "sonner";
import ThemeToggle from "../components/ThemeToggle";
import { useThemeStore } from "../stores/themeStore";
import { Menu, X, ChevronLeft, LayoutGrid, Inbox, Send, Building2, ClipboardList } from "lucide-react";
import clsx from "clsx";

function NavItem({
  to,
  icon,
  label,
  collapsed,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
          "hover:bg-gray-100 dark:hover:bg-white/10",
          isActive ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-200"
        )
      }
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {/* نخفي النص عند الطي */}
      <span className={clsx("truncate transition-[opacity,transform] duration-200", collapsed ? "opacity-0 -translate-x-1 pointer-events-none" : "opacity-100 translate-x-0")}>
        {label}
      </span>
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

  // حالات الطي
  const [collapsed, setCollapsed] = useState(false);

  // Drawer للموبايل
  const [open, setOpen] = useState(false);

  // نرسل “resize” للرسوم عند انتهاء تحريك السايدبار (احتياط)
  const onSidebarAnimEnd = () => {
    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-slate-100 transition-colors" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 flex items-center justify-between gap-3">
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
            {/* زر طي/فتح السايدبار للديسكتوب */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden md:inline-flex rounded-xl border px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20"
              aria-label="طي/فتح القائمة"
            >
              <ChevronLeft className={clsx("size-5 transition-transform", collapsed ? "rotate-180" : "")} />
            </button>

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
      <div className="max-w-7xl mx-auto px-3 md:px-4 py-6">
        {/* ✅ أعمدة ثابتة: 224px للسايدبار + 1fr للمحتوى (لا نغيّرها إطلاقًا) */}
        <div className="grid grid-cols-1 md:grid-cols-[224px_1fr] gap-6">
          {/* Sidebar Desktop (داخل عمود ثابت) */}
          <aside className="hidden md:block h-max sticky top-[76px] -mr-1 md:-mr-2">
            {/* لوح السايدبار يُطوى داخليًا */}
            <div
              className={clsx(
                "sb-panel bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-3 w-[224px] origin-right",
                "transition-transform duration-300 will-change-transform"
              )}
              style={{
                // عند الطي نحرّك المحتوى لليسار بقدر (224 - 72) = 152px، فتبقى “سِكّة” بعرض ~72px للأيقونات
                transform: collapsed ? "translateX(152px)" : "translateX(0px)",
              }}
              onTransitionEnd={onSidebarAnimEnd}
            >
              <nav className="space-y-1">
                <NavItem to="/dashboard" icon={<LayoutGrid className="size-5" />} label="لوحة التحكم" collapsed={collapsed} />
                <NavItem to="/incoming" icon={<Inbox className="size-5" />} label="الوارد" collapsed={collapsed} />
                <NavItem to="/outgoing" icon={<Send className="size-5" />} label="الصادر" collapsed={collapsed} />
                <NavItem to="/departments" icon={<Building2 className="size-5" />} label="الأقسام" collapsed={collapsed} />
                <NavItem to="/my-desk" icon={<ClipboardList className="size-5" />} label="مكتبي" collapsed={collapsed} />
              </nav>
            </div>
          </aside>

          {/* Content — عرضه لا يتغيّر بتاتًا */}
          <main className="min-w-0">
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
              <NavLink to="/dashboard" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">لوحة التحكم</NavLink>
              <NavLink to="/incoming" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">الوارد</NavLink>
              <NavLink to="/outgoing" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">الصادر</NavLink>
              <NavLink to="/departments" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">الأقسام</NavLink>
              <NavLink to="/my-desk" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">طاولتي</NavLink>
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





// // src/layout/AppLayout.tsx

// import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
// import Button from "./ui/Button";
// import { useAuthStore } from "../stores/authStore";
// import React, { useEffect, useState, useRef } from "react";
// import { Toaster } from "sonner";
// import ThemeToggle from "../components/ThemeToggle";
// import { useThemeStore } from "../stores/themeStore";
// import { Menu, X, ChevronLeft, LayoutGrid, Inbox, Send, Building2, ClipboardList } from "lucide-react";
// import clsx from "clsx";

// function NavItem({
//   to,
//   icon,
//   label,
//   collapsed,
//   onClick,
// }: {
//   to: string;
//   icon: React.ReactNode;
//   label: string;
//   collapsed: boolean;
//   onClick?: () => void;
// }) {
//   return (
//     <NavLink
//       to={to}
//       onClick={onClick}
//       className={({ isActive }) =>
//         clsx(
//           "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
//           "hover:bg-gray-100 dark:hover:bg-white/10",
//           isActive ? "bg-blue-600 text-white" : "text-gray-700 dark:text-gray-200"
//         )
//       }
//       title={collapsed ? label : undefined}
//     >
//       <span className="shrink-0">{icon}</span>
//       {/* نخفي النص عند الطي */}
//       <span className={clsx("truncate transition-[opacity,transform] duration-200", collapsed ? "opacity-0 -translate-x-1 pointer-events-none" : "opacity-100 translate-x-0")}>
//         {label}
//       </span>
//     </NavLink>
//   );
// }

// export default function AppLayout() {
//   const navigate = useNavigate();
//   const logout = useAuthStore((s) => s.logout);
//   const user = useAuthStore((s) => s.user);
//   const { mode, resolved, setMode } = useThemeStore();

//   const onLogout = () => {
//     logout();
//     navigate("/", { replace: true });
//   };

//   useEffect(() => {
//     setMode(mode);
//     const root = document.documentElement;
//     const saved = localStorage.getItem("theme");
//     if (saved === "dark") root.classList.add("dark");
//     if (saved === "light") root.classList.remove("dark");
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   function toggleTheme(mode: "light" | "dark") {
//     const root = document.documentElement;
//     if (mode === "dark") {
//       root.classList.add("dark");
//       localStorage.setItem("theme", "dark");
//     } else {
//       root.classList.remove("dark");
//       localStorage.setItem("theme", "light");
//     }
//   }

//   // حالات الطي
//   const [collapsed, setCollapsed] = useState(false);

//   // Drawer للموبايل
//   const [open, setOpen] = useState(false);

//   // نرسل “resize” للرسوم عند انتهاء تحريك السايدبار (احتياط)
//   const onSidebarAnimEnd = () => {
//     requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
//   };

//   return (
//     <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-slate-100 transition-colors" dir="rtl">
//       {/* Header */}
//       <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-gray-200 dark:border-white/10">
//         <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 flex items-center justify-between gap-3">
//           <div className="flex items-center gap-3">
//             {/* زر القائمة للموبايل */}
//             <button
//               className="md:hidden rounded-xl border px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20"
//               onClick={() => setOpen(true)}
//               aria-label="فتح القائمة"
//             >
//               <Menu className="size-5" />
//             </button>

//             <Link to="/dashboard" className="font-bold text-lg">
//               السرايا للأرشفة الإلكترونية
//             </Link>
//             <span className="text-xs text-gray-500 dark:text-gray-400">نسخة تجريبية</span>
//           </div>

//           <div className="flex items-center gap-2">
//             {/* زر طي/فتح السايدبار للديسكتوب */}
//             <button
//               onClick={() => setCollapsed((c) => !c)}
//               className="hidden md:inline-flex rounded-xl border px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20"
//               aria-label="طي/فتح القائمة"
//             >
//               <ChevronLeft className={clsx("size-5 transition-transform", collapsed ? "rotate-180" : "")} />
//             </button>

//             <ThemeToggle />
//             <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
//               مرحبًا، {user?.fullName ?? "مستخدم"}
//             </span>
//             <Button variant="outline" size="sm" onClick={onLogout}>
//               خروج
//             </Button>
//           </div>
//         </div>
//       </header>

//       {/* Layout */}
//       <div className="max-w-7xl mx-auto px-3 md:px-4 py-6">
//         {/* ✅ أعمدة ثابتة: 224px للسايدبار + 1fr للمحتوى (لا نغيّرها إطلاقًا) */}
//         <div className="grid grid-cols-1 md:grid-cols-[224px_1fr] gap-6">
//           {/* Sidebar Desktop (داخل عمود ثابت) */}
//           <aside className="hidden md:block h-max sticky top-[76px] -mr-1 md:-mr-2">
//             {/* لوح السايدبار يُطوى داخليًا */}
//             <div
//               className={clsx(
//                 "sb-panel bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-3 w-[224px] origin-right",
//                 "transition-transform duration-300 will-change-transform"
//               )}
//               style={{
//                 // عند الطي نحرّك المحتوى لليسار بقدر (224 - 72) = 152px، فتبقى “سِكّة” بعرض ~72px للأيقونات
//                 transform: collapsed ? "translateX(152px)" : "translateX(0px)",
//               }}
//               onTransitionEnd={onSidebarAnimEnd}
//             >
//               <nav className="space-y-1">
//                 <NavItem to="/dashboard" icon={<LayoutGrid className="size-5" />} label="لوحة التحكم" collapsed={collapsed} />
//                 <NavItem to="/incoming" icon={<Inbox className="size-5" />} label="الوارد" collapsed={collapsed} />
//                 <NavItem to="/outgoing" icon={<Send className="size-5" />} label="الصادر" collapsed={collapsed} />
//                 <NavItem to="/departments" icon={<Building2 className="size-5" />} label="الأقسام" collapsed={collapsed} />
//                 <NavItem to="/my-desk" icon={<ClipboardList className="size-5" />} label="مكتبي" collapsed={collapsed} />
//               </nav>
//             </div>
//           </aside>

//           {/* Content — عرضه لا يتغيّر بتاتًا */}
//           <main className="min-w-0">
//             <Outlet />
//           </main>
//         </div>
//       </div>

//       {/* Footer */}
//       <footer className="border-t dark:border-white/10 py-4 mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
//         © {new Date().getFullYear()} السرايا للتقنية — جميع الحقوق محفوظة
//       </footer>

//       {/* Drawer Sidebar (Mobile) */}
//       {open && (
//         <div className="md:hidden">
//           {/* خلفية معتمة */}
//           <div
//             className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
//             onClick={() => setOpen(false)}
//             aria-hidden="true"
//           />
//           {/* اللوحة */}
//           <aside
//             className="fixed top-0 bottom-0 right-0 w-[78%] max-w-[320px] bg-white dark:bg-slate-950 border-l dark:border-white/10 p-4 z-40"
//             role="dialog"
//             aria-label="القائمة الجانبية"
//           >
//             <div className="flex items-center justify-between mb-4">
//               <div className="font-bold">القائمة</div>
//               <button
//                 onClick={() => setOpen(false)}
//                 className="rounded-xl border px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20"
//                 aria-label="إغلاق القائمة"
//               >
//                 <X className="size-5" />
//               </button>
//             </div>
//             <nav className="space-y-1">
//               <NavLink to="/dashboard" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">لوحة التحكم</NavLink>
//               <NavLink to="/incoming" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">الوارد</NavLink>
//               <NavLink to="/outgoing" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">الصادر</NavLink>
//               <NavLink to="/departments" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">الأقسام</NavLink>
//               <NavLink to="/my-desk" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">طاولتي</NavLink>
//             </nav>
//           </aside>
//         </div>
//       )}

//       {/* Toaster عام مع الثيم */}
//       <Toaster
//         position="top-center"
//         duration={3000}
//         dir="rtl"
//         richColors
//         expand
//         theme={resolved === "dark" ? "dark" : "light"}
//       />
//     </div>
//   );
// }



// // src/layout/AppLayout.tsx

// import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
// import React, { useEffect, useMemo, useState } from "react";
// import { Toaster } from "sonner";
// import { useAuthStore } from "../stores/authStore";
// import { useThemeStore } from "../stores/themeStore";
// import ThemeToggle from "../components/ThemeToggle";
// import Button from "./ui/Button";
// import {
//   Menu, X, ChevronLeft, ChevronRight,
//   LayoutDashboard, Inbox, Send, Building2, ClipboardList
// } from "lucide-react";

// type NavConf = { to: string; label: string; icon: React.ReactNode; };

// function RtlAwareChevron({ collapsed }: { collapsed: boolean }) {
//   // في RTL، الاتجاه معكوس
//   return (
//     <span className="inline-flex items-center justify-center">
//       {/* عند RTL نعرض السهم المناسب */}
//       {collapsed ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
//     </span>
//   );
// }

// function NavItem({
//   to, label, icon, collapsed, onClick,
// }: { to: string; label: string; icon: React.ReactNode; collapsed: boolean; onClick?: () => void }) {
//   return (
//     <NavLink
//       to={to}
//       onClick={onClick}
//       title={collapsed ? label : undefined}
//       className={({ isActive }) =>
//         [
//           "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//           "hover:bg-gray-100 dark:hover:bg-white/10",
//           isActive ? "bg-blue-600 text-white hover:bg-blue-600/90" : "text-gray-700 dark:text-gray-200",
//         ].join(" ")
//       }
//     >
//       <span className="shrink-0">{icon}</span>
//       <span className={["truncate transition-opacity", collapsed ? "opacity-0 pointer-events-none w-0" : "opacity-100"].join(" ")}>
//         {label}
//       </span>
//     </NavLink>
//   );
// }

// export default function AppLayout() {
//   const navigate = useNavigate();
//   const { mode, resolved, setMode } = useThemeStore();

//   const { logout, user } = useAuthStore();

//   const onLogout = () => { logout(); navigate("/", { replace: true }); };

//   // تطبيق الثيم عند أول تحميل
//   useEffect(() => {
//     setMode(mode);
//     const root = document.documentElement;
//     const saved = localStorage.getItem("theme");
//     if (saved === "dark") root.classList.add("dark");
//     if (saved === "light") root.classList.remove("dark");
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ===== Sidebar collapse (desktop) =====
//   const [collapsed, setCollapsed] = useState<boolean>(() => {
//     const v = localStorage.getItem("sidebar:collapsed");
//     return v === "1";
//   });

//   useEffect(() => {
//     localStorage.setItem("sidebar:collapsed", collapsed ? "1" : "0");
//   }, [collapsed]);

//   // Drawer للموبايل
//   const [open, setOpen] = useState(false);

//   const navs: NavConf[] = useMemo(() => ([
//     { to: "/dashboard",   label: "لوحة التحكم", icon: <LayoutDashboard className="size-5" /> },
//     { to: "/incoming",    label: "الوارد",       icon: <Inbox className="size-5" /> },
//     { to: "/outgoing",    label: "الصادر",       icon: <Send className="size-5" /> },
//     { to: "/departments", label: "الأقسام",      icon: <Building2 className="size-5" /> },
//     { to: "/my-desk",     label: "مكتبي",        icon: <ClipboardList className="size-5" /> },
//   ]), []);

//   // عرض العمود الأيسر بثبات عرض، مع شبكة عمودين
//   const sidebarWidth = collapsed ? 80 : 224;

//   return (
//     <div className="min-h-screen bg-slate-50 dark:bg-slate-900 dark:text-slate-100 transition-colors" dir="rtl">
//       {/* Header */}
//       <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-gray-200 dark:border-white/10">
//         <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
//           <div className="flex items-center gap-3">
//             {/* زر القائمة للجوال */}
//             <button
//               className="md:hidden rounded-xl border px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20"
//               onClick={() => setOpen(true)}
//               aria-label="فتح القائمة"
//             >
//               <Menu className="size-5" />
//             </button>

//             <Link to="/dashboard" className="font-bold text-lg">
//               السرايا للأرشفة الإلكترونية
//             </Link>
//             <span className="text-xs text-gray-500 dark:text-gray-400">نسخة تجريبية</span>
//           </div>

//           <div className="flex items-center gap-2">
//             <ThemeToggle />
//             <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
//               مرحبًا، {user?.fullName ?? "مستخدم"}
//             </span>
//             <Button variant="outline" size="sm" onClick={onLogout}>
//               خروج
//             </Button>
//           </div>
//         </div>
//       </header>

//       {/* Layout */}
//       <div className="max-w-7xl mx-auto px-4 py-6">
//         {/*<div
//           className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6"
//           style={{ gridTemplateColumns: `minmax(0, ${sidebarWidth}px) 1fr` }}
//         >*/}
//         <div
//           className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 transition-[grid-template-columns] duration-300"
//           style={
//             {
//               // نمرّر عرض العمود الأول عبر متغيّر ثم نستخدمه في grid-template-columns
//               ['--sbw' as any]: collapsed ? '80px' : '224px',
//               gridTemplateColumns: 'var(--sbw) 1fr',
//             } as React.CSSProperties
//           }

//           onTransitionEnd={(e) => {
//             if (e.propertyName === 'grid-template-columns') {
//               // يجبر Chart.js يعيد حساب الأبعاد فورًا
//               window.dispatchEvent(new Event('resize'));
//             }
//           }}
//         >
//           {/* Sidebar Desktop */}
//           {/*<aside
//             className={[
//               "hidden md:flex flex-col bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-3 h-max sticky top-[76px] transition-[width] duration-300",
//             ].join(" ")}
//             style={{ width: sidebarWidth }}
//           >*/}
//           <aside
//             className="hidden md:flex flex-col sticky top-[76px] z-10 w-full w-full bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-3 h-max sticky top-[76px]"
//           >
//             {/* رأس السايدبار */}
//             <div className="flex items-center justify-between mb-2">
//               <div className={["text-sm font-bold truncate transition-opacity", collapsed ? "opacity-0 w-0" : "opacity-100"].join(" ")}>
//                 القائمة
//               </div>
//               <button
//                 onClick={() => setCollapsed((v) => !v)}
//                 className="rounded-xl border px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20"
//                 aria-label={collapsed ? "توسيع القائمة" : "طي القائمة"}
//                 title={collapsed ? "توسيع" : "طي"}
//               >
//                 <RtlAwareChevron collapsed={collapsed} />
//               </button>
//             </div>

//             {/* الروابط */}
//             <nav className="space-y-1">
//               {navs.map((n) => (
//                 <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} collapsed={collapsed} />
//               ))}
//             </nav>

//             {/* تلميح عند الطي */}
//             {collapsed && (
//               <div className="mt-3 text-[10px] text-center text-gray-400 select-none">
//                 حرّك المؤشر لعرض التلميحات
//               </div>
//             )}
//           </aside>

//           {/* Content */}
//           <main>
//             <Outlet />
//           </main>
//         </div>
//       </div>

//       {/* Footer */}
//       <footer className="border-t dark:border-white/10 py-4 mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
//         © {new Date().getFullYear()} السرايا للتقنية — جميع الحقوق محفوظة
//       </footer>

//       {/* Drawer Sidebar (Mobile) */}
//       {open && (
//         <div className="md:hidden">
//           {/* خلفية */}
//           <div
//             className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
//             onClick={() => setOpen(false)}
//             aria-hidden="true"
//           />
//           {/* اللوحة */}
//           <aside
//             className="fixed top-0 bottom-0 right-0 w-[78%] max-w-[320px] bg-white dark:bg-slate-950 border-l dark:border-white/10 p-4 z-40"
//             role="dialog"
//             aria-label="القائمة الجانبية"
//           >
//             <div className="flex items-center justify-between mb-4">
//               <div className="font-bold">القائمة</div>
//               <button
//                 onClick={() => setOpen(false)}
//                 className="rounded-xl border px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/10 dark:border-white/20"
//                 aria-label="إغلاق القائمة"
//               >
//                 <X className="size-5" />
//               </button>
//             </div>
//             <nav className="space-y-1">
//               {navs.map((n) => (
//                 <NavLink
//                   key={n.to}
//                   to={n.to}
//                   onClick={() => setOpen(false)}
//                   className={({ isActive }) =>
//                     [
//                       "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
//                       "hover:bg-gray-100 dark:hover:bg-white/10",
//                       isActive ? "bg-blue-600 text-white hover:bg-blue-600/90" : "text-gray-700 dark:text-gray-200",
//                     ].join(" ")
//                   }
//                 >
//                   {n.icon}
//                   <span className="truncate">{n.label}</span>
//                 </NavLink>
//               ))}
//             </nav>
//           </aside>
//         </div>
//       )}

//       {/* Toaster */}
//       <Toaster
//         position="top-center"
//         duration={3000}
//         dir="rtl"
//         richColors
//         expand
//         theme={resolved === "dark" ? "dark" : "light"}
//       />
//     </div>
//   );
// }


