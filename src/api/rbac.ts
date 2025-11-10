// src/api/rbac.ts
import api from './apiClient';

export type RoleDto = {
  id: number;
  roleName: string;
  description?: string | null;
  isSystem?: boolean;
};

export type UserRolesDto = {
  userId: number;
  roleIds: number[];
  roles: RoleDto[];
  count: number;
};

function unwrap<T = any>(payload: any): T {
  if (!payload) return payload;
  if (typeof payload === 'object' && 'success' in payload) {
    return (payload.success ? payload.data : null) as T;
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as any).data as T;
  }
  return payload as T;
}

// ---------- Roles ----------
export async function listRoles(): Promise<RoleDto[]> {
  const res = await api.get('/rbac/roles');
  const data = unwrap<any>(res.data);

  const arr =
    (Array.isArray(data?.roles) ? data.roles : null) ??
    (Array.isArray(data?.items) ? data.items : null) ??
    (Array.isArray(data) ? data : []);

  return arr.map((r: any) => ({
    id: Number(r.id),
    roleName: r.roleName ?? r.name ?? 'UNKNOWN',
    description: r.description ?? null,
    isSystem: !!r.isSystem,
  }));
}

// ---------- Permissions ----------
export async function listPermissions(): Promise<string[]> {
  const res = await api.get('/rbac/permissions');
  const data = unwrap<any>(res.data);

  // ادعم: مصفوفة مباشرة، أو {permissions:[]}, أو {items:[]}
  const arr =
    (Array.isArray(data?.permissions) ? data.permissions : null) ??
    (Array.isArray(data?.items) ? data.items : null) ??
    (Array.isArray(data) ? data : []);

  return arr.map((p: any) => (typeof p === 'string' ? p : p.code ?? p.name)).filter(Boolean);
}

// ---------- User ↔ Roles ----------
export async function getUserRoles(userId: number): Promise<UserRolesDto> {
  const res = await api.get(`/rbac/users/${userId}/roles`);
  const data = unwrap<any>(res.data);

  const rolesArr =
    (Array.isArray(data?.roles) ? data.roles : null) ??
    (Array.isArray(data?.items) ? data.items : null) ??
    (Array.isArray(data) ? data : []);

  const roleIds = Array.isArray(data?.roleIds)
    ? data.roleIds.map((x: any) => Number(x))
    : rolesArr.map((r: any) => Number(r.id));

  const roles: RoleDto[] = rolesArr.map((r: any) => ({
    id: Number(r.id),
    roleName: r.roleName ?? r.name ?? 'UNKNOWN',
    description: r.description ?? null,
    isSystem: !!r.isSystem,
  }));

  return {
    userId: Number(data?.userId ?? userId),
    roleIds,
    roles,
    count: Number(data?.count ?? roles.length),
  };
}

export async function setUserRoles(
  userId: number,
  roleIds: number[],
): Promise<{ ok: true; userId: number; count: number; roleIds: number[] }> {
  const res = await api.patch(`/rbac/users/${userId}/roles`, { roleIds });
  const data = unwrap<any>(res.data);
  return {
    ok: true as const,
    userId: Number(data?.userId ?? userId),
    count: Number(data?.count ?? (Array.isArray(data?.roleIds) ? data.roleIds.length : roleIds.length)),
    roleIds: (Array.isArray(data?.roleIds) ? data.roleIds : roleIds).map((x: any) => Number(x)),
  };
}

// ---------- Role ↔ Permissions ----------
export async function getRolePermissions(
  roleId: number,
): Promise<{ roleId: number; roleName: string; permissionCodes: string[] }> {
  const res = await api.get(`/rbac/roles/${roleId}/permissions`);
  const data = unwrap<any>(res.data) ?? {};
  const permissionCodes =
    (Array.isArray(data?.permissionCodes) ? data.permissionCodes : null) ??
    (Array.isArray(data?.permissions) ? data.permissions : null) ??
    [];
  return {
    roleId: Number(data?.roleId ?? roleId),
    roleName: data?.roleName ?? 'UNKNOWN',
    permissionCodes: permissionCodes.map((x: any) => (typeof x === 'string' ? x : x?.code)).filter(Boolean),
  };
}

export async function setRolePermissions(
  roleId: number,
  permissionCodes: string[],
): Promise<{ ok: true; roleId: number; permissionCodes: string[]; count: number }> {
  const res = await api.patch(`/rbac/roles/${roleId}/permissions`, { permissionCodes });
  const data = unwrap<any>(res.data) ?? {};
  const list =
    (Array.isArray(data?.permissionCodes) ? data.permissionCodes : null) ??
    (Array.isArray(data?.permissions) ? data.permissions : null) ??
    permissionCodes;

  return {
    ok: true as const,
    roleId: Number(data?.roleId ?? roleId),
    permissionCodes: list,
    count: Number(data?.count ?? list.length),
  };
}




