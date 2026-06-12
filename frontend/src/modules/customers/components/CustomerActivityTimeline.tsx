import React from 'react';
import type { CustomerActivity } from '../types/customer.types';
import { Activity, UserPlus, Edit3, CalendarPlus, CreditCard, AlertOctagon, RefreshCcw } from 'lucide-react';

interface Props {
  activities: CustomerActivity[];
}

export const CustomerActivityTimeline: React.FC<Props> = ({ activities }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'registration': return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'profile_update': return <Edit3 className="w-4 h-4 text-blue-400" />;
      case 'booking_created': return <CalendarPlus className="w-4 h-4 text-black font-semibold" />;
      case 'payment': return <CreditCard className="w-4 h-4 text-fuchsia-400" />;
      case 'complaint': return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case 'refund_request': return <RefreshCcw className="w-4 h-4 text-amber-400" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-400" />
        Activity Timeline
      </h3>

      <div className="relative flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No activities recorded.
          </div>
        ) : (
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700/50"></div>
        )}
        
        <div className="space-y-6 relative z-10">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0 relative z-10">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 pt-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(activity.timestamp).toLocaleString(undefined, { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{activity.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
