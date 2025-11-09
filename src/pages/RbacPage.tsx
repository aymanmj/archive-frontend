import { useEffect, useMemo, useState } from "react";
import api from "../api/apiClient";
import PermissionsGate from "../components/PermissionsGate";
import { toast } from "sonner";

type Permission = { id: number; code: string; description?: string | null };
type Role = {
  id: number;
  roleName: string;
  description?: string | null;
  RolePermission: { Permission: Permission }[];
};
type User = { id: number; fullName: string };

type Recipe = {
  key: string;
  title: string;
  description: string;
  roleName: string;
  permissions: string[];
};

const RECIPES: Recipe[] = [
  {
    key: "viewer",
    title: "VIEWER (قراءة فقط)",
    description: "وصول للقراءة فقط للوارد/الصادر/الأقسام.",
    roleName: "VIEWER",
    permissions: ["incoming.read", "outgoing.read", "departments.read"],
  },
  {
    key: "clerk_incoming",
    title: "CLERK_INCOMING (كاتب وارد)",
    description: "إدخال واردات ورفع مرفقات + قراءة أساسية.",
    roleName: "CLERK_INCOMING",
    permissions: ["incoming.read", "incoming.create", "files.upload", "departments.read"],
  },
  {
    key: "supervisor_incoming",
    title: "SUPERVISOR_INCOMING (مشرف وارد)",
    description: "قراءة وتوجيه وتوزيع وتحديث حالات الوارد.",
    roleName: "SUPERVISOR_INCOMING",
    permissions: ["incoming.read", "incoming.forward", "incoming.assign", "incoming.updateStatus", "departments.read"],
  },
  {
    key: "auditor",
    title: "AUDITOR (مدقق)",
    description: "قراءة سجلات التدقيق + قراءة عامة.",
    roleName: "AUDITOR",
    permissions: ["audit.read", "incoming.read", "outgoing.read", "departments.read"],
  },
];

