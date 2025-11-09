// src/components/ManageUserRoles.tsx

import { useEffect, useState } from "react";
import api from "../api/apiClient";
import { toast } from "sonner";
import PermissionsGate from "./PermissionsGate";

type Role = { id: number; roleName: string };
type UserLite = { id: number; fullName: string; departmentId: number|null };

export default function ManageUserRoles() {
  const [users, setUsers] = useState<UserLite[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [userRoles, setUserRoles] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<UserLite[]>("/users/list-basic"),
      api.get<Role[]>("/rbac/roles"),
    ]).then(([u, r]) => {
      setUsers(Array.isArray(u.data)? u.data : []);
      setRoles(Array.isArray(r.data)? r.data : []);
    }).catch(()=> toast.error("تعذّر التحميل"));
  }, []);

  async function loadUserRoles(uid: number) {
    try {
      const res = await api.get<Role[]>(`/rbac/users/${uid}/roles`);
      setUserRoles(res.data.map(x => x.id));
    } catch {
      setUserRoles([]);
      toast.error("تعذّر تحميل أدوار المستخدم");
    }
  }

  useEffect(() => {
    if (!selectedUserId) { setUserRoles([]); return; }
    loadUserRoles(Number(selectedUserId));
  }, [selectedUserId]);

  function toggleRole(id: number) {
    setUserRoles((curr) => {
      const s = new Set(curr);
      s.has(id) ? s.delete(id) : s.add(id);
      return Array.from(s);
    });
  }

  async function save() {
    if (!selectedUserId) return toast.warning("اختر مستخدمًا");
    setBusy(true);
    try {
      await api.post(`/rbac/users/${selectedUserId}/roles`, { roleIds: userRoles });
      toast.success("تم تحديث الأدوار");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "فشل تحديث الأدوار";
      toast.error(Array.isArray(msg) ? msg.join("، ") : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PermissionsGate one="users.manage">
      <div className="space-y-3" dir="rtl">
        <h2 className="text-lg font-bold">تعيين/إلغاء أدوار المستخدم</h2>

        <div className="grid md:grid-cols-2 gap-3 max-w-3xl">
          <div>
            <label className="text-xs text-gray-500">المستخدم</label>
            <select className="w-full border rounded-xl p-2 bg-white"
              value={selectedUserId}
              onChange={(e)=>setSelectedUserId(e.target.value)}
            >
              <option value="">اختر مستخدمًا</option>
              {users.map(u=>(
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>

          <div className="border rounded-xl p-3">
            <div className="font-medium mb-2">الأدوار</div>
            <div className="grid md:grid-cols-2 gap-2">
              {roles.map(r=>{
                const id = `r_${r.id}`;
                const checked = userRoles.includes(r.id);
                return (
                  <label key={r.id} htmlFor={id} className="flex items-center gap-2">
                    <input id={id} type="checkbox" checked={checked} onChange={()=>toggleRole(r.id)} />
                    {r.roleName}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <button onClick={save} disabled={busy || !selectedUserId}
          className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50">
          {busy ? "..." : "حفظ"}
        </button>
      </div>
    </PermissionsGate>
  );
}






// // src/components/ManageUserRoles.tsx


// import { useEffect, useState } from "react";
// import api from "../api/apiClient";
// import { toast } from "sonner";
// import PermissionsGate from "./PermissionsGate";

// type Role = { id: number; roleName: string };
// type UserLite = { id: number; fullName: string; departmentId: number|null };

// export default function ManageUserRoles() {
//   const [users, setUsers] = useState<UserLite[]>([]);
//   const [roles, setRoles] = useState<Role[]>([]);
//   const [selectedUserId, setSelectedUserId] = useState<string>("");
//   const [userRoles, setUserRoles] = useState<number[]>([]);
//   const [busy, setBusy] = useState(false);

//   useEffect(() => {
//     // نحمل المستخدمين (نشِطين) + الأدوار
//     Promise.all([
//       api.get<UserLite[]>("/users/list-basic"),
//       api.get<Role[]>("/rbac/roles"),
//     ]).then(([u, r]) => {
//       setUsers(Array.isArray(u.data)? u.data : []);
//       setRoles(Array.isArray(r.data)? r.data : []);
//     }).catch(()=> toast.error("تعذّر التحميل"));
//   }, []);

//   async function loadUserRoles(uid: number) {
//     try {
//       const res = await api.get<Role[]>(`/rbac/users/${uid}/roles`);
//       setUserRoles(res.data.map(x => x.id));
//     } catch {
//       setUserRoles([]);
//       toast.error("تعذّر تحميل أدوار المستخدم");
//     }
//   }

//   useEffect(() => {
//     if (!selectedUserId) { setUserRoles([]); return; }
//     loadUserRoles(Number(selectedUserId));
//   }, [selectedUserId]);

//   function toggleRole(id: number) {
//     setUserRoles((curr) => {
//       const s = new Set(curr);
//       s.has(id) ? s.delete(id) : s.add(id);
//       return Array.from(s);
//     });
//   }

//   async function save() {
//     if (!selectedUserId) return toast.warning("اختر مستخدمًا");
//     setBusy(true);
//     try {
//       await api.post(`/rbac/users/${selectedUserId}/roles`, { roleIds: userRoles });
//       toast.success("تم تحديث الأدوار");
//     } catch (e: any) {
//       const msg = e?.response?.data?.message || e?.message || "فشل تحديث الأدوار";
//       toast.error(Array.isArray(msg) ? msg.join("، ") : msg);
//     } finally {
//       setBusy(false);
//     }
//   }

//   return (
//     <PermissionsGate one="users.manage">
//       <div className="space-y-3" dir="rtl">
//         <h2 className="text-lg font-bold">تعيين/إلغاء أدوار المستخدم</h2>

//         <div className="grid md:grid-cols-2 gap-3 max-w-3xl">
//           <div>
//             <label className="text-xs text-gray-500">المستخدم</label>
//             <select className="w-full border rounded-xl p-2 bg-white"
//               value={selectedUserId}
//               onChange={(e)=>setSelectedUserId(e.target.value)}
//             >
//               <option value="">اختر مستخدمًا</option>
//               {users.map(u=>(
//                 <option key={u.id} value={u.id}>{u.fullName}</option>
//               ))}
//             </select>
//           </div>

//           <div className="border rounded-xl p-3">
//             <div className="font-medium mb-2">الأدوار</div>
//             <div className="grid md:grid-cols-2 gap-2">
//               {roles.map(r=>{
//                 const id = `r_${r.id}`;
//                 const checked = userRoles.includes(r.id);
//                 return (
//                   <label key={r.id} htmlFor={id} className="flex items-center gap-2">
//                     <input id={id} type="checkbox" checked={checked} onChange={()=>toggleRole(r.id)} />
//                     {r.roleName}
//                   </label>
//                 );
//               })}
//             </div>
//           </div>
//         </div>

//         <button onClick={save} disabled={busy || !selectedUserId}
//           className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50">
//           {busy ? "..." : "حفظ"}
//         </button>
//       </div>
//     </PermissionsGate>
//   );
// }
