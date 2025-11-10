// src/pages/UsersAdminPage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listUsers,
  getUserById,
  createUser,
  resetUserPassword,
  type UserSummary,
} from "../api/users";
import {
  listRoles,
  getUserRoles,
  setUserRoles,
  type RoleDto,
  type UserRolesDto,
} from "../api/rbac";
import { listDepartments, type DepartmentDto } from "../api/departments";

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
  password?: string; // اختياري - لو فارغة يُولّد السيرفر كلمة مؤقتة
  departmentId?: number | null;
  isActive?: boolean;
  roleIds?: number[];
};

export default function UsersAdminPage() {
  // ====== إشعارات بسيطة ======
  const toastRef = useRef<HTMLDivElement>(null);
  const showToast = (msg: string, danger = false) => {
    if (!toastRef.current) return;
    toastRef.current.textContent = msg;
    toastRef.current.style.opacity = "1";
    toastRef.current.style.background = danger ? "#b00020" : "#0f766e";
    setTimeout(() => {
      if (toastRef.current) toastRef.current.style.opacity = "0";
    }, 1800);
  };

  // ====== حالات عامة ======
  const [error, setError] = useState<string | null>(null);

  // ====== المستخدمون والبحث ======
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // ====== الأدوار ======
  const [allRoles, setAllRoles] = useState<RoleDto[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [userRolesDto, setUserRolesDto] = useState<UserRolesDto | null>(null);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);

  // ====== الأقسام ======
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(true);

  // ====== إنشاء مستخدم جديد ======
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

  // ====== مودال تغيير كلمة المرور ======
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const selectedRoleIds = useMemo(
    () => new Set<number>(userRolesDto?.roleIds ?? []),
    [userRolesDto]
  );

  // ====== تحميل الأدوار مرة ======
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
        if (mounted)
          setError(
            "تعذّر تحميل الأدوار. (تأكد من منح RBAC_MANAGE/READ لحسابك)"
          );
      } finally {
        if (mounted) setLoadingRoles(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ====== تحميل الأقسام ======
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
    return () => {
      mounted = false;
    };
  }, []);

  // ====== تحميل المستخدمين ======
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingUsers(true);
        const list = await listUsers({
          search: debouncedSearch,
          page: 1,
          pageSize: 50,
        });
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

  // ====== تحميل أدوار المستخدم المحدد ======
  useEffect(() => {
    if (!selectedUserId) {
      setUserRolesDto(null);
      return;
    }
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
          setUserRolesDto({
            userId: selectedUserId,
            roleIds: [],
            roles: [],
            count: 0,
          });
          setError("تعذّر تحميل أدوار المستخدم.");
        }
      } finally {
        if (mounted) setLoadingUserRoles(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedUserId]);

  // ====== تبديل دور ======
  const toggleRole = (roleId: number) => {
    if (!userRolesDto) return;
    const next = new Set<number>(userRolesDto.roleIds);
    next.has(roleId) ? next.delete(roleId) : next.add(roleId);
    const roleList = allRoles.filter((r) => next.has(r.id));
    setUserRolesDto({
      ...userRolesDto,
      roleIds: [...next],
      roles: roleList,
      count: next.size,
    });
  };

  // ====== حفظ أدوار المستخدم ======
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

  // ====== إنشاء مستخدم جديد ======
  const createUserHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreateBusy(true);
      const payload: CreateUserPayload = {
        ...newUser,
        departmentId: newUser.departmentId || undefined,
        roleIds: newUser.roleIds?.length ? newUser.roleIds : undefined,
      };

      const res = await createUser(payload);
      showToast("تم إنشاء المستخدم بنجاح.");

      // اجلب المستخدم الجديد بالهوية وأضفه للقائمة بدون تكرار
      const created = await getUserById(res.userId);
      if (created) {
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === created.id);
          const next = exists ? prev.map((u) => (u.id === created.id ? created : u)) : [created, ...prev];
          return next.sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));
        });
        setSelectedUserId(created.id);
      }

      // لو السيرفر ولّد كلمة مؤقتة (لأنك تركت الحقل فارغ) اعرضها للمسؤول
      if (res.tempPassword) {
        alert(`تم إنشاء كلمة مرور مؤقتة للمستخدم:\n${res.tempPassword}`);
      }

      // إعادة تعيين النموذج
      setNewUser({
        fullName: "",
        username: "",
        email: "",
        password: "",
        departmentId: null,
        isActive: true,
        roleIds: [],
      });
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.message ?? "تعذّر إنشاء المستخدم.";
      showToast(msg, true);
    } finally {
      setCreateBusy(false);
    }
  };

  // ====== حفظ كلمة مرور جديدة للمستخدم المحدد ======
  const submitNewPassword = async () => {
    if (!selectedUserId || !newPassword || newPassword.length < 6) {
      showToast("أدخل كلمة مرور لا تقل عن 6 أحرف.", true);
      return;
    }
    try {
      setSavingPassword(true);
      await resetUserPassword(selectedUserId, newPassword);
      setPwModalOpen(false);
      setNewPassword("");
      showToast("تم تغيير كلمة المرور بنجاح.");
    } catch (e) {
      console.error(e);
      showToast("تعذّر تغيير كلمة المرور.", true);
    } finally {
      setSavingPassword(false);
    }
  };

  // ====== ستايلات بسيطة ======
  const card: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    background: "#fff",
    boxShadow: "0 6px 22px rgba(0,0,0,.06)",
  };
  const label: React.CSSProperties = {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
    display: "block",
  };
  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
  };
  const h3: React.CSSProperties = { marginTop: 0, marginBottom: 12 };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <h2 style={{ margin: "6px 0 16px 0" }}>إدارة المستخدمين</h2>

      {/* أعلى: البحث + اختيار المستخدم */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div style={card}>
          <label style={label}>ابحث عن مستخدم بالاسم أو اسم المستخدم</label>
          <input
            style={input}
            placeholder="مثال: محمد.. أو admin"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={card}>
          <label style={label}>المستخدم</label>
          <select
            style={input}
            value={selectedUserId ?? ""}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
          >
            <option value="" disabled>
              اختر مستخدمًا
            </option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} — {u.username}
                {u.department?.name ? ` (${u.department.name})` : ""}
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
        {/* يسار: إدارة أدوار المستخدم + تغيير كلمة المرور */}
        <div style={card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <h3 style={h3}>
              أدوار المستخدم {selectedUserId ? `#${selectedUserId}` : ""}
            </h3>

            <button
              onClick={() => setPwModalOpen(true)}
              disabled={!selectedUserId}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
                cursor: selectedUserId ? "pointer" : "not-allowed",
              }}
              title="تغيير كلمة مرور المستخدم المحدد"
            >
              تغيير كلمة المرور
            </button>
          </div>

          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              maxHeight: 440,
              overflow: "auto",
            }}
          >
            {(allRoles ?? []).length === 0 && <div>لا توجد أدوار.</div>}
            {(allRoles ?? []).map((r) => {
              const checked = selectedRoleIds.has(r.id);
              return (
                <label
                  key={r.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "start",
                    padding: "6px 0",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(r.id)}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {r.roleName} {r.isSystem ? " (system)" : ""}
                    </div>
                    {r.description && (
                      <div style={{ color: "#555", fontSize: 13 }}>
                        {r.description}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <button
            onClick={saveUserRoles}
            disabled={savingRoles || !selectedUserId}
            style={{
              marginTop: 14,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: savingRoles ? "#94a3b8" : "#0ea5e9",
              color: "#fff",
              cursor: savingRoles ? "not-allowed" : "pointer",
            }}
          >
            {savingRoles ? "جاري الحفظ…" : "حفظ تغييرات الأدوار"}
          </button>
        </div>

        {/* يمين: إنشاء مستخدم جديد */}
        <div style={card}>
          <h3 style={h3}>إنشاء مستخدم جديد</h3>
          <form onSubmit={createUserHandler}>
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
            >
              <div>
                <label style={label}>الاسم الكامل</label>
                <input
                  style={input}
                  value={newUser.fullName}
                  onChange={(e) =>
                    setNewUser({ ...newUser, fullName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label style={label}>اسم المستخدم</label>
                <input
                  style={input}
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label style={label}>البريد الإلكتروني (اختياري)</label>
                <input
                  style={input}
                  type="email"
                  value={newUser.email ?? ""}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder="example@org.ly"
                />
              </div>
              <div>
                <label style={label}>كلمة المرور (اختياري)</label>
                <input
                  style={input}
                  type="password"
                  placeholder="إن تُركت فارغة سيتم توليد كلمة مؤقتة"
                  value={newUser.password ?? ""}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                />
              </div>
              <div>
                <label style={label}>القسم</label>
                <select
                  style={input}
                  value={newUser.departmentId ?? ""}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      departmentId: e.target.value
                        ? Number(e.target.value)
                        : null,
                    })
                  }
                >
                  <option value="">— بدون قسم —</option>
                  {(departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 26,
                }}
              >
                <input
                  id="isActive"
                  type="checkbox"
                  checked={!!newUser.isActive}
                  onChange={(e) =>
                    setNewUser({ ...newUser, isActive: e.target.checked })
                  }
                />
                <label htmlFor="isActive">مفعّل</label>
              </div>
            </div>

            {/* اختيار أدوار ابتدائية */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                أدوار ابتدائية
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  maxHeight: 160,
                  overflow: "auto",
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 10,
                }}
              >
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
                marginTop: 14,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: createBusy ? "#94a3b8" : "#10b981",
                color: "#fff",
                cursor: createBusy ? "not-allowed" : "pointer",
              }}
            >
              {createBusy ? "جاري الإنشاء…" : "إنشاء المستخدم"}
            </button>
          </form>
        </div>
      </div>

      {/* Toast */}
      <div
        ref={toastRef}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "#0f766e",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: 12,
          boxShadow: "0 6px 20px rgba(0,0,0,.18)",
          opacity: 0,
          transition: "opacity .2s ease",
          pointerEvents: "none",
        }}
      />

      {/* Modal: تغيير كلمة المرور */}
      {pwModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
          }}
          onClick={() => !savingPassword && setPwModalOpen(false)}
        >
          <div
            style={{
              width: 420,
              maxWidth: "95vw",
              background: "#fff",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>تغيير كلمة المرور</h3>
            <p style={{ marginTop: 0, color: "#444", fontSize: 14 }}>
              ستقوم بتعيين كلمة مرور جديدة للمستخدم المحدد.
            </p>

            <label style={{ display: "block", marginTop: 8 }}>
              <span style={{ fontSize: 13, color: "#555" }}>
                كلمة المرور الجديدة
              </span>
              <input
                type="password"
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                }}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="على الأقل 6 أحرف"
                autoFocus
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 14,
              }}
            >
              <button
                onClick={() => setPwModalOpen(false)}
                disabled={savingPassword}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={submitNewPassword}
                disabled={savingPassword}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: savingPassword ? "#94a3b8" : "#0ea5e9",
                  color: "#fff",
                  cursor: savingPassword ? "not-allowed" : "pointer",
                }}
              >
                {savingPassword ? "جارِ الحفظ…" : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





// // src/pages/UsersAdminPage.tsx


// import { useEffect, useMemo, useRef, useState } from "react";
// import { listUsers, getUserById, createUserApi, type UserSummary } from "../api/users";
// import { listRoles, getUserRoles, setUserRoles, type RoleDto, type UserRolesDto } from "../api/rbac";
// import { listDepartments, type DepartmentDto } from "../api/departments";

// function useDebouncedValue<T>(value: T, delay = 400) {
//   const [v, setV] = useState(value);
//   useEffect(() => {
//     const t = setTimeout(() => setV(value), delay);
//     return () => clearTimeout(t);
//   }, [value, delay]);
//   return v;
// }

// type CreateUserPayload = {
//   fullName: string;
//   username: string;
//   email?: string;
//   password?: string;          // اختياري
//   departmentId?: number | null;
//   isActive?: boolean;
//   roleIds?: number[];
// };

// export default function UsersAdminPage() {
//   // ====== حالة عامة ======
//   const [error, setError] = useState<string | null>(null);
//   const toastRef = useRef<HTMLDivElement>(null);

//   // ====== المستخدمون والبحث ======
//   const [search, setSearch] = useState("");
//   const debouncedSearch = useDebouncedValue(search, 350);
//   const [users, setUsers] = useState<UserSummary[]>([]);
//   const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
//   const [loadingUsers, setLoadingUsers] = useState(true);

//   // ====== الأدوار ======
//   const [allRoles, setAllRoles] = useState<RoleDto[]>([]);
//   const [loadingRoles, setLoadingRoles] = useState(true);
//   const [userRolesDto, setUserRolesDto] = useState<UserRolesDto | null>(null);
//   const [loadingUserRoles, setLoadingUserRoles] = useState(false);
//   const [savingRoles, setSavingRoles] = useState(false);

//   // ====== الأقسام ======
//   const [departments, setDepartments] = useState<DepartmentDto[]>([]);
//   const [loadingDeps, setLoadingDeps] = useState(true);

//   // ====== إنشاء مستخدم جديد ======
//   const [createBusy, setCreateBusy] = useState(false);
//   const [newUser, setNewUser] = useState<CreateUserPayload>({
//     fullName: "",
//     username: "",
//     email: "",
//     password: "",
//     departmentId: null,
//     isActive: true,
//     roleIds: [],
//   });
//   const selectedRoleIds = useMemo(() => new Set<number>(userRolesDto?.roleIds ?? []), [userRolesDto]);

//   // ====== Helpers ======
//   const showToast = (msg: string, danger = false) => {
//     if (!toastRef.current) return;
//     toastRef.current.textContent = msg;
//     toastRef.current.style.opacity = "1";
//     toastRef.current.style.background = danger ? "#b00020" : "#0f766e";
//     setTimeout(() => {
//       if (toastRef.current) toastRef.current.style.opacity = "0";
//     }, 1800);
//   };

//   // ====== تحميل الأدوار ======
//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         setLoadingRoles(true);
//         const roles = await listRoles();
//         if (!mounted) return;
//         setAllRoles(roles);
//       } catch (e: any) {
//         console.error(e);
//         if (mounted) setError("تعذّر تحميل الأدوار. (تأكد من صلاحيات RBAC)");
//       } finally {
//         if (mounted) setLoadingRoles(false);
//       }
//     })();
//     return () => { mounted = false; };
//   }, []);

//   // ====== الأقسام ======
//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         setLoadingDeps(true);
//         const deps = await listDepartments();
//         if (!mounted) return;
//         setDepartments(deps);
//       } catch (e) {
//         console.error(e);
//         if (mounted) setError("تعذّر تحميل الأقسام.");
//       } finally {
//         if (mounted) setLoadingDeps(false);
//       }
//     })();
//     return () => { mounted = false; };
//   }, []);

//   // ====== المستخدمون ======
//   useEffect(() => {
//     let mounted = true;
//     (async () => {
//       try {
//         setLoadingUsers(true);
//         const list = await listUsers({ search: debouncedSearch, page: 1, pageSize: 50 });
//         if (!mounted) return;
//         setUsers(list);
//         if (list.length && selectedUserId == null) setSelectedUserId(list[0].id);
//       } catch (e) {
//         console.error(e);
//         if (mounted) {
//           setUsers([]);
//           setError("تعذّر تحميل المستخدمين.");
//         }
//       } finally {
//         if (mounted) setLoadingUsers(false);
//       }
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [debouncedSearch]);

