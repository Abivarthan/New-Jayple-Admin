import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, TrendingUp, Calendar, Users, Store } from 'lucide-react';

const COLORS = ['#8B5CF6', '#F43F5E', '#10B981', '#06B6D4', '#F59E0B'];

const revenueData = [
  { week: 'W19', Commission: 24200, Convenience: 3100 },
  { week: 'W20', Commission: 28400, Convenience: 3800 },
  { week: 'W21', Commission: 31800, Convenience: 4200 },
  { week: 'W22', Commission: 35900, Convenience: 4800 },
  { week: 'W23', Commission: 41200, Convenience: 5500 }
];

const paymentSplitData = [
  { name: 'Online Payments', value: 72 },
  { name: 'Cash on Delivery', value: 28 }
];

const customerFunnel = [
  { step: 'Created Booking', count: 1520, percent: 100 },
  { step: 'Confirmed by Salon', count: 1410, percent: 92 },
  { step: 'Completed Service', count: 1284, percent: 84 },
  { step: 'Reviewed by User', count: 894, percent: 58 }
];

const vendorTiersData = [
  { name: 'Normal Tier', value: 92 },
  { name: 'Premium Tier', value: 35 }
];

// Hour of Day vs Day of Week heatmap simulation values
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_BLOCKS = ['Morning (8AM-12PM)', 'Afternoon (12PM-4PM)', 'Evening (4PM-8PM)', 'Night (8PM-11PM)'];
const mockHeatmapData = [
  [12, 14, 18, 8],  // Mon
  [15, 12, 22, 10], // Tue
  [18, 15, 24, 12], // Wed
  [14, 18, 20, 15], // Thu
  [22, 28, 42, 26], // Fri
  [45, 52, 68, 54], // Sat
  [38, 48, 62, 45]  // Sun
];

