import React from 'react';
import {
  IndianRupee,
  Calendar,
  Store,
  Users,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Mock Data for Analytics
const bookingTrendData = [
  { date: 'May 22', Bookings: 24, Completed: 18 },
  { date: 'May 23', Bookings: 30, Completed: 25 },
  { date: 'May 24', Bookings: 35, Completed: 29 },
  { date: 'May 25', Bookings: 42, Completed: 36 },
  { date: 'May 26', Bookings: 38, Completed: 31 },
  { date: 'May 27', Bookings: 45, Completed: 40 },
  { date: 'May 28', Bookings: 52, Completed: 44 }
];

const zoneRevenueData = [
  { zone: 'Chennai Central', Revenue: 84320 },
  { zone: 'Trichy East', Revenue: 34500 },
  { zone: 'Madurai North', Revenue: 12400 },
  { zone: 'Coimbatore South', Revenue: 62100 },
  { zone: 'Salem West', Revenue: 18900 }
];

const mockRecentActivity = [
  { id: '1', admin: 'Jayaprakash', role: 'superadmin', action: 'Approved Vendor', target: 'Grace Beauty Salon', time: '10 mins ago' },
  { id: '2', admin: 'Meera', role: 'manager', action: 'Updated UI Config', target: 'Chennai Central Zone', time: '2 hours ago' },
  { id: '3', admin: 'Jayaprakash', role: 'superadmin', action: 'Adjusted Wallet Balance', target: 'Rahul (Vendor #12)', time: '4 hours ago', detail: '+₹1,500' },
  { id: '4', admin: 'Suresh', role: 'support', action: 'Force Cancelled Booking', target: 'BKG-9920112', time: '1 day ago' },
  { id: '5', admin: 'Meera', role: 'manager', action: 'Deactivated Zone', target: 'Madurai North', time: '2 days ago' }
];

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Console Dashboard</h1>
        <p className="text-sm text-slate-400">Real-time statistics across all zones.</p>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Weekly Revenue</span>
            <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-400">
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-100">₹2,12,220</h3>
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-400 font-semibold">
              <TrendingUp size={12} />
              <span>+12.4% vs last week</span>
            </p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Today's Bookings</span>
            <div className="rounded-md bg-violet-500/10 p-2 text-violet-400">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-100">52</h3>
            <p className="mt-1 text-xs text-slate-400">44 completed successfully</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Active Vendors</span>
            <div className="rounded-md bg-sky-500/10 p-2 text-sky-400">
              <Store size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-100">127</h3>
            <p className="mt-1 text-xs text-amber-500 font-medium">3 registrations pending review ⚠️</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">New Users (Today)</span>
            <div className="rounded-md bg-pink-500/10 p-2 text-pink-400">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-100">18</h3>
            <p className="mt-1 text-xs text-slate-400">Total active users: 4,821</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Bookings Trend */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6">
          <h2 className="text-base font-semibold text-slate-200 mb-4">Bookings volume trend (last 7 days)</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bookingTrendData}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Area type="monotone" dataKey="Bookings" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorBookings)" />
                <Area type="monotone" dataKey="Completed" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Zone */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6">
          <h2 className="text-base font-semibold text-slate-200 mb-4">Revenue by Zone</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="zone" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <Bar dataKey="Revenue" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Logs & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Activity */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-200">Recent Activity</h2>
            <button className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors">
              <span>View Audit Logs</span>
              <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="divide-y divide-slate-800">
            {mockRecentActivity.map((activity) => (
              <div key={activity.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{activity.admin}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
                      {activity.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {activity.action} <span className="text-slate-300 font-medium">{activity.target}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">{activity.time}</span>
                  {activity.detail && (
                    <span className="block text-xs font-bold text-emerald-400 mt-0.5">{activity.detail}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6">
          <h2 className="text-base font-semibold text-slate-200 mb-4">Quick Operations</h2>
          <div className="space-y-3">
            <button className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 py-2.5 text-sm font-semibold text-white transition-all">
              Review Pending Vendors (3)
            </button>
            
            <button className="w-full rounded-lg bg-slate-700 hover:bg-slate-700 active:bg-slate-800 border border-slate-600 py-2.5 text-sm font-semibold text-slate-200 transition-all">
              Run Weekly Settlements
            </button>

            <button className="w-full rounded-lg bg-slate-700 hover:bg-slate-700 active:bg-slate-800 border border-slate-600 py-2.5 text-sm font-semibold text-slate-200 transition-all">
              Broadcast Notification
            </button>

            <button className="w-full rounded-lg bg-slate-700 hover:bg-slate-700 active:bg-slate-800 border border-slate-600 py-2.5 text-sm font-semibold text-slate-200 transition-all">
              View Waitlists
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