//   // ====== أدوار المستخدم المحدد ======
//   useEffect(() => {
//     if (!selectedUserId) { setUserRolesDto(null); return; }
//     let mounted = true;
//     (async () => {
//       try {
//         setLoadingUserRoles(true);
//         const dto = await getUserRoles(selectedUserId);
//         if (!mounted) return;
//         setUserRolesDto(dto);
//       } catch (e) {
//         console.error(e);
//         if (mounted) {
//           setUserRolesDto({ userId: selectedUserId, roleIds: [], roles: [], count: 0 });
//           setError("تعذّر تحميل أدوار المستخدم.");
//         }
//       } finally {
//         if (mounted) setLoadingUserRoles(false);
//       }
//     })();
//     return () => { mounted = false; };
//   }, [selectedUserId]);

//   // ====== تبديل دور ======
//   const toggleRole = (roleId: number) => {
//     if (!userRolesDto) return;
//     const next = new Set<number>(userRolesDto.roleIds);
//     next.has(roleId) ? next.delete(roleId) : next.add(roleId);
//     const roleList = allRoles.filter((r) => next.has(r.id));
//     setUserRolesDto({ ...userRolesDto, roleIds: [...next], roles: roleList, count: next.size });
//   };

//   const saveUserRoles = async () => {
//     if (!userRolesDto) return;
//     try {
//       setSavingRoles(true);
//       await setUserRoles(userRolesDto.userId, userRolesDto.roleIds);
//       const fresh = await getUserRoles(userRolesDto.userId);
//       setUserRolesDto(fresh);
//       showToast("تم حفظ الأدوار بنجاح.");
//     } catch (e) {
//       console.error(e);
//       showToast("تعذّر حفظ الأدوار.", true);
//     } finally {
//       setSavingRoles(false);
//     }
//   };

