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

function normalizeIncoming(d: any): Stats {
  // يدعم الشكلين:
  // 1) الشكل المسطّح: { totalToday, totalWeek, totalMonth, totalAll }
  if (d && typeof d.totalToday === 'number') return d as Stats;

  // 2) الشكل المتداخل: { totals: { incoming: { today, last7Days, thisMonth, all } }, ... }
  const inc = d?.totals?.incoming;
  if (inc) {
    return {
      totalToday: Number(inc.today || 0),
      totalWeek: Number(inc.last7Days || 0),
      totalMonth: Number(inc.thisMonth || 0),
      totalAll: Number(inc.all || 0),
    };
  }
  return { totalAll: 0, totalToday: 0, totalWeek: 0, totalMonth: 0 };
}

function normalizeOutgoing(d: any): Stats {
  // خدمة الصادر لدينا تُرجع الشكل المسطّح بالفعل
  if (d && typeof d.totalToday === 'number') return d as Stats;
  // لو تغيّر مستقبلاً
  const og = d?.totals?.outgoing;
  if (og) {
    return {
      totalToday: Number(og.today || 0),
      totalWeek: Number(og.last7Days || 0),
      totalMonth: Number(og.thisMonth || 0),
      totalAll: Number(og.all || 0),
    };
  }
  return { totalAll: 0, totalToday: 0, totalWeek: 0, totalMonth: 0 };
}

export default function DashboardPage() {
  const [inc, setInc] = useState<Stats | null>(null);
  const [out, setOut] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [a, b] = await Promise.all([
        api.get('/incoming/stats/overview'),
        api.get('/outgoing/stats/overview'),
      ]);
      setInc(normalizeIncoming(a.data));
      setOut(normalizeOutgoing(b.data));
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'تعذّر تحميل إحصائيات لوحة التحكم');
      setInc({ totalAll: 0, totalToday: 0, totalWeek: 0, totalMonth: 0 });
      setOut({ totalAll: 0, totalToday: 0, totalWeek: 0, totalMonth: 0 });
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
        <button onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">تحديث</button>
      </header>

      {loading && <div className="text-center text-sm text-gray-500">ج جاري التحميل…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}

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
            <CardHeader><CardTitle>ملاحظات سريعة</CardTitle></CardHeader>
            <CardContent className="text-sm text-gray-600">
              - يمكنك الانتقال إلى الوارد/الصادر من الشريط العلوي.<br/>
              - جرّب الفلاتر والترقيم في صفحة الوارد/الصادر.<br/>
              - قريبًا: “مهامي” و“المعاملات على طاولتي”.
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}




// import { useEffect, useState } from 'react';
// import api from '../api/apiClient';
// import StatCard from '../components/ui/Stat';
// import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

// type Stats = {
//   totalAll: number;
//   totalToday: number;
//   totalWeek: number;
//   totalMonth: number;
// };

// export default function DashboardPage() {
//   const [inc, setInc] = useState<Stats | null>(null);
//   const [out, setOut] = useState<Stats | null>(null);
//   const [loading, setLoading] = useState(true);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const [a, b] = await Promise.all([
//         api.get<Stats>('/incoming/stats/overview'),
//         api.get<Stats>('/outgoing/stats/overview'),
//       ]);
//       setInc(a.data);
//       setOut(b.data);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => { load(); }, []);

//   return (
//     <div className="space-y-6" dir="rtl">
//       <header className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">لوحة التحكم</h1>
//           <p className="text-sm text-gray-500 mt-1">نظرة عامة سريعة على الوارد والصادر</p>
//         </div>
//       </header>

//       {loading && <div className="text-center text-sm text-gray-500">جاري التحميل…</div>}

//       {!loading && (
//         <>
//           <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             <StatCard title="الوارد اليوم" value={inc?.totalToday ?? 0} hint="عدد المعاملات الواردة اليوم" />
//             <StatCard title="الوارد هذا الأسبوع" value={inc?.totalWeek ?? 0} hint="آخر 7 أيام" />
//             <StatCard title="الوارد هذا الشهر" value={inc?.totalMonth ?? 0} hint="من أول الشهر" />
//             <StatCard title="إجمالي الوارد" value={inc?.totalAll ?? 0} />
//           </section>

//           <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             <StatCard title="الصادر اليوم" value={out?.totalToday ?? 0} hint="عدد المعاملات الصادرة اليوم" />
//             <StatCard title="الصادر هذا الأسبوع" value={out?.totalWeek ?? 0} hint="آخر 7 أيام" />
//             <StatCard title="الصادر هذا الشهر" value={out?.totalMonth ?? 0} hint="من أول الشهر" />
//             <StatCard title="إجمالي الصادر" value={out?.totalAll ?? 0} />
//           </section>

//           <Card>
//             <CardHeader>
//               <CardTitle>ملاحظات سريعة</CardTitle>
//             </CardHeader>
//             <CardContent className="text-sm text-gray-600">
//               - يمكنك الانتقال إلى الوارد/الصادر من الشريط العلوي.<br/>
//               - جرّب الفلاتر والترقيم في صفحة الوارد.<br/>
//               - نضيف قريبًا “مهامي” و“المعاملات على طاولتي”.
//             </CardContent>
//           </Card>
//         </>
//       )}
//     </div>
//   );
// }