export const Analytics: React.FC = () => {
  const [tab, setTab] = useState<'revenue' | 'bookings' | 'vendors' | 'users'>('revenue');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-display">Analytics & Cohorts</h1>
          <p className="text-sm text-slate-400">Pre-aggregated indicators showing platform health and customer funnels.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <select className="rounded-lg border border-slate-600 bg-slate-800 py-2 px-3.5 text-sm text-slate-350 outline-none focus:border-violet-500">
            <option>Last 30 Days</option>
            <option>This Month</option>
            <option>This Quarter</option>
          </select>
          <button className="rounded-lg bg-slate-700 hover:bg-slate-750 text-slate-200 border border-slate-600 py-2 px-4 text-sm font-semibold transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-px">
        <button
          onClick={() => setTab('revenue')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            tab === 'revenue'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <DollarSign size={16} />
          Revenue & Payments
        </button>
        <button
          onClick={() => setTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            tab === 'bookings'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <Calendar size={16} />
          Bookings Funnel
        </button>
        <button
          onClick={() => setTab('vendors')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            tab === 'vendors'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <Store size={16} />
          Vendor Insights
        </button>
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            tab === 'users'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-250'
          }`}
        >
          <Users size={16} />
          User Demographics
        </button>
      </div>

      {/* Tab Workspaces */}
      <div className="space-y-6">
        {/* Tab 1: Revenue */}
        {tab === 'revenue' && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* KPI list */}
            <div className="md:col-span-1 space-y-4 flex flex-col justify-between">
              <div className="rounded-xl border border-slate-600 bg-slate-800 p-5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gross Platform share</span>
                <h3 className="text-2xl font-bold mt-2 text-slate-100">₹46,700</h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-2.5">
                  <TrendingUp size={14} />
                  <span>+14.8% vs last week</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-600 bg-slate-800 p-5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Commission Collected</span>
                <h3 className="text-2xl font-bold mt-2 text-slate-100">₹41,200</h3>
                <p className="text-[10px] text-slate-500 mt-1">Calculated at standard 15% rate</p>
              </div>

              <div className="rounded-xl border border-slate-600 bg-slate-800 p-5">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Convenience Fee Revenue</span>
                <h3 className="text-2xl font-bold mt-2 text-slate-100">₹5,500</h3>
                <p className="text-[10px] text-slate-500 mt-1">₹9 flat fee assessed per booking</p>
              </div>
            </div>

            {/* Revenue Split Graph */}
            <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 md:col-span-2">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Revenue Split (last 5 weeks)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#F1F5F9' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar dataKey="Commission" name="Commissions" stackId="a" fill="#8B5CF6" />
                    <Bar dataKey="Convenience" name="Convenience Fees" stackId="a" fill="#06B6D4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Method Split */}
            <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 md:col-span-3 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3 max-w-md">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Payment Gateway Preferences</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Percentage of transactions executed via online UPI/cards compared to Cash on Delivery. 
                  Increasing online payments reduces safety threshold block risks on vendors.
                </p>
              </div>
              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentSplitData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {paymentSplitData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {paymentSplitData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <span className="h-3 w-3 rounded" style={{ backgroundColor: COLORS[i] }} />
                    <span className="text-slate-350">{entry.name}:</span>
                    <span className="font-bold text-slate-200">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bookings */}
        {tab === 'bookings' && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Booking Funnel Progress */}
            <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 md:col-span-2 space-y-6">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Conversion Funnel Percentages</h3>
              
              <div className="space-y-5">
                {customerFunnel.map((step) => (
                  <div key={step.step} className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300">{step.step}</span>
                      <span className="text-slate-400">{step.count} ({step.percent}%)</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[#0f172a] overflow-hidden border border-slate-600">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 transition-all duration-300"
                        style={{ width: `${step.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick conversion analysis */}
            <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">Cohort Review Rates</h3>
              
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400">Created to Completed Rate</span>
                  <p className="text-2xl font-bold mt-1 text-slate-200">84.4%</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Feedback Submission Rate</span>
                  <p className="text-2xl font-bold mt-1 text-slate-200">69.6%</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Average Platform Rating</span>
                  <p className="text-2xl font-bold mt-1 text-violet-400">⭐ 4.85 / 5.0</p>
                </div>
              </div>
            </div>

            {/* Simulated Heatmap for Peak Hours */}
            <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 md:col-span-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-5">Peak Booking hours heatmap</h3>
              
              <div className="overflow-x-auto">
                <div className="min-w-[600px] grid grid-cols-5 gap-3 text-center">
                  <div />
                  {TIME_BLOCKS.map((t) => (
                    <span key={t} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t}</span>
                  ))}
                  
                  {DAYS_OF_WEEK.map((day, dIdx) => (
                    <React.Fragment key={day}>
                      <span className="text-xs font-semibold text-slate-300 flex items-center pr-2">{day}</span>
                      {TIME_BLOCKS.map((_, tIdx) => {
                        const count = mockHeatmapData[dIdx][tIdx];
                        // Interpolate opacity/bg based on count density (max is ~70)
                        const opacity = Math.min(0.15 + (count / 75), 0.9);
                        return (
                          <div
                            key={tIdx}
                            className="rounded-lg p-4 flex flex-col justify-center items-center border border-violet-500/10 transition-all hover:scale-[1.03]"
                            style={{ backgroundColor: `rgba(139, 92, 246, ${opacity})` }}
                          >
                            <span className="text-xs font-bold text-slate-100">{count}</span>
                            <span className="text-[8px] text-slate-300 mt-0.5">bookings</span>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Vendors */}
        {tab === 'vendors' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Vendor split */}
            <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Premium vs Normal Tiers</h3>
                <p className="text-xs text-slate-400">
                  Split between registered storefronts assigned to premium asset lists vs default packages.
                </p>
              </div>

              <div className="h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vendorTiersData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {vendorTiersData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index + 2 % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vendor activity state */}
            <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">Vendor Activity Rate</h3>
                <p className="text-xs text-slate-500">Active shops receiving at least 1 booking within the last 7 days.</p>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <h2 className="text-4xl font-extrabold text-slate-100">88.2%</h2>
                <span className="text-xs text-slate-400 font-semibold">(112 out of 127 shops active)</span>
              </div>

              <div className="w-full h-2 rounded-full bg-[#0f172a] overflow-hidden border border-slate-600 mt-4">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88.2%' }} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Users */}
        {tab === 'users' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Sample Registrations */}
            <div className="rounded-xl border border-slate-600 bg-slate-800 p-6">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">User Acquisition trend</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { date: 'May 1', Users: 120 },
                    { date: 'May 8', Users: 240 },
                    { date: 'May 15', Users: 480 },
                    { date: 'May 22', Users: 790 },
                    { date: 'May 29', Users: 1284 }
                  ]}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #334155', borderRadius: '8px' }}
                    />
                    <Area type="monotone" dataKey="Users" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gender preferences */}
            <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">User Gender Preference Sample</h3>
                <p className="text-xs text-slate-500">Aggregated preference filters toggled by active clients.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Unisex / Both</span>
                    <span className="font-semibold text-slate-350">64%</span>
                  </div>
                  <div className="w-full h-2 rounded bg-[#0f172a] border border-slate-600 overflow-hidden">
                    <div className="h-full bg-violet-600" style={{ width: '64%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Women Services Only</span>
                    <span className="font-semibold text-slate-350">28%</span>
                  </div>
                  <div className="w-full h-2 rounded bg-[#0f172a] border border-slate-600 overflow-hidden">
                    <div className="h-full bg-pink-500" style={{ width: '28%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Men Services Only</span>
                    <span className="font-semibold text-slate-350">8%</span>
                  </div>
                  <div className="w-full h-2 rounded bg-[#0f172a] border border-slate-600 overflow-hidden">
                    <div className="h-full bg-sky-500" style={{ width: '8%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
