// src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

type ProtectedRouteProps = {
  /** أدوار مطلوبة اختياريًا */
  roles?: string[];
  /** عرض شاشة تحميل أثناء التهيئة */
  fallback?: React.ReactNode;
};

export default function ProtectedRoute({ roles, fallback }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isInitialized  = useAuthStore((s) => s.isInitialized);
  const user           = useAuthStore((s) => s.user);

  // أثناء التهيئة الأولى لا نقرر شيء (يمنع وميض أو إعادة توجيه خاطئة)
  if (!isInitialized) {
    return (
      fallback ?? (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 text-slate-600">
          ...جاري التحميل
        </div>
      )
    );
  }

  // لو غير مصادق → إلى صفحة الدخول + نحفظ الوجهة للرجوع بعد الدخول
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // لو محدد أدوار مطلوبة
  if (roles && roles.length > 0) {
    const hasRole = user?.roles?.some((r) => roles.includes(r));
    if (!hasRole) {
      // ليس لديه صلاحية
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}




// import { Navigate, Outlet } from 'react-router-dom';
// import { useAuthStore } from '../stores/authStore';

// const ProtectedRoute = () => {
//   // نقرأ حالة المصادقة مباشرة من المخزن
//   const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

//   // إذا كان المستخدم مسجل دخوله، نعرض المحتوى المطلوب (الصفحة) باستخدام <Outlet />
//   // وإلا، نعيد توجيهه إلى صفحة تسجيل الدخول
//   return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
// };

// export default ProtectedRoute;
