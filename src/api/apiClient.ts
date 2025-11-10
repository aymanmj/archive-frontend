// src/api/apiClient.ts

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: false,
});

// ألحق التوكن + اسم المحطة + المنطقة الزمنية على كل الطلبات
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // اسم المحطة (يمكنك تغييره من الواجهة وحفظه في localStorage)
  const ws =
    (typeof window !== "undefined" && localStorage.getItem("workstationName")) ||
    (typeof navigator !== "undefined" && navigator.userAgent
      ? `WebClient:${navigator.userAgent.slice(0, 40)}`
      : undefined);

  if (ws) {
    (config.headers as any)["X-Workstation"] = ws;
  }

  // المنطقة الزمنية للعميل (اختياري مفيد للسجلات)
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  (config.headers as any)["X-Client-Timezone"] = tz;

  // (اختياري) للدلالة أن الطلب من XHR
  (config.headers as any)["X-Requested-With"] = "XMLHttpRequest";

  return config;
});

export default api;



// // src/api/apiClient.ts

// import axios from "axios";

// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
//   // لا نحتاج withCredentials لأننا نعمل بالـ Bearer token
//   withCredentials: false,
// });

// // ألحق التوكن على كل الطلبات
// api.interceptors.request.use((config) => {
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
//   if (token) {
//     config.headers = config.headers ?? {};
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// export default api;

