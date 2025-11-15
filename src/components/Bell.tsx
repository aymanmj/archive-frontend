// src/components/Bell.tsx

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/apiClient";

export type NotificationDto = {
  id: number;
  userId: number;
  title: string;
  body: string;
  link?: string | null;
  severity: "info" | "warning" | "danger";
  status: "Unread" | "Read";
  createdAt: string;
};

export default function Bell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // تحميل الإشعارات (نستخدمها من الـ effect ومن فتح القائمة)
  const loadNotifications = async () => {
    // لو سبق التحميل أو الآن نحمل، لا نعيد
    if (loaded || loading) return;

    setLoading(true);
    try {
      const res = await apiClient.get<NotificationDto[]>("/notifications/my", {
        params: { onlyUnread: 0, take: 50 },
      });

      const list = res.data ?? [];
      setItems(list);
      setUnread(list.filter((n) => n.status === "Unread").length);
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
    }
  };

  // 📌 حمّل الإشعارات مرة واحدة عند أول تحميل للجرس
  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadNotifications();
    }
  };

  // تعيين الكل كمقروء
  const handleMarkAllRead = async () => {
    const ids = items.filter((n) => n.status === "Unread").map((n) => n.id);
    if (!ids.length) return;

    setItems((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, status: "Read" } : n)),
    );
    setUnread(0);

    try {
      await apiClient.patch("/notifications/read", { ids });
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };

  // فتح إشعار واحد + تعيينه كمقروء
  const handleOpenOne = async (id: number, link?: string | null) => {
    setItems((prev) => {
      const next = prev.map((n) =>
        n.id === id ? { ...n, status: "Read" } : n,
      );

      const wasUnread = prev.find((n) => n.id === id)?.status === "Unread";
      if (wasUnread) {
        setUnread((u) => Math.max(0, u - 1));
      }

      return next;
    });

    try {
      await apiClient.patch("/notifications/read", { ids: [id] });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }

    setOpen(false);

    if (!link) return;

    if (link.startsWith("http://") || link.startsWith("https://")) {
      window.location.href = link;
    } else {
      navigate(link);
    }
  };

  return (
    <div className="relative">
      {/* زر الجرس */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 rounded-full bg-red-600 text-white text-xs px-1">
            {unread}
          </span>
        )}
      </button>

      {/* القائمة المنسدلة */}
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-40">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-white/10 text-sm font-semibold">
            <span>الإشعارات</span>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-xs text-blue-600 hover:underline"
            >
              تعيين الكل كمقروء
            </button>
          </div>

          {loading && (
            <div className="px-3 py-4 text-xs text-gray-500">
              جاري تحميل الإشعارات...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="px-3 py-4 text-xs text-gray-500">
              لا توجد إشعارات.
            </div>
          )}

          {!loading &&
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenOne(n.id, n.link)}
                className={`w-full text-right px-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-white/5 text-xs hover:bg-gray-50 dark:hover:bg-white/5 ${
                  n.status === "Unread"
                    ? "bg-blue-50/60 dark:bg-slate-800"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{n.title}</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
                      n.severity === "danger"
                        ? "bg-red-100 text-red-700"
                        : n.severity === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {n.status === "Unread" ? "جديد" : "مقروء"}
                  </span>
                </div>
                <div className="text-[11px] text-gray-700 dark:text-gray-200 line-clamp-2">
                  {n.body}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}



// // src/components/Bell.tsx

// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import apiClient from "../api/apiClient";

// export type NotificationDto = {
//   id: number;
//   userId: number;
//   title: string;
//   body: string;
//   link?: string | null;
//   severity: "info" | "warning" | "danger";
//   status: "Unread" | "Read";
//   createdAt: string;
// };

// export default function Bell() {
//   const [open, setOpen] = useState(false);
//   const [items, setItems] = useState<NotificationDto[]>([]);
//   const [unread, setUnread] = useState(0);
//   const [loaded, setLoaded] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const navigate = useNavigate();

//   // تحميل الإشعارات أول مرة فقط عند فتح القائمة
//   const loadNotifications = async () => {
//     if (loaded || loading) return;

//     setLoading(true);
//     try {
//       const res = await apiClient.get<NotificationDto[]>("/notifications/my", {
//         params: { onlyUnread: 0, take: 50 },
//       });

//       const list = res.data ?? [];
//       setItems(list);
//       setUnread(list.filter((n) => n.status === "Unread").length);
//       setLoaded(true);
//     } catch (err) {
//       console.error("Failed to load notifications", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleToggle = async () => {
//     const next = !open;
//     setOpen(next);
//     if (next) {
//       await loadNotifications();
//     }
//   };

//   // تعيين الكل كمقروء
//   const handleMarkAllRead = async () => {
//     const ids = items.filter((n) => n.status === "Unread").map((n) => n.id);
//     if (!ids.length) return;

//     // تحديث واجهة المستخدم مباشرة
//     setItems((prev) =>
//       prev.map((n) =>
//         ids.includes(n.id) ? { ...n, status: "Read" } : n
//       )
//     );
//     setUnread(0);

//     try {
//       await apiClient.patch("/notifications/read", { ids });
//     } catch (err) {
//       console.error("Failed to mark all notifications as read", err);
//     }
//   };

//   // فتح إشعار واحد + تعيينه كمقروء
//   const handleOpenOne = async (id: number, link?: string | null) => {
//     setItems((prev) => {
//       const next = prev.map((n) =>
//         n.id === id ? { ...n, status: "Read" } : n
//       );

//       // لو كان الإشعار غير مقروء قبل التعديل ننقص العداد واحد
//       const wasUnread = prev.find((n) => n.id === id)?.status === "Unread";
//       if (wasUnread) {
//         setUnread((u) => Math.max(0, u - 1));
//       }

//       return next;
//     });

//     try {
//       await apiClient.patch("/notifications/read", { ids: [id] });
//     } catch (err) {
//       console.error("Failed to mark notification as read", err);
//     }

//     setOpen(false);

//     if (!link) return;

//     if (link.startsWith("http://") || link.startsWith("https://")) {
//       window.location.href = link;
//     } else {
//       navigate(link);
//     }
//   };

//   return (
//     <div className="relative">
//       {/* زر الجرس */}
//       <button
//         type="button"
//         onClick={handleToggle}
//         className="relative inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
//       >
//         <span aria-hidden>🔔</span>
//         {unread > 0 && (
//           <span className="absolute -top-1 -right-1 rounded-full bg-red-600 text-white text-xs px-1">
//             {unread}
//           </span>
//         )}
//       </button>

//       {/* القائمة المنسدلة */}
//       {open && (
//         <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-40">
//           <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-white/10 text-sm font-semibold">
//             <span>الإشعارات</span>
//             <button
//               type="button"
//               onClick={handleMarkAllRead}
//               className="text-xs text-blue-600 hover:underline"
//             >
//               تعيين الكل كمقروء
//             </button>
//           </div>

//           {loading && (
//             <div className="px-3 py-4 text-xs text-gray-500">
//               جاري تحميل الإشعارات...
//             </div>
//           )}

//           {!loading && items.length === 0 && (
//             <div className="px-3 py-4 text-xs text-gray-500">
//               لا توجد إشعارات.
//             </div>
//           )}

//           {!loading &&
//             items.map((n) => (
//               <button
//                 key={n.id}
//                 type="button"
//                 onClick={() => handleOpenOne(n.id, n.link)}
//                 className={`w-full text-right px-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-white/5 text-xs hover:bg-gray-50 dark:hover:bg-white/5 ${
//                   n.status === "Unread"
//                     ? "bg-blue-50/60 dark:bg-slate-800"
//                     : ""
//                 }`}
//               >
//                 <div className="flex items-center justify-between mb-1">
//                   <span className="font-semibold">{n.title}</span>
//                   <span
//                     className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] ${
//                       n.severity === "danger"
//                         ? "bg-red-100 text-red-700"
//                         : n.severity === "warning"
//                         ? "bg-amber-100 text-amber-700"
//                         : "bg-slate-100 text-slate-600"
//                     }`}
//                   >
//                     {n.status === "Unread" ? "جديد" : "مقروء"}
//                   </span>
//                 </div>
//                 <div className="text-[11px] text-gray-700 dark:text-gray-200 line-clamp-2">
//                   {n.body}
//                 </div>
//               </button>
//             ))}
//         </div>
//       )}
//     </div>
//   );
// }

