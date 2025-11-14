// src/components/Bell.tsx


import { useNotiStore } from '../stores/notiStore';

export default function Bell() {
  const unread = useNotiStore(s => s.unread);
  return (
    <button className="relative inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-gray-100">
      <span aria-hidden>🔔</span>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 rounded-full bg-red-600 text-white text-xs px-1">
          {unread}
        </span>
      )}
    </button>
  );
}
