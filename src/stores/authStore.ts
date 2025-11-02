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

  login: (token: string, user?: CurrentUser) => Promise<void>;
  logout: () => void;
  initializeAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isInitializing: true,

  login: async (token, user) => {
    if (typeof window !== "undefined") localStorage.setItem("token", token);
    set({ token });

    let resolvedUser = user ?? null;
    if (!resolvedUser) {
      try {
        const { data } = await api.get("/users/me");
        resolvedUser = data;
      } catch {
        if (typeof window !== "undefined") localStorage.removeItem("token");
        set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
        return;
      }
    }
    set({ user: resolvedUser, isAuthenticated: true, isInitializing: false });
  },

  logout: () => {
    if (typeof window !== "undefined") localStorage.removeItem("token");
    set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
  },

  initializeAuth: async () => {
    if (typeof window === "undefined") {
      set({ isInitializing: false });
      return;
    }

    const lsToken = localStorage.getItem("token");
    if (!lsToken) {
      set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
      return;
    }

    // خزّن التوكن مؤقتًا، ثم تحقّق من /users/me
    set({ token: lsToken });

    try {
      const { data } = await api.get("/users/me");
      set({ user: data, isAuthenticated: true, isInitializing: false });
    } catch {
      localStorage.removeItem("token");
      set({ token: null, user: null, isAuthenticated: false, isInitializing: false });
    }
  },
}));

