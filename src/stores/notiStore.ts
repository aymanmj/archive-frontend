import { create } from "zustand";
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

type NotiState = {
  items: NotificationDto[];
  unread: number;
  loaded: boolean;
  loading: boolean;
  error?: string;
  fetchOnce: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markOneAsRead: (id: number) => Promise<void>;
};

export const useNotiStore = create<NotiState>((set, get) => ({
  items: [],
  unread: 0,
  loaded: false,
  loading: false,
  error: undefined,

  // نحمل الإشعارات مرة واحدة فقط
  async fetchOnce() {
    const { loaded, loading } = get();
    if (loaded || loading) return;

    set({ loading: true, error: undefined });

    try {
      const res = await apiClient.get<NotificationDto[]>("/notifications/my", {
        params: { onlyUnread: 0, take: 50 },
      });

      const items = res.data ?? [];
      const unread = items.filter((n) => n.status === "Unread").length;

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

    // تحديث واجهة المستخدم مباشرة
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
//   severity: "info" | "warning" | "danger" | string;
//   status: "Unread" | "Read" | string;
//   createdAt: string;
// };

// type NotiState = {
//   items: NotificationDto[];
//   unread: number;
//   loaded: boolean;

//   // ⇦ هذه هي الدالة اللي تستخدمها في AppLayout
//   fetchOnce: () => Promise<void>;

//   markAllRead: () => Promise<void>;

//   socketConnected: boolean;
//   connectSocket: (userId: number) => void;
// };

// let socket: Socket | null = null;

// export const useNotiStore = create<NotiState>((set, get) => ({
//   items: [],
//   unread: 0,
//   loaded: false,

//   async fetchOnce() {
//     // لا تعيد الجلب لو تم الجلب مسبقًا
//     if (get().loaded) return;

//     const res = await apiClient.get<NotificationDto[]>("/notifications/my", {
//       params: { onlyUnread: 0, take: 50 },
//     });

//     const items = res.data ?? [];
//     const unread = items.filter((n) => n.status === "Unread").length;

//     set({
//       items,
//       unread,
//       loaded: true,
//     });
//   },

//   async markAllRead() {
//     const ids = get()
//       .items.filter((n) => n.status === "Unread")
//       .map((n) => n.id);

//     if (!ids.length) return;

//     await apiClient.patch("/notifications/read", { ids });

//     set((state) => ({
//       items: state.items.map((n) =>
//         ids.includes(n.id) ? { ...n, status: "Read" } : n
//       ),
//       unread: 0,
//     }));
//   },

//   socketConnected: false,

//   connectSocket(userId: number) {
//     if (!userId) return;
//     if (socket || get().socketConnected) return;

//     const base =
//       import.meta.env.VITE_API_URL || "http://localhost:3000";

//     // 👈 مطابق للـ Gateway: namespace /notifications و path /socket.io
//     socket = io(`${base}/notifications`, {
//       path: "/socket.io",
//       transports: ["websocket"],
//       autoConnect: true,
//     });

//     socket.on("connect", () => {
//       socket!.emit("join", { userId });
//       set({ socketConnected: true });
//     });

//     // السيرفر يبث الحدث 'notify' للمستخدمين
//     socket.on("notify", (payload: NotificationDto) => {
//       set((state) => {
//         const items = [payload, ...state.items].slice(0, 50);
//         const unread = items.filter((n) => n.status === "Unread").length;
//         return { items, unread };
//       });
//     });

//     socket.on("disconnect", () => {
//       set({ socketConnected: false });
//     });
//   },
// }));

