// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import React from 'react';

type ProtectedRouteProps = {
  roles?: string[];
  fallback?: React.ReactNode;
};

export default function ProtectedRoute({ roles, fallback }: ProtectedRouteProps) {
  const location        = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitializing  = useAuthStore((s) => s.isInitializing);
  const user            = useAuthStore((s) => s.user);

  // أثناء تهيئة الجلسة: لا نقرر شيئًا (يمنع الوميض والتوجيه المبكر)
  if (isInitializing) {
    return (
      fallback ?? (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 text-slate-600" dir="rtl">
          ...جاري التحميل
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (roles?.length) {
    const ok = user?.roles?.some((r) => roles.includes(r));
    if (!ok) return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}




// // src/components/ProtectedRoute.tsx

// import { Navigate, Outlet, useLocation } from 'react-router-dom';
// import { useAuthStore } from '../stores/authStore';
// import AppLayout from './layout/AppLayout';

// type ProtectedRouteProps = {
//   roles?: string[];
//   fallback?: React.ReactNode;
// };

// export default function ProtectedRoute({ roles, fallback }: ProtectedRouteProps) {
//   const location        = useLocation();
//   const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
//   const isInitializing  = useAuthStore((s) => s.isInitializing);
//   const user            = useAuthStore((s) => s.user);

//   // أثناء تهيئة الجلسة: لا نقرر شيئًا (يمنع الوميض)
//   if (isInitializing) {
//     return (
//       fallback ?? (
//         <div className="flex items-center justify-center min-h-screen bg-slate-100 text-slate-600" dir="rtl">
//           ...جاري التحميل
//         </div>
//       )
//     );
//   }

//   // غير مصدّق → إلى صفحة الدخول، مع حفظ الوجهة
//   if (!isAuthenticated) {
//     return <Navigate to="/" replace state={{ from: location }} />;
//   }

//   // التحقق من الأدوار إن طُلب
//   if (roles?.length) {
//     const userRoles: string[] | undefined =
//       (user as any)?.roles ?? (user as any)?.UserRole?.map((ur: any) => ur?.Role?.roleName) ?? undefined;

//     const allowed = userRoles?.some((r) => roles.includes(r));
//     if (!allowed) return <Navigate to="/dashboard" replace />;
//   }

//   // ✅ تغليف الصفحات المحمية بالـ Layout (Topbar + Sidebar)
//   return (
//     <AppLayout>
//       <Outlet />
//     </AppLayout>
//   );
// }


