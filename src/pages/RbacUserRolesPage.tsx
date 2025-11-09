// src/pages/RbacUserRolesPage.tsx

import { useEffect, useState } from 'react';
import { getUserRoles, RoleDto } from '../api/rbac';

export default function RbacUserRolesPage({ userId }: { userId: number }) {
  const [roles, setRoles] = useState<RoleDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await getUserRoles(userId);
        if (!mounted) return;
        setRoles(data);
        setErr(null);
      } catch (e: any) {
        console.error('Failed to load roles:', e);
        if (!mounted) return;
        // لا نظهر "تعذّر تحميل أدوار المستخدم" بشكل مطلق؛
        // نعرض رسالة أدق فقط عند فشل حقيقي (Network/403/500...)
        setErr('حدث خطأ أثناء جلب الأدوار. الرجاء المحاولة لاحقًا.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading) return <div>جارِ التحميل…</div>;
  if (err) return <div style={{ color: 'crimson' }}>{err}</div>;

  return (
    <div>
      <h3>أدوار المستخدم #{userId}</h3>
      {(!roles || roles.length === 0) ? (
        <div>لا توجد أدوار.</div>
      ) : (
        <ul>
          {roles.map(r => <li key={r.id}>{r.roleName}</li>)}
        </ul>
      )}
    </div>
  );
}
