import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

const AppInitializer = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  
  // ✨ نستخدم دالة تهيئة المخزن التي سنضيفها
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // ✨ نستدعي الدالة من المخزن، وهي ستقوم بكل العمل
        await initializeAuth();
      } catch (error) {
        console.error("Initialization failed", error);
        // حتى لو فشل، يجب أن ننهي التحميل للسماح بعرض صفحة الدخول
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [initializeAuth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 text-slate-600">
        ...جاري تهيئة التطبيق
      </div>
    );
  }

  return <>{children}</>;
};

export default AppInitializer;
