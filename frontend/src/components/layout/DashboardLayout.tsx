import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0f172a] text-slate-100">
      {/* Navigation Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Bar */}
        <TopBar />

        {/* Dynamic Page Views */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0f172a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
