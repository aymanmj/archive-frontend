// src/pages/UsersAdminPage.tsx

import { useEffect, useState } from "react";
import api from "../api/apiClient";
import { toast } from "sonner";
import PermissionsGate from "../components/PermissionsGate";

type Role = { id: number; roleName: string };

export default function UsersAdminPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    departmentId: "",
    roleIds: [] as number[],
  });
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | undefined>();

  useEffect(() => {
    api.get("/rbac/roles").then((r) => setRoles(r.data)).catch(() => {});
  }, []);

  function toggleRole(id: number) {
    setForm((f) => {
      const s = new Set(f.roleIds);
      s.has(id) ? s.delete(id) : s.add(id);
      return { ...f, roleIds: Array.from(s) };
    });
  }

  // async function submit() {
  //   setBusy(true);
  //   try {
  //     const payload = {
  //       fullName: form.fullName,
  //       username: form.username,
  //       email: form.email || undefined,
  //       password: form.password || undefined,
  //       departmentId: form.departmentId ? Number(form.departmentId) : undefined,
  //       roleIds: form.roleIds,
  //     };
  //     const { data } = await api.post("/users", payload);
  //     setTempPassword(data?.tempPassword);
  //     toast.success("تم إنشاء المستخدم");
  //   } catch {
  //     toast.error("فشل إنشاء المستخدم");
  //   } finally {
  //     setBusy(false);
  //   }
  // }

  async function submit() {
    setBusy(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email?.trim() || undefined,
        password: form.password?.trim() || undefined, // إن فاضية => undefined لتوليد مؤقتة
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        roleIds: form.roleIds,
      };
      const { data } = await api.post("/users", payload);
      setTempPassword(data?.tempPassword);
      toast.success("تم إنشاء المستخدم");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "فشل إنشاء المستخدم";
      // لو الرسالة Array من class-validator
      const flat = Array.isArray(msg) ? msg.join("، ") : msg;
      toast.error(flat);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PermissionsGate one="users.manage">
      <div className="space-y-4" dir="rtl">
        <h1 className="text-xl font-bold">إنشاء مستخدم جديد</h1>
        <div className="grid gap-3 max-w-xl">
          <input className="border rounded px-3 py-2" placeholder="الاسم الكامل"
                 value={form.fullName} onChange={(e)=>setForm({...form, fullName:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="اسم المستخدم"
                 value={form.username} onChange={(e)=>setForm({...form, username:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="البريد (اختياري)"
                 value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="كلمة المرور (اختياري لإنشاء مؤقتة)"
                 value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})}/>
          <input className="border rounded px-3 py-2" placeholder="رقم القسم (اختياري)"
                 value={form.departmentId} onChange={(e)=>setForm({...form, departmentId:e.target.value})}/>

          <div className="border rounded p-3">
            <div className="font-medium mb-2">الأدوار:</div>
            <div className="grid grid-cols-2 gap-2">
              {roles.map(r=>{
                const id = `role_${r.id}`;
                const checked = form.roleIds.includes(r.id);
                return (
                  <div key={r.id} className="flex items-center gap-2">
                    <input id={id} type="checkbox" checked={checked} onChange={()=>toggleRole(r.id)}/>
                    <label htmlFor={id}>{r.roleName}</label>
                  </div>
                );
              })}
            </div>
          </div>

          <button disabled={busy} onClick={submit}
                  className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-50">
            إنشاء
          </button>

          {tempPassword && (
            <div className="text-sm text-amber-600">
              كلمة مرور مؤقتة للمستخدم الجديد: <b>{tempPassword}</b>
            </div>
          )}
        </div>
      </div>
    </PermissionsGate>
  );
}