//   // ====== إنشاء مستخدم جديد (إضافة فورية للـ ComboBox) ======
//   const createUser = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       setCreateBusy(true);

//       const payload: CreateUserPayload = {
//         fullName: newUser.fullName.trim(),
//         username: newUser.username.trim(),
//         email: newUser.email?.trim() || undefined,
//         password: newUser.password?.trim() || undefined,
//         departmentId: newUser.departmentId || undefined,
//         isActive: newUser.isActive ?? true,
//         roleIds: newUser.roleIds?.length ? newUser.roleIds : undefined,
//       };

//       const result = await createUserApi(payload);
//       showToast("تم إنشاء المستخدم بنجاح.");

//       // نجلب نسخة الـ summary للمستخدم الجديد ثم نضيفه للقائمة ونختاره
//       const fresh = await getUserById(result.userId);
//       if (fresh) {
//         setUsers(prev => {
//           const withoutDup = prev.filter(u => u.id !== fresh.id);
//           return [fresh, ...withoutDup]; // ضع الجديد أولاً
//         });
//         setSelectedUserId(fresh.id);
//       }

//       // إعادة ضبط النموذج
//       setNewUser({ fullName: "", username: "", email: "", password: "", departmentId: null, isActive: true, roleIds: [] });

//       // لو رجعت كلمة مؤقتة من السيرفر، أظهرها كتلميح
//       if (result.tempPassword) {
//         showToast(`كلمة مؤقتة: ${result.tempPassword}`);
//       }

