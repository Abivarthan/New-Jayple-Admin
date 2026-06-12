import React from 'react';
import { Megaphone } from 'lucide-react';

const Campaigns: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
      <p className="text-sm text-gray-500 mt-1">Run time-bound marketing campaigns with targeting and analytics.</p>
    </div>
    <div className="p-8 bg-white rounded-2xl border border-gray-200 flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-slate-700 flex items-center justify-center">
        <Megaphone className="h-8 w-8 text-gray-500" />
      </div>
      <div className="text-center">
        <p className="text-gray-800 font-semibold">Campaign Manager</p>
        <p className="text-gray-500 text-sm mt-2">Targeted push campaigns, email blasts, and in-app banners. Coming soon.</p>
      </div>
    </div>
  </div>
);

export default Campaigns;
