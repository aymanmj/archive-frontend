// src/auth.ts
import { useAuthStore } from "./stores/authStore";

export function getToken(): string | null {
  const zToken = useAuthStore.getState().token;
  if (zToken) return zToken;

  if (typeof window !== "undefined") {
    const ls = localStorage.getItem("token");
    return ls ?? null;
  }
  return null;
}

/**
 * تهيئة المصادقة عند بدء التطبيق:
 * - تحميل التوكن من localStorage (إن وجد)
 * - وضعه في Zustand
 * - محاولة جلب /users/me لتهيئة بيانات المستخدم (اختياري)
 * ملاحظة: نستخدم fetch هنا لتجنّب circular import مع apiClient.
 */
export async function initializeAuth(): Promise<void> {
  if (typeof window === "undefined") return;

  const token = localStorage.getItem("token");
  if (!token) {
    // تأكد من تفريغ الحالة لو ما فيش توكن
    useAuthStore.getState().logout();
    return;
  }

  // ضَع التوكن في Zustand حتى قبل جلب /users/me
  useAuthStore.getState().setToken(token);

  try {
    const res = await fetch("http://localhost:3000/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // توكن غير صالح/منتهي
      useAuthStore.getState().logout();
      return;
    }

    const me = await res.json();
    useAuthStore.getState().setUser(me);
  } catch {
    // في حالة شبكة/سيرفر؛ على الأقل خلّي التوكن موجود لحين نجاح أول طلب لاحق
  }
}



// // src/auth.ts

// const TOKEN_KEY = "archive_token";

// export function saveToken(token: string) {
//   localStorage.setItem(TOKEN_KEY, token);
// }

// export function getToken(): string | null {
//   return localStorage.getItem(TOKEN_KEY);
// }

// export function clearToken() {
//   localStorage.removeItem(TOKEN_KEY);
// }
