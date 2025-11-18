// src/stores/notiStore.ts

import { create } from "zustand";
import apiClient from "../api/apiClient";
import { io, Socket } from "socket.io-client";

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

type NotiState = {
  items: NotificationDto[];
  unread: number;
  loaded: boolean;
  loading: boolean;
  error?: string;

  // REST
  fetchOnce: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markOneAsRead: (id: number) => Promise<void>;

  // WebSocket
  connectSocket: (userId: number) => void;
};

// 🔌 socket.io client (مشترَك على مستوى الملف)
let socket: Socket | null = null;
let socketUserId: number | null = null;

export const useNotiStore = create<NotiState>((set, get) => ({
  items: [],
  unread: 0,
  loaded: false,
  loading: false,
  error: undefined,

  // نحمل الإشعارات مرة واحدة (عند دخول المستخدم)
  async fetchOnce() {
    const { loaded, loading } = get();
    if (loaded || loading) return;

    set({ loading: true, error: undefined });

    try {
      const res = await apiClient.get<NotificationDto[]>("/notifications/my", {
        params: { onlyUnread: 0, take: 50 },
      });

      const list = Array.isArray(res.data) ? res.data : [];

      // تأكد من عدم وجود تكرار بالـ id حتى لو الـ API رجّع داتا مكررة
      const map = new Map<number, NotificationDto>();
      for (const n of list) map.set(n.id, n);

      const items = Array.from(map.values()).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const unread = items.filter((n) => n.status === "Unread").length;

      console.log("[NOTI] fetched notifications:", {
        count: items.length,
        unread,
      });

      set({ items, unread, loaded: true, loading: false });
    } catch (err) {
      console.error("Failed to load notifications", err);
      set({ loading: false, error: "تعذر تحميل الإشعارات" });
    }
  },

  // تعيين الكل كمقروء
  async markAllAsRead() {
    const { items } = get();
    const unreadIds = items
      .filter((n) => n.status === "Unread")
      .map((n) => n.id);

    if (!unreadIds.length) return;

    set({
      items: items.map((n) =>
        unreadIds.includes(n.id) ? { ...n, status: "Read" } : n
      ),
      unread: 0,
    });

    try {
      await apiClient.patch("/notifications/read", { ids: unreadIds });
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  },

  // تعيين إشعار واحد كمقروء
  async markOneAsRead(id: number) {
    const { items, unread } = get();
    const target = items.find((n) => n.id === id);
    if (!target || target.status === "Read") return;

    set({
      items: items.map((n) =>
        n.id === id ? { ...n, status: "Read" } : n
      ),
      unread: Math.max(0, unread - 1),
    });

    try {
      await apiClient.patch("/notifications/read", { ids: [id] });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  },

  // اتصال WebSocket للحصول على إشعارات حية
  connectSocket(userId: number) {
    if (!userId) return;

    // لو فيه socket موجود لأي سبب نستعمله ولا ننشئ واحد جديد
    if (socket) {
      if (socketUserId !== userId) {
        socketUserId = userId;
        socket.emit("join", { userId });
        console.log("[NOTI] reuse socket, join user:", userId);
      }
      return;
    }

    socketUserId = userId;

    // 👇 مهم جداً: اختيار الـ URL حسب البيئة
    const isDev = window.location.origin.includes("localhost:5173");
    const WS_URL =
      // في الإنتاج نستعمل env (لو موجود) أو نفس origin على /notifications
      import.meta.env.VITE_NOTI_WS_URL ||
      (isDev
        ? "http://localhost:3000/notifications"
        : `${window.location.origin}/notifications`);

    console.log("[NOTI] connecting socket to:", WS_URL);

    socket = io(WS_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("[NOTI] socket connected", socket?.id);
      socket?.emit("join", { userId: socketUserId });
    });

    socket.on("connect_error", (err) => {
      console.error("[NOTI] socket connect_error", err);
    });

    // هذا الحدث يرسله NotificationsGateway: emitToUsers(..., 'notify', payload)
    socket.on("notify", (payload: any) => {
      console.log("[NOTI] received notify payload:", payload);

      const n: NotificationDto = {
        id: payload.id,
        userId: payload.userId ?? userId,
        title: payload.title,
        body: payload.body,
        link: payload.link ?? null,
        severity: payload.severity ?? "info",
        status: payload.status ?? "Unread",
        createdAt:
          typeof payload.createdAt === "string"
            ? payload.createdAt
            : new Date().toISOString(),
      };

      set((state) => {
        // ✅ منع تكرار نفس الإشعار حسب الـ id
        const existingIndex = state.items.findIndex((x) => x.id === n.id);

        let items: NotificationDto[];
        if (existingIndex >= 0) {
          // لو موجود نحدثه فقط
          items = [...state.items];
          items[existingIndex] = { ...items[existingIndex], ...n };
        } else {
          items = [n, ...state.items].slice(0, 50);
        }

        const unread = items.filter((x) => x.status === "Unread").length;

        return { items, unread };
      });
    });

    socket.on("disconnect", () => {
      console.log("[NOTI] socket disconnected");
    });
  },
}));





// // src/stores/notiStore.ts

// import { create } from "zustand";
// import apiClient from "../api/apiClient";
// import { io, Socket } from "socket.io-client";

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

// type NotiState = {
//   items: NotificationDto[];
//   unread: number;
//   loaded: boolean;
//   loading: boolean;
//   error?: string;

//   // REST
//   fetchOnce: () => Promise<void>;
//   markAllAsRead: () => Promise<void>;
//   markOneAsRead: (id: number) => Promise<void>;

//   // WebSocket
//   connectSocket: (userId: number) => void;
// };

// // 🔌 socket.io client (مشترَك على مستوى الملف)
// let socket: Socket | null = null;
// let socketUserId: number | null = null;

// export const useNotiStore = create<NotiState>((set, get) => ({
//   items: [],
//   unread: 0,
//   loaded: false,
//   loading: false,
//   error: undefined,

//   // نحمل الإشعارات مرة واحدة (عند دخول المستخدم)
//   async fetchOnce() {
//     const { loaded, loading } = get();
//     if (loaded || loading) return;

//     set({ loading: true, error: undefined });

//     try {
//       const res = await apiClient.get<NotificationDto[]>("/notifications/my", {
//         params: { onlyUnread: 0, take: 50 },
//       });

//       const list = Array.isArray(res.data) ? res.data : [];

//       // تأكد من عدم وجود تكرار بالـ id حتى لو الـ API رجّع داتا مكررة
//       const map = new Map<number, NotificationDto>();
//       for (const n of list) map.set(n.id, n);

//       const items = Array.from(map.values()).sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//       );

//       const unread = items.filter((n) => n.status === "Unread").length;

//       set({ items, unread, loaded: true, loading: false });
//     } catch (err) {
//       console.error("Failed to load notifications", err);
//       set({ loading: false, error: "تعذر تحميل الإشعارات" });
//     }
//   },

//   // تعيين الكل كمقروء
//   async markAllAsRead() {
//     const { items } = get();
//     const unreadIds = items
//       .filter((n) => n.status === "Unread")
//       .map((n) => n.id);

//     if (!unreadIds.length) return;

//     set({
//       items: items.map((n) =>
//         unreadIds.includes(n.id) ? { ...n, status: "Read" } : n
//       ),
//       unread: 0,
//     });

//     try {
//       await apiClient.patch("/notifications/read", { ids: unreadIds });
//     } catch (err) {
//       console.error("Failed to mark all notifications as read", err);
//     }
//   },

//   // تعيين إشعار واحد كمقروء
//   async markOneAsRead(id: number) {
//     const { items, unread } = get();
//     const target = items.find((n) => n.id === id);
//     if (!target || target.status === "Read") return;

//     set({
//       items: items.map((n) =>
//         n.id === id ? { ...n, status: "Read" } : n
//       ),
//       unread: Math.max(0, unread - 1),
//     });

//     try {
//       await apiClient.patch("/notifications/read", { ids: [id] });
//     } catch (err) {
//       console.error("Failed to mark notification as read", err);
//     }
//   },

//   // اتصال WebSocket للحصول على إشعارات حية
//   connectSocket(userId: number) {
//     if (!userId) return;

//     // 🔒 لو فيه socket موجود لأي سبب (حتى لو لسا ما اتصلش) نستعمله ولا ننشئ واحد جديد
//     if (socket) {
//       // لو المستخدم تغيّر (نادرًا) نرسل join جديد
//       if (socketUserId !== userId) {
//         socketUserId = userId;
//         socket.emit("join", { userId });
//         console.log("[NOTI] reuse socket, join user:", userId);
//       }
//       return;
//     }

//     socketUserId = userId;

//     socket = io(`${window.location.origin}/notifications`, {
//       path: "/socket.io",
//       transports: ["websocket", "polling"],
//       withCredentials: true,
//     });

//     socket.on("connect", () => {
//       console.log("[NOTI] socket connected", socket?.id);
//       socket?.emit("join", { userId: socketUserId });
//     });

//     socket.on("connect_error", (err) => {
//       console.error("[NOTI] socket connect_error", err);
//     });

//     // هذا الحدث يرسله NotificationsGateway: emitToUsers(..., 'notify', payload)
//     socket.on("notify", (payload: any) => {
//       const n: NotificationDto = {
//         id: payload.id,
//         userId: payload.userId ?? userId,
//         title: payload.title,
//         body: payload.body,
//         link: payload.link ?? null,
//         severity: payload.severity ?? "info",
//         status: payload.status ?? "Unread",
//         createdAt:
//           typeof payload.createdAt === "string"
//             ? payload.createdAt
//             : new Date().toISOString(),
//       };

//       set((state) => {
//         // ✅ منع تكرار نفس الإشعار حسب الـ id
//         const existingIndex = state.items.findIndex((x) => x.id === n.id);

//         let items: NotificationDto[];
//         if (existingIndex >= 0) {
//           // لو موجود نحدثه فقط
//           items = [...state.items];
//           items[existingIndex] = { ...items[existingIndex], ...n };
//         } else {
//           items = [n, ...state.items].slice(0, 50);
//         }

//         const unread = items.filter((x) => x.status === "Unread").length;

//         return { items, unread };
//       });
//     });

//     socket.on("disconnect", () => {
//       console.log("[NOTI] socket disconnected");
//     });
//   },
// }));



