// src/hooks/usePermissions.ts

import { useAuthStore } from "../stores/authStore";

/**
 * Hook موحّد للصلاحيات — يعرّف can() بشكل متوافق:
 * can('incoming.read')              -> boolean
 * can(['incoming.read','files.upload'])        // any (افتراضي)
 * can(['incoming.read','files.upload'], 'all') // كلّها
 */
export function usePermissions() {
  const {
    permissions,
    isAuthenticated,
    isLoadingPermissions,
    hasPerm,
    hasAllPerms,
  } = useAuthStore();

  const can = (
    code: string | string[],
    mode: "any" | "all" = "any"
  ): boolean => {
    if (!isAuthenticated) return false;
    if (isLoadingPermissions) return false;

    if (Array.isArray(code)) {
      return mode === "all" ? hasAllPerms(code) : code.some((c) => hasPerm(c));
    }
    return hasPerm(code);
  };

  return {
    permissions,
    isAuthenticated,
    isLoadingPermissions,
    hasPerm,
    hasAllPerms,
    can,
  };
}
