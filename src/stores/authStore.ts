// src/stores/authStore.ts

import { create } from "zustand";
import api from "../api/apiClient";

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
  isInitializing: boolean;

  permissions: string[];
  isLoadingPermissions: boolean;

  login: (token: string, user?: CurrentUser) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  refreshPermissions: () => Promise<string[]>;

  hasPerm: (code: string) => boolean;
  hasAllPerms: (codes: string[]) => boolean;

  // طبقة توافق مع المكونات القديمة
  can: (perm: string) => boolean;
  canAny: (perms: string[]) => boolean;
  canAll: (perms: string[]) => boolean;
};

const TOKEN_KEY = "token";
const USER_KEY = "currentUser";

function setAuthHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isInitializing: true,

  permissions: [],
  isLoadingPermissions: false,

  /** تسجيل الدخول */
  login: async (token, user) => {
    // خزن التوكن والمستخدم في localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    }

    setAuthHeader(token);
    set({ token });

    // هنا لن ننادي /users/me إطلاقاً
    const resolvedUser = user ?? null;

    set({
      user: resolvedUser,
      isAuthenticated: !!resolvedUser,
      isInitializing: false,
    });

    // جلب الصلاحيات بعد تسجيل الدخول
    try {
      await get().refreshPermissions();
    } catch {
      // لو فشلت الصلاحيات، نتركها فارغة مؤقتاً
    }
  },

  /** تسجيل الخروج */
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    setAuthHeader(null);
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isInitializing: false,
      permissions: [],
      isLoadingPermissions: false,
    });
  },

  /** تهيئة الحالة عند بدء التطبيق */
  initializeAuth: async () => {
    if (typeof window === "undefined") {
      set({ isInitializing: false });
      return;
    }

    const lsToken = localStorage.getItem(TOKEN_KEY);
    const lsUserJson = localStorage.getItem(USER_KEY);

    // لو مافيش توكن أو مافيش بيانات مستخدم مخزّنة → اعتبره غير مسجّل
    if (!lsToken || !lsUserJson) {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitializing: false,
        permissions: [],
      });
      setAuthHeader(null);
      return;
    }

    let parsedUser: CurrentUser = null;
    try {
      parsedUser = JSON.parse(lsUserJson);
    } catch {
      // لو البيانات تالفة نحذفها
      localStorage.removeItem(USER_KEY);
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitializing: false,
        permissions: [],
      });
      setAuthHeader(null);
      return;
    }

    setAuthHeader(lsToken);
    set({
      token: lsToken,
      user: parsedUser,
      isAuthenticated: true,
      isInitializing: false,
    });

    // نحاول جلب الصلاحيات
    try {
      await get().refreshPermissions();
    } catch {
      /* تجاهل مؤقتًا */
    }
  },

  /** جلب الصلاحيات مع fallback */
  refreshPermissions: async () => {
    set({ isLoadingPermissions: true });
    try {
      const { data } = await api.get("/auth/permissions");
      const perms: string[] = Array.isArray(data)
        ? data
        : data?.permissions ?? [];
      set({ permissions: perms, isLoadingPermissions: false });
      return perms;
    } catch {
      try {
        const { data } = await api.get("/auth/me/permissions");
        const perms: string[] = Array.isArray(data)
          ? data
          : data?.permissions ?? [];
        set({ permissions: perms, isLoadingPermissions: false });
        return perms;
      } catch (e) {
        set({ isLoadingPermissions: false, permissions: [] });
        throw e;
      }
    }
  },

  hasPerm: (code: string) => get().permissions.includes(code),
  hasAllPerms: (codes: string[]) =>
    codes.every((c) => get().permissions.includes(c)),

  // --- طبقة توافق مع الإصدارات/المكوّنات القديمة ---
  can: (perm: string) => get().hasPerm(perm),
  canAny: (perms: string[]) => perms.some((p) => get().hasPerm(p)),
  canAll: (perms: string[]) => get().hasAllPerms(perms),
}));




// // src/stores/authStore.ts

// import { create } from "zustand";
// import api from "../api/apiClient";

// type Dept = { id: number; name: string } | null;

// export type CurrentUser = {
//   id: number;
//   fullName: string;
//   username: string;
//   isActive: boolean;
//   department: Dept;
//   roles: string[];
// } | null;

// type AuthState = {
//   token: string | null;
//   user: CurrentUser;
//   isAuthenticated: boolean;
//   isInitializing: boolean;

