// src/components/Bell.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotiStore } from "../stores/notiStore";
import { useAuthStore } from "../stores/authStore";

export default function Bell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);

  const {
    items,
    unread,
    loading,
    markAllAsRead,
    markOneAsRead,
    fetchOnce,
    connectSocket,
  } = useNotiStore();

  useEffect(() => {
    if (!user?.id) return;

    // تحميل الإشعارات من الـ API
    fetchOnce();

    // فتح اتصال WebSocket
    connectSocket(user.id);
  }, [user?.id, fetchOnce, connectSocket]);

  const handleToggle = () => {
    setOpen((o) => !o);
  };

  const handleMarkAllReadClick = async () => {
    await markAllAsRead();
  };

  const handleOpenOne = async (id: number, link?: string | null) => {
    await markOneAsRead(id);
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

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-lg z-40">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-white/10 text-sm font-semibold">
            <span>الإشعارات</span>
            <button
              type="button"
              onClick={handleMarkAllReadClick}
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

          {!loading && items.length > 0 && (
            <div className="px-3 py-2 text-[11px] text-right bg-gray-50 dark:bg-slate-800/60">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
                className="text-blue-600 hover:underline"
              >
                عرض كل الإشعارات
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}





// // src/components/Bell.tsx

// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useNotiStore } from "../stores/notiStore";
// import { useAuthStore } from "../stores/authStore";

// export default function Bell() {
//   const [open, setOpen] = useState(false);
//   const navigate = useNavigate();

//   // 🧑‍💼 المستخدم الحالي (من authStore)
//   const user = useAuthStore((s) => s.user);

//   // 🛎️ حالة الإشعارات + الدوال
//   const {
//     items,
//     unread,
//     loading,
//     markAllAsRead,
//     markOneAsRead,
//     fetchOnce,
//     connectSocket,
//   } = useNotiStore();

//   // ✅ عند وجود مستخدم: حمّل الإشعارات مرة واحدة + افتح socket
//   useEffect(() => {
//     if (!user?.id) return;

//     // تحميل الإشعارات من الـ API (مرة واحدة)
//     fetchOnce();

//     // فتح اتصال WebSocket وربط المستخدم بغرفته user:{id}
//     connectSocket(user.id);
//   }, [user?.id, fetchOnce, connectSocket]);

//   const handleToggle = () => {
//     setOpen((o) => !o);
//   };

//   const handleMarkAllReadClick = async () => {
//     await markAllAsRead();
//   };

//   const handleOpenOne = async (id: number, link?: string | null) => {
//     await markOneAsRead(id);
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
//               onClick={handleMarkAllReadClick}
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

//           {/* 👇 زر "عرض كل الإشعارات" أسفل القائمة */}
//           {!loading && items.length > 0 && (
//             <div className="px-3 py-2 text-[11px] text-right bg-gray-50 dark:bg-slate-800/60">
//               <button
//                 type="button"
//                 onClick={() => {
//                   setOpen(false);
//                   navigate("/notifications");
//                 }}
//                 className="text-blue-600 hover:underline"
//               >
//                 عرض كل الإشعارات
//               </button>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }
