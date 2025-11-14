// src/hooks/useNotificationsSocket.ts

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { useNotiStore } from '../stores/notiStore';

let socket: Socket | null = null;

export function useNotificationsSocket() {
  const user = useAuthStore(s => s.user); // { id, ... }
  const pushNoti = useNotiStore(s => s.push);

  useEffect(() => {
    if (!user?.id) return;
    if (!socket) {
      socket = io('/notifications', { // نفس namespace في Gateway
        path: '/socket.io',           // عدّل إذا لديك proxy path
        transports: ['websocket'],
      });
      socket.on('connect', () => {
        socket?.emit('join', { userId: user.id });
      });
      socket.on('notify', (payload) => {
        // payload: { title, body, link, severity, at }
        pushNoti(payload);
      });
    }
    return () => {
      // نُبقي الاتصال طالما التطبيق مفتوح
    };
  }, [user?.id, pushNoti]);
}
