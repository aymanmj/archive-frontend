import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type User = {
  id: number;
  fullName: string;
  username: string;
  department: { id: number; name: string } | null;
  roles: string[];
};

type AuthState = {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>; // ✨ دالة التهيئة الجديدة
};

export const useAuthStore = create(
  persist<AuthState>(
    (set, get) => ({ // ✨ نحتاج الوصول إلى `get` لقراءة الحالة الحالية
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token: string) => {
        set({ token, isAuthenticated: true });
      },

      setUser: (user: User) => {
        set({ user });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },

      // ✨ هذا هو المنطق المركزي الجديد
      initializeAuth: async () => {
        // `persist` middleware يقوم تلقائياً بملء `token` من localStorage عند البدء
        const token = get().token;

        if (token) {
          try {
            const res = await fetch('http://localhost:3000/users/me', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (res.ok) {
              const userData = await res.json();
              // التوكن صالح، نضبط المستخدم والحالة
              set({ user: userData, isAuthenticated: true });
            } else {
              // التوكن غير صالح
              set({ token: null, user: null, isAuthenticated: false });
            }
          } catch (error) {
            console.error('Failed to fetch user on startup', error);
            // فشل في الاتصال، نعتبر المستخدم غير مسجل دخوله
            set({ token: null, user: null, isAuthenticated: false });
          }
        }
        // إذا لم يكن هناك توكن، لا نفعل شيئاً، الحالة الافتراضية صحيحة
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ token: state.token }),
    },
  ),
);
