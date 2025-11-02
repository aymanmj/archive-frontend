import { useEffect, useState } from 'react';
import api from '../api/apiClient';
import StatCard from '../components/ui/Stat';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

type Stats = {
  totalAll: number;
  totalToday: number;
  totalWeek: number;
  totalMonth: number;
};

export default function DashboardPage() {
  const [inc, setInc] = useState<Stats | null>(null);
  const [out, setOut] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        api.get<Stats>('/incoming/stats/overview'),
        api.get<Stats>('/outgoing/stats/overview'),
      ]);
      setInc(a.data);
      setOut(b.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-gray-500 mt-1">نظرة عامة سريعة على الوارد والصادر</p>
        </div>
      </header>

      {loading && <div className="text-center text-sm text-gray-500">جاري التحميل…</div>}

      {!loading && (
        <>
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="الوارد اليوم" value={inc?.totalToday ?? 0} hint="عدد المعاملات الواردة اليوم" />
            <StatCard title="الوارد هذا الأسبوع" value={inc?.totalWeek ?? 0} hint="آخر 7 أيام" />
            <StatCard title="الوارد هذا الشهر" value={inc?.totalMonth ?? 0} hint="من أول الشهر" />
            <StatCard title="إجمالي الوارد" value={inc?.totalAll ?? 0} />
          </section>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="الصادر اليوم" value={out?.totalToday ?? 0} hint="عدد المعاملات الصادرة اليوم" />
            <StatCard title="الصادر هذا الأسبوع" value={out?.totalWeek ?? 0} hint="آخر 7 أيام" />
            <StatCard title="الصادر هذا الشهر" value={out?.totalMonth ?? 0} hint="من أول الشهر" />
            <StatCard title="إجمالي الصادر" value={out?.totalAll ?? 0} />
          </section>

          <Card>
            <CardHeader>
              <CardTitle>ملاحظات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              - يمكنك الانتقال إلى الوارد/الصادر من الشريط العلوي.<br/>
              - جرّب الفلاتر والترقيم في صفحة الوارد.<br/>
              - نضيف قريبًا “مهامي” و“المعاملات على طاولتي”.
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}




// import { useAuthStore } from "../stores/authStore";

// export default function DashboardPage() {
//   const user = useAuthStore((s) => s.user);

//   return (
//     <div className="p-4 space-y-4" dir="rtl">
//       <h1 className="text-2xl font-bold text-slate-700">لوحة التحكم</h1>
//       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//         <div className="rounded-2xl bg-white shadow p-4">
//           <div className="text-slate-500 text-sm">المستخدم</div>
//           <div className="text-lg">{user?.fullName ?? "—"}</div>
//         </div>
//         <div className="rounded-2xl bg-white shadow p-4">
//           <div className="text-slate-500 text-sm">القسم</div>
//           <div className="text-lg">{user?.department?.name ?? "—"}</div>
//         </div>
//         <div className="rounded-2xl bg-white shadow p-4">
//           <div className="text-slate-500 text-sm">الأدوار</div>
//           <div className="text-lg">{(user?.roles ?? []).join("، ") || "—"}</div>
//         </div>
//       </div>
//     </div>
//   );
// }

