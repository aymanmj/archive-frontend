import React from 'react';
import { NavLink } from 'react-router-dom';

const itemCls = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-3 py-2 text-sm transition
   ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-gray-100 text-gray-700'}`;

export default function Sidebar() {
  return (
    <aside
      className="w-[240px] shrink-0 border-s bg-white hidden md:block"
      style={{ borderLeft: 'none', borderRight: '1px solid #e5e7eb' }}
    >
      <div className="p-4 space-y-1">
        <NavLink to="/dashboard" className={itemCls}>
          لوحة التحكم
        </NavLink>
        <NavLink to="/incoming" className={itemCls}>
          الوارد
        </NavLink>
        <NavLink to="/outgoing" className={itemCls}>
          الصادر
        </NavLink>
        <NavLink to="/departments" className={itemCls}>
          الأقسام
        </NavLink>
      </div>
    </aside>
  );
}