//   permissions: string[];
//   isLoadingPermissions: boolean;

//   login: (token: string, user?: CurrentUser) => Promise<void>;
//   logout: () => void;
//   initializeAuth: () => Promise<void>;
//   refreshPermissions: () => Promise<string[]>;

//   hasPerm: (code: string) => boolean;
//   hasAllPerms: (codes: string[]) => boolean;
// };

// function setAuthHeader(token: string | null) {
//   if (token) {
//     api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
//   } else {
//     delete api.defaults.headers.common["Authorization"];
//   }
// }

// export const useAuthStore = create<AuthState>((set, get) => ({
//   token: null,
//   user: null,
//   isAuthenticated: false,
//   isInitializing: true,

//   permissions: [],
//   isLoadingPermissions: false,

//   /** تسجيل الدخول */
//   login: async (token, user) => {
//     if (typeof window !== "undefined") localStorage.setItem("token", token);
//     setAuthHeader(token);
//     set({ token });

//     let resolvedUser = user ?? null;
//     if (!resolvedUser) {
//       try {
//         const { data } = await api.get("/users/me");
//         resolvedUser = data;
//       } catch {
//         if (typeof window !== "undefined") localStorage.removeItem("token");
//         setAuthHeader(null);
//         set({
//           token: null,
//           user: null,
//           isAuthenticated: false,
//           isInitializing: false,
//           permissions: [],
//         });
//         return;
//       }
//     }

//     set({
//       user: resolvedUser,
//       isAuthenticated: true,
//       isInitializing: false,
//     });

//     try {
//       await get().refreshPermissions();
//     } catch {
//       // نُبقي permissions فارغة مؤقتًا
//     }
//   },

//   /** تسجيل الخروج */
//   logout: () => {
//     if (typeof window !== "undefined") localStorage.removeItem("token");
//     setAuthHeader(null);
//     set({
//       token: null,
//       user: null,
//       isAuthenticated: false,
//       isInitializing: false,
//       permissions: [],
//       isLoadingPermissions: false,
//     });
//   },

//   /** تهيئة الحالة عند بدء التطبيق */
//   initializeAuth: async () => {
//     if (typeof window === "undefined") {
//       set({ isInitializing: false });
//       return;
//     }

//     const lsToken = localStorage.getItem("token");
//     if (!lsToken) {
//       set({
//         token: null,
//         user: null,
//         isAuthenticated: false,
//         isInitializing: false,
//         permissions: [],
//       });
//       return;
//     }

//     setAuthHeader(lsToken);
//     set({ token: lsToken });

//     try {
//       const { data } = await api.get("/users/me");
//       set({
//         user: data,
//         isAuthenticated: true,
//         isInitializing: false,
//       });

//       try {
//         await get().refreshPermissions();
//       } catch {
//         /* تجاهل */
//       }
//     } catch {
//       localStorage.removeItem("token");
//       setAuthHeader(null);
//       set({
//         token: null,
//         user: null,
//         isAuthenticated: false,
//         isInitializing: false,
//         permissions: [],
//       });
//     }
//   },

//   /** جلب الصلاحيات مع fallback */
//   refreshPermissions: async () => {
//     set({ isLoadingPermissions: true });
//     try {
//       const { data } = await api.get("/auth/permissions");
//       const perms: string[] = Array.isArray(data) ? data : (data?.permissions ?? []);
//       set({ permissions: perms, isLoadingPermissions: false });
//       return perms;
//     } catch {
//       try {
//         const { data } = await api.get("/auth/me/permissions");
//         const perms: string[] = Array.isArray(data) ? data : (data?.permissions ?? []);
//         set({ permissions: perms, isLoadingPermissions: false });
//         return perms;
//       } catch (e) {
//         set({ isLoadingPermissions: false, permissions: [] });
//         throw e;
//       }
//     }
//   },

//   hasPerm: (code: string) => get().permissions.includes(code),
//   hasAllPerms: (codes: string[]) => codes.every((c) => get().permissions.includes(c)),

//    // --- ⬇️ طبقة توافق مع الإصدارات/المكوّنات القديمة ---
//   can: (perm: string) => get().hasPerm(perm),
//   canAny: (perms: string[]) => perms.some((p) => get().hasPerm(p)),
//   canAll: (perms: string[]) => get().hasAllPerms(perms),
// }));
