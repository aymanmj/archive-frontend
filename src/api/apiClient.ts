// src/api/apiClient.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  // لا نحتاج withCredentials لأننا نعمل بالـ Bearer token
  withCredentials: false,
});

// ألحق التوكن على كل الطلبات
api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;



// // src/apiClient.ts

// import axios from "axios";
// import { useAuthStore } from "../stores/authStore"; // ✅ كان ../stores — صُحّح

// const baseURL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

// const api = axios.create({
//   baseURL,
//   withCredentials: false,
// });

// api.interceptors.request.use((config) => {
//   const token =
//     useAuthStore.getState().token ??
//     (typeof window !== "undefined" ? localStorage.getItem("token") : null);

//   config.headers = config.headers ?? {};

//   if (token) {
//     (config.headers as any).Authorization = `Bearer ${token}`;
//   }

//   // اترك المتصفح يحدد Content-Type تلقائيًا عندما تكون البيانات FormData
//   if (typeof FormData !== "undefined" && config.data instanceof FormData) {
//     if ("Content-Type" in (config.headers as any)) {
//       delete (config.headers as any)["Content-Type"];
//     }
//   } else {
//     if (!(config.headers as any)["Content-Type"]) {
//       (config.headers as any)["Content-Type"] = "application/json";
//     }
//   }

//   return config;
// });

// api.interceptors.response.use(
//   (r) => r,
//   (err) => {
//     if (err?.response?.status === 401) {
//       try {
//         useAuthStore.getState().logout();
//       } catch {}
//       if (typeof window !== "undefined") {
//         window.location.replace("/");
//       }
//     }
//     return Promise.reject(err);
//   }
// );

// export default api;


