import React from 'react';
import Topbar from './Topbar';
import Sidebar from './Sidebar';

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Topbar />

      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
