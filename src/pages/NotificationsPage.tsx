// src/pages/NotificationsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNotiStore, NotificationDto } from "../stores/notiStore";
import { Link } from "react-router-dom";

type Tab = "all" | "unread" | "read" | "sla";

function isSlaNotification(n: NotificationDto) {
  const txt = `${n.title} ${n.body}`.toLowerCase();
  // أي إشعار فيه SLA في العنوان/النص نعتبره من نوع SLA
  return txt.includes("sla");
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("all");

  const {
    items,
    unread,
    loading,
    error,
    fetchOnce,
    markAllAsRead,
  } = useNotiStore();

  // تحميل الإشعارات مرة واحدة عند الدخول للصفحة
  useEffect(() => {
    fetchOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    switch (tab) {
      case "unread":
        return items.filter((n) => n.status === "Unread");
      case "read":
        return items.filter((n) => n.status === "Read");
      case "sla":
        return items.filter((n) => isSlaNotification(n));
      default:
        return items;
    }
  }, [items, tab]);

  return (
    <div className="space-y-4" dir="rtl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">إشعارات النظام</h1>
          <p className="text-sm text-gray-500 mt-1">
            جميع الإشعارات التي أرسلها النظام لك، بما في ذلك تنبيهات SLA، التوزيعات،
            والتغييرات الإدارية.
          </p>
        </div>
        {unread > 0 && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1">
            لديك <span className="font-bold">{unread}</span> إشعار غير مقروء.
          </div>
        )}
      </header>

      {/* تبويبات الفلترة */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {(
          [
            ["all", "الكل"],
            ["unread", "غير مقروءة"],
            ["read", "مقروءة"],
            ["sla", "تنبيهات SLA"],
          ] as [Tab, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={[
              "px-3 py-1 rounded-full border",
              tab === value
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 hover:bg-gray-50",
            ].join(" ")}
          >
            {label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={markAllAsRead}
            className="px-3 py-1 rounded-full border text-xs bg-gray-50 hover:bg-gray-100"
          >
            تعيين جميع الإشعارات كمقروءة
          </button>
        </div>
      </div>

      {/* المحتوى */}
      <section className="bg-white border rounded-2xl shadow-sm p-4 min-h-[200px]">
        {loading && (
          <div className="text-sm text-gray-500">جاري تحميل الإشعارات...</div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-600 mb-2">{error}</div>
        )}

        {!loading && !filtered.length && (
          <div className="text-sm text-gray-500">لا توجد إشعارات مطابقة.</div>
        )}

        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {filtered.map((n) => {
              const isSla = isSlaNotification(n);

              return (
                <li
                  key={n.id}
                  className={`py-3 flex flex-col gap-1 text-sm ${
                    n.status === "Unread"
                      ? "bg-blue-50/40 dark:bg-slate-800/40"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{n.title}</span>
                      {n.status === "Unread" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600 text-white">
                          جديد
                        </span>
                      )}
                      {isSla && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          SLA
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 font-mono">
                      {new Date(n.createdAt).toLocaleString("ar-LY", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="text-xs text-gray-700 dark:text-gray-200">
                    {n.body}
                  </div>

                  {n.link && (
                    <div className="mt-1">
                      <Link
                        to={n.link.startsWith("http") ? "#" : n.link}
                        onClick={(e) => {
                          if (n.link.startsWith("http")) {
                            e.preventDefault();
                            window.location.href = n.link;
                          }
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        فتح المعاملة / التفاصيل
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="text-[11px] text-gray-500 mt-3">
          * تنبيهات SLA يتم إنشاؤها تلقائيًا عند تأخر المعاملة عن موعد الاستحقاق أو
          عند تصعيدها إلى مستوى أعلى.
        </div>
      </section>
    </div>
  );
}
