// src/realtime/notiSocket.ts

import { io, Socket } from "socket.io-client";
import { useNotiStore, type NotificationDto } from "../stores/notiStore";

let socket: Socket | null = null;
let currentUserId: number | null = null;

/**
 * تهيئة اتصال WebSocket للإشعارات للمستخدم المحدد
 */
export function initNotiSocket(userId: number) {
  if (!userId) return;

  // لو نفس المستخدم والاتصال موجود، لا نكرر
  if (socket && currentUserId === userId) {
    return;
  }

  currentUserId = userId;

  // لو كان في socket قديم لمستخدم آخر، نفصله
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // في التطوير: http://localhost:3000/notifications
  // في الإنتاج يمكن ضبط VITE_NOTI_WS_URL على عنوان الـ API
  const WS_URL =
    import.meta.env.VITE_NOTI_WS_URL || "http://localhost:3000/notifications";

  socket = io(WS_URL, {
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    // ننضم لغرفة user:{id}
    socket?.emit("join", { userId });
    console.log("[NOTI-SOCKET] connected, joined user:", userId);
  });

  socket.on("disconnect", () => {
    console.log("[NOTI-SOCKET] disconnected");
  });

  // إشعار واحد يصل من السيرفر
  socket.on("notify", (payload: any) => {
    const n = payload as NotificationDto;

    // نضيف الإشعار للـ store (items + unread)
    useNotiStore.getState().addRealtime(n);
  });
}
