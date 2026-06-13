import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee, Calendar, Store, Users, ArrowRight } from 'lucide-react';
import { fetchDashboardStats } from '../services/adminDataService';

const inr = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({ queryKey: ['dashboardStats'], queryFn: fetchDashboardStats });

  const cards = [
    {
      label: 'Revenue (completed)',
      value: stats ? inr(stats.grossRevenue) : '—',
      icon: <IndianRupee size={18} />,
      tint: 'bg-emerald-500/10 text-emerald-400',
      sub: `${stats?.completedBookings ?? 0} completed bookings`,
    },
    {
      label: 'Recent Bookings',
      value: stats ? String(stats.totalBookings) : '—',
      icon: <Calendar size={18} />,
      tint: 'bg-violet-500/10 text-black font-semibold',
      sub: `${stats?.completedBookings ?? 0} completed`,
    },
    {
      label: 'Active Vendors',
      value: stats ? String(stats.activeVendors) : '—',
      icon: <Store size={18} />,
      tint: 'bg-sky-500/10 text-sky-400',
      sub: `${stats?.pendingVendors ?? 0} pending review`,
    },
    {
      label: 'Total Customers',
      value: stats ? String(stats.totalCustomers) : '—',
      icon: <Users size={18} />,
      tint: 'bg-pink-500/10 text-pink-400',
      sub: `${stats?.totalVendors ?? 0} vendors total`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Console Dashboard</h1>
        <p className="text-sm text-gray-500">
          Live statistics from Firestore.{isLoading ? ' Loading…' : ''}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">{c.label}</span>
              <div className={`rounded-md p-2 ${c.tint}`}>{c.icon}</div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-gray-900">{c.value}</h3>
              <p className="mt-1 text-xs text-gray-500">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent bookings */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 md:col-span-2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Bookings</h2>
          <div className="divide-y divide-slate-800">
            {(stats?.recentBookings ?? []).map((bk) => (
              <div key={bk.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {bk.customerName} <span className="text-gray-500">→</span> {bk.vendorName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {bk.at ? new Date(bk.at).toLocaleString() : '—'}
                  </p>
                </div>
                <div className="text-right shrink-0 pl-3">
                  <span className="block text-sm font-bold text-gray-900">{inr(bk.amount)}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 capitalize">{bk.status}</span>
                </div>
              </div>
            ))}
            {(!stats || stats.recentBookings.length === 0) && (
              <p className="py-6 text-center text-sm text-gray-500">{isLoading ? 'Loading…' : 'No bookings yet.'}</p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Operations</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/vendors/approvals')}
              className="w-full rounded-lg bg-black text-white hover:bg-gray-900 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            >
              Review Pending Vendors ({stats?.pendingVendors ?? 0})
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => navigate('/vendors')}
              className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 border border-gray-200 py-2.5 text-sm font-semibold text-white transition-all"
            >
              All Vendors
            </button>
            <button
              onClick={() => navigate('/settlements')}
              className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 border border-gray-200 py-2.5 text-sm font-semibold text-white transition-all"
            >
              Settlements
            </button>
            <button
              onClick={() => navigate('/users')}
              className="w-full rounded-lg bg-slate-700 hover:bg-slate-600 border border-gray-200 py-2.5 text-sm font-semibold text-white transition-all"
            >
              Customers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
