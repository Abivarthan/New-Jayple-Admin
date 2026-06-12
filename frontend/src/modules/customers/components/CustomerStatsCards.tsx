import React from 'react';
import type { CustomerStats } from '../types/customer.types';
import { IndianRupee, ShoppingBag, CheckCircle, XCircle, TrendingUp, Gem } from 'lucide-react';

interface Props {
  stats: CustomerStats;
}

export const CustomerStatsCards: React.FC<Props> = ({ stats }) => {
  const items = [
    {
      title: 'Total Spend',
      value: `₹${stats.totalSpend.toLocaleString()}`,
      icon: <IndianRupee className="w-5 h-5 text-emerald-400" />,
      bg: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Lifetime Value',
      value: `₹${stats.lifetimeValue.toLocaleString()}`,
      icon: <Gem className="w-5 h-5 text-black font-semibold" />,
      bg: 'bg-violet-500/10 border-black'
    },
    {
      title: 'Avg Order Value',
      value: `₹${stats.averageOrderValue.toLocaleString()}`,
      icon: <TrendingUp className="w-5 h-5 text-blue-400" />,
      bg: 'bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: <ShoppingBag className="w-5 h-5 text-fuchsia-400" />,
      bg: 'bg-fuchsia-500/10 border-fuchsia-500/20'
    },
    {
      title: 'Completed',
      value: stats.completedBookings,
      icon: <CheckCircle className="w-5 h-5 text-teal-400" />,
      bg: 'bg-teal-500/10 border-teal-500/20'
    },
    {
      title: 'Cancelled',
      value: stats.cancelledBookings,
      icon: <XCircle className="w-5 h-5 text-rose-400" />,
      bg: 'bg-rose-500/10 border-rose-500/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {items.map((item, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between transition-all hover:border-gray-200 hover:bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-xl border ${item.bg}`}>
              {item.icon}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{item.value}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1">{item.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