//     } catch (e: any) {
//       console.error(e);
//       showToast(e?.response?.data?.message ?? "تعذّر إنشاء المستخدم.", true);
//     } finally {
//       setCreateBusy(false);
//     }
//   };

//   // ====== ستايل بسيط ======
//   const card: React.CSSProperties = {
//     border: "1px solid #e5e7eb",
//     borderRadius: 14,
//     padding: 16,
//     background: "#fff",
//     boxShadow: "0 6px 22px rgba(0,0,0,.06)",
//   };
//   const label: React.CSSProperties = { fontSize: 13, color: "#555", marginBottom: 6, display: "block" };
//   const input: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" };
//   const h3: React.CSSProperties = { marginTop: 0, marginBottom: 12 };

//   return (
//     <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
//       <h2 style={{ margin: "6px 0 16px 0" }}>إدارة المستخدمين</h2>

//       <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 14 }}>
//         <div style={card}>
//           <label style={label}>ابحث عن مستخدم بالاسم أو اسم المستخدم</label>
//           <input style={input} placeholder="مثال: محمد.. أو admin" value={search} onChange={(e) => setSearch(e.target.value)} />
//         </div>
//         <div style={card}>
//           <label style={label}>المستخدم</label>
//           <select style={input} value={selectedUserId ?? ""} onChange={(e) => setSelectedUserId(Number(e.target.value))}>
//             <option value="" disabled>اختر مستخدمًا</option>
//             {(users ?? []).map((u) => (
//               <option key={u.id} value={u.id}>
//                 {u.fullName} — {u.username}{u.department?.name ? ` (${u.department.name})` : ""}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {(loadingUsers || loadingRoles || loadingUserRoles || loadingDeps) && <div style={{ marginTop: 4 }}>جارِ التحميل…</div>}
//       {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