export default function RbacPage() {
  const [perms, setPerms] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [busy, setBusy] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");

  const [userRoleIds, setUserRoleIds] = useState<number[]>([]);
  const selectedRole = useMemo(
    () => roles.find((r) => r.id === Number(selectedRoleId)) || null,
    [roles, selectedRoleId]
  );
  const selectedUser = useMemo(
    () => users.find((u) => u.id === Number(selectedUserId)) || null,
    [users, selectedUserId]
  );

  // إنشاء دور يدوي
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  async function loadAll() {
    const [p, r, u] = await Promise.all([
      api.get("/rbac/permissions"),
      api.get("/rbac/roles"),
      api.get("/users/list-basic"),
    ]);
    setPerms(p.data);
    setRoles(r.data);
    setUsers(u.data);
  }

  async function loadUserRoles(uid: number) {
    const { data } = await api.get(`/rbac/users/${uid}/roles`);
    const ids = (data as { id: number }[]).map((x) => x.id);
    setUserRoleIds(ids);
  }

  useEffect(() => {
    loadAll().catch(() => toast.error("فشل تحميل بيانات RBAC"));
  }, []);

  useEffect(() => {
    if (selectedUserId && Number(selectedUserId) > 0) {
      loadUserRoles(Number(selectedUserId)).catch(() =>
        toast.error("فشل جلب أدوار المستخدم")
      );
    } else {
      setUserRoleIds([]);
    }
  }, [selectedUserId]);

  // تبديل صلاحية للدور المحدد
  async function togglePermOnRole(code: string) {
    if (!selectedRole) return;
    setBusy(true);
    try {
      const current = new Set(
        selectedRole.RolePermission.map((x) => x.Permission.code)
      );
      if (current.has(code)) current.delete(code);
      else current.add(code);
      await api.post(`/rbac/roles/${selectedRole.id}/permissions`, {
        permissions: Array.from(current),
      });
      await loadAll();
      toast.success("تم تحديث صلاحيات الدور");
    } catch {
      toast.error("فشل تحديث صلاحيات الدور");
    } finally {
      setBusy(false);
    }
  }

  // إنشاء دور يدوي
  async function createRole() {
    if (!newRoleName.trim()) {
      toast.error("اكتب اسم الدور");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post("/rbac/roles", {
        roleName: newRoleName.trim(),
        description: newRoleDesc || undefined,
      });
      await loadAll();
      setNewRoleName("");
      setNewRoleDesc("");
      setSelectedRoleId(data.id);
      toast.success("تم إنشاء الدور");
    } catch {
      toast.error("فشل إنشاء الدور");
    } finally {
      setBusy(false);
    }
  }

  // تنفيذ وصفة جاهزة (إنشاء/تحديث وربط الصلاحيات)
  async function applyRecipe(recipe: Recipe) {
    setBusy(true);
    try {
      await api.post("/rbac/recipes", {
        roleName: recipe.roleName,
        description: recipe.description,
        permissions: recipe.permissions,
      });
      await loadAll();
      const role = roles.find((r) => r.roleName === recipe.roleName);
      if (role) setSelectedRoleId(role.id);
      toast.success(`تم تطبيق وصفة ${recipe.roleName}`);
    } catch {
      toast.error("تعذر تطبيق الوصفة");
    } finally {
      setBusy(false);
    }
  }

  function toggleUserRole(id: number) {
    setUserRoleIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return Array.from(s);
    });
  }

  async function saveUserRoles() {
    if (!selectedUser) return;
    setBusy(true);
    try {
      await api.post(`/rbac/users/${selectedUser.id}/roles`, {
        roleIds: userRoleIds,
      });
      toast.success("تم حفظ أدوار المستخدم");
    } catch {
      toast.error("فشل حفظ أدوار المستخدم");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PermissionsGate one="admin.rbac">
      <div className="space-y-6" dir="rtl">
        <h1 className="text-xl font-bold">إدارة الصلاحيات والأدوار</h1>

        {/* ===== وصفات جاهزة ===== */}
        <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
          <div className="mb-3 font-semibold">وصفات أدوار جاهزة</div>
          <div className="grid md:grid-cols-2 gap-3">
            {RECIPES.map((rcp) => (
              <div key={rcp.key} className="rounded-xl border p-3">
                <div className="font-medium">{rcp.title}</div>
                <div className="text-xs text-gray-500 mt-1">{rcp.description}</div>
                <div className="text-[11px] mt-2 font-mono">
                  {rcp.permissions.join(", ")}
                </div>
                <button
                  disabled={busy}
                  onClick={() => applyRecipe(rcp)}
                  className="mt-3 rounded bg-emerald-600 text-white text-sm px-3 py-2 disabled:opacity-50"
                >
                  إنشاء/تحديث هذا الدور
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ===== إنشاء دور يدوي ===== */}
        <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
          <div className="mb-3 font-semibold">إنشاء دور جديد</div>
          <div className="grid gap-2 sm:grid-cols-[240px_1fr_auto]">
            <input
              className="border rounded px-3 py-2"
              placeholder="اسم الدور (مثلاً: VIEWER)"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="وصف (اختياري)"
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
            />
            <button
              disabled={busy}
              onClick={createRole}
              className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
            >
              إنشاء الدور
            </button>
          </div>
        </section>

        {/* ===== اختيار الدور وتعديل صلاحياته ===== */}
        <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm">اختر دوراً:</label>
            <select
              className="border rounded px-2 py-1 bg-transparent"
              value={selectedRoleId}
              onChange={(e) =>
                setSelectedRoleId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— اختر —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roleName}
                </option>
              ))}
            </select>
          </div>

          {selectedRole ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {perms.map((p) => {
                const checked = selectedRole.RolePermission.some(
                  (x) => x.Permission.code === p.code
                );
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-sm rounded border px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={checked}
                      onChange={() => togglePermOnRole(p.code)}
                    />
                    <span className="font-mono">{p.code}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">اختر دوراً لعرض/تعديل صلاحياته.</p>
          )}
        </section>

        {/* ===== تعيين أدوار لمستخدم ===== */}
        <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm">اختر مستخدماً:</label>
            <select
              className="border rounded px-2 py-1 bg-transparent"
              value={selectedUserId}
              onChange={(e) =>
                setSelectedUserId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">— اختر —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>

          {selectedUser ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {roles.map((r) => {
                  const id = `role_${r.id}`;
                  const checked = userRoleIds.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 text-sm rounded border px-3 py-2"
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUserRole(r.id)}
                      />
                      <span>{r.roleName}</span>
                    </label>
                  );
                })}
              </div>

              <button
                disabled={busy}
                onClick={saveUserRoles}
                className="mt-3 rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
              >
                حفظ أدوار المستخدم
              </button>
            </>
          ) : (
            <p className="text-sm text-gray-500">اختر مستخدماً لتعيين الأدوار له.</p>
          )}
        </section>
      </div>
    </PermissionsGate>
  );
}




