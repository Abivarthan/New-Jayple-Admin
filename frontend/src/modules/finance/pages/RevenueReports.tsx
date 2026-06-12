import React from 'react';
import { TrendingUp } from 'lucide-react';

const RevenueReports: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Revenue Reports</h1>
      <p className="text-sm text-gray-500 mt-1">Weekly, monthly, and yearly revenue breakdowns.</p>
    </div>
    <div className="p-8 bg-white rounded-2xl border border-gray-200 flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-slate-700 flex items-center justify-center">
        <TrendingUp className="h-8 w-8 text-gray-500" />
      </div>
      <div className="text-center">
        <p className="text-gray-800 font-semibold">Revenue Reports</p>
        <p className="text-gray-500 text-sm mt-2">Detailed revenue analytics with charts, breakdowns by zone and category. Coming soon.</p>
      </div>
    </div>
  </div>
);

export default RevenueReports;
