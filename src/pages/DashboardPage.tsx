// src/pages/DashboardPage.tsx

import { useEffect, useState } from "react";
import api from "../api/apiClient";
import { toast } from "sonner";
import { ArrowRightLeft, Inbox, Send, RefreshCw, LayoutGrid, Files, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title as ChartTitle, Tooltip, Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTitle, Tooltip, Legend);

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
  const [dailyInc, setDailyInc] = useState<{date:string;count:number}[]>([]);
  const [dailyOut, setDailyOut] = useState<{date:string;count:number}[]>([]);
  const [deskDist, setDeskDist] = useState<{open:number;inProgress:number;closed:number} | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [a, b, di, doo, md] = await Promise.all([
        api.get<IncomingStats>("/incoming/stats/overview"),
        api.get<OutgoingStats>("/outgoing/stats/overview").catch(() => ({ data: null as any })),
        api.get<{days:number;series:{date:string;count:number}[]}>("/incoming/stats/daily", { params: { days: 30 } }),
        api.get<{days:number;series:{date:string;count:number}[]}>("/outgoing/stats/daily", { params: { days: 30 } }),
        api.get<{open:number;inProgress:number;closed:number}>("/incoming/stats/my-desk"),
      ]);
      setInc(a.data);
      setOut(b?.data ?? null);
      setDailyInc(di.data.series);
      setDailyOut(doo.data.series);
      setDeskDist(md.data);
    } catch (e:any) {
      toast.error(e?.response?.data?.message ?? "تعذّر تحميل لوحة التحكم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const incT = inc?.totals?.incoming;
  const outT = (out?.totals as any)?.outgoing;

  const chartData = {
    labels: ['اليوم', 'هذا الأسبوع', 'هذا الشهر', 'الإجمالي'],
    datasets: [
      {
        label: 'الوارد',
        data: [incT?.today, incT?.last7Days, incT?.thisMonth, incT?.all],
        fill: false,
        borderColor: 'rgba(75, 192, 192, 1)',
        tension: 0.1,
      },
      {
        label: 'الصادر',
        data: [outT?.today, outT?.last7Days, outT?.thisMonth, outT?.all],
        fill: false,
        borderColor: 'rgba(255, 99, 132, 1)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: { beginAtZero: true },
      y: { beginAtZero: true },
    },
  };

  const labels30 = dailyInc.length ? dailyInc.map(x => x.date.slice(5)) : dailyOut.map(x => x.date.slice(5));
  const lineData = {
    labels: labels30,
    datasets: [
      {
        label: "الوارد (30 يوم)",
        data: dailyInc.map(x => x.count),
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0,
        borderColor: "rgba(2,132,199,1)",
        backgroundColor: "rgba(2,132,199,0.15)"
      },
      {
        label: "الصادر (30 يوم)",
        data: dailyOut.map(x => x.count),
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0,
        borderColor: "rgba(124,58,237,1)",
        backgroundColor: "rgba(124,58,237,0.15)"
      }
    ]
  };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" as const } },
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
      y: { beginAtZero: true, ticks: { stepSize: 1 } }
    }
  };

  const doughnutData = deskDist ? {
    labels: ["مفتوح", "قيد الإجراء", "مغلق"],
    datasets: [{
      data: [deskDist.open, deskDist.inProgress, deskDist.closed],
      backgroundColor: [
        "rgba(125,211,252,0.9)",
        "rgba(252,211,77,0.9)",
        "rgba(134,239,172,0.9)"
      ],
      borderWidth: 1,
    }]
  } : null;

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

      {/* إصلاح سلوك التحميل: أظهر skeleton عندما loading=true */}
      {loading ? <DashboardSkeleton /> : null}

      {!loading && (
        <>
          {/* رسم بياني لعرض البيانات */}
          <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-4">
            <h2 className="text-xl font-semibold mb-4">إحصائيات الوارد والصادر</h2>
            <Line data={chartData} options={chartOptions} />
          </section>

          {/* اتجاه 30 يوم */}
          <section className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border bg-white shadow-sm p-4">
              <h3 className="font-semibold mb-3">اتجاه 30 يوم (وارد/صادر)</h3>
              <div className="h-64">
                <Line data={lineData} options={lineOptions} />
              </div>
            </div>

            <div className="rounded-2xl border bg-white shadow-sm p-4">
              <h3 className="font-semibold mb-3">حالات “طاولتي”</h3>
              <div className="h-64 flex items-center justify-center">
                {doughnutData ? <Doughnut data={doughnutData} /> : <div className="text-sm text-gray-500">لا بيانات</div>}
              </div>
            </div>
          </section>

          {/* بطاقات إحصائيات */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-gradient-to-br from-sky-50 p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]">
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

            <div className="rounded-2xl border bg-gradient-to-br from-sky-50 p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]">
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
              <div className="grid sm:grid-cols-2 gap-8 mt-4 py-2 text-sm ">
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
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-2xl border p-4 shadow-sm bg-white">
          <div className="h-4 w-32 bg-gray-200 rounded mb-3 animate-pulse" />
          <div className="grid sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="rounded-xl border p-3">
                <div className="h-3 w-16 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-6 w-10 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  strong,
  icon,
}: {
  label: string;
  value: number;
  strong?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group rounded-xl border bg-white/70 backdrop-blur p-3 shadow-[0_1px_0_#0001] hover:shadow-lg hover:shadow-black/5 transition-all duration-200 relative"
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-0 group-hover:ring-1 ring-sky-300/40" />
      <div className="text-xs text-gray-500 flex items-center justify-between">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-1 ${strong ? "text-2xl font-extrabold" : "text-xl font-bold"}`}>
        {value}
      </div>
    </motion.div>
  );
}

function BadgeStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "sky" | "amber" | "emerald";
}) {
  const map: Record<string, string> = {
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className={`rounded-xl p-3 text-sm font-medium border ${map[color]} flex items-center justify-between shadow-sm`}
    >
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </motion.div>
  );
}

function LinkBtn({
  to,
  label,
  tone,
}: {
  to: string;
  label: string;
  tone: "sky" | "violet" | "amber" | "emerald";
}) {
  const map: Record<string, string> = {
    sky: "text-sky-700 border-sky-200 hover:bg-sky-50 focus-visible:ring-sky-300/40",
    violet: "text-violet-700 border-violet-200 hover:bg-violet-50 focus-visible:ring-violet-300/40",
    amber: "text-amber-700 border-amber-200 hover:bg-amber-50 focus-visible:ring-amber-300/40",
    emerald:
      "text-emerald-700 border-emerald-200 hover:bg-emerald-50 focus-visible:ring-emerald-300/40",
  };
  return (
    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.995 }}>
      <Link
        to={to}
        className={`rounded-xl border px-3 py-2 text-center transition shadow-sm focus-visible:outline-none focus-visible:ring-2 ${map[tone]}`}
      >
        {label}
      </Link>
    </motion.div>
  );
}



// // src/pages/DashboardPage.tsx

// import { useEffect, useState } from "react";
// import api from "../api/apiClient";
// import { toast } from "sonner";
// import { ArrowRightLeft, Inbox, Send, RefreshCw, LayoutGrid, Files, TrendingUp, TrendingDown } from "lucide-react";
// import { Link } from "react-router-dom";
// import { motion } from "framer-motion";
// import { Line, Doughnut } from "react-chartjs-2";
// import {
//   Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
//   ArcElement, Title as ChartTitle, Tooltip, Legend
// } from "chart.js";

// ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTitle, Tooltip, Legend);



// type Totals = {
//   today: number;
//   last7Days: number;
//   thisMonth: number;
//   all: number;
// };

// type MyDeskTotals = {
//   open: number;
//   inProgress: number;
//   closed: number;
// };

// type IncomingStats = {
//   totals: { incoming: Totals };
//   myDesk?: MyDeskTotals;
//   generatedAt?: string;
// };

// type OutgoingStats = {
//   totals: { outgoing: Totals } | { incoming?: never; outgoing: Totals };
//   generatedAt?: string;
// };

// export default function DashboardPage() {
//   const [inc, setInc] = useState<IncomingStats | null>(null);
//   const [out, setOut]   = useState<OutgoingStats | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [dailyInc, setDailyInc] = useState<{date:string;count:number}[]>([]);
//   const [dailyOut, setDailyOut] = useState<{date:string;count:number}[]>([]);
//   const [deskDist, setDeskDist] = useState<{open:number;inProgress:number;closed:number} | null>(null);

//   async function load() {
//     setLoading(true);
//     try {
//       const [a, b, di, doo, md] = await Promise.all([
//         api.get<IncomingStats>("/incoming/stats/overview"),
//         api.get<OutgoingStats>("/outgoing/stats/overview").catch(() => ({ data: null as any })), // قد لا تكون متوفرة
//         api.get<{days:number;series:{date:string;count:number}[]}>("/incoming/stats/daily", { params: { days: 30 } }),
//         api.get<{days:number;series:{date:string;count:number}[]}>("/outgoing/stats/daily", { params: { days: 30 } }),
//         api.get<{open:number;inProgress:number;closed:number}>("/incoming/stats/my-desk"),
//       ]);
//       setInc(a.data);
//       setOut(b?.data ?? null);
//       setDailyInc(di.data.series);
//       setDailyOut(doo.data.series);
//       setDeskDist(md.data);
//     } catch (e:any) {
//       toast.error(e?.response?.data?.message ?? "تعذّر تحميل لوحة التحكم");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => { load(); }, []);

//   const incT = inc?.totals?.incoming;
//   // دعم شكل بديل إن سميت الكائن outgoing مباشرة
//   const outT = (out?.totals as any)?.outgoing;

//   // بيانات الرسم البياني
//   const chartData = {
//     labels: ['اليوم', 'هذا الأسبوع', 'هذا الشهر', 'الإجمالي'],
//     datasets: [
//       {
//         label: 'الوارد',
//         data: [incT?.today, incT?.last7Days, incT?.thisMonth, incT?.all],
//         fill: false,
//         borderColor: 'rgba(75, 192, 192, 1)',
//         tension: 0.1,
//       },
//       {
//         label: 'الصادر',
//         data: [outT?.today, outT?.last7Days, outT?.thisMonth, outT?.all],
//         fill: false,
//         borderColor: 'rgba(255, 99, 132, 1)',
//         tension: 0.1,
//       },
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     plugins: {
//       legend: {
//         position: 'top' as const,
//       },
//       tooltip: {
//         mode: 'index' as const,
//         intersect: false,
//       },
//     },
//     scales: {
//       x: {
//         beginAtZero: true,
//       },
//       y: {
//         beginAtZero: true,
//       },
//     },
//   };


//   const labels30 = dailyInc.length ? dailyInc.map(x => x.date.slice(5)) : dailyOut.map(x => x.date.slice(5));
//   const lineData = {
//     labels: labels30,
//     datasets: [
//       {
//         label: "الوارد (30 يوم)",
//         data: dailyInc.map(x => x.count),
//         tension: 0.3,
//         borderWidth: 2,
//         pointRadius: 0,
//         borderColor: "rgba(2,132,199,1)",      // sky-600
//         backgroundColor: "rgba(2,132,199,0.15)"
//       },
//       {
//         label: "الصادر (30 يوم)",
//         data: dailyOut.map(x => x.count),
//         tension: 0.3,
//         borderWidth: 2,
//         pointRadius: 0,
//         borderColor: "rgba(124,58,237,1)",     // violet-600
//         backgroundColor: "rgba(124,58,237,0.15)"
//       }
//     ]
//   };
//   const lineOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: { legend: { position: "top" as const } },
//     interaction: { mode: "index" as const, intersect: false },
//     scales: {
//       x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
//       y: { beginAtZero: true, ticks: { stepSize: 1 } }
//     }
//   };

//   const doughnutData = deskDist ? {
//     labels: ["مفتوح", "قيد الإجراء", "مغلق"],
//     datasets: [{
//       data: [deskDist.open, deskDist.inProgress, deskDist.closed],
//       backgroundColor: [
//         "rgba(125,211,252,0.9)",  // sky-300
//         "rgba(252,211,77,0.9)",   // amber-300
//         "rgba(134,239,172,0.9)"   // emerald-300
//       ],
//       borderWidth: 1,
//     }]
//   } : null;

//   return (
//     <div className="space-y-6" dir="rtl">
//       <header className="flex items-center justify-between">
//         <div className="space-y-1">
//           <h1 className="text-2xl font-bold">لوحة التحكم</h1>
//           <p className="text-sm text-gray-500">نظرة عامة سريعة على الوارد والصادر وطاولتك</p>
//         </div>
//         <button onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
//           <RefreshCw className="size-4" />
//           تحديث
//         </button>
//       </header>

//        {/*{loading && <div className="text-center text-sm text-gray-500">جاري التحميل…</div>}*/}
//        {loading ? <DashboardSkeleton /> : (<div className="text-center text-sm text-gray-500">جاري التحميل…</div>)}

//       {!loading && (
//         <>
//           {/* رسم بياني لعرض البيانات */}
//           <section className="bg-white border rounded-2xl shadow-sm p-4 space-y-4">
//             <h2 className="text-xl font-semibold mb-4">إحصائيات الوارد والصادر</h2>
//             <Line data={chartData} options={chartOptions} />
//           </section>

//           {/* إضافة باقي البطاقات هنا */}
//         </>
//       )}

//       {/* اتجاه 30 يوم */}
//       <section className="grid lg:grid-cols-3 gap-6">
//         <div className="lg:col-span-2 rounded-2xl border bg-white shadow-sm p-4">
//           <h3 className="font-semibold mb-3">اتجاه 30 يوم (وارد/صادر)</h3>
//           <div className="h-64">
//             <Line data={lineData} options={lineOptions} />
//           </div>
//         </div>

//         <div className="rounded-2xl border bg-white shadow-sm p-4">
//           <h3 className="font-semibold mb-3">حالات “طاولتي”</h3>
//           <div className="h-64 flex items-center justify-center">
//             {doughnutData ? <Doughnut data={doughnutData} /> : <div className="text-sm text-gray-500">لا بيانات</div>}
//           </div>
//         </div>
//       </section>


//       {/* بطاقات إحصائيات */}
//       <section className="grid md:grid-cols-2 gap-6">
//         {/* وارد */}
//         {/*<div className="rounded-2xl border bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">*/}
//         <div className="rounded-2xl border bg-gradient-to-br from-sky-50 p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="rounded-xl bg-sky-100 p-2 text-sky-700"><Inbox className="size-5" /></div>
//               <div className="font-semibold">الوارد</div>
//             </div>
//             <Link to="/incoming" className="text-sky-700 text-sm hover:underline flex items-center gap-1">
//               فتح الوارد <ArrowRightLeft className="size-4 rtl:rotate-180" />
//             </Link>
//           </div>

//           <div className="grid sm:grid-cols-4 gap-3 mt-3">
//             <StatCard label="اليوم" value={incT?.today ?? 0} icon={<TrendingUp className="size-4" />} />
//             <StatCard label="هذا الأسبوع" value={incT?.last7Days ?? 0} />
//             <StatCard label="هذا الشهر" value={incT?.thisMonth ?? 0} />
//             <StatCard label="الإجمالي" value={incT?.all ?? 0} strong />
//           </div>

//           {inc?.myDesk && (
//             <div className="grid sm:grid-cols-3 gap-3 mt-4">
//               <BadgeStat label="مفتوح" value={inc.myDesk.open} color="sky" />
//               <BadgeStat label="قيد الإجراء" value={inc.myDesk.inProgress} color="amber" />
//               <BadgeStat label="مغلق" value={inc.myDesk.closed} color="emerald" />
//             </div>
//           )}
//         </div>

//         {/* صادر */}
//         {/*<div className="rounded-2xl border bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">*/}
//         <div className="rounded-2xl border bg-gradient-to-br from-sky-50 p-4 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.08)]">
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <div className="rounded-xl bg-violet-100 p-2 text-violet-700"><Send className="size-5" /></div>
//               <div className="font-semibold">الصادر</div>
//             </div>
//             <Link to="/outgoing" className="text-violet-700 text-sm hover:underline flex items-center gap-1">
//               فتح الصادر <ArrowRightLeft className="size-4 rtl:rotate-180" />
//             </Link>
//           </div>

//           <div className="grid sm:grid-cols-4 gap-3 mt-3">
//             <StatCard label="اليوم" value={outT?.today ?? 0} icon={<TrendingDown className="size-4" />} />
//             <StatCard label="هذا الأسبوع" value={outT?.last7Days ?? 0} />
//             <StatCard label="هذا الشهر" value={outT?.thisMonth ?? 0} />
//             <StatCard label="الإجمالي" value={outT?.all ?? 0} strong />
//           </div>
//         </div>
//       </section>

//       {/* روابط سريعة + صناديق */}
//       <section className="grid lg:grid-cols-3 gap-6">
//         <div className="rounded-2xl border p-4 bg-white shadow-sm">
//           <h3 className="font-semibold mb-3 flex items-center gap-2">
//             <LayoutGrid className="size-4 text-gray-600" /> روابط سريعة
//           </h3>
//           <div className="grid sm:grid-cols-2 gap-8 mt-4 py-2 text-sm ">
//             <LinkBtn to="/incoming" label="الوارد" tone="sky" />
//             <LinkBtn to="/outgoing" label="الصادر" tone="violet" />
//             <LinkBtn to="/departments" label="الأقسام" tone="amber" />
//             <LinkBtn to="/my-desk" label="طاولتي" tone="emerald" />
//           </div>
//         </div>

//         <div className="rounded-2xl border p-4 bg-white shadow-sm">
//           <h3 className="font-semibold mb-3 flex items-center gap-2">
//             <Files className="size-4 text-gray-600" /> ملاحظات سريعة
//           </h3>
//           <ul className="text-sm list-disc pr-4 space-y-1 text-gray-600">
//             <li>يمكنك الانتقال إلى الوارد/الصادر من الروابط الجانبية أو السريعة.</li>
//             <li>جرّب الفلاتر والبحث في صفحة الوارد لضبط نتائجك.</li>
//             <li>تابع “طاولتي” لرؤية كل المعاملات الموكلة لك أو لقسمك.</li>
//           </ul>
//         </div>

//         <div className="rounded-2xl border p-4 bg-white shadow-sm">
//           <h3 className="font-semibold mb-1">آخر تحديث</h3>
//           <p className="text-xs text-gray-500">
//             {inc?.generatedAt ? new Date(inc.generatedAt).toLocaleString("ar-LY") : "—"}
//           </p>
//           <div className="mt-3 text-sm text-gray-600">
//             احرص دائمًا على تحديث الصفحة للاطلاع على أحدث الأرقام.
//           </div>
//         </div>
//       </section>
//     </div>
//   );
// }


// function DashboardSkeleton() {
//   return (
//     <div className="grid md:grid-cols-2 gap-6">
//       {Array.from({ length: 2 }).map((_, i) => (
//         <div key={i} className="rounded-2xl border p-4 shadow-sm bg-white">
//           <div className="h-4 w-32 bg-gray-200 rounded mb-3 animate-pulse" />
//           <div className="grid sm:grid-cols-4 gap-3">
//             {Array.from({ length: 4 }).map((_, j) => (
//               <div key={j} className="rounded-xl border p-3">
//                 <div className="h-3 w-16 bg-gray-200 rounded mb-2 animate-pulse" />
//                 <div className="h-6 w-10 bg-gray-200 rounded animate-pulse" />
//               </div>
//             ))}
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }



// // بطاقة رقمية تفاعلية
// function StatCard({
//   label,
//   value,
//   strong,
//   icon,
// }: {
//   label: string;
//   value: number;
//   strong?: boolean;
//   icon?: React.ReactNode;
// }) {
//   return (
//     <motion.div
//       whileHover={{ y: -2, scale: 1.01 }}
//       whileTap={{ scale: 0.995 }}
//       transition={{ type: "spring", stiffness: 300, damping: 20 }}
//       className="group rounded-xl border bg-white/70 backdrop-blur p-3 shadow-[0_1px_0_#0001] hover:shadow-lg hover:shadow-black/5 transition-all duration-200 relative"
//     >
//       {/* لمعة إطار خفيفة عند الهوفر */}
//       <div className="pointer-events-none absolute inset-0 rounded-xl ring-0 group-hover:ring-1 ring-sky-300/40" />
//       <div className="text-xs text-gray-500 flex items-center justify-between">
//         <span>{label}</span>
//         {icon}
//       </div>
//       <div className={`mt-1 ${strong ? "text-2xl font-extrabold" : "text-xl font-bold"}`}>
//         {value}
//       </div>
//     </motion.div>
//   );
// }


// // شارة حالة “طاولتي” مع تفاعل خفيف
// function BadgeStat({
//   label,
//   value,
//   color,
// }: {
//   label: string;
//   value: number;
//   color: "sky" | "amber" | "emerald";
// }) {
//   const map: Record<string, string> = {
//     sky: "bg-sky-50 text-sky-700 border-sky-200",
//     amber: "bg-amber-50 text-amber-700 border-amber-200",
//     emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
//   };
//   return (
//     <motion.div
//       whileHover={{ y: -1 }}
//       className={`rounded-xl p-3 text-sm font-medium border ${map[color]} flex items-center justify-between shadow-sm`}
//     >
//       <span>{label}</span>
//       <span className="font-bold">{value}</span>
//     </motion.div>
//   );
// }



// // زر رابط سريع أكثر حيوية
// function LinkBtn({
//   to,
//   label,
//   tone,
// }: {
//   to: string;
//   label: string;
//   tone: "sky" | "violet" | "amber" | "emerald";
// }) {
//   const map: Record<string, string> = {
//     sky: "text-sky-700 border-sky-200 hover:bg-sky-50 focus-visible:ring-sky-300/40",
//     violet: "text-violet-700 border-violet-200 hover:bg-violet-50 focus-visible:ring-violet-300/40",
//     amber: "text-amber-700 border-amber-200 hover:bg-amber-50 focus-visible:ring-amber-300/40",
//     emerald:
//       "text-emerald-700 border-emerald-200 hover:bg-emerald-50 focus-visible:ring-emerald-300/40",
//   };
//   return (
//     <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.995 }}>
//       <Link
//         to={to}
//         className={`rounded-xl border px-3 py-2 text-center transition shadow-sm focus-visible:outline-none focus-visible:ring-2 ${map[tone]}`}
//       >
//         {label}
//       </Link>
//     </motion.div>
//   );
// }



