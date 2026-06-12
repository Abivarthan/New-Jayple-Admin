import React from 'react';
import { Flag } from 'lucide-react';

const FeatureFlags: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
      <p className="text-sm text-gray-500 mt-1">Toggle features on/off across the platform without deployments.</p>
    </div>
    <div className="p-8 bg-white rounded-2xl border border-gray-200 flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-slate-700 flex items-center justify-center">
        <Flag className="h-8 w-8 text-gray-500" />
      </div>
      <div className="text-center">
        <p className="text-gray-800 font-semibold">Feature Flag Manager</p>
        <p className="text-gray-500 text-sm mt-2">Safely roll out new features with toggle switches and gradual rollouts. Coming soon.</p>
      </div>
    </div>
  </div>
);

export default FeatureFlags;
