// src/components/AppLayout.tsx

import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Button from "./ui/Button";
import { useAuthStore } from "../stores/authStore";
import React, { useEffect, useState } from "react";
import { Toaster } from "sonner";
import ThemeToggle from "./ThemeToggle";
import { useThemeStore } from "../stores/themeStore";
import { Menu, X, ChevronLeft } from "lucide-react";
import clsx from "clsx";
import { usePermissions } from "../permissions/PermissionsContext";

function NavItem({
  to,
  icon,
  label,
  collapsed,
  onClick,
  children,
}: {
  to: string;
  icon?: React.ReactNode;
  label?: string;
  collapsed?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const text = label ?? (typeof children === "string" ? children : undefined);
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
      title={collapsed ? text : undefined}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span
        className={clsx(
          "truncate transition-[opacity,transform] duration-200",
          collapsed ? "opacity-0 -translate-x-1 pointer-events-none" : "opacity-100 translate-x-0"
        )}
      >
        {text ?? children}
      </span>
    </NavLink>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { mode, resolved, setMode } = useThemeStore();

  // ⬅️ صلاحيات
  const { ready, has } = usePermissions();

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

  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  // Skeleton للقائمة أثناء تحميل/مزامنة الصلاحيات
  const SidebarSkeleton = (
    <div className="space-y-2">
      <div className="h-8 rounded-lg bg-gray-100 dark:bg-white/10 animate-pulse" />
      <div className="h-8 rounded-lg bg-gray-100 dark:bg-white/10 animate-pulse" />
      <div className="h-8 rounded-lg bg-gray-100 dark:bg-white/10 animate-pulse" />
    </div>
  );

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
              className="hidden md:inline-flex rounded-xl border px-2 py-2 hover:bg-gray-50 dark:hover:bg:white/10 dark:border-white/20"
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
        <div className="grid grid-cols-1 md:grid-cols-[224px_1fr] gap-6">
          {/* Sidebar Desktop */}
          <aside className="hidden md:block bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-3 h-max sticky top-[76px]">
            {!ready ? (
              SidebarSkeleton
            ) : (
              <nav className="space-y-1">
                <NavItem to="/dashboard">لوحة التحكم</NavItem>

                {has("incoming.read") && <NavItem to="/incoming">الوارد</NavItem>}
                {has("outgoing.read") && <NavItem to="/outgoing">الصادر</NavItem>}
                {has("departments.read") && <NavItem to="/departments">الأقسام</NavItem>}
                {has("users.read") && <NavItem to="/my-desk">مكتبي</NavItem>}
                {has("audit.read") && <NavItem to="/audit">سجل التدقيق</NavItem>}
                {has("admin.rbac") && <NavItem to="/rbac">إدارة الصلاحيات</NavItem>}
                {has("users.manage") && <NavItem to="/usersadmin">إدارة المستخدمين</NavItem>}
              </nav>
            )}
          </aside>

          {/* Content */}
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
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
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
            {!ready ? (
              <div className="space-y-2">
                <div className="h-8 rounded-lg bg-gray-100 dark:bg-white/10 animate-pulse" />
                <div className="h-8 rounded-lg bg-gray-100 dark:bg:white/10 animate-pulse" />
              </div>
            ) : (
              <nav className="space-y-1">
                <NavLink to="/dashboard" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">
                  لوحة التحكم
                </NavLink>
                {has("incoming.read") && (
                  <NavLink to="/incoming" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">
                    الوارد
                  </NavLink>
                )}
                {has("outgoing.read") && (
                  <NavLink to="/outgoing" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">
                    الصادر
                  </NavLink>
                )}
                {has("departments.read") && (
                  <NavLink to="/departments" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">
                    الأقسام
                  </NavLink>
                )}
                {has("users.read") && (
                  <NavLink to="/my-desk" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">
                    مكتبي
                  </NavLink>
                )}
                {has("audit.read") && (
                  <NavLink to="/audit" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">
                    سجل التدقيق
                  </NavLink>
                )}
                {has("admin.rbac") && (
                  <NavLink to="/rbac" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">
                    إدارة الصلاحيات
                  </NavLink>
                )}
                {has("users.manage") && (
                  <NavLink to="/usersadmin" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">
                    إدارة المستخدمين
                  </NavLink>
                )}
              </nav>
            )}
          </aside>
        </div>
      )}

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



