// src/pages/RbacPage.tsx

import { useEffect, useMemo, useState } from "react";
import api from "../api/apiClient";
import PermissionsGate from "../components/PermissionsGate";
import { toast } from "sonner";
import { useAuthStore } from "../stores/authStore";

type Permission = { id: number; code: string; description?: string | null };
type Role = {
  id: number;
  roleName: string;
  description?: string | null;
  RolePermission: { Permission: Permission }[];
};
type User = { id: number; fullName: string };

export default function RbacPage() {
  const [perms, setPerms] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const me = useAuthStore((s) => s.user);

  // حالة محلية لصلاحيات الدور المختار
  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  // حالة محلية لأدوار المستخدم المختار
  const [userRoleIds, setUserRoleIds] = useState<Set<number>>(new Set());

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

  useEffect(() => {
    loadAll().catch(() => toast.error("فشل تحميل بيانات RBAC"));
  }, []);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  // مزامنة rolePerms عند تغيير الدور
  useEffect(() => {
    if (!selectedRole) {
      setRolePerms(new Set());
      return;
    }
    setRolePerms(
      new Set(selectedRole.RolePermission.map((x) => x.Permission.code))
    );
  }, [selectedRole]);

  // تحميل أدوار المستخدم عند تغييره
  useEffect(() => {
    async function loadUserRoles(uid: number) {
      try {
        const { data } = await api.get(`/rbac/users/${uid}/roles`);
        setUserRoleIds(new Set<number>((data ?? []).map((r: Role) => r.id)));
      } catch {
        setUserRoleIds(new Set());
        toast.error("فشل تحميل أدوار المستخدم");
      }
    }
    if (selectedUserId) loadUserRoles(selectedUserId);
    else setUserRoleIds(new Set());
  }, [selectedUserId]);

  function toggleLocalPerm(code: string) {
    setRolePerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function saveRolePerms() {
    if (!selectedRoleId) return;
    const preventAdminSelf =
      selectedRole?.roleName === "ADMIN" && me?.username === "admin";
    if (preventAdminSelf) {
      toast.error("لا يمكن تعديل صلاحيات دور ADMIN بواسطة المستخدم admin.");
      return;
    }

    setBusy(true);
    try {
      await api.post(`/rbac/roles/${selectedRoleId}/permissions`, {
        permCodes: Array.from(rolePerms), // ← اسم الحقل الصحيح في الباك
      });
      toast.success("تم تحديث صلاحيات الدور");
      await loadAll();
    } catch {
      toast.error("فشل تحديث صلاحيات الدور");
    } finally {
      setBusy(false);
    }
  }

  function toggleUserRole(roleId: number) {
    setUserRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  async function saveUserRoles() {
    if (!selectedUserId) return;
    const isAdminSelf = me?.username === "admin" && selectedUser?.id === me?.id;
    if (isAdminSelf) {
      toast.error("لا يمكن تعديل أدوارك كـ admin من هذه الواجهة.");
      return;
    }

    setBusy(true);
    try {
      await api.post(`/rbac/users/${selectedUserId}/roles`, {
        roleIds: Array.from(userRoleIds),
      });
      toast.success("تم تحديث أدوار المستخدم");
    } catch {
      toast.error("فشل تحديث أدوار المستخدم");
    } finally {
      setBusy(false);
    }
  }

  const roleEditingDisabled =
    busy ||
    !selectedRoleId ||
    (selectedRole?.roleName === "ADMIN" && me?.username === "admin");

  return (
    <PermissionsGate one="admin.rbac">
      <div className="space-y-6" dir="rtl">
        <h1 className="text-xl font-bold">إدارة الصلاحيات والأدوار</h1>

        {/* ===== صلاحيات الدور ===== */}
        <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm">اختر دوراً:</label>
            <select
              className="border rounded px-2 py-1 bg-transparent"
              value={selectedRoleId ?? ""}
              onChange={(e) =>
                setSelectedRoleId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">— اختر —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roleName}
                </option>
              ))}
            </select>

            <button
              className="ml-auto rounded bg-blue-600 text-white text-sm px-3 py-2 disabled:opacity-50"
              disabled={roleEditingDisabled}
              onClick={saveRolePerms}
            >
              حفظ الصلاحيات
            </button>
          </div>

          {selectedRoleId ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {perms.map((p) => {
                const id = `perm_${p.id}`;
                const checked = rolePerms.has(p.code);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 text-sm rounded border px-3 py-2"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      name={id}
                      disabled={roleEditingDisabled}
                      checked={checked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleLocalPerm(p.code);
                      }}
                    />
                    <label
                      htmlFor={id}
                      className="font-mono cursor-pointer select-none"
                    >
                      {p.code}
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              اختر دوراً لعرض/تعديل صلاحياته.
            </p>
          )}
        </section>

        {/* ===== أدوار المستخدم ===== */}
        <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm">اختر مستخدماً:</label>
            <select
              className="border rounded px-2 py-1 bg-transparent"
              value={selectedUserId ?? ""}
              onChange={(e) =>
                setSelectedUserId(
                  e.target.value ? Number(e.target.value) : null
                )
              }
            >
              <option value="">— اختر —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>

            <button
              className="ml-auto rounded bg-blue-600 text-white text-sm px-3 py-2 disabled:opacity-50"
              disabled={busy || !selectedUserId}
              onClick={saveUserRoles}
            >
              حفظ أدوار المستخدم
            </button>
          </div>

          {selectedUserId ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {roles.map((r) => {
                const id = `role_${r.id}`;
                const selected = userRoleIds.has(r.id);
                const disableThis =
                  busy ||
                  (me?.username === "admin" &&
                    selectedUser?.id === me?.id &&
                    r.roleName === "ADMIN");
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 text-sm rounded border px-3 py-2"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      name={id}
                      disabled={disableThis}
                      checked={selected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleUserRole(r.id);
                      }}
                    />
                    <label htmlFor={id} className="cursor-pointer select-none">
                      {r.roleName}
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              اختر مستخدماً لتعيين الأدوار له.
            </p>
          )}
        </section>
      </div>
    </PermissionsGate>
  );
}




// import { useEffect, useState } from "react";
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
//   const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
//   const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
//   const [busy, setBusy] = useState(false);

//   async function loadAll() {
//     const [p, r, u] = await Promise.all([
//       api.get('/rbac/permissions'),
//       api.get('/rbac/roles'),
//       api.get('/users/list-basic'),
//     ]);
//     setPerms(p.data);
//     setRoles(r.data);
//     setUsers(u.data);
//   }

//   useEffect(() => { loadAll().catch(() => toast.error('فشل تحميل بيانات RBAC')); }, []);

//   const selectedRole = roles.find(r => r.id === selectedRoleId) || null;
//   const selectedUser = users.find(u => u.id === selectedUserId) || null;

//   async function togglePermOnRole(code: string) {
//     if (!selectedRole) return;
//     setBusy(true);
//     try {
//       const current = new Set(selectedRole.RolePermission.map(x => x.Permission.code));
//       if (current.has(code)) current.delete(code); else current.add(code);
//       await api.post(`/rbac/roles/${selectedRole.id}/permissions`, { permissions: Array.from(current) });
//       await loadAll();
//       toast.success('تم تحديث صلاحيات الدور');
//     } catch {
//       toast.error('فشل تحديث صلاحيات الدور');
//     } finally { setBusy(false); }
//   }

//   async function setUserRoles(roleIds: number[]) {
//     if (!selectedUser) return;
//     setBusy(true);
//     try {
//       await api.post(`/rbac/users/${selectedUser.id}/roles`, { roleIds });
//       toast.success('تم تحديث أدوار المستخدم');
//     } catch {
//       toast.error('فشل تحديث أدوار المستخدم');
//     } finally { setBusy(false); }
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
//               value={selectedRoleId ?? ''}
//               onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : null)}
//             >
//               <option value="">— اختر —</option>
//               {roles.map(r => <option key={r.id} value={r.id}>{r.roleName}</option>)}
//             </select>
//           </div>

//           {selectedRole ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
//               {perms.map(p => {
//                 const checked = selectedRole.RolePermission.some(x => x.Permission.code === p.code);
//                 return (
//                   <label key={p.id} className="flex items-center gap-2 text-sm rounded border px-3 py-2">
//                     <input
//                       type="checkbox"
//                       disabled={busy}
//                       checked={checked}
//                       onChange={() => togglePermOnRole(p.code)}
//                     />
//                     <span className="font-mono">{p.code}</span>
//                   </label>
//                 );
//               })}
//             </div>
//           ) : (
//             <p className="text-sm text-gray-500">اختر دوراً لعرض/تعديل صلاحياته.</p>
//           )}
//         </section>

//         {/* تعيين أدوار لمستخدم */}
//         <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
//           <div className="flex items-center gap-3 mb-4">
//             <label className="text-sm">اختر مستخدماً:</label>
//             <select
//               className="border rounded px-2 py-1 bg-transparent"
//               value={selectedUserId ?? ''}
//               onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
//             >
//               <option value="">— اختر —</option>
//               {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
//             </select>
//           </div>

//           {selectedUser ? (
//             <div className="space-y-2">
//               <div className="text-sm">عيّن الأدوار:</div>
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
//                 {roles.map(r => {
//                   // مبدئيًا لا نسترجع أدوار المستخدم، لكنها تعمل كتعيين شامل عند الضغط “تأكيد”
//                   // يمكن لاحقًا جلب GET /rbac/users/:id/roles لمزامنة الحالة الأولية.
//                   const [selected, setSelected] = [false, (_: boolean)=>{}]; // اختصار لواجهة مبسطة
//                   return (
//                     <label key={r.id} className="flex items-center gap-2 text-sm rounded border px-3 py-2">
//                       <input type="checkbox" defaultChecked={selected} onChange={()=>{}} />
//                       <span>{r.roleName}</span>
//                     </label>
//                   );
//                 })}
//               </div>
//               <button
//                 className="mt-2 rounded bg-blue-600 text-white text-sm px-3 py-2 disabled:opacity-50"
//                 disabled={busy}
//                 onClick={() => {
//                   // في النسخة البسيطة: نختار كل الأدوار المعروضة (كمثال تعيين شامل)
//                   // غيّر هذا لاحقًا لقراءة حالات checkboxes الفعلية.
//                   const allRoleIds = roles.map(r => r.id);
//                   setUserRoles(allRoleIds);
//                 }}
//               >
//                 تأكيد التعيين (نموذج أولي)
//               </button>
//             </div>
//           ) : (
//             <p className="text-sm text-gray-500">اختر مستخدماً لتعيين الأدوار له.</p>
//           )}
//         </section>
//       </div>
//     </PermissionsGate>
//   );
// }
