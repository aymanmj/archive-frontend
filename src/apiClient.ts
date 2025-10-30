import axios from 'axios';
import { useAuthStore } from './stores/authStore';

// 1. إنشاء نسخة من axios مع إعدادات أساسية
const apiClient = axios.create({
  baseURL: 'http://localhost:3000', // عنوان الخادم الخلفي
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. استخدام "معترض الطلبات" (Request Interceptor)
// هذا الكود سيعمل قبل إرسال أي طلب
apiClient.interceptors.request.use(
  (config) => {
    // قراءة التوكن مباشرة من مخزن Zustand
    const token = useAuthStore.getState().token;
    if (token) {
      // إذا وجد التوكن، أضفه إلى الهيدر
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // في حالة حدوث خطأ أثناء إعداد الطلب
    return Promise.reject(error);
  },
);

// 3. (اختياري لكن موصى به بشدة) استخدام "معترض الاستجابات" (Response Interceptor)
// هذا الكود سيعمل بعد استلام أي استجابة من الخادم
apiClient.interceptors.response.use(
  (response) => {
    // أي استجابة ناجحة (رمز الحالة 2xx) ستمر من هنا
    return response;
  },
  (error) => {
    // أي استجابة فاشلة (رمز الحالة ليس 2xx) ستمر من هنا
    if (error.response && error.response.status === 401) {
      // خطأ 401 يعني أن التوكن غير صالح أو منتهي الصلاحية
      console.log('API Client: Unauthorized access (401). Logging out.');
      // نقوم بتسجيل الخروج تلقائياً
      useAuthStore.getState().logout();
      // إعادة تحميل الصفحة لتوجيه المستخدم إلى صفحة الدخول
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
