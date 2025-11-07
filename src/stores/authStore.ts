// src/stores/authStore.ts

import { create } from "zustand";
import api from "../api/apiClient";

/** طِبق قسم المستخدم الحالي */
type Dept = { id: number; name: string } | null;
export type CurrentUser = {
  id: number;
  fullName: string;
  username: string;
  isActive: boolean;
  department: Dept;
  roles: string[];
} | null;

/** نفس اتحاد الصلاحيات الموجود في backend (permissions.constants.ts) */
export type PermissionCode =
  | 'incoming.read' | 'incoming.create' | 'incoming.forward' | 'incoming.assign' | 'incoming.updateStatus'
  | 'outgoing.read' | 'outgoing.create' | 'outgoing.markDelivered'
  | 'files.read'    | 'files.upload'    | 'files.delete'
  | 'departments.read' | 'departments.create' | 'departments.updateStatus'
  | 'users.read'
  | 'audit.read';

type AuthState = {
  token: string | null;
  user: CurrentUser;
  isAuthenticated: boolean;
  isInitializing: boolean;

  /** الصلاحيات القادمة من /auth/me/permissions */
  permissions: PermissionCode[];
  isLoadingPermissions: boolean;

  /** إجراءات أساسية */
  login: (token: string, user?: CurrentUser) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;

  /** سحب الصلاحيات */
  fetchPermissions: () => Promise<void>;

  /** Helpers للواجهة */
  can: (perm: PermissionCode) => boolean;
  canAny: (perms: PermissionCode[]) => boolean;
  canAll: (perms: PermissionCode[]) => boolean;
};

function setAuthHeader(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isInitializing: true,

  permissions: [],
  isLoadingPermissions: false,

  /** login: نخزّن التوكن، نضبط الهيدر، نجلب /users/me (إن لزم)، ثم /auth/me/permissions */
  login: async (token, user) => {
    if (typeof window !== "undefined") localStorage.setItem("token", token);
    setAuthHeader(token);
    set({ token });

    let resolvedUser = user ?? null;
    if (!resolvedUser) {
      try {
        const { data } = await api.get("/users/me");
        resolvedUser = data;
      } catch {
        if (typeof window !== "undefined") localStorage.removeItem("token");
        setAuthHeader(null);
        set({ token: null, user: null, isAuthenticated: false, isInitializing: false, permissions: [] });
        return;
      }
    }

    set({ user: resolvedUser, isAuthenticated: true, isInitializing: false });

    await get().fetchPermissions();
  },

  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem("token");
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

  /** initializeAuth: تُستدعى عند بدء التطبيق. */
  initializeAuth: async () => {
    if (typeof window === "undefined") {
      set({ isInitializing: false });
      return;
    }

    const lsToken = localStorage.getItem("token");
    if (!lsToken) {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitializing: false,
        permissions: [],
      });
      return;
    }

    setAuthHeader(lsToken);
    set({ token: lsToken });

    try {
      const { data } = await api.get("/users/me");
      set({ user: data, isAuthenticated: true, isInitializing: false });
      await get().fetchPermissions();
    } catch {
      localStorage.removeItem("token");
      setAuthHeader(null);
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isInitializing: false,
        permissions: [],
      });
    }
  },

  /** جلب الصلاحيات من الباك: GET /auth/me/permissions => { permissions: string[] } */
  fetchPermissions: async () => {
    set({ isLoadingPermissions: true });
    try {
      const { data } = await api.get("/auth/me/permissions");
      const perms = (data?.permissions ?? []) as PermissionCode[];
      set({ permissions: perms, isLoadingPermissions: false });
    } catch {
      // لو فشل الطلب، لا نمنع الواجهة من العمل، فقط نفرّغ القائمة
      set({ permissions: [], isLoadingPermissions: false });
    }
  },

  /** Helpers */
  can: (perm) => get().permissions.includes(perm),
  canAny: (perms) => perms.some((p) => get().permissions.includes(p)),
  canAll: (perms) => perms.every((p) => get().permissions.includes(p)),
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

//   login: (token: string, user?: CurrentUser) => Promise<void>;
//   logout: () => void;
//   initializeAuth: () => Promise<void>;
// };

// export const useAuthStore = create<AuthState>((set, get) => ({
//   token: null,
//   user: null,
//   isAuthenticated: false,
//   isInitializing: true,

//   login: async (token, user) => {
//     if (typeof window !== "undefined") localStorage.setItem("token", token);
//     set({ token });

//     let resolvedUser = user ?? null;
//     if (!resolvedUser) {
//       try {
//         const { data } = await api.get("/users/me");
//         resolvedUser = data;
//       } catch {
//         if (typeof window !== "undefined") localStorage.removeItem("token");
//         set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
//         return;
//       }
//     }
//     set({ user: resolvedUser, isAuthenticated: true, isInitializing: false });
//   },

//   logout: () => {
//     if (typeof window !== "undefined") localStorage.removeItem("token");
//     set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
//   },

//   initializeAuth: async () => {
//     if (typeof window === "undefined") {
//       set({ isInitializing: false });
//       return;
//     }

//     const lsToken = localStorage.getItem("token");
//     if (!lsToken) {
//       set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
//       return;
//     }

//     // خزّن التوكن مؤقتًا، ثم تحقّق من /users/me
//     set({ token: lsToken });

//     try {
//       const { data } = await api.get("/users/me");
//       set({ user: data, isAuthenticated: true, isInitializing: false });
//     } catch {
//       localStorage.removeItem("token");
//       set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
//     }
//   },
// }));

