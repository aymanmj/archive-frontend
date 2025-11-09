// src/pages/UsersAdminPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { listUsers, type UserSummary } from "../api/users";
import { listRoles, getUserRoles, setUserRoles, type RoleDto, type UserRolesDto } from "../api/rbac";

function useDebouncedValue<T>(value: T, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function UsersAdminPage() {
  // البحث واختيار المستخدم
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // الأدوار
  const [allRoles, setAllRoles] = useState<RoleDto[]>([]);
  const [userRolesDto, setUserRolesDto] = useState<UserRolesDto | null>(null);

  // حالات
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  // تحميل قائمة الأدوار مرة واحدة
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingRoles(true);
        const roles = await listRoles();
        if (!mounted) return;
        setAllRoles(roles);
      } catch (e) {
        console.error(e);
        if (mounted) setError("تعذّر تحميل قائمة الأدوار.");
      } finally {
        if (mounted) setLoadingRoles(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // تحميل المستخدمين حسب البحث
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingUsers(true);
        const list = await listUsers({ search: debouncedSearch, page: 1, pageSize: 30 });
        if (!mounted) return;
        setUsers(list);
        // ضبط مستخدم افتراضي لو لم يكن مختار
        if (list.length && selectedUserId == null) {
          setSelectedUserId(list[0].id);
        }
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

  // تحميل أدوار المستخدم الحالي
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
          setUserRolesDto({ userId: selectedUserId, roleIds: [], roles: [], count: 0 });
          setError("تعذّر تحميل أدوار المستخدم.");
        }
      } finally {
        if (mounted) setLoadingUserRoles(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedUserId]);

  // مجموعة الأدوار المحددة
  const selectedRoleIds = useMemo(
    () => new Set<number>(userRolesDto?.roleIds ?? []),
    [userRolesDto]
  );

  // Toggle
  const toggleRole = (roleId: number) => {
    if (!userRolesDto) return;
    const next = new Set<number>(userRolesDto.roleIds);
    next.has(roleId) ? next.delete(roleId) : next.add(roleId);
    const roleList = allRoles.filter((r) => next.has(r.id));
    setUserRolesDto({ ...userRolesDto, roleIds: [...next], roles: roleList, count: next.size });
  };

  const onSave = async () => {
    if (!userRolesDto) return;
    try {
      setSaving(true);
      await setUserRoles(userRolesDto.userId, userRolesDto.roleIds);
      const fresh = await getUserRoles(userRolesDto.userId);
      setUserRolesDto(fresh);
      showToast("تم حفظ التغييرات بنجاح.");
    } catch (e) {
      console.error(e);
      showToast("تعذّر حفظ التغييرات.", true);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg: string, danger = false) => {
    if (!toastRef.current) return;
    toastRef.current.textContent = msg;
    toastRef.current.style.opacity = "1";
    toastRef.current.style.background = danger ? "#b00020" : "#0f766e";
    setTimeout(() => {
      if (toastRef.current) toastRef.current.style.opacity = "0";
    }, 1800);
  };

  // واجهة مستخدم
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>إدارة المستخدمين</h2>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 360, flex: "1 1 360px" }}>
          <label>ابحث عن مستخدم بالاسم أو اسم المستخدم</label>
          <input
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" }}
            placeholder="مثال: محمد.. أو admin"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ minWidth: 300, flex: "1 1 300px" }}>
          <label>المستخدم:</label>
          <select
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" }}
            value={selectedUserId ?? ""}
            onChange={(e) => setSelectedUserId(Number(e.target.value))}
          >
            <option value="" disabled>اختر مستخدمًا</option>
            {(users ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} — {u.username}{u.department?.name ? ` (${u.department.name})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(loadingUsers || loadingRoles || loadingUserRoles) && (
        <div style={{ marginTop: 12 }}>جارِ التحميل…</div>
      )}
      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}

      {!loadingUsers && !loadingRoles && selectedUserId && (
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <h3>كل الأدوار</h3>
            <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, maxHeight: 420, overflow: "auto" }}>
              {(allRoles ?? []).length === 0 && <div>لا توجد أدوار.</div>}
              {(allRoles ?? []).map((r) => {
                const checked = selectedRoleIds.has(r.id);
                const disabled = r.isSystem && r.roleName?.toUpperCase() === "ADMIN"; // مثال: منع إلغاء ADMIN لو أردت
                return (
                  <label key={r.id} style={{ display: "flex", gap: 8, alignItems: "start", padding: "6px 0" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleRole(r.id)}
                    />
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {r.roleName} {r.isSystem ? " (system)" : ""}
                      </div>
                      {r.description && <div style={{ color: "#555", fontSize: 13 }}>{r.description}</div>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <h3>أدوار المستخدم #{userRolesDto?.userId}</h3>
            <div style={{ marginBottom: 8, color: "#333" }}>إجمالي: {userRolesDto?.count ?? 0}</div>
            <ul style={{ paddingInlineStart: 18 }}>
              {(userRolesDto?.roles ?? []).map((r) => (
                <li key={r.id}>{r.roleName}</li>
              ))}
              {(userRolesDto?.roles ?? []).length === 0 && <li>لا توجد أدوار.</li>}
            </ul>

            <button
              onClick={onSave}
              disabled={saving}
              style={{
                marginTop: 16,
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: saving ? "#94a3b8" : "#0ea5e9",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "جاري الحفظ…" : "حفظ التغييرات"}
            </button>
          </div>
        </div>
      )}

      {/* Toast بسيط */}
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





// // src/pages/UsersAdminPage.tsx

// import { useEffect, useState } from "react";
// import api from "../api/apiClient";
// import { toast } from "sonner";
// import PermissionsGate from "../components/PermissionsGate";
// import ManageUserRoles from "../components/ManageUserRoles";

// type Role = { id: number; roleName: string };

// export default function UsersAdminPage() {
//   const [roles, setRoles] = useState<Role[]>([]);
//   const [form, setForm] = useState({
//     fullName: "",
//     username: "",
//     email: "",
//     password: "",
//     departmentId: "",
//     roleIds: [] as number[],
//   });
//   const [busy, setBusy] = useState(false);
//   const [tempPassword, setTempPassword] = useState<string | undefined>();
//   const [tab, setTab] = useState<"create"|"roles">("create");

//   useEffect(() => {
//     api.get("/rbac/roles").then((r) => setRoles(r.data)).catch(() => {});
//   }, []);

//   function toggleRole(id: number) {
//     setForm((f) => {
//       const s = new Set(f.roleIds);
//       s.has(id) ? s.delete(id) : s.add(id);
//       return { ...f, roleIds: Array.from(s) };
//     });
//   }

//   async function submit() {
//     setBusy(true);
//     try {
//       const payload = {
//         fullName: form.fullName.trim(),
//         username: form.username.trim(),
//         email: form.email?.trim() || undefined,
//         password: form.password?.trim() || undefined,
//         departmentId: form.departmentId ? Number(form.departmentId) : undefined,
//         roleIds: form.roleIds,
//       };
//       const { data } = await api.post("/users", payload);
//       setTempPassword(data?.tempPassword);
//       toast.success("تم إنشاء المستخدم");
//     } catch (e: any) {
//       const msg =
//         e?.response?.data?.message ||
//         e?.message ||
//         "فشل إنشاء المستخدم";
//       const flat = Array.isArray(msg) ? msg.join("، ") : msg;
//       toast.error(flat);
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <PermissionsGate anyOf={["users.manage", "users.read"] as any}>
//       <div className="space-y-4" dir="rtl">
//         <h1 className="text-xl font-bold">إدارة المستخدمين</h1>

//         <div className="flex gap-2 border-b">
//           <button onClick={()=>setTab("create")}
//             className={`px-3 py-2 -mb-px border-b-2 text-sm ${
//               tab==="create" ? "border-blue-600 text-blue-700 font-semibold" : "border-transparent text-gray-600"
//             }`}
//           >
//             إنشاء مستخدم
//           </button>
//           <button onClick={()=>setTab("roles")}
//             className={`px-3 py-2 -mb-px border-b-2 text-sm ${
//               tab==="roles" ? "border-blue-600 text-blue-700 font-semibold" : "border-transparent text-gray-600"
//             }`}
//           >
//             تعيين الأدوار
//           </button>
//         </div>

//         {tab==="create" && (
//           <PermissionsGate one="users.manage">
//             <div className="grid gap-3 max-w-xl">
//               <input className="border rounded px-3 py-2" placeholder="الاسم الكامل"
//                     value={form.fullName} onChange={(e)=>setForm({...form, fullName:e.target.value})}/>
//               <input className="border rounded px-3 py-2" placeholder="اسم المستخدم"
//                     value={form.username} onChange={(e)=>setForm({...form, username:e.target.value})}/>
//               <input className="border rounded px-3 py-2" placeholder="البريد (اختياري)"
//                     value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})}/>
//               <input className="border rounded px-3 py-2" placeholder="كلمة المرور (اختياري لإنشاء مؤقتة)"
//                     value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})}/>
//               <input className="border rounded px-3 py-2" placeholder="رقم القسم (اختياري)"
//                     value={form.departmentId} onChange={(e)=>setForm({...form, departmentId:e.target.value})}/>

//               <div className="border rounded p-3">
//                 <div className="font-medium mb-2">الأدوار:</div>
//                 <div className="grid grid-cols-2 gap-2">
//                   {roles.map(r=>{
//                     const id = `role_${r.id}`;
//                     const checked = form.roleIds.includes(r.id);
//                     return (
//                       <div key={r.id} className="flex items-center gap-2">
//                         <input id={id} type="checkbox" checked={checked} onChange={()=>toggleRole(r.id)}/>
//                         <label htmlFor={id}>{r.roleName}</label>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>

//               <button disabled={busy} onClick={submit}
//                       className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50">
//                 إنشاء
//               </button>

//               {tempPassword && (
//                 <div className="text-sm text-amber-600">
//                   كلمة مرور مؤقتة للمستخدم الجديد: <b>{tempPassword}</b>
//                 </div>
//               )}
//             </div>
//           </PermissionsGate>
//         )}

//         {tab==="roles" && <ManageUserRoles />}
//       </div>
//     </PermissionsGate>
//   );
// }

