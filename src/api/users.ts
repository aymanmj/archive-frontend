// src/api/users.ts

import api from "./apiClient";

export type UserSummary = {
  id: number;
  fullName: string;
  username: string;
  department?: { id: number; name: string } | null;
  isActive?: boolean;
};

type CreateUserPayload = {
  fullName: string;
  username: string;
  email?: string;
  password?: string;
  departmentId?: number | null;
  isActive?: boolean;
  roleIds?: number[];
};

type CreateUserResponse = {
  userId: number;
  tempPassword?: string;
};

function unwrap<T = any>(payload: any): T {
  if (!payload) return payload as T;
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
    (Array.isArray(data) ? data : []);

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

export async function createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
  const { data } = await api.post("/users", payload);
  return unwrap<CreateUserResponse>(data);
}

export async function resetUserPassword(userId: number, newPassword: string): Promise<{ ok: true }> {
  const { data } = await api.post(`/users/${userId}/reset-password`, { newPassword });
  return unwrap<{ ok: true }>(data);
}

// تغيير كلمة مرور المستخدم الحالي (Self-service)
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true }> {
  // لو مسارك في الباك مختلف، عدّل هذا فقط:
  // شائع: POST /auth/change-password { currentPassword, newPassword }
  const { data } = await api.post("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  // بعض البواك تعيد { success: true } أو { ok: true }؛ دالة unwrap تتكفل بالأمر
  return unwrap<{ ok: true }>(data) ?? { ok: true };
}

// ===== Password reset (admin-initiated) =====
export async function initiatePasswordReset(userId: number, ttlMinutes?: number)
: Promise<{ url: string; expiresAt: string }> {
  const res = await api.post('/auth/reset/initiate', { userId, ttlMinutes });
  return res.data;
}

// ===== Password reset (user completes with token) =====
export async function completePasswordReset(token: string, newPassword: string) {
  const res = await api.post('/auth/reset/complete', { token, newPassword });
  return res.data;
}

/////////


// (أ) للإدمن: إصدار رابط/رمز إعادة تعيين لمستخدم محدد
export async function issuePasswordResetForUser(userId: number) {
  // الـ backend عندك يعيد { url, expiresAt }
  const { data } = await api.post("/auth/reset/initiate", { userId });
  return data as { url?: string; expiresAt: string };
}

// (ب) (غير مدعوم في باك إندك الحالي) — عطّله بوضوح
export async function requestPasswordResetByUsername(_username: string) {
  throw new Error("ميزة إصدار رابط عبر اسم المستخدم غير مفعّلة على الخادوم.");
}

// (ج) استهلاك الرمز لتعيين كلمة مرور جديدة (بدون تسجيل دخول)
export async function consumePasswordReset(token: string, newPassword: string) {
  const { data } = await api.post("/auth/reset/complete", { token, newPassword });
  return data;
}




















// /* ===== إدارة كلمات المرور ===== */

// // (أ) للإدمن: إصدار رابط/رمز إعادة تعيين لمستخدم محدد
// export async function issuePasswordResetForUser(userId: number) {
//   const { data } = await api.post("/auth/password-resets/issue", { userId });
//   // نتوقع { token, expiresAt, url? }
//   return data as { token: string; expiresAt: string; url?: string };
// }

// // (ب) للواجهة العامة: طلب إعادة تعيين عبر اسم المستخدم (نسيت كلمة المرور)
// export async function requestPasswordResetByUsername(username: string) {
//   const { data } = await api.post("/auth/password-resets/request", { username });
//   return data as { token: string; expiresAt: string; url?: string };
// }

// // (ج) استهلاك الرمز لتعيين كلمة مرور جديدة (بدون تسجيل دخول)
// export async function consumePasswordReset(token: string, newPassword: string) {
//   const { data } = await api.post("/auth/password-resets/consume", { token, newPassword });
//   return data;
// }





// // src/api/users.ts


// import api from "./apiClient";

// export type UserSummary = {
//   id: number;
//   fullName: string;
//   username: string;
//   department?: { id: number; name: string } | null;
//   isActive?: boolean;
// };

// function unwrap<T = any>(payload: any): T {
//   if (!payload) return payload;
//   if (typeof payload === "object" && "success" in payload) {
//     return (payload.success ? payload.data : null) as T;
//   }
//   if ("data" in (payload ?? {})) return (payload as any).data as T;
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

//   const arr =
//     (Array.isArray(data?.items) ? data.items : null) ??
//     (Array.isArray(data?.users) ? data.users : null) ??
//     (Array.isArray(data) ? data : []);

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

// // ---- إضافات جديدة ----
// export async function createUserApi(payload: {
//   fullName: string;
//   username: string;
//   email?: string;
//   password?: string;
//   departmentId?: number;
//   isActive?: boolean;
//   roleIds?: number[];
// }): Promise<{ userId: number; tempPassword?: string | undefined }> {
//   const { data } = await api.post("/users", payload);
//   return data;
// }

// export async function adminResetToTemporary(userId: number): Promise<{ ok: true; tempPassword: string }> {
//   const { data } = await api.post(`/users/${userId}/reset-to-temporary`, {});
//   return data;
// }

// export async function changeOwnPassword(currentPassword: string, newPassword: string) {
//   const { data } = await api.patch(`/users/change-password`, { currentPassword, newPassword });
//   return data;
// }

