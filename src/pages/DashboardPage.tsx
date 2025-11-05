// src/pages/DashboardPage.tsx

import { useEffect, useState } from "react";
import api from "../api/apiClient";
import { toast } from "sonner";
import { ArrowRightLeft, Inbox, Send, RefreshCw, LayoutGrid, Files, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";

type Totals = {
  today: number;
  last7Days: number;
  thisMonth: number;
  all: number;
};

type MyDeskTotals = {
  open: number;
  inProgress: number;
  closed: number;
};

type IncomingStats = {
  totals: { incoming: Totals };
  myDesk?: MyDeskTotals;
  generatedAt?: string;
};

type OutgoingStats = {
  totals: { outgoing: Totals } | { incoming?: never; outgoing: Totals };
  generatedAt?: string;
};

export default function DashboardPage() {
  const [inc, setInc] = useState<IncomingStats | null>(null);
  const [out, setOut]   = useState<OutgoingStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        api.get<IncomingStats>("/incoming/stats/overview"),
        api.get<OutgoingStats>("/outgoing/stats/overview").catch(() => ({ data: null as any })), // قد لا تكون متوفرة
      ]);
      setInc(a.data);
      setOut(b?.data ?? null);
    } catch (e:any) {
      toast.error(e?.response?.data?.message ?? "تعذّر تحميل لوحة التحكم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const incT = inc?.totals?.incoming;
  // دعم شكل بديل إن سميت الكائن outgoing مباشرة
  const outT = (out?.totals as any)?.outgoing;

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-gray-500">نظرة عامة سريعة على الوارد والصادر وطاولتك</p>
        </div>
        <button onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
          <RefreshCw className="size-4" />
          تحديث
        </button>
      </header>

      {/* بطاقات إحصائيات */}
      <section className="grid md:grid-cols-2 gap-6">
        {/* وارد */}
        <div className="rounded-2xl border bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-sky-100 p-2 text-sky-700"><Inbox className="size-5" /></div>
              <div className="font-semibold">الوارد</div>
            </div>
            <Link to="/incoming" className="text-sky-700 text-sm hover:underline flex items-center gap-1">
              فتح الوارد <ArrowRightLeft className="size-4 rtl:rotate-180" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 mt-3">
            <StatCard label="اليوم" value={incT?.today ?? 0} icon={<TrendingUp className="size-4" />} />
            <StatCard label="هذا الأسبوع" value={incT?.last7Days ?? 0} />
            <StatCard label="هذا الشهر" value={incT?.thisMonth ?? 0} />
            <StatCard label="الإجمالي" value={incT?.all ?? 0} strong />
          </div>

          {inc?.myDesk && (
            <div className="grid sm:grid-cols-3 gap-3 mt-4">
              <BadgeStat label="مفتوح" value={inc.myDesk.open} color="sky" />
              <BadgeStat label="قيد الإجراء" value={inc.myDesk.inProgress} color="amber" />
              <BadgeStat label="مغلق" value={inc.myDesk.closed} color="emerald" />
            </div>
          )}
        </div>

        {/* صادر */}
        <div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-violet-100 p-2 text-violet-700"><Send className="size-5" /></div>
              <div className="font-semibold">الصادر</div>
            </div>
            <Link to="/outgoing" className="text-violet-700 text-sm hover:underline flex items-center gap-1">
              فتح الصادر <ArrowRightLeft className="size-4 rtl:rotate-180" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-4 gap-3 mt-3">
            <StatCard label="اليوم" value={outT?.today ?? 0} icon={<TrendingDown className="size-4" />} />
            <StatCard label="هذا الأسبوع" value={outT?.last7Days ?? 0} />
            <StatCard label="هذا الشهر" value={outT?.thisMonth ?? 0} />
            <StatCard label="الإجمالي" value={outT?.all ?? 0} strong />
          </div>
        </div>
      </section>

      {/* روابط سريعة + صناديق */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <LayoutGrid className="size-4 text-gray-600" /> روابط سريعة
          </h3>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <LinkBtn to="/incoming" label="الوارد" tone="sky" />
            <LinkBtn to="/outgoing" label="الصادر" tone="violet" />
            <LinkBtn to="/departments" label="الأقسام" tone="amber" />
            <LinkBtn to="/my-desk" label="طاولتي" tone="emerald" />
          </div>
        </div>

        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Files className="size-4 text-gray-600" /> ملاحظات سريعة
          </h3>
          <ul className="text-sm list-disc pr-4 space-y-1 text-gray-600">
            <li>يمكنك الانتقال إلى الوارد/الصادر من الروابط الجانبية أو السريعة.</li>
            <li>جرّب الفلاتر والبحث في صفحة الوارد لضبط نتائجك.</li>
            <li>تابع “طاولتي” لرؤية كل المعاملات الموكلة لك أو لقسمك.</li>
          </ul>
        </div>

        <div className="rounded-2xl border p-4 bg-white shadow-sm">
          <h3 className="font-semibold mb-1">آخر تحديث</h3>
          <p className="text-xs text-gray-500">
            {inc?.generatedAt ? new Date(inc.generatedAt).toLocaleString("ar-LY") : "—"}
          </p>
          <div className="mt-3 text-sm text-gray-600">
            احرص دائمًا على تحديث الصفحة للاطلاع على أحدث الأرقام.
          </div>
        </div>
      </section>
    </div>
  );
}

/** عناصر فرعية صغيرة أنيقة */

function StatCard({ label, value, strong, icon }: { label: string; value: number; strong?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white/70 backdrop-blur p-3 shadow-[0_1px_0_#00000010] hover:shadow-md transition">
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-1 ${strong ? "text-2xl font-extrabold" : "text-xl font-bold"}`}>{value}</div>
    </div>
  );
}

function BadgeStat({ label, value, color }: { label: string; value: number; color: "sky"|"amber"|"emerald" }) {
  const map: Record<string, string> = {
    sky: "bg-sky-100 text-sky-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <div className={`rounded-xl p-3 text-sm font-medium ${map[color]} flex items-center justify-between`}>
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function LinkBtn({ to, label, tone }: { to: string; label: string; tone: "sky"|"violet"|"amber"|"emerald" }) {
  const map: Record<string, string> = {
    sky: "text-sky-700 border-sky-200 hover:bg-sky-50",
    violet: "text-violet-700 border-violet-200 hover:bg-violet-50",
    amber: "text-amber-700 border-amber-200 hover:bg-amber-50",
    emerald: "text-emerald-700 border-emerald-200 hover:bg-emerald-50",
  };
  return (
    <Link to={to} className={`rounded-xl border px-3 py-2 text-center ${map[tone]} transition`}>
      {label}
    </Link>
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

// function normalizeIncoming(d: any): Stats {
//   // يدعم الشكلين:
//   // 1) الشكل المسطّح: { totalToday, totalWeek, totalMonth, totalAll }
//   if (d && typeof d.totalToday === 'number') return d as Stats;

//   // 2) الشكل المتداخل: { totals: { incoming: { today, last7Days, thisMonth, all } }, ... }
//   const inc = d?.totals?.incoming;
//   if (inc) {
//     return {
//       totalToday: Number(inc.today || 0),
//       totalWeek: Number(inc.last7Days || 0),
//       totalMonth: Number(inc.thisMonth || 0),
//       totalAll: Number(inc.all || 0),
//     };
//   }
//   return { totalAll: 0, totalToday: 0, totalWeek: 0, totalMonth: 0 };
// }

// function normalizeOutgoing(d: any): Stats {
//   // خدمة الصادر لدينا تُرجع الشكل المسطّح بالفعل
//   if (d && typeof d.totalToday === 'number') return d as Stats;
//   // لو تغيّر مستقبلاً
//   const og = d?.totals?.outgoing;
//   if (og) {
//     return {
//       totalToday: Number(og.today || 0),
//       totalWeek: Number(og.last7Days || 0),
//       totalMonth: Number(og.thisMonth || 0),
//       totalAll: Number(og.all || 0),
//     };
//   }
//   return { totalAll: 0, totalToday: 0, totalWeek: 0, totalMonth: 0 };
// }

// export default function DashboardPage() {
//   const [inc, setInc] = useState<Stats | null>(null);
//   const [out, setOut] = useState<Stats | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [err, setErr] = useState<string | null>(null);

//   const load = async () => {
//     setLoading(true);
//     setErr(null);
//     try {
//       const [a, b] = await Promise.all([
//         api.get('/incoming/stats/overview'),
//         api.get('/outgoing/stats/overview'),
//       ]);
//       setInc(normalizeIncoming(a.data));
//       setOut(normalizeOutgoing(b.data));
//     } catch (e: any) {
//       setErr(e?.response?.data?.message ?? 'تعذّر تحميل إحصائيات لوحة التحكم');
//       setInc({ totalAll: 0, totalToday: 0, totalWeek: 0, totalMonth: 0 });
//       setOut({ totalAll: 0, totalToday: 0, totalWeek: 0, totalMonth: 0 });
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
//         <button onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">تحديث</button>
//       </header>

//       {loading && <div className="text-center text-sm text-gray-500">ج جاري التحميل…</div>}
//       {err && <div className="text-sm text-red-600">{err}</div>}

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
//             <CardHeader><CardTitle>ملاحظات سريعة</CardTitle></CardHeader>
//             <CardContent className="text-sm text-gray-600">
//               - يمكنك الانتقال إلى الوارد/الصادر من الشريط العلوي.<br/>
//               - جرّب الفلاتر والترقيم في صفحة الوارد/الصادر.<br/>
//               - قريبًا: “مهامي” و“المعاملات على طاولتي”.
//             </CardContent>
//           </Card>
//         </>
//       )}
//     </div>
//   );
// }

