// src/stores/notiStore.ts

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

  // 👇 تُستخدم مع WebSocket لإضافة إشعار جديد لحظيًا
  addRealtime: (n: NotificationDto) => void;
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

  // ✅ تُستدعى عند وصول إشعار جديد من WebSocket
  addRealtime(n: NotificationDto) {
    set((state) => {
      // لو الإشعار موجود بالفعل لا نكرره (احتياط)
      if (state.items.some((x) => x.id === n.id)) {
        return state;
      }

      const items = [n, ...state.items].slice(0, 50);
      const unread = items.filter((i) => i.status === "Unread").length;

      return { ...state, items, unread };
    });
  },
}));





// // src/stores/notiStore.ts

// import { create } from "zustand";
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

// type NotiState = {
//   items: NotificationDto[];
//   unread: number;
//   loaded: boolean;
//   loading: boolean;
//   error?: string;
//   // 👇 نسمح بإجبار إعادة التحميل force
//   fetchOnce: (force?: boolean) => Promise<void>;
//   markAllAsRead: () => Promise<void>;
//   markOneAsRead: (id: number) => Promise<void>;
// };

// export const useNotiStore = create<NotiState>((set, get) => ({
//   items: [],
//   unread: 0,
//   loaded: false,
//   loading: false,
//   error: undefined,

//   // نحمل الإشعارات، ويمكن إجبار إعادة التحميل بتمرير force = true
//   async fetchOnce(force = false) {
//     const { loaded, loading } = get();

//     // لو مش مجبر (force = false) وسبق التحميل أو الآن يحمل → لا نعيد
//     if (!force && (loaded || loading)) return;

//     set({ loading: true, error: undefined });

//     try {
//       const res = await apiClient.get<NotificationDto[]>("/notifications/my", {
//         params: { onlyUnread: 0, take: 50 },
//       });

//       const items = res.data ?? [];
//       const unread = items.filter((n) => n.status === "Unread").length;

//       set({
//         items,
//         unread,
//         loaded: true,
//         loading: false,
//       });

//       console.log("[notiStore] loaded notifications:", items);
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
// }));



