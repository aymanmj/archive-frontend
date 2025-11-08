// src/components/PermissionsGate.tsx
import React from "react";
import { useAuthStore } from "../stores/authStore";

type Props =
  | { one: string; any?: never; all?: never; children: React.ReactNode }
  | { any: string[]; one?: never; all?: never; children: React.ReactNode }
  | { all: string[]; one?: never; any?: never; children: React.ReactNode };

export default function PermissionsGate(props: Props) {
  // نقرأ الدوال المتاحة أياً كانت تسميتها
  const hasPerm = useAuthStore((s: any) => s.hasPerm || s.can);
  const hasAllPerms = useAuthStore((s: any) => s.hasAllPerms || s.canAll);
  const permissions = useAuthStore((s) => s.permissions);
  const isInit = useAuthStore((s) => s.isInitializing);
  const isLoadingPermissions = useAuthStore((s) => s.isLoadingPermissions);

  // أثناء التهيئة أو تحميل الصلاحيات نعرض الأطفال (أو يمكنك إرجاع Placeholder)
  if (isInit || isLoadingPermissions) return <>{props.children}</>;

  // حماية إضافية لو حصل undefined
  const canOne = (code: string) =>
    typeof hasPerm === "function" ? hasPerm(code) : permissions.includes(code);

  const canAll = (codes: string[]) =>
    typeof hasAllPerms === "function"
      ? hasAllPerms(codes)
      : codes.every((c) => permissions.includes(c));

  let allowed = false;
  if ("one" in props && props.one) {
    allowed = canOne(props.one);
  } else if ("any" in props && props.any) {
    allowed = props.any.some((p) => canOne(p));
  } else if ("all" in props && props.all) {
    allowed = canAll(props.all);
  }

  if (!allowed) return null;
  return <>{props.children}</>;
}
