// src/permissions/PermissionsContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/apiClient";
import { useAuthStore } from "../stores/authStore";

type PermsContext = {
  ready: boolean;         // تمت مزامنة الصلاحيات (أو تم الاسترجاع من الكاش مؤقتًا)
  list: string[];         // أكواد الصلاحيات
  has: (p: string) => boolean;
  hasAll: (req: string[]) => boolean;
};

const Ctx = createContext<PermsContext>({
  ready: false,
  list: [],
  has: () => false,
  hasAll: () => false,
});

function unwrap<T = any>(payload: any): T {
  if (!payload) return payload;
  if (typeof payload === "object" && "success" in payload) {
    return (payload.success ? payload.data : null) as T;
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as any).data as T;
  }
  return payload as T;
}

const LS_KEY = "saraya.permissions.cache";

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // جرّب تحميل كاش قديم لتجنّب وميض القائمة بعد التحديث
  const cached = (() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch { return []; }
  })();

  const [list, setList] = useState<string[]>(cached);
  const [ready, setReady] = useState<boolean>(!!cached.length);

  useEffect(() => {
    let cancel = false;

    const load = async () => {
      setReady(false);
      try {
        if (!isAuthenticated) {
          if (!cancel) {
            setList([]);
            localStorage.removeItem(LS_KEY);
          }
          return;
        }

        const res = await api.get("/auth/permissions");
        const data = unwrap<any>(res.data);

        // تقبّل الأشكال الشائعة:
        // 1) ['incoming.read', ...]
        // 2) { permissions: [...] }
        // 3) { userId, permissions: [...] }
        // 4) أي مصفوفة أكواد داخل data
        let perms: string[] =
          (Array.isArray(data) ? data : null) ??
          (Array.isArray(data?.permissions) ? data.permissions : null) ??
          (Array.isArray(res.data?.permissions) ? res.data.permissions : null) ??
          [];

        if (!cancel) {
          setList(perms);
          try { localStorage.setItem(LS_KEY, JSON.stringify(perms)); } catch {}
        }
      } catch {
        if (!cancel) {
          setList(cached); // استخدم الكاش بدل التفريغ
        }
      } finally {
        if (!cancel) setReady(true);
      }
    };

    load();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const has = (p: string) => list.includes(p);
  const hasAll = (req: string[]) => req.every((r) => list.includes(r));

  return (
    <Ctx.Provider value={{ ready, list, has, hasAll }}>
      {children}
    </Ctx.Provider>
  );
};

export const usePermissions = () => useContext(Ctx);




// // src/permissions/PermissionsContext.tsx

// import React, { createContext, useContext, useEffect, useState } from "react";
// import api from "../api/apiClient";
// import { useAuthStore } from "../stores/authStore";

// type PermsContext = {
//   ready: boolean;         // تمت مزامنة الصلاحيات
//   list: string[];         // أكواد الصلاحيات
//   has: (p: string) => boolean;
//   hasAll: (req: string[]) => boolean;
// };

// const Ctx = createContext<PermsContext>({
//   ready: false,
//   list: [],
//   has: () => false,
//   hasAll: () => false,
// });

// export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const isAuthenticated = useAuthStore(s => s.isAuthenticated);
//   const [list, setList] = useState<string[]>([]);
//   const [ready, setReady] = useState(false);

//   useEffect(() => {
//     let cancel = false;

//     const load = async () => {
//       setReady(false);
//       try {
//         if (!isAuthenticated) {
//           setList([]);
//           setReady(true);
//           return;
//         }
//         const { data } = await api.get<{ permissions: string[] }>("/auth/permissions");
//         if (!cancel) {
//           setList(Array.isArray(data?.permissions) ? data.permissions : []);
//         }
//       } catch {
//         if (!cancel) setList([]);
//       } finally {
//         if (!cancel) setReady(true);
//       }
//     };

//     load();
//     return () => { cancel = true; };
//   }, [isAuthenticated]);

//   const has = (p: string) => list.includes(p);
//   const hasAll = (req: string[]) => req.every(r => list.includes(r));

//   return (
//     <Ctx.Provider value={{ ready, list, has, hasAll }}>
//       {children}
//     </Ctx.Provider>
//   );
// };

// export const usePermissions = () => useContext(Ctx);