//       <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
//         {/* يسار: إدارة أدوار المستخدم المحدد */}
//         <div style={card}>
//           <h3 style={h3}>أدوار المستخدم {selectedUserId ? `#${selectedUserId}` : ""}</h3>
//           <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, maxHeight: 440, overflow: "auto" }}>
//             {(allRoles ?? []).length === 0 && <div>لا توجد أدوار.</div>}
//             {(allRoles ?? []).map((r) => {
//               const checked = selectedRoleIds.has(r.id);
//               return (
//                 <label key={r.id} style={{ display: "flex", gap: 10, alignItems: "start", padding: "6px 0" }}>
//                   <input type="checkbox" checked={checked} onChange={() => toggleRole(r.id)} />
//                   <div>
//                     <div style={{ fontWeight: 600 }}>{r.roleName} {r.isSystem ? " (system)" : ""}</div>
//                     {r.description && <div style={{ color: "#555", fontSize: 13 }}>{r.description}</div>}
//                   </div>
//                 </label>
//               );
//             })}
//           </div>
//           <button
//             onClick={saveUserRoles}
//             disabled={savingRoles || !selectedUserId}
//             style={{ marginTop: 14, padding: "10px 16px", borderRadius: 10, border: "none",
//                      background: savingRoles ? "#94a3b8" : "#0ea5e9", color: "#fff",
//                      cursor: savingRoles ? "not-allowed" : "pointer" }}
//           >
//             {savingRoles ? "جاري الحفظ…" : "حفظ تغييرات الأدوار"}
//           </button>
//         </div>