// // src/pages/RbacPage.tsx

// import { useEffect, useMemo, useState } from "react";
// import api from "../api/apiClient";
// import PermissionsGate from "../components/PermissionsGate";
// import { toast } from "sonner";

// type Permission = { id: number; code: string; description?: string | null };
// type Role = { id: number; roleName: string; description?: string | null; RolePermission: { Permission: Permission }[] };
// type User = { id: number; fullName: string };

// export default function RbacPage() {
//   const [perms, setPerms] = useState<Permission[]>([]);
//   const [roles, setRoles] = useState<Role[]>([]);
//   const [users, setUsers] = useState<User[]>([]);

//   const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");
//   const [selectedUserId, setSelectedUserId] = useState<number | "">("");

//   // حالة محلية للاختيارات
//   const [selectedPermCodes, setSelectedPermCodes] = useState<Set<string>>(new Set());
//   const [selectedUserRoleIds, setSelectedUserRoleIds] = useState<Set<number>>(new Set());

//   const [busyRoleSave, setBusyRoleSave] = useState(false);
//   const [busyUserSave, setBusyUserSave] = useState(false);
//   const [loading, setLoading] = useState(true);

//   async function loadAll() {
//     setLoading(true);
//     try {
//       const [p, r, u] = await Promise.all([
//         api.get("/rbac/permissions"),
//         api.get("/rbac/roles"),
//         api.get("/users/list-basic"),
//       ]);
//       setPerms(p.data);
//       setRoles(r.data);
//       setUsers(u.data);
//     } catch {
//       toast.error("فشل تحميل بيانات RBAC");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadAll();
//   }, []);

//   // الدور المحدد
//   const selectedRole = useMemo(
//     () => (typeof selectedRoleId === "number" ? roles.find(r => r.id === selectedRoleId) ?? null : null),
//     [roles, selectedRoleId]
//   );

//   // المستخدم المحدد
//   const selectedUser = useMemo(
//     () => (typeof selectedUserId === "number" ? users.find(u => u.id === selectedUserId) ?? null : null),
//     [users, selectedUserId]
//   );

//   // عند تغيير الدور: نبني مجموعة الصلاحيات الحالية للدور
//   useEffect(() => {
//     if (!selectedRole) {
//       setSelectedPermCodes(new Set());
//       return;
//     }
//     const current = new Set<string>(selectedRole.RolePermission.map(x => x.Permission.code));
//     setSelectedPermCodes(current);
//   }, [selectedRole]);

//   // عند تغيير المستخدم: نجيب أدواره الحالية
//   useEffect(() => {
//     async function loadUserRoles(uid: number) {
//       try {
//         const { data } = await api.get(`/rbac/users/${uid}/roles`);
//         setSelectedUserRoleIds(new Set<number>(data.map((r: { id: number }) => r.id)));
//       } catch {
//         setSelectedUserRoleIds(new Set());
//       }
//     }
//     if (typeof selectedUserId === "number") loadUserRoles(selectedUserId);
//     else setSelectedUserRoleIds(new Set());
//   }, [selectedUserId]);

//   // تبديل صلاحية داخل الحالة المحلية
//   function togglePerm(code: string) {
//     setSelectedPermCodes(prev => {
//       const next = new Set(prev);
//       next.has(code) ? next.delete(code) : next.add(code);
//       return next;
//     });
//   }

//   // حفظ صلاحيات الدور
//   async function saveRolePermissions() {
//     if (!selectedRole) return;
//     setBusyRoleSave(true);
//     try {
//       await api.post(`/rbac/roles/${selectedRole.id}/permissions`, {
//         permissions: Array.from(selectedPermCodes),
//       });
//       toast.success("تم حفظ صلاحيات الدور");
//       await loadAll(); // لتزامن العرض مع السيرفر
//     } catch (e: any) {
//       const msg = e?.response?.data?.message || "فشل حفظ صلاحيات الدور";
//       toast.error(msg);
//     } finally {
//       setBusyRoleSave(false);
//     }
//   }

//   // تبديل دور للمستخدم داخل الحالة المحلية
//   function toggleUserRole(id: number) {
//     setSelectedUserRoleIds(prev => {
//       const next = new Set(prev);
//       next.has(id) ? next.delete(id) : next.add(id);
//       return next;
//     });
//   }

