// src/pages/RbacPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listRoles,
  listPermissions,
  getRolePermissions,
  setRolePermissions,
  type RoleDto,
} from "../api/rbac";

export default function RbacPage() {
  const [allRoles, setAllRoles] = useState<RoleDto[]>([]);
  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const [rolePerms, setRolePerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingRole, setLoadingRole] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("");

  // --- Helpers ---
  const showToast = (msg: string, danger = false) => {
    if (!toastRef.current) return;
    toastRef.current.textContent = msg;
    toastRef.current.style.opacity = "1";
    toastRef.current.style.background = danger ? "#b00020" : "#0f766e";
    setTimeout(() => {
      if (toastRef.current) toastRef.current.style.opacity = "0";
    }, 1800);
  };

  // --- Load roles & all-permissions ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [roles, perms] = await Promise.all([listRoles(), listPermissions()]);

        if (!mounted) return;

        const rolesArr = Array.isArray(roles) ? roles : [];
        const permsArr = Array.isArray(perms) ? perms : [];

        setAllRoles(rolesArr);
        setAllPerms(permsArr);

        // select first role by default
        if (rolesArr.length && selectedRoleId == null) {
          setSelectedRoleId(rolesArr[0].id);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setAllRoles([]);
          setAllPerms([]);
          setError("تعذّر تحميل الأدوار/الصلاحيات.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Load current role permissions ---
  useEffect(() => {
    if (!selectedRoleId) {
      setRolePerms(new Set());
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setLoadingRole(true);
        const rp = await getRolePermissions(selectedRoleId);
        if (!mounted) return;

        const set = new Set<string>(Array.isArray(rp.permissionCodes) ? rp.permissionCodes : []);
        setRolePerms(set);
      } catch (e) {
        console.error(e);
        if (mounted) {
          setRolePerms(new Set());
          setError("تعذّر تحميل صلاحيات الدور المحدد.");
        }
      } finally {
        if (mounted) setLoadingRole(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedRoleId]);

  // --- Derived ---
  const selectedRole: RoleDto | undefined = useMemo(() => {
    return allRoles.find((r) => r.id === selectedRoleId!);
  }, [allRoles, selectedRoleId]);

  const filteredPerms = useMemo(() => {
    const f = filter.trim();
    if (!f) return allPerms;
    return allPerms.filter((p) => p.toLowerCase().includes(f.toLowerCase()));
  }, [allPerms, filter]);

  const togglePerm = (code: string) => {
    setRolePerms((prev) => {
      const copy = new Set(prev);
      copy.has(code) ? copy.delete(code) : copy.add(code);
      return copy;
    });
  };

  const onSave = async () => {
    if (!selectedRoleId) return;
    try {
      setSaving(true);
      await setRolePermissions(selectedRoleId, Array.from(rolePerms));
      showToast("تم حفظ صلاحيات الدور بنجاح.");
    } catch (e) {
      console.error(e);
      showToast("تعذّر حفظ الصلاحيات.", true);
    } finally {
      setSaving(false);
    }
  };

  // --- UI ---
  if (loading) {
    return (
      <div className="p-4">
        جارِ التحميل…
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-6">
      {/* Roles list */}
      <aside className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-3 h-max">
        <h3 className="font-semibold mb-2">الأدوار</h3>
        {allRoles.length === 0 ? (
          <div className="text-sm text-gray-500">لا توجد أدوار.</div>
        ) : (
          <ul className="space-y-1">
            {allRoles.map((r) => (
              <li key={r.id}>
                <button
                  className={
                    "w-full text-right px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 " +
                    (r.id === selectedRoleId ? "bg-blue-600 text-white" : "")
                  }
                  onClick={() => setSelectedRoleId(r.id)}
                >
                  <div className="font-medium">{r.roleName}</div>
                  {r.description && (
                    <div className="text-xs opacity-80">{r.description}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Permissions editor */}
      <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold">
              صلاحيات الدور: {selectedRole ? selectedRole.roleName : "—"}
            </h3>
            {error && <div className="text-rose-600 text-sm mt-1">{error}</div>}
          </div>
          <button
            onClick={onSave}
            disabled={!selectedRoleId || saving}
            className={`px-4 py-2 rounded-xl text-white ${saving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {saving ? "جارِ الحفظ…" : "حفظ"}
          </button>
        </div>

        <div className="mb-3">
          <input
            className="w-full border rounded-xl px-3 py-2"
            placeholder="فلترة الصلاحيات…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {loadingRole ? (
          <div>جارِ تحميل صلاحيات الدور…</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredPerms.map((code) => {
              const checked = rolePerms.has(code);
              return (
                <label key={code} className="flex items-start gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/10">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePerm(code)}
                    className="mt-1"
                  />
                  <span className="select-text">{code}</span>
                </label>
              );
            })}
            {filteredPerms.length === 0 && (
              <div className="text-sm text-gray-500">لا توجد صلاحيات مطابقة.</div>
            )}
          </div>
        )}
      </section>

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
    </div>
  );
}




// import { useEffect, useMemo, useState } from "react";
// import api from "../api/apiClient";
// import PermissionsGate from "../components/PermissionsGate";
// import { toast } from "sonner";

// type Permission = { id: number; code: string; description?: string | null };
// type Role = {
//   id: number;
//   roleName: string;
//   description?: string | null;
//   RolePermission: { Permission: Permission }[];
// };
// type User = { id: number; fullName: string };

// type Recipe = {
//   key: string;
//   title: string;
//   description: string;
//   roleName: string;
//   permissions: string[];
// };

// const RECIPES: Recipe[] = [
//   {
//     key: "viewer",
//     title: "VIEWER (قراءة فقط)",
//     description: "وصول للقراءة فقط للوارد/الصادر/الأقسام.",
//     roleName: "VIEWER",
//     permissions: ["incoming.read", "outgoing.read", "departments.read"],
//   },
//   {
//     key: "clerk_incoming",
//     title: "CLERK_INCOMING (كاتب وارد)",
//     description: "إدخال واردات ورفع مرفقات + قراءة أساسية.",
//     roleName: "CLERK_INCOMING",
//     permissions: ["incoming.read", "incoming.create", "files.upload", "departments.read"],
//   },
//   {
//     key: "supervisor_incoming",
//     title: "SUPERVISOR_INCOMING (مشرف وارد)",
//     description: "قراءة وتوجيه وتوزيع وتحديث حالات الوارد.",
//     roleName: "SUPERVISOR_INCOMING",
//     permissions: ["incoming.read", "incoming.forward", "incoming.assign", "incoming.updateStatus", "departments.read"],
//   },
//   {
//     key: "auditor",
//     title: "AUDITOR (مدقق)",
//     description: "قراءة سجلات التدقيق + قراءة عامة.",
//     roleName: "AUDITOR",
//     permissions: ["audit.read", "incoming.read", "outgoing.read", "departments.read"],
//   },
// ];

// export default function RbacPage() {
//   const [perms, setPerms] = useState<Permission[]>([]);
//   const [roles, setRoles] = useState<Role[]>([]);
//   const [users, setUsers] = useState<User[]>([]);
//   const [busy, setBusy] = useState(false);

//   const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");
//   const [selectedUserId, setSelectedUserId] = useState<number | "">("");

//   const [userRoleIds, setUserRoleIds] = useState<number[]>([]);
//   const selectedRole = useMemo(
//     () => roles.find((r) => r.id === Number(selectedRoleId)) || null,
//     [roles, selectedRoleId]
//   );
//   const selectedUser = useMemo(
//     () => users.find((u) => u.id === Number(selectedUserId)) || null,
//     [users, selectedUserId]
//   );

//   // إنشاء دور يدوي
//   const [newRoleName, setNewRoleName] = useState("");
//   const [newRoleDesc, setNewRoleDesc] = useState("");

//   async function loadAll() {
//     const [p, r, u] = await Promise.all([
//       api.get("/rbac/permissions"),
//       api.get("/rbac/roles"),
//       api.get("/users/list-basic"),
//     ]);
//     setPerms(p.data);
//     setRoles(r.data);
//     setUsers(u.data);
//   }

//   async function loadUserRoles(uid: number) {
//     const { data } = await api.get(`/rbac/users/${uid}/roles`);
//     const ids = (data as { id: number }[]).map((x) => x.id);
//     setUserRoleIds(ids);
//   }

//   useEffect(() => {
//     loadAll().catch(() => toast.error("فشل تحميل بيانات RBAC"));
//   }, []);

//   useEffect(() => {
//     if (selectedUserId && Number(selectedUserId) > 0) {
//       loadUserRoles(Number(selectedUserId)).catch(() =>
//         toast.error("فشل جلب أدوار المستخدم")
//       );
//     } else {
//       setUserRoleIds([]);
//     }
//   }, [selectedUserId]);

//   // تبديل صلاحية للدور المحدد
//   async function togglePermOnRole(code: string) {
//     if (!selectedRole) return;
//     setBusy(true);
//     try {
//       const current = new Set(
//         selectedRole.RolePermission.map((x) => x.Permission.code)
//       );
//       if (current.has(code)) current.delete(code);
//       else current.add(code);
//       await api.post(`/rbac/roles/${selectedRole.id}/permissions`, {
//         permissions: Array.from(current),
//       });
//       await loadAll();
//       toast.success("تم تحديث صلاحيات الدور");
//     } catch {
//       toast.error("فشل تحديث صلاحيات الدور");
//     } finally {
//       setBusy(false);
//     }
//   }

//   // إنشاء دور يدوي
//   async function createRole() {
//     if (!newRoleName.trim()) {
//       toast.error("اكتب اسم الدور");
//       return;
//     }
//     setBusy(true);
//     try {
//       const { data } = await api.post("/rbac/roles", {
//         roleName: newRoleName.trim(),
//         description: newRoleDesc || undefined,
//       });
//       await loadAll();
//       setNewRoleName("");
//       setNewRoleDesc("");
//       setSelectedRoleId(data.id);
//       toast.success("تم إنشاء الدور");
//     } catch {
//       toast.error("فشل إنشاء الدور");
//     } finally {
//       setBusy(false);
//     }
//   }

//   // تنفيذ وصفة جاهزة (إنشاء/تحديث وربط الصلاحيات)
//   async function applyRecipe(recipe: Recipe) {
//     setBusy(true);
//     try {
//       await api.post("/rbac/recipes", {
//         roleName: recipe.roleName,
//         description: recipe.description,
//         permissions: recipe.permissions,
//       });
//       await loadAll();
//       const role = roles.find((r) => r.roleName === recipe.roleName);
//       if (role) setSelectedRoleId(role.id);
//       toast.success(`تم تطبيق وصفة ${recipe.roleName}`);
//     } catch {
//       toast.error("تعذر تطبيق الوصفة");
//     } finally {
//       setBusy(false);
//     }
//   }

//   function toggleUserRole(id: number) {
//     setUserRoleIds((prev) => {
//       const s = new Set(prev);
//       s.has(id) ? s.delete(id) : s.add(id);
//       return Array.from(s);
//     });
//   }

//   async function saveUserRoles() {
//     if (!selectedUser) return;
//     setBusy(true);
//     try {
//       await api.post(`/rbac/users/${selectedUser.id}/roles`, {
//         roleIds: userRoleIds,
//       });
//       toast.success("تم حفظ أدوار المستخدم");
//     } catch {
//       toast.error("فشل حفظ أدوار المستخدم");
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <PermissionsGate one="admin.rbac">
//       <div className="space-y-6" dir="rtl">
//         <h1 className="text-xl font-bold">إدارة الصلاحيات والأدوار</h1>

//         {/* ===== وصفات جاهزة ===== */}
//         <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
//           <div className="mb-3 font-semibold">وصفات أدوار جاهزة</div>
//           <div className="grid md:grid-cols-2 gap-3">
//             {RECIPES.map((rcp) => (
//               <div key={rcp.key} className="rounded-xl border p-3">
//                 <div className="font-medium">{rcp.title}</div>
//                 <div className="text-xs text-gray-500 mt-1">{rcp.description}</div>
//                 <div className="text-[11px] mt-2 font-mono">
//                   {rcp.permissions.join(", ")}
//                 </div>
//                 <button
//                   disabled={busy}
//                   onClick={() => applyRecipe(rcp)}
//                   className="mt-3 rounded bg-emerald-600 text-white text-sm px-3 py-2 disabled:opacity-50"
//                 >
//                   إنشاء/تحديث هذا الدور
//                 </button>
//               </div>
//             ))}
//           </div>
//         </section>

//         {/* ===== إنشاء دور يدوي ===== */}
//         <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
//           <div className="mb-3 font-semibold">إنشاء دور جديد</div>
//           <div className="grid gap-2 sm:grid-cols-[240px_1fr_auto]">
//             <input
//               className="border rounded px-3 py-2"
//               placeholder="اسم الدور (مثلاً: VIEWER)"
//               value={newRoleName}
//               onChange={(e) => setNewRoleName(e.target.value)}
//             />
//             <input
//               className="border rounded px-3 py-2"
//               placeholder="وصف (اختياري)"
//               value={newRoleDesc}
//               onChange={(e) => setNewRoleDesc(e.target.value)}
//             />
//             <button
//               disabled={busy}
//               onClick={createRole}
//               className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
//             >
//               إنشاء الدور
//             </button>
//           </div>
//         </section>

//         {/* ===== اختيار الدور وتعديل صلاحياته ===== */}
//         <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
//           <div className="flex items-center gap-3 mb-4">
//             <label className="text-sm">اختر دوراً:</label>
//             <select
//               className="border rounded px-2 py-1 bg-transparent"
//               value={selectedRoleId}
//               onChange={(e) =>
//                 setSelectedRoleId(e.target.value ? Number(e.target.value) : "")
//               }
//             >
//               <option value="">— اختر —</option>
//               {roles.map((r) => (
//                 <option key={r.id} value={r.id}>
//                   {r.roleName}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {selectedRole ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
//               {perms.map((p) => {
//                 const checked = selectedRole.RolePermission.some(
//                   (x) => x.Permission.code === p.code
//                 );
//                 return (
//                   <label
//                     key={p.id}
//                     className="flex items-center gap-2 text-sm rounded border px-3 py-2"
//                   >
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

//         {/* ===== تعيين أدوار لمستخدم ===== */}
//         <section className="bg-white dark:bg-slate-950 border dark:border-white/10 rounded-2xl p-4">
//           <div className="flex items-center gap-3 mb-4">
//             <label className="text-sm">اختر مستخدماً:</label>
//             <select
//               className="border rounded px-2 py-1 bg-transparent"
//               value={selectedUserId}
//               onChange={(e) =>
//                 setSelectedUserId(e.target.value ? Number(e.target.value) : "")
//               }
//             >
//               <option value="">— اختر —</option>
//               {users.map((u) => (
//                 <option key={u.id} value={u.id}>
//                   {u.fullName}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {selectedUser ? (
//             <>
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
//                 {roles.map((r) => {
//                   const id = `role_${r.id}`;
//                   const checked = userRoleIds.includes(r.id);
//                   return (
//                     <label
//                       key={r.id}
//                       className="flex items-center gap-2 text-sm rounded border px-3 py-2"
//                     >
//                       <input
//                         id={id}
//                         type="checkbox"
//                         checked={checked}
//                         onChange={() => toggleUserRole(r.id)}
//                       />
//                       <span>{r.roleName}</span>
//                     </label>
//                   );
//                 })}
//               </div>

//               <button
//                 disabled={busy}
//                 onClick={saveUserRoles}
//                 className="mt-3 rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
//               >
//                 حفظ أدوار المستخدم
//               </button>
//             </>
//           ) : (
//             <p className="text-sm text-gray-500">اختر مستخدماً لتعيين الأدوار له.</p>
//           )}
//         </section>
//       </div>
//     </PermissionsGate>
//   );
// }

