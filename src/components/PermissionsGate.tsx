// src/components/PermissionsGate.tsx

import React from "react";
import { useAuthStore, type PermissionCode } from "../stores/authStore";

type Props =
  | { allOf: PermissionCode[]; children: React.ReactNode }
  | { anyOf: PermissionCode[]; children: React.ReactNode }
  | { one: PermissionCode; children: React.ReactNode };

export default function PermissionsGate(props: Props) {
  const can = useAuthStore((s) => s.can);
  const canAny = useAuthStore((s) => s.canAny);
  const canAll = useAuthStore((s) => s.canAll);

  if ("one" in props)   return can(props.one) ? <>{props.children}</> : null;
  if ("allOf" in props) return canAll(props.allOf) ? <>{props.children}</> : null;
  if ("anyOf" in props) return canAny(props.anyOf) ? <>{props.children}</> : null;
  return null;
}
