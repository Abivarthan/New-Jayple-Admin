import React from 'react';
import { Ticket } from 'lucide-react';

const Coupons: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Coupons</h1>
      <p className="text-sm text-slate-400 mt-1">Create, manage and track discount coupon codes.</p>
    </div>
    <div className="p-8 bg-slate-800/60 rounded-2xl border border-slate-700 flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-slate-700 flex items-center justify-center">
        <Ticket className="h-8 w-8 text-slate-400" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-semibold">Coupon Manager</p>
        <p className="text-slate-500 text-sm mt-2">Generate, track, and expire discount codes. Coming soon.</p>
      </div>
    </div>
  </div>
);

export default Coupons;
