import React from 'react';
import { TrendingUp, Star, Calendar } from 'lucide-react';

const VendorPerformance: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Vendor Performance</h1>
      <p className="text-sm text-slate-400 mt-1">Rankings, ratings, and performance benchmarks across all vendors.</p>
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[
        { icon: TrendingUp, label: 'Top Earners', desc: 'Vendors by revenue this month' },
        { icon: Star, label: 'Highest Rated', desc: 'Vendors by average customer rating' },
        { icon: Calendar, label: 'Most Bookings', desc: 'Vendors by completed booking count' },
      ].map(({ icon: Icon, label, desc }) => (
        <div key={label} className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700 flex flex-col gap-3">
          <div className="h-10 w-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
            <Icon className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-200">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
          <p className="text-xs text-slate-600 italic">Coming soon</p>
        </div>
      ))}
    </div>
  </div>
);

export default VendorPerformance;
