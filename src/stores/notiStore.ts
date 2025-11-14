// src/stores/notiStore.ts

import { create } from 'zustand';

type Noti = { title: string; body: string; link?: string; severity?: 'info'|'warning'|'danger'; at?: string; };
type S = {
  list: Noti[];
  unread: number;
  push: (n: Noti) => void;
  setUnread: (n: number) => void;
  clear: () => void;
};

export const useNotiStore = create<S>((set) => ({
  list: [],
  unread: 0,
  push: (n) => set((s) => ({ list: [n, ...s.list].slice(0, 50), unread: s.unread + 1 })),
  setUnread: (n) => set({ unread: n }),
  clear: () => set({ list: [], unread: 0 }),
}));
