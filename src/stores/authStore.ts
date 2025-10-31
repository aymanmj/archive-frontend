// src/stores/authStore.ts
import { create } from "zustand";

type Dept = { id: number; name: string } | null;

export type CurrentUser = {
  id: number;
  fullName: string;
  username: string;
  isActive: boolean;
  department: Dept;
  roles: string[];
} | null;

type AuthState = {
  token: string | null;
  user: CurrentUser;
  isAuthenticated: boolean;

  // actions
  setToken: (token: string | null) => void;
  setUser: (user: CurrentUser) => void;
  login: (token: string, user?: CurrentUser) => void;
  logout: () => void;

  // initialize on app start
  initializeAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setToken: (token) => set({ token, isAuthenticated: !!token }),
  setUser: (user) => set({ user }),

  login: (token, user) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
    set({ token, user: user ?? get().user, isAuthenticated: true });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  initializeAuth: async () => {
    if (typeof window === "undefined") return;

    const lsToken = localStorage.getItem("token");
    if (!lsToken) {
      // لا يوجد توكن مخزّن
      set({ token: null, user: null, isAuthenticated: false });
      return;
    }

    // اجعل التوكن متاحًا فورًا لباقي الصفحات
    set({ token: lsToken, isAuthenticated: true });

    try {
      // جرّب تحميل بيانات المستخدم
      const res = await fetch("http://localhost:3000/users/me", {
        headers: { Authorization: `Bearer ${lsToken}` },
      });

      if (!res.ok) {
        // توكن منتهي/غير صالح
        localStorage.removeItem("token");
        set({ token: null, user: null, isAuthenticated: false });
        return;
      }

      const me = await res.json();
      set({ user: me, isAuthenticated: true });
    } catch {
      // مشكلة شبكة: اترك التوكن في الحالة ولكن بدون user
      // يمكن الطلبات التالية أن تنجح عندما يعود السيرفر
    }
  },
}));




// // src/stores/authStore.ts
// import { create } from "zustand";

// type UserInfo = {
//   id: number;
//   fullName: string;
//   username?: string;
//   department?: { id: number; name: string } | null;
//   roles?: string[];
// } | null;

// type AuthState = {
//   token: string | null;
//   user: UserInfo;
//   login: (token: string, user: UserInfo) => void;
//   logout: () => void;
//   setToken: (token: string | null) => void;
//   setUser: (user: UserInfo) => void;
// };

// // hydrate initial state from localStorage once (safe on client)
// const initialToken =
//   typeof window !== "undefined" ? localStorage.getItem("token") : null;

// export const useAuthStore = create<AuthState>((set) => ({
//   token: initialToken,
//   user: null,

//   setToken: (token) => {
//     if (typeof window !== "undefined") {
//       if (token) localStorage.setItem("token", token);
//       else localStorage.removeItem("token");
//     }
//     set({ token });
//   },

//   setUser: (user) => set({ user }),

//   login: (token, user) => {
//     if (typeof window !== "undefined") {
//       localStorage.setItem("token", token);
//     }
//     set({ token, user });
//   },

//   logout: () => {
//     if (typeof window !== "undefined") {
//       localStorage.removeItem("token");
//     }
//     set({ token: null, user: null });
//   },
// }));


// import { create } from 'zustand';
// import { persist, createJSONStorage } from 'zustand/middleware';

// type User = {
//   id: number;
//   fullName: string;
//   username: string;
//   department: { id: number; name: string } | null;
//   roles: string[];
// };

// type AuthState = {
//   token: string | null;
//   user: User | null;
//   isAuthenticated: boolean;
//   setToken: (token: string) => void;
//   setUser: (user: User) => void;
//   logout: () => void;
//   initializeAuth: () => Promise<void>; // ✨ دالة التهيئة الجديدة
// };

// export const useAuthStore = create(
//   persist<AuthState>(
//     (set, get) => ({ // ✨ نحتاج الوصول إلى `get` لقراءة الحالة الحالية
//       token: null,
//       user: null,
//       isAuthenticated: false,

//       setToken: (token: string) => {
//         set({ token, isAuthenticated: true });
//       },

//       setUser: (user: User) => {
//         set({ user });
//       },

//       logout: () => {
//         set({ token: null, user: null, isAuthenticated: false });
//       },

//       // ✨ هذا هو المنطق المركزي الجديد
//       initializeAuth: async () => {
//         // `persist` middleware يقوم تلقائياً بملء `token` من localStorage عند البدء
//         const token = get().token;

//         if (token) {
//           try {
//             const res = await fetch('http://localhost:3000/users/me', {
//               headers: {
//                 Authorization: `Bearer ${token}`,
//               },
//             });

//             if (res.ok) {
//               const userData = await res.json();
//               // التوكن صالح، نضبط المستخدم والحالة
//               set({ user: userData, isAuthenticated: true });
//             } else {
//               // التوكن غير صالح
//               set({ token: null, user: null, isAuthenticated: false });
//             }
//           } catch (error) {
//             console.error('Failed to fetch user on startup', error);
//             // فشل في الاتصال، نعتبر المستخدم غير مسجل دخوله
//             set({ token: null, user: null, isAuthenticated: false });
//           }
//         }
//         // إذا لم يكن هناك توكن، لا نفعل شيئاً، الحالة الافتراضية صحيحة
//       },
//     }),
//     {
//       name: 'auth-storage',
//       storage: createJSONStorage(() => localStorage),
//       partialize: (state) => ({ token: state.token }),
//     },
//   ),
// );
