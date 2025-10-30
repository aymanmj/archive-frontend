// src/apiClient.ts
import axios from "axios";
import { useAuthStore } from "./stores/authStore";

// لو عندك VITE_API_BASE_URL استعمله، وإلا استخدم localhost:3000
const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const apiClient = axios.create({
  baseURL,
  withCredentials: false,
});

// ميدلوير قبل الإرسال
apiClient.interceptors.request.use((config) => {
  // أضف التوكن إن وجد
  try {
    // ⚠️ الواجهة لا يمكنها استدعاء Zustand مباشرة من هنا،
    // لذا سنقرأ التوكن من localStorage (على افتراض authStore يخزن هناك أيضاً)
    const raw = localStorage.getItem("auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token || parsed?.token;
      if (token) {
        config.headers = config.headers || {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    // تجاهل
  }

  // لو البيانات FormData، لا تضع Content-Type إطلاقاً
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers && "Content-Type" in config.headers) {
      delete (config.headers as any)["Content-Type"];
    }
  } else {
    // غير ذلك خليه JSON افتراضياً
    config.headers = config.headers || {};
    if (!(config.headers as any)["Content-Type"]) {
      (config.headers as any)["Content-Type"] = "application/json";
    }
  }

  return config;
});

export default apiClient;
