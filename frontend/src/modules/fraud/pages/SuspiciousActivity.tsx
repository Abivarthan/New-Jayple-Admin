import React from 'react';
import { Eye } from 'lucide-react';

const SuspiciousActivity: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Suspicious Activity</h1>
      <p className="text-sm text-gray-500 mt-1">Investigate and resolve flagged accounts and transactions.</p>
    </div>
    <div className="p-8 bg-white rounded-2xl border border-gray-200 flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-amber-900/30 flex items-center justify-center">
        <Eye className="h-8 w-8 text-amber-400" />
      </div>
      <div className="text-center">
        <p className="text-gray-800 font-semibold">Suspicious Activity Log</p>
        <p className="text-gray-500 text-sm mt-2">Accounts flagged for unusual behavior, fake reviews, and manipulation. Coming soon.</p>
      </div>
    </div>
  </div>
);

export default SuspiciousActivity;
