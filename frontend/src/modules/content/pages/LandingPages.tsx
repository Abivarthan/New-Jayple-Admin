import React from 'react';
import { LayoutTemplate } from 'lucide-react';

const LandingPages: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Landing Pages</h1>
      <p className="text-sm text-slate-400 mt-1">Design and manage custom landing pages for campaigns and promotions.</p>
    </div>
    <div className="p-8 bg-slate-800/60 rounded-2xl border border-slate-700 flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-slate-700 flex items-center justify-center">
        <LayoutTemplate className="h-8 w-8 text-slate-400" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-semibold">Landing Page Builder</p>
        <p className="text-slate-500 text-sm mt-2">Visual landing page editor with template support. Coming soon.</p>
      </div>
    </div>
  </div>
);

export default LandingPages;