// // src/components/AppLayout.tsx

// import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
// import Button from "./ui/Button";
// import { useAuthStore } from "../stores/authStore";
// import PermissionsGate from "./PermissionsGate";
// import React, { useEffect, useState } from "react";
// import { Toaster } from "sonner";
// import ThemeToggle from "./ThemeToggle";
// import { useThemeStore } from "../stores/themeStore";
// import { Menu, X, ChevronLeft } from "lucide-react";
// import clsx from "clsx";

// function NavItem({
//   to,
//   icon,
//   label,
//   collapsed,
//   onClick,
//   children,
// }: {
//   to: string;
//   icon?: React.ReactNode;
//   label?: string;
//   collapsed?: boolean;
//   onClick?: () => void;
//   children?: React.ReactNode;
// }) {
//   const text = label ?? (typeof children === "string" ? children : undefined);
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
//       title={collapsed ? text : undefined}
//     >
//       {icon && <span className="shrink-0">{icon}</span>}
//       <span
//         className={clsx(
//           "truncate transition-[opacity,transform] duration-200",
//           collapsed ? "opacity-0 -translate-x-1 pointer-events-none" : "opacity-100 translate-x-0"
//         )}
//       >
//         {text ?? children}
//       </span>
//     </NavLink>
//   );
// }

// export default function AppLayout() {
//   const navigate = useNavigate();
//   const logout = useAuthStore((s) => s.logout);
//   const user = useAuthStore((s) => s.user);
//   const { mode, resolved, setMode } = useThemeStore();
//   const isInit = useAuthStore((s) => s.isInitializing);

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

//   const [collapsed, setCollapsed] = useState(false);
//   const [open, setOpen] = useState(false);

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
//         <div className="grid grid-cols-1 md:grid-cols-[224px_1fr] gap-6">
//           {/* Sidebar Desktop */}
//           <aside className="hidden md:block bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-3 h-max sticky top-[76px]">
//             {isInit ? (
//               <div className="space-y-2">
//                 <div className="h-8 rounded-lg bg-gray-100 dark:bg-white/10 animate-pulse" />
//                 <div className="h-8 rounded-lg bg-gray-100 dark:bg-white/10 animate-pulse" />
//                 <div className="h-8 rounded-lg bg-gray-100 dark:bg-white/10 animate-pulse" />
//               </div>
//             ) : (
//               <nav className="space-y-1">
//                 <NavItem to="/dashboard">لوحة التحكم</NavItem>

//                 <PermissionsGate one="incoming.read">
//                   <NavItem to="/incoming">الوارد</NavItem>
//                 </PermissionsGate>

//                 <PermissionsGate one="outgoing.read">
//                   <NavItem to="/outgoing">الصادر</NavItem>
//                 </PermissionsGate>

//                 <PermissionsGate one="departments.read">
//                   <NavItem to="/departments">الأقسام</NavItem>
//                 </PermissionsGate>

//                 <PermissionsGate one="users.read">
//                   <NavItem to="/my-desk">مكتبي</NavItem>
//                 </PermissionsGate>

//                 <PermissionsGate one="audit.read">
//                   <NavItem to="/audit">سجل التدقيق</NavItem>
//                 </PermissionsGate>
//                 <PermissionsGate one="admin.rbac">
//                   <NavItem to="/rbac">إدارة الصلاحيات</NavItem>
//                 </PermissionsGate>
//                 <PermissionsGate one="users.manage">
//                   <NavItem to="/usersadmin">إدارة المستخدمين</NavItem>
//                 </PermissionsGate>
//               </nav>
//             )}
//           </aside>

//           {/* Content */}
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
//           <div
//             className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
//             onClick={() => setOpen(false)}
//             aria-hidden="true"
//           />
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
//               <NavLink to="/my-desk" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 hover:bg-gray-100">مكتبي</NavLink>
//             </nav>
//           </aside>
//         </div>
//       )}

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