// // src/api/rbac.ts

// import api from './apiClient';

// export type RoleDto = {
//   id: number;
//   roleName: string;
//   description?: string | null;
//   isSystem?: boolean;
// };

// export type UserRolesDto = {
//   userId: number;
//   roleIds: number[];
//   roles: RoleDto[];
//   count: number;
// };

// // يلتقط data من عدة أشكال شائعة
// function unwrap<T = any>(payload: any): T {
//   if (!payload) return payload;
//   if (typeof payload === 'object' && 'success' in payload) {
//     return (payload.success ? payload.data : null) as T;
//   }
//   if ('data' in payload) return payload.data as T;
//   return payload as T;
// }

// export async function listRoles(): Promise<RoleDto[]> {
//   const res = await api.get('/rbac/roles');
//   const data = unwrap<any>(res.data);
//   const roles = Array.isArray(data) ? data : data?.roles ?? [];
//   return roles.map((r: any) => ({
//     id: Number(r.id),
//     roleName: r.roleName ?? r.name ?? 'UNKNOWN',
//     description: r.description ?? null,
//     isSystem: !!r.isSystem,
//   }));
// }

// export async function listPermissions(): Promise<string[]> {
//   const res = await api.get('/rbac/permissions');
//   const data = unwrap<any>(res.data);
//   const perms = Array.isArray(data) ? data : data?.permissions ?? [];
//   // قد تكون عناصر مصفوفة من كائنات {code} أو نصوص
//   return perms.map((p: any) => (typeof p === 'string' ? p : p.code)).filter(Boolean);
// }

// export async function getUserRoles(userId: number): Promise<UserRolesDto> {
//   const res = await api.get(`/rbac/users/${userId}/roles`);
//   const data = unwrap<any>(res.data);

//   // يدعم الاستجابات: {userId, roleIds, roles, count} أو {roles:[...]} فقط
//   const rolesArr = Array.isArray(data?.roles) ? data.roles : (Array.isArray(data) ? data : []);
//   const roleIds = Array.isArray(data?.roleIds)
//     ? data.roleIds.map((x: any) => Number(x))
//     : rolesArr.map((r: any) => Number(r.id));

//   const roles: RoleDto[] = rolesArr.map((r: any) => ({
//     id: Number(r.id),
//     roleName: r.roleName ?? r.name ?? 'UNKNOWN',
//     description: r.description ?? null,
//     isSystem: !!r.isSystem,
//   }));

//   return {
//     userId: Number(data?.userId ?? userId),
//     roleIds,
//     roles,
//     count: Number(data?.count ?? roles.length),
//   };
// }

// export async function setUserRoles(userId: number, roleIds: number[]): Promise<{ ok: true; userId: number; count: number; roleIds: number[] }> {
//   const res = await api.patch(`/rbac/users/${userId}/roles`, { roleIds });
//   const data = unwrap<any>(res.data);
//   return {
//     ok: true,
//     userId: Number(data?.userId ?? userId),
//     count: Number(data?.count ?? (Array.isArray(data?.roleIds) ? data.roleIds.length : 0)),
//     roleIds: (Array.isArray(data?.roleIds) ? data.roleIds : roleIds).map((x: any) => Number(x)),
//   };
// }

// export async function getRolePermissions(roleId: number): Promise<{ roleId: number; roleName: string; permissionCodes: string[] }> {
//   const res = await api.get(`/rbac/roles/${roleId}/permissions`);
//   const data = unwrap<any>(res.data);
//   return {
//     roleId: Number(data?.roleId ?? roleId),
//     roleName: data?.roleName ?? '',
//     permissionCodes: Array.isArray(data?.permissionCodes) ? data.permissionCodes : [],
//   };
// }

// export async function setRolePermissions(roleId: number, permissionCodes: string[]): Promise<{ ok: true; roleId: number; permissionCodes: string[]; count: number }> {
//   const res = await api.patch(`/rbac/roles/${roleId}/permissions`, { permissionCodes });
//   const data = unwrap<any>(res.data);
//   return {
//     ok: true,
//     roleId: Number(data?.roleId ?? roleId),
//     permissionCodes: Array.isArray(data?.permissionCodes) ? data.permissionCodes : permissionCodes,
//     count: Number(data?.count ?? permissionCodes.length),
//   };
// }
