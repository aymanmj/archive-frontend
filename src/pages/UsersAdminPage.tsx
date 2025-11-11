// src/pages/UsersAdminPage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { listUsers, type UserSummary, issuePasswordResetForUser } from "../api/users";
import { listRoles, getUserRoles, setUserRoles, type RoleDto, type UserRolesDto } from "../api/rbac";
import { listDepartments, type DepartmentDto } from "../api/departments";
import api from "../api/apiClient";


/* ... نفس hook useDebouncedValue ... */
function useDebouncedValue<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

type CreateUserPayload = {
  fullName: string;
  username: string;
  email?: string;
  password?: string;
  departmentId?: number | null;
  isActive?: boolean;
  roleIds?: number[];
};

export default function UsersAdminPage() {
  const [error, setError] = useState<string | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [allRoles, setAllRoles] = useState<RoleDto[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [userRolesDto, setUserRolesDto] = useState<UserRolesDto | null>(null);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);

  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(true);

  const [createBusy, setCreateBusy] = useState(false);
  const [newUser, setNewUser] = useState<CreateUserPayload>({
    fullName: "",
    username: "",
    email: "",
    password: "",
    departmentId: null,
    isActive: true,
    roleIds: [],
  });

  const selectedRoleIds = useMemo(
    () => new Set<number>(userRolesDto?.roleIds ?? []),
    [userRolesDto]
  );

  const showToast = (msg: string, danger = false) => {
    if (!toastRef.current) return;
    toastRef.current.textContent = msg;
    toastRef.current.style.opacity = "1";
    toastRef.current.style.background = danger ? "#b00020" : "#0f766e";
    setTimeout(() => {
      if (toastRef.current) toastRef.current.style.opacity = "0";
    }, 1800);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingRoles(true);
        const roles = await listRoles();
        if (!mounted) return;
        setAllRoles(roles);
      } catch (e: any) {
        console.error(e);
        if (mounted) setError("تعذّر تحميل الأدوار. (تأكد من منح RBAC_MANAGE/READ لحسابك)");
      } finally {
        if (mounted) setLoadingRoles(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingDeps(true);
        const deps = await listDepartments();
        if (!mounted) return;
        setDepartments(deps);
      } catch (e) {
        console.error(e);
        if (mounted) setError("تعذّر تحميل الأقسام.");
      } finally {
        if (mounted) setLoadingDeps(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingUsers(true);
        const list = await listUsers({ search: debouncedSearch, page: 1, pageSize: 50 });
        if (!mounted) return;
        setUsers(list);
        if (list.length && selectedUserId == null) setSelectedUserId(list[0].id);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setUsers([]);
          setError("تعذّر تحميل المستخدمين.");
        }
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (!selectedUserId) { setUserRolesDto(null); return; }
    let mounted = true;
    (async () => {
      try {
        setLoadingUserRoles(true);
        const dto = await getUserRoles(selectedUserId);
        if (!mounted) return;
        setUserRolesDto(dto);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setUserRolesDto({ userId: selectedUserId, roleIds: [], roles: [], count: 0 });
          setError("تعذّر تحميل أدوار المستخدم.");
        }
      } finally {
        if (mounted) setLoadingUserRoles(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedUserId]);

  const toggleRole = (roleId: number) => {
    if (!userRolesDto) return;
    const next = new Set<number>(userRolesDto.roleIds);
    next.has(roleId) ? next.delete(roleId) : next.add(roleId);
    const roleList = allRoles.filter((r) => next.has(r.id));
    setUserRolesDto({ ...userRolesDto, roleIds: [...next], roles: roleList, count: next.size });
  };

  const saveUserRoles = async () => {
    if (!userRolesDto) return;
    try {
      setSavingRoles(true);
      await setUserRoles(userRolesDto.userId, userRolesDto.roleIds);
      const fresh = await getUserRoles(userRolesDto.userId);
      setUserRolesDto(fresh);
      showToast("تم حفظ الأدوار بنجاح.");
    } catch (e) {
      console.error(e);
      showToast("تعذّر حفظ الأدوار.", true);
    } finally {
      setSavingRoles(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateBusy(true);
      const payload: CreateUserPayload = {
        ...newUser,
        departmentId: newUser.departmentId || undefined,
        roleIds: newUser.roleIds?.length ? newUser.roleIds : undefined,
      };
      const { data } = await api.post("/users", payload);
      showToast("تم إنشاء المستخدم بنجاح.");
      const list = await listUsers({ search: newUser.username, page: 1, pageSize: 1 });
      if (list.length) {
        setUsers(prev => {
          const exists = prev.find(u => u.id === list[0].id);
          return exists ? prev : [list[0], ...prev];
        });
        setSelectedUserId(list[0].id);
      }
      setNewUser({ fullName: "", username: "", email: "", password: "", departmentId: null, isActive: true, roleIds: [] });
    } catch (e: any) {
      console.error(e);
      showToast(e?.response?.data?.message ?? "تعذّر إنشاء المستخدم.", true);
    } finally {
      setCreateBusy(false);
    }
  };

  // ===== إصدار رابط/رمز إعادة تعيين للمستخدم المحدد =====
  // const [issuing, setIssuing] = useState(false);
  // const [issuedInfo, setIssuedInfo] = useState<{ token: string; url?: string; expiresAt: string } | null>(null);

  // const handleIssueReset = async () => {
  //   if (!selectedUserId) { showToast("اختر مستخدمًا أولاً.", true); return; }
  //   try {
  //     setIssuing(true);
  //     const res = await issuePasswordResetForUser(selectedUserId);
  //     setIssuedInfo(res);
  //     showToast("تم إصدار رابط إعادة تعيين.");
  //   } catch (e: any) {
  //     console.error(e);
  //     showToast(e?.response?.data?.message ?? "تعذّر إصدار الرابط.", true);
  //   } finally {
  //     setIssuing(false);
  //   }
  // };

  const [issuing, setIssuing] = useState(false);
  const [issuedInfo, setIssuedInfo] = useState<{ url?: string; expiresAt: string } | null>(null);

  const handleIssueReset = async () => {
    if (!selectedUserId) { showToast("اختر مستخدمًا أولاً.", true); return; }
    try {
      setIssuing(true);
      const res = await issuePasswordResetForUser(selectedUserId);
      setIssuedInfo(res);
      showToast("تم إصدار رابط إعادة التعيين.");
    } catch (e: any) {
      console.error(e);
      showToast(e?.response?.data?.message ?? "تعذّر إصدار الرابط.", true);
    } finally {
      setIssuing(false);
    }
  };

  // ==== UI ==== (نفس تنسيق البطاقات السابق)
  const card: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    background: "#fff",
    boxShadow: "0 6px 22px rgba(0,0,0,.06)",
  };
  const label: React.CSSProperties = { fontSize: 13, color: "#555", marginBottom: 6, display: "block" };
  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" };
  const h3: React.CSSProperties = { marginTop: 0, marginBottom: 12 };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <h2 style={{ margin: "6px 0 16px 0" }}>إدارة المستخدمين</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 14 }}>
        <div style={card}>
          <label style={label}>ابحث عن مستخدم بالاسم أو اسم المستخدم</label>
          <input style={input} placeholder="مثال: محمد.. أو admin" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={card}>
          <label style={label}>المستخدم</label>
          <select style={input} value={selectedUserId ?? ""} onChange={(e) => setSelectedUserId(Number(e.target.value))}>
            <option value="" disabled>اختر مستخدمًا</option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} — {u.username}{u.department?.name ? ` (${u.department.name})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(loadingUsers || loadingRoles || loadingUserRoles || loadingDeps) && (
        <div style={{ marginTop: 4 }}>جارِ التحميل…</div>
      )}
      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* يسار: أدوار */}
        <div style={card}>
          <h3 style={h3}>أدوار المستخدم {selectedUserId ? `#${selectedUserId}` : ""}</h3>
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, maxHeight: 440, overflow: "auto" }}>
            {(allRoles ?? []).length === 0 && <div>لا توجد أدوار.</div>}
            {(allRoles ?? []).map((r) => {
              const checked = selectedRoleIds.has(r.id);
              return (
                <label key={r.id} style={{ display: "flex", gap: 10, alignItems: "start", padding: "6px 0" }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleRole(r.id)} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.roleName} {r.isSystem ? " (system)" : ""}</div>
                    {r.description && <div style={{ color: "#555", fontSize: 13 }}>{r.description}</div>}
                  </div>
                </label>
              );
            })}
          </div>
          <button
            onClick={saveUserRoles}
            disabled={savingRoles || !selectedUserId}
            style={{
              marginTop: 14, padding: "10px 16px", borderRadius: 10, border: "none",
              background: savingRoles ? "#94a3b8" : "#0ea5e9", color: "#fff",
              cursor: savingRoles ? "not-allowed" : "pointer",
            }}
          >
            {savingRoles ? "جاري الحفظ…" : "حفظ تغييرات الأدوار"}
          </button>

          {/* زر إصدار رابط إعادة التعيين + عرض النتيجة */}
{/*          <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>إعادة تعيين كلمة المرور</div>
            <button
              onClick={handleIssueReset}
              disabled={!selectedUserId || issuing}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: issuing ? "#94a3b8" : "#10b981",
                color: "#fff",
                cursor: issuing ? "not-allowed" : "pointer",
              }}
            >
              {issuing ? "جاري الإصدار…" : "إصدار رابط إعادة تعيين"}
            </button>
            {issuedInfo && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div>ينتهي في: {new Date(issuedInfo.expiresAt).toLocaleString("ar-LY")}</div>
                <div style={{ wordBreak: "break-all" }}>الرمز: <code>{issuedInfo.token}</code></div>
                {issuedInfo.url && <div style={{ wordBreak: "break-all" }}>الرابط: <a href={issuedInfo.url} target="_blank" rel="noreferrer">{issuedInfo.url}</a></div>}
              </div>
            )}
          </div>*/}
          <div style={{ marginTop: 12, borderTop: "1px solid #eee", paddingTop: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>إعادة تعيين كلمة المرور</div>
            <button
              onClick={handleIssueReset}
              disabled={!selectedUserId || issuing}
              style={{ padding: "8px 12px", borderRadius: 10, border: "none",
                       background: issuing ? "#94a3b8" : "#10b981", color: "#fff",
                       cursor: issuing ? "not-allowed" : "pointer" }}
            >
              {issuing ? "جاري الإصدار…" : "إصدار رابط إعادة تعيين"}
            </button>

            {issuedInfo && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <div>ينتهي في: {new Date(issuedInfo.expiresAt).toLocaleString("ar-LY")}</div>
                {issuedInfo.url && (
                  <div className="mt-1 break-all">
                    الرابط: <a href={issuedInfo.url} target="_blank" rel="noreferrer">{issuedInfo.url}</a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* يمين: إنشاء مستخدم جديد (كما كان) */}
        <div style={card}>
          <h3 style={h3}>إنشاء مستخدم جديد</h3>
          <form onSubmit={createUser}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={label}>الاسم الكامل</label>
                <input style={input} value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} required />
              </div>
              <div>
                <label style={label}>اسم المستخدم</label>
                <input style={input} value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
              </div>
              <div>
                <label style={label}>البريد الإلكتروني (اختياري)</label>
                <input style={input} type="email" value={newUser.email ?? ""} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div>
                <label style={label}>كلمة المرور (اختياري)</label>
                <input style={input} type="password" placeholder="إن تُركت فارغة سيتم توليد كلمة مؤقتة" value={newUser.password ?? ""} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              </div>
              <div>
                <label style={label}>القسم</label>
                <select
                  style={input}
                  value={newUser.departmentId ?? ""}
                  onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">— بدون قسم —</option>
                  {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 26 }}>
                <input
                  id="isActive"
                  type="checkbox"
                  checked={!!newUser.isActive}
                  onChange={(e) => setNewUser({ ...newUser, isActive: e.target.checked })}
                />
                <label htmlFor="isActive">مفعّل</label>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>أدوار ابتدائية</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 160, overflow: "auto", border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
                {(allRoles ?? []).map((r) => {
                  const checked = newUser.roleIds?.includes(r.id) ?? false;
                  return (
                    <label key={r.id} style={{ display: "flex", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const set = new Set<number>(newUser.roleIds ?? []);
                          checked ? set.delete(r.id) : set.add(r.id);
                          setNewUser({ ...newUser, roleIds: [...set] });
                        }}
                      />
                      <span>{r.roleName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={createBusy}
              style={{
                marginTop: 14, padding: "10px 16px", borderRadius: 10, border: "none",
                background: createBusy ? "#94a3b8" : "#10b981", color: "#fff",
                cursor: createBusy ? "not-allowed" : "pointer",
              }}
            >
              {createBusy ? "جاري الإنشاء…" : "إنشاء المستخدم"}
            </button>
          </form>
        </div>
      </div>

      <div
        ref={toastRef}
        style={{
          position: "fixed", bottom: 24, right: 24, background: "#0f766e",
          color: "#fff", padding: "10px 14px", borderRadius: 12,
          boxShadow: "0 6px 20px rgba(0,0,0,.18)", opacity: 0,
          transition: "opacity .2s ease", pointerEvents: "none",
        }}
      />
    </div>
  );
}




// // src/pages/UsersAdminPage.tsx

// import { useEffect, useMemo, useRef, useState } from "react";
// import api from "../api/apiClient";
// import { listUsers, type UserSummary } from "../api/users";
// import { initiatePasswordReset } from "../api/users";
// import { listDepartments, type DepartmentDto } from "../api/departments";
// import {
//   listRoles,
//   getUserRoles,
//   setUserRoles,
//   type RoleDto,
//   type UserRolesDto,
// } from "../api/rbac";

// /* ===== Utilities ===== */
// function useDebounced<T>(value: T, ms = 350) {
//   const [v, setV] = useState(value);
//   useEffect(() => {
//     const t = setTimeout(() => setV(value), ms);
//     return () => clearTimeout(t);
//   }, [value, ms]);
//   return v;
// }

// function classNames(...xs: Array<string | false | null | undefined>) {
//   return xs.filter(Boolean).join(" ");
// }

// function randomPassword(len = 10) {
//   const chars =
//     "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
//   let out = "";
//   for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
//   return out;
// }

// /* ====== Modal (pure Tailwind) ====== */
// function Modal({
//   open,
//   title,
//   onClose,
//   children,
//   maxWidth = "max-w-3xl",
// }: {
//   open: boolean;
//   title: string;
//   onClose: () => void;
//   children: React.ReactNode;
//   maxWidth?: string;
// }) {
//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 z-[100]">
//       <div
//         className="absolute inset-0 bg-black/30"
//         onClick={onClose}
//         aria-hidden
//       />
//       <div
//         className={classNames(
//           "absolute inset-x-0 top-16 mx-auto bg-white rounded-2xl shadow-xl border border-slate-200",
//           "p-5",
//           maxWidth
//         )}
//         dir="rtl"
//       >
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
//           <button
//             onClick={onClose}
//             className="rounded-lg px-3 py-1 text-slate-600 hover:bg-slate-100"
//           >
//             إغلاق
//           </button>
//         </div>
//         {children}
//       </div>
//     </div>
//   );
// }

// /* ===== Types ===== */
// type CreateUserPayload = {
//   fullName: string;
//   username: string;
//   email?: string;
//   password?: string;
//   departmentId?: number | null;
//   isActive?: boolean;
//   roleIds?: number[];
// };

// /* ===== Page ===== */
// export default function UsersAdminPage() {
//   /* ---- global state ---- */
//   const [error, setError] = useState<string | null>(null);
//   const [toast, setToast] = useState<string | null>(null);
//   const toastTimer = useRef<number | null>(null);

//   const showToast = (msg: string) => {
//     setToast(msg);
//     if (toastTimer.current) window.clearTimeout(toastTimer.current);
//     toastTimer.current = window.setTimeout(() => setToast(null), 2200);
//   };

//   /* ---- search & users ---- */
//   const [search, setSearch] = useState("");
//   const debounced = useDebounced(search, 350);
//   const [users, setUsers] = useState<UserSummary[]>([]);
//   const [loadingUsers, setLoadingUsers] = useState(true);
//   const [selectedId, setSelectedId] = useState<number | null>(null);

//   /* ---- roles ---- */
//   const [roles, setRoles] = useState<RoleDto[]>([]);
//   const [loadingRoles, setLoadingRoles] = useState(true);
//   const [userRoles, setUserRoles] = useState<UserRolesDto | null>(null);
//   const [savingRoles, setSavingRoles] = useState(false);

//   /* ---- departments ---- */
//   const [deps, setDeps] = useState<DepartmentDto[]>([]);
//   const [loadingDeps, setLoadingDeps] = useState(true);

//   /* ---- create modal ---- */
//   const [openCreate, setOpenCreate] = useState(false);
//   const [creating, setCreating] = useState(false);
//   const [newUser, setNewUser] = useState<CreateUserPayload>({
//     fullName: "",
//     username: "",
//     email: "",
//     password: "",
//     departmentId: null,
//     isActive: true,
//     roleIds: [],
//   });
//   const [createResultPwd, setCreateResultPwd] = useState<string | null>(null);

//   /* ---- reset password (admin for selected user) ---- */
//   const [resetBusy, setResetBusy] = useState(false);
//   const [resetPwd, setResetPwd] = useState("");
//   const [resetLink, setResetLink] = useState<string | null>(null);

//   const selected = useMemo(
//     () => users.find((u) => u.id === selectedId) ?? null,
//     [users, selectedId]
//   );
//   const selectedRoleIds = useMemo(
//     () => new Set<number>(userRoles?.roleIds ?? []),
//     [userRoles]
//   );

//   /* ===== Load Roles once ===== */
//   useEffect(() => {
//     let m = true;
//     (async () => {
//       try {
//         setLoadingRoles(true);
//         const rs = await listRoles();
//         if (!m) return;
//         setRoles(rs);
//       } catch (e) {
//         setError("تعذر تحميل الأدوار.");
//       } finally {
//         setLoadingRoles(false);
//       }
//     })();
//     return () => {
//       m = false;
//     };
//   }, []);

//   /* ===== Load Departments once ===== */
//   useEffect(() => {
//     let m = true;
//     (async () => {
//       try {
//         setLoadingDeps(true);
//         const ds = await listDepartments();
//         if (!m) return;
//         setDeps(ds);
//       } catch {
//         setError("تعذر تحميل الأقسام.");
//       } finally {
//         setLoadingDeps(false);
//       }
//     })();
//     return () => {
//       m = false;
//     };
//   }, []);

//   /* ===== Load Users (search) ===== */
//   useEffect(() => {
//     let m = true;
//     (async () => {
//       try {
//         setLoadingUsers(true);
//         const list = await listUsers({ search: debounced, page: 1, pageSize: 80 });
//         if (!m) return;
//         setUsers(list);
//         if (!selectedId && list.length) setSelectedId(list[0].id);
//       } catch {
//         if (m) {
//           setUsers([]);
//           setError("تعذر تحميل المستخدمين.");
//         }
//       } finally {
//         if (m) setLoadingUsers(false);
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [debounced]);

//   /* ===== Load selected user's roles ===== */
//   useEffect(() => {
//     if (!selectedId) {
//       setUserRoles(null);
//       return;
//     }
//     let m = true;
//     (async () => {
//       try {
//         const dto = await getUserRoles(selectedId);
//         if (!m) return;
//         setUserRoles(dto);
//       } catch {
//         if (m) {
//           setUserRoles({ userId: selectedId, roleIds: [], roles: [], count: 0 });
//           setError("تعذر تحميل أدوار المستخدم.");
//         }
//       }
//     })();
//     return () => {
//       m = false;
//     };
//   }, [selectedId]);

//   /* ===== Actions ===== */
//   const toggleRole = (roleId: number) => {
//     if (!userRoles) return;
//     const next = new Set(userRoles.roleIds);
//     next.has(roleId) ? next.delete(roleId) : next.add(roleId);
//     const chosen = roles.filter((r) => next.has(r.id));
//     setUserRoles({ ...userRoles, roleIds: [...next], roles: chosen, count: next.size });
//   };

//   const saveRoles = async () => {
//     if (!userRoles) return;
//     try {
//       setSavingRoles(true);
//       await setUserRoles(userRoles.userId, userRoles.roleIds);
//       const refreshed = await getUserRoles(userRoles.userId);
//       setUserRoles(refreshed);
//       showToast("تم حفظ الأدوار بنجاح.");
//     } catch {
//       showToast("تعذر حفظ الأدوار.", true as any);
//     } finally {
//       setSavingRoles(false);
//     }
//   };

//   const handleOpenCreate = () => {
//     setCreateResultPwd(null);
//     setNewUser({
//       fullName: "",
//       username: "",
//       email: "",
//       password: "",
//       departmentId: null,
//       isActive: true,
//       roleIds: [],
//     });
//     setOpenCreate(true);
//   };

//   const createUser = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       setCreating(true);
//       const payload: CreateUserPayload = {
//         ...newUser,
//         departmentId: newUser.departmentId || undefined,
//         roleIds: newUser.roleIds && newUser.roleIds.length ? newUser.roleIds : undefined,
//         password: newUser.password?.trim() ? newUser.password.trim() : undefined,
//         email: newUser.email?.trim() ? newUser.email.trim() : undefined,
//       };

//       const res = await api.post("/users", payload);
//       const data = res?.data || {};
//       const userId = Number(data?.userId ?? data?.data?.userId ?? 0);
//       const tempPassword: string | undefined = data?.tempPassword ?? data?.data?.tempPassword;

//       // جرّب إيجاد المستخدم الجديد عبر البحث باليوزرنيم
//       if (userId) {
//         const fresh = await listUsers({ search: String(userId), page: 1, pageSize: 1 });
//         // fallback: جرّب باليوزرنيم أيضًا
//         const fallback =
//           fresh.length === 0
//             ? await listUsers({ search: newUser.username, page: 1, pageSize: 1 })
//             : fresh;

//         // أضِف للقائمة إن لم يكن موجودًا واختره
//         setUsers((prev) => {
//           const found = prev.some((u) => u.id === (fallback[0]?.id ?? userId));
//           return found ? prev : [...prev, ...(fallback.length ? [fallback[0]] : [])];
//         });
//         setSelectedId(fallback[0]?.id ?? userId);
//       }

//       if (tempPassword) setCreateResultPwd(tempPassword);
//       showToast("تم إنشاء المستخدم بنجاح.");
//     } catch (err: any) {
//       const msg = err?.response?.data?.message ?? "تعذر إنشاء المستخدم.";
//       setError(msg);
//     } finally {
//       setCreating(false);
//     }
//   };

//   const resetUserPassword = async () => {
//     if (!selectedId) return;
//     try {
//       setResetBusy(true);
//       const np = resetPwd.trim() || randomPassword(10);
//       await api.post(`/users/${selectedId}/reset-password`, { newPassword: np });
//       setResetPwd("");
//       showToast("تم تغيير كلمة المرور للمستخدم المحدد.");
//       // أعرض كلمة المرور الجديدة إن كانت مولدة تلقائيًا
//       if (!resetPwd.trim()) {
//         alert("تم توليد كلمة مرور مؤقتة:\n\n" + np + "\n\nانسخها وسلّمها للمستخدم.");
//       }
//     } catch (e: any) {
//       const msg = e?.response?.data?.message ?? "تعذر تغيير كلمة المرور.";
//       setError(msg);
//     } finally {
//       setResetBusy(false);
//     }
//   };

//   /* ===== UI ===== */
//   return (
//     <div className="p-4 max-w-[1400px] mx-auto" dir="rtl">
//       {/* Top Bar */}
//       <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
//         <div>
//           <h2 className="text-xl font-semibold text-slate-700">إدارة المستخدمين</h2>
//           <p className="text-sm text-slate-500">ابحث، اختر مستخدمًا، عدّل أدواره أو أعد تعيين كلمة مروره.</p>
//         </div>
//         <div className="flex items-center gap-2">
//           <div className="relative">
//             <input
//               className="w-72 rounded-xl border border-slate-300 px-4 py-2 outline-none focus:ring"
//               placeholder="ابحث بالاسم أو اسم المستخدم…"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//             />
//             <span className="absolute left-3 top-2.5 text-slate-400">🔎</span>
//           </div>
//           <button
//             onClick={handleOpenCreate}
//             className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2"
//           >
//             + إنشاء مستخدم
//           </button>
//         </div>
//       </div>

//       {error && (
//         <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
//           {error}
//         </div>
//       )}

//       {/* 3 columns layout */}
//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
//         {/* Left: Users list */}
//         <div className="lg:col-span-4">
//           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
//             <div className="border-b border-slate-100 px-4 py-3 font-medium">المستخدمون</div>
//             <div className="max-h-[540px] overflow-auto divide-y divide-slate-100">
//               {loadingUsers ? (
//                 <div className="p-4 text-slate-500">جارِ التحميل…</div>
//               ) : users.length === 0 ? (
//                 <div className="p-4 text-slate-500">لا توجد نتائج.</div>
//               ) : (
//                 users.map((u) => {
//                   const active = u.isActive !== false;
//                   return (
//                     <button
//                       key={u.id}
//                       onClick={() => setSelectedId(u.id)}
//                       className={classNames(
//                         "w-full text-right px-4 py-3 hover:bg-slate-50",
//                         selectedId === u.id && "bg-emerald-50/60"
//                       )}
//                     >
//                       <div className="flex items-center justify-between">
//                         <div className="font-medium text-slate-700">
//                           {u.fullName}{" "}
//                           <span className="text-slate-400">— {u.username}</span>
//                         </div>
//                         <div
//                           className={classNames(
//                             "text-xs rounded-full px-2 py-0.5",
//                             active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
//                           )}
//                         >
//                           {active ? "مفعّل" : "مقفّل"}
//                         </div>
//                       </div>
//                       <div className="text-xs text-slate-500 mt-1">
//                         {u.department?.name ? `القسم: ${u.department.name}` : "بدون قسم"}
//                       </div>
//                     </button>
//                   );
//                 })
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Middle: Selected summary */}
//         <div className="lg:col-span-4">
//           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
//             <div className="border-b border-slate-100 px-4 py-3 font-medium">
//               معلومات المستخدم
//             </div>
//             {selected ? (
//               <div className="p-4 space-y-3 text-slate-700">
//                 <div>
//                   <div className="text-sm text-slate-500">الاسم الكامل</div>
//                   <div className="font-semibold">{selected.fullName}</div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-slate-500">اسم المستخدم</div>
//                   <div className="font-semibold">{selected.username}</div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-slate-500">القسم</div>
//                   <div className="">
//                     {selected.department?.name ?? <span className="text-slate-400">بدون قسم</span>}
//                   </div>
//                 </div>
//                 <div>
//                   <div className="text-sm text-slate-500">الحالة</div>
//                   <div
//                     className={classNames(
//                       "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm",
//                       selected.isActive !== false
//                         ? "bg-emerald-50 text-emerald-700"
//                         : "bg-slate-100 text-slate-600"
//                     )}
//                   >
//                     <span className="text-lg">•</span>
//                     {selected.isActive !== false ? "مفعّل" : "مقفّل"}
//                   </div>
//                 </div>
//                 <button
//                   type="button"
//                   onClick={async () => {
//                     if (!selectedUserId) return;
//                     try {
//                       const { url } = await initiatePasswordReset(selectedUserId, 30);
//                       setResetLink(url);
//                       showToast("تم إصدار رابط إعادة التعيين.");
//                     } catch (e) {
//                       showToast("تعذّر إصدار الرابط.", true);
//                     }
//                   }}
//                   className="mt-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
//                 >
//                   إصدار رابط إعادة تعيين
//                 </button>

//                 {resetLink && (
//                   <div className="mt-2 text-xs select-all break-all bg-amber-50 border border-amber-200 rounded-lg p-2">
//                     {resetLink}
//                   </div>
//                 )}
//               </div>
//             ) : (
//               <div className="p-4 text-slate-500">اختر مستخدمًا من القائمة.</div>
//             )}
//           </div>

//           {/* Reset password */}
//           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm mt-4">
//             <div className="border-b border-slate-100 px-4 py-3 font-medium">
//               تغيير كلمة المرور للمستخدم المحدد
//             </div>
//             <div className="p-4">
//               <div className="text-sm text-slate-500 mb-2">
//                 اكتب كلمة مرور جديدة أو اتركها فارغة لنولِّد واحدة مؤقتة.
//               </div>
//               <div className="flex items-center gap-2">
//                 <input
//                   className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring"
//                   type="password"
//                   placeholder="كلمة مرور جديدة (اختياري)"
//                   value={resetPwd}
//                   onChange={(e) => setResetPwd(e.target.value)}
//                   disabled={!selected}
//                 />
//                 <button
//                   onClick={() => setResetPwd(randomPassword(10))}
//                   className="rounded-xl border px-3 py-2 hover:bg-slate-50"
//                   disabled={!selected}
//                 >
//                   توليد
//                 </button>
//                 <button
//                   onClick={resetUserPassword}
//                   disabled={!selected || resetBusy}
//                   className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-50"
//                 >
//                   {resetBusy ? "جارِ الحفظ…" : "حفظ"}
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Right: Roles */}
//         <div className="lg:col-span-4">
//           <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
//             <div className="border-b border-slate-100 px-4 py-3 font-medium">
//               أدوار المستخدم {selectedId ? `#${selectedId}` : ""}
//             </div>

//             <div className="p-4">
//               {loadingRoles || !selectedId ? (
//                 <div className="text-slate-500">اختر مستخدمًا…</div>
//               ) : (
//                 <>
//                   <div className="max-h-[360px] overflow-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
//                     {roles.map((r) => {
//                       const checked = selectedRoleIds.has(r.id);
//                       return (
//                         <label
//                           key={r.id}
//                           className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
//                         >
//                           <div>
//                             <div className="font-medium">
//                               {r.roleName} {r.isSystem ? <span className="text-xs text-slate-400">(system)</span> : null}
//                             </div>
//                             {r.description ? (
//                               <div className="text-xs text-slate-500">{r.description}</div>
//                             ) : null}
//                           </div>
//                           <input
//                             type="checkbox"
//                             className="mt-1 h-4 w-4"
//                             checked={checked}
//                             onChange={() => toggleRole(r.id)}
//                           />
//                         </label>
//                       );
//                     })}
//                   </div>
//                   <div className="mt-3 flex justify-end">
//                     <button
//                       onClick={saveRoles}
//                       disabled={savingRoles || !selectedId}
//                       className="rounded-xl bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 disabled:opacity-50"
//                     >
//                       {savingRoles ? "جارِ الحفظ…" : "حفظ تغييرات الأدوار"}
//                     </button>
//                   </div>
//                 </>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Create User Modal */}
//       <Modal open={openCreate} onClose={() => setOpenCreate(false)} title="إنشاء مستخدم جديد">
//         <form onSubmit={createUser} className="space-y-4">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//             <label className="block">
//               <span className="text-sm text-slate-600">الاسم الكامل</span>
//               <input
//                 className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring"
//                 required
//                 value={newUser.fullName}
//                 onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
//               />
//             </label>
//             <label className="block">
//               <span className="text-sm text-slate-600">اسم المستخدم</span>
//               <input
//                 className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring"
//                 required
//                 value={newUser.username}
//                 onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
//               />
//             </label>

//             <label className="block">
//               <span className="text-sm text-slate-600">البريد الإلكتروني (اختياري)</span>
//               <input
//                 className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring"
//                 type="email"
//                 value={newUser.email ?? ""}
//                 onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
//               />
//             </label>
//             <label className="block">
//               <span className="text-sm text-slate-600">كلمة المرور (اختياري)</span>
//               <input
//                 className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring"
//                 type="password"
//                 placeholder="إن تُركت فارغة سيتم توليد كلمة مؤقتة"
//                 value={newUser.password ?? ""}
//                 onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
//               />
//             </label>

//             <label className="block">
//               <span className="text-sm text-slate-600">القسم</span>
//               <select
//                 className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:ring"
//                 value={newUser.departmentId ?? ""}
//                 onChange={(e) =>
//                   setNewUser({
//                     ...newUser,
//                     departmentId: e.target.value ? Number(e.target.value) : null,
//                   })
//                 }
//               >
//                 <option value="">— بدون قسم —</option>
//                 {deps.map((d) => (
//                   <option key={d.id} value={d.id}>
//                     {d.name}
//                   </option>
//                 ))}
//               </select>
//             </label>

//             <label className="flex items-center gap-2 pt-6">
//               <input
//                 type="checkbox"
//                 checked={!!newUser.isActive}
//                 onChange={(e) => setNewUser({ ...newUser, isActive: e.target.checked })}
//               />
//               <span>مفعّل</span>
//             </label>
//           </div>

//           <div>
//             <div className="font-medium mb-2">أدوار ابتدائية</div>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-auto rounded-xl border border-slate-200 p-3">
//               {roles.map((r) => {
//                 const checked = newUser.roleIds?.includes(r.id) ?? false;
//                 return (
//                   <label key={r.id} className="flex items-center gap-2">
//                     <input
//                       type="checkbox"
//                       checked={checked}
//                       onChange={() => {
//                         const set = new Set<number>(newUser.roleIds ?? []);
//                         checked ? set.delete(r.id) : set.add(r.id);
//                         setNewUser({ ...newUser, roleIds: [...set] });
//                       }}
//                     />
//                     <span>
//                       {r.roleName} {r.isSystem ? <span className="text-xs text-slate-400">(system)</span> : null}
//                     </span>
//                   </label>
//                 );
//               })}
//             </div>
//           </div>

//           {createResultPwd && (
//             <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
//               تم إنشاء المستخدم بكلمة مؤقتة:{" "}
//               <span className="font-mono font-semibold">{createResultPwd}</span>
//             </div>
//           )}

//           <div className="flex items-center justify-end gap-2">
//             <button
//               type="button"
//               onClick={() => setOpenCreate(false)}
//               className="rounded-xl border px-4 py-2 hover:bg-slate-50"
//             >
//               إلغاء
//             </button>
//             <button
//               type="submit"
//               disabled={creating}
//               className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 disabled:opacity-50"
//             >
//               {creating ? "جارِ الإنشاء…" : "إنشاء المستخدم"}
//             </button>
//           </div>
//         </form>
//       </Modal>

//       {/* Toast */}
//       {toast && (
//         <div className="fixed bottom-6 left-6 rounded-xl bg-emerald-600 text-white px-4 py-2 shadow-lg">
//           {toast}
//         </div>
//       )}
//     </div>
//   );
// }