//   // حفظ أدوار المستخدم
//   async function saveUserRoles() {
//     if (!selectedUser) return;
//     setBusyUserSave(true);
//     try {
//       await api.post(`/rbac/users/${selectedUser.id}/roles`, {
//         roleIds: Array.from(selectedUserRoleIds),
//       });
//       toast.success("تم حفظ أدوار المستخدم");
//     } catch (e: any) {
//       const msg = e?.response?.data?.message || "فشل حفظ أدوار المستخدم";
//       toast.error(msg);
//     } finally {
//       setBusyUserSave(false);
//     }
//   }

//   if (loading) {
//     return (
//       <div className="p-6 text-sm text-gray-500" dir="rtl">
//         ...جاري التحميل
//       </div>
//     );
//   }

//   return (
//     <PermissionsGate one="admin.rbac">
//       <div className="space-y-6" dir="rtl">
//         <h1 className="text-xl font-bold">إدارة الصلاحيات والأدوار</h1>

//         {/* اختيار الدور وتعديل صلاحياته */}
//         <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
//           <div className="flex items-center gap-3 mb-4">
//             <label className="text-sm">اختر دوراً:</label>
//             <select
//               className="border rounded px-2 py-1 bg-transparent"
//               value={selectedRoleId}
//               onChange={(e) => {
//                 const v = e.target.value;
//                 setSelectedRoleId(v ? Number(v) : "");
//               }}
//             >
//               <option value="">— اختر —</option>
//               {roles.map(r => <option key={r.id} value={r.id}>{r.roleName}</option>)}
//             </select>

//             <button
//               onClick={saveRolePermissions}
//               disabled={!selectedRole || busyRoleSave}
//               className="rounded bg-blue-600 text-white text-sm px-3 py-2 disabled:opacity-50"
//             >
//               حفظ الصلاحيات
//             </button>
//           </div>

//           {selectedRole ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
//               {perms.map(p => {
//                 const id = `perm_${p.id}`;
//                 const checked = selectedPermCodes.has(p.code);
//                 return (
//                   <label key={p.id} htmlFor={id} className="flex items-center gap-2 text-sm rounded border px-3 py-2">
//                     <input
//                       id={id}
//                       type="checkbox"
//                       checked={checked}
//                       onChange={() => togglePerm(p.code)}
//                     />
//                     <span className="font-mono">{p.code}</span>
//                   </label>
//                 );
//               })}
//             </div>
//           ) : (
//             <p className="text-sm text-gray-500">اختر دوراً لعرض/تعديل صلاحياته ثم اضغط “حفظ الصلاحيات”.</p>
//           )}
//         </section>

//         {/* تعيين أدوار لمستخدم */}
//         <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
//           <div className="flex items-center gap-3 mb-4">
//             <label className="text-sm">اختر مستخدماً:</label>
//             <select
//               className="border rounded px-2 py-1 bg-transparent"
//               value={selectedUserId}
//               onChange={(e) => {
//                 const v = e.target.value;
//                 setSelectedUserId(v ? Number(v) : "");
//               }}
//             >
//               <option value="">— اختر —</option>
//               {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
//             </select>

//             <button
//               onClick={saveUserRoles}
//               disabled={!selectedUser || busyUserSave}
//               className="rounded bg-blue-600 text-white text-sm px-3 py-2 disabled:opacity-50"
//             >
//               حفظ أدوار المستخدم
//             </button>
//           </div>

//           {selectedUser ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
//               {roles.map(r => {
//                 const id = `role_${r.id}`;
//                 const checked = selectedUserRoleIds.has(r.id);
//                 return (
//                   <label key={r.id} htmlFor={id} className="flex items-center gap-2 text-sm rounded border px-3 py-2">
//                     <input
//                       id={id}
//                       type="checkbox"
//                       checked={checked}
//                       onChange={() => toggleUserRole(r.id)}
//                     />
//                     <span>{r.roleName}</span>
//                   </label>
//                 );
//               })}
//             </div>
//           ) : (
//             <p className="text-sm text-gray-500">اختر مستخدماً، علِّم أدواره، ثم اضغط “حفظ أدوار المستخدم”.</p>
//           )}
//         </section>
//       </div>
//     </PermissionsGate>
//   );
// }

