// src/permissions/PermissionsContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/apiClient";
import { useAuthStore } from "../stores/authStore";

type PermsContext = {
  ready: boolean;         // تمت مزامنة الصلاحيات
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

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [list, setList] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancel = false;

    const load = async () => {
      setReady(false);
      try {
        if (!isAuthenticated) {
          setList([]);
          setReady(true);
          return;
        }
        const { data } = await api.get<{ permissions: string[] }>("/auth/permissions");
        if (!cancel) {
          setList(Array.isArray(data?.permissions) ? data.permissions : []);
        }
      } catch {
        if (!cancel) setList([]);
      } finally {
        if (!cancel) setReady(true);
      }
    };

    load();
    return () => { cancel = true; };
  }, [isAuthenticated]);

  const has = (p: string) => list.includes(p);
  const hasAll = (req: string[]) => req.every(r => list.includes(r));

  return (
    <Ctx.Provider value={{ ready, list, has, hasAll }}>
      {children}
    </Ctx.Provider>
  );
};

export const usePermissions = () => useContext(Ctx);
