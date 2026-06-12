import React from 'react';
import { ShieldAlert, Key, Bell, Ticket, Play, Pause } from 'lucide-react';
import type { CustomerDetails } from '../types/customer.types';

interface Props {
  customer: CustomerDetails;
  onUpdateStatus: (status: 'active' | 'locked') => void;
}

export const CustomerActionsPanel: React.FC<Props> = ({ customer, onUpdateStatus }) => {
  const isSuspended = customer.status === 'locked';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-black font-semibold" />
        Quick Actions
      </h3>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => onUpdateStatus(isSuspended ? 'active' : 'locked')}
          className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-medium transition-colors ${
            isSuspended 
              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20'
          }`}
        >
          {isSuspended ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          {isSuspended ? 'Activate Customer' : 'Suspend Customer'}
        </button>

        <button className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-medium text-gray-800 bg-slate-700/50 hover:bg-gray-100 border border-gray-200 transition-colors">
          <Key className="w-4 h-4" />
          Reset Password
        </button>
        
        <button className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-medium text-gray-800 bg-slate-700/50 hover:bg-gray-100 border border-gray-200 transition-colors">
          <Bell className="w-4 h-4" />
          Send Notification
        </button>

        <div className="mt-auto pt-4">
          <button className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-medium text-gray-900 bg-black text-white hover:bg-gray-900 shadow-lg shadow-violet-500/20 transition-all">
            <Ticket className="w-4 h-4" />
            Create Support Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
