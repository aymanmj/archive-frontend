// src/lib/api.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore'; // ✅ استيراد الـ store الخاص بك

// 1. إنشاء نسخة خاصة من axios مع الإعدادات الأساسية
const api = axios.create({
  baseURL: 'http://localhost:3000', // ✅ تأكد من أن هذا هو عنوان الخادم الصحيح
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. ✨ هذا هو الجزء السحري: المعترض (Interceptor)
// سيتم تنفيذ هذه الدالة قبل إرسال *أي* طلب باستخدام `api`
api.interceptors.request.use(
  (config) => {
    // احصل على التوكن مباشرة من zustand store
    // getState() تسمح لنا بقراءة الحالة خارج مكونات React
    const token = useAuthStore.getState().token;

    // إذا كان التوكن موجودًا، أضفه إلى ترويسة الطلب
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config; // أرجع الإعدادات المعدلة ليتم إرسال الطلب
  },
  (error) => {
    // في حال حدوث خطأ أثناء تجهيز الطلب
    return Promise.reject(error);
  }
);

// 3. ✨ (اختياري ولكنه موصى به بشدة) معترض للاستجابات
// يعالج الأخطاء الشائعة مثل انتهاء صلاحية التوكن
api.interceptors.response.use(
  (response) => response, // إذا كانت الاستجابة ناجحة (2xx)، مررها كما هي
  (error) => {
    // إذا كان الخطأ هو 401 (غير مصرح به)، فهذا يعني أن التوكن منتهي الصلاحية
    if (error.response && error.response.status === 401) {
      // قم بتسجيل خروج المستخدم تلقائيًا
      useAuthStore.getState().logout();
      // يمكنك أيضًا إعادة توجيه المستخدم إلى صفحة تسجيل الدخول
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


export default api;
