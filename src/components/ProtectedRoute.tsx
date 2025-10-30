import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ProtectedRoute = () => {
  // نقرأ حالة المصادقة مباشرة من المخزن
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // إذا كان المستخدم مسجل دخوله، نعرض المحتوى المطلوب (الصفحة) باستخدام <Outlet />
  // وإلا، نعيد توجيهه إلى صفحة تسجيل الدخول
  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
