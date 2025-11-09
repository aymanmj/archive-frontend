// src/api/users.ts
import api from "./apiClient";

export type UserSummary = {
  id: number;
  fullName: string;
  username: string;
  department?: { id: number; name: string } | null;
  isActive?: boolean;
};

function unwrap<T = any>(payload: any): T {
  if (!payload) return payload;
  if (typeof payload === "object" && "success" in payload) {
    return (payload.success ? payload.data : null) as T;
  }
  if ("data" in (payload ?? {})) return (payload as any).data as T;
  return payload as T;
}

export async function listUsers(params?: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<UserSummary[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.page) query.set("page", String(params.page));
  if (params?.pageSize) query.set("pageSize", String(params.pageSize));

  const path = query.toString() ? `?${query}` : "";
  const res = await api.get(`/users${path}`).catch(() => api.get(`/users/list${path}`));

  const data = unwrap<any>(res.data);

  const arr =
    (Array.isArray(data?.items) ? data.items : null) ??
    (Array.isArray(data?.users) ? data.users : null) ??
    (Array.isArray(data) ? data : []) ;

  return arr.map((u: any, i: number) => {
    const composedName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    const fullName =
      (u.fullName ?? u.name ?? (composedName || null)) ||
      u.username ||
      `User #${i + 1}`;

    return {
      id: Number(u.id ?? u.userId ?? i + 1),
      fullName,
      username: u.username ?? u.userName ?? String(u.id ?? `user${i + 1}`),
      department: u.department
        ? { id: Number(u.department.id), name: u.department.name }
        : u.departmentName
        ? { id: 0, name: u.departmentName }
        : null,
      isActive: typeof u.isActive === "boolean" ? u.isActive : true,
    };
  });
}

export async function getUserById(userId: number): Promise<UserSummary | null> {
  const res = await api.get(`/users/${userId}`).catch(() => null);
  if (!res) return null;
  const u = unwrap<any>(res.data);
  if (!u) return null;

  const composedName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  const fullName =
    (u.fullName ?? u.name ?? (composedName || null)) ||
    u.username ||
    `User #${userId}`;

  return {
    id: Number(u.id ?? userId),
    fullName,
    username: u.username ?? u.userName ?? String(userId),
    department: u.department
      ? { id: Number(u.department.id), name: u.department.name }
      : u.departmentName
      ? { id: 0, name: u.departmentName }
      : null,
    isActive: typeof u.isActive === "boolean" ? u.isActive : true,
  };
}




// // src/api/users.ts
// import api from "./apiClient";

// export type UserSummary = {
//   id: number;
//   fullName: string;
//   username: string;
//   department?: { id: number; name: string } | null;
//   isActive?: boolean;
// };

// // تفكيك مرن لاستجابات الـAPI
// function unwrap<T = any>(payload: any): T {
//   if (!payload) return payload;
//   if (typeof payload === "object" && "success" in payload) {
//     return (payload.success ? payload.data : null) as T;
//   }
//   if ("data" in payload) return payload.data as T;
//   return payload as T;
// }

// export async function listUsers(params?: {
//   search?: string;
//   page?: number;
//   pageSize?: number;
// }): Promise<UserSummary[]> {
//   const query = new URLSearchParams();
//   if (params?.search) query.set("search", params.search);
//   if (params?.page) query.set("page", String(params.page));
//   if (params?.pageSize) query.set("pageSize", String(params.pageSize));

//   const path = query.toString() ? `?${query}` : "";
//   const res = await api.get(`/users${path}`).catch(() => api.get(`/users/list${path}`));

//   const data = unwrap<any>(res.data);
//   const arr = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);

//   return arr.map((u: any, i: number) => {
//     const composedName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
//     const fullName =
//       (u.fullName ?? u.name ?? (composedName || null)) ||
//       u.username ||
//       `User #${i + 1}`;

//     return {
//       id: Number(u.id ?? u.userId ?? i + 1),
//       fullName,
//       username: u.username ?? u.userName ?? String(u.id ?? `user${i + 1}`),
//       department: u.department
//         ? { id: Number(u.department.id), name: u.department.name }
//         : u.departmentName
//         ? { id: 0, name: u.departmentName }
//         : null,
//       isActive: typeof u.isActive === "boolean" ? u.isActive : true,
//     };
//   });
// }

// export async function getUserById(userId: number): Promise<UserSummary | null> {
//   const res = await api.get(`/users/${userId}`).catch(() => null);
//   if (!res) return null;
//   const u = unwrap<any>(res.data);
//   if (!u) return null;

//   const composedName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
//   const fullName =
//     (u.fullName ?? u.name ?? (composedName || null)) ||
//     u.username ||
//     `User #${userId}`;

//   return {
//     id: Number(u.id ?? userId),
//     fullName,
//     username: u.username ?? u.userName ?? String(userId),
//     department: u.department
//       ? { id: Number(u.department.id), name: u.department.name }
//       : u.departmentName
//       ? { id: 0, name: u.departmentName }
//       : null,
//     isActive: typeof u.isActive === "boolean" ? u.isActive : true,
//   };
// }