//         {/* يمين: إنشاء مستخدم جديد */}
//         <div style={card}>
//           <h3 style={h3}>إنشاء مستخدم جديد</h3>
//           <form onSubmit={createUser}>
//             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
//               <div>
//                 <label style={label}>الاسم الكامل</label>
//                 <input style={input} value={newUser.fullName} onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })} required />
//               </div>
//               <div>
//                 <label style={label}>اسم المستخدم</label>
//                 <input style={input} value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} required />
//               </div>
//               <div>
//                 <label style={label}>البريد الإلكتروني (اختياري)</label>
//                 <input style={input} type="email" value={newUser.email ?? ""} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
//               </div>
//               <div>
//                 <label style={label}>كلمة المرور (اختياري)</label>
//                 <input style={input} type="password" placeholder="إن تُركت فارغة سيتم توليد كلمة مؤقتة" value={newUser.password ?? ""} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
//               </div>
//               <div>
//                 <label style={label}>القسم</label>
//                 <select
//                   style={input}
//                   value={newUser.departmentId ?? ""}
//                   onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value ? Number(e.target.value) : null })}
//                 >
//                   <option value="">— بدون قسم —</option>
//                   {(departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
//                 </select>
//               </div>
//               <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 26 }}>
//                 <input id="isActive" type="checkbox" checked={!!newUser.isActive} onChange={(e) => setNewUser({ ...newUser, isActive: e.target.checked })}/>
//                 <label htmlFor="isActive">مفعّل</label>
//               </div>
//             </div>

//             {/* أدوار ابتدائية */}
//             <div style={{ marginTop: 12 }}>
//               <div style={{ fontWeight: 600, marginBottom: 8 }}>أدوار ابتدائية</div>
//               <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 160, overflow: "auto", border: "1px solid #eee", borderRadius: 12, padding: 10 }}>
//                 {(allRoles ?? []).map((r) => {
//                   const checked = newUser.roleIds?.includes(r.id) ?? false;
//                   return (
//                     <label key={r.id} style={{ display: "flex", gap: 8 }}>
//                       <input
//                         type="checkbox"
//                         checked={checked}
//                         onChange={() => {
//                           const set = new Set<number>(newUser.roleIds ?? []);
//                           checked ? set.delete(r.id) : set.add(r.id);
//                           setNewUser({ ...newUser, roleIds: [...set] });
//                         }}
//                       />
//                       <span>{r.roleName}</span>
//                     </label>
//                   );
//                 })}
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={createBusy}
//               style={{ marginTop: 14, padding: "10px 16px", borderRadius: 10, border: "none",
//                        background: createBusy ? "#94a3b8" : "#10b981", color: "#fff",
//                        cursor: createBusy ? "not-allowed" : "pointer" }}
//             >
//               {createBusy ? "جاري الإنشاء…" : "إنشاء المستخدم"}
//             </button>
//           </form>
//         </div>
//       </div>

//       {/* Toast */}
//       <div
//         ref={toastRef}
//         style={{
//           position: "fixed", bottom: 24, right: 24, background: "#0f766e",
//           color: "#fff", padding: "10px 14px", borderRadius: 12,
//           boxShadow: "0 6px 20px rgba(0,0,0,.18)", opacity: 0,
//           transition: "opacity .2s ease", pointerEvents: "none",
//         }}
//       />
//     </div>
//   );
// }

