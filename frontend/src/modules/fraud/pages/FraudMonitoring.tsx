import React from 'react';
import { Activity } from 'lucide-react';

const FraudMonitoring: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Fraud Monitoring</h1>
      <p className="text-sm text-gray-500 mt-1">Real-time fraud detection and alert management.</p>
    </div>
    <div className="p-8 bg-white rounded-2xl border border-gray-200 flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-rose-900/30 flex items-center justify-center">
        <Activity className="h-8 w-8 text-rose-400" />
      </div>
      <div className="text-center">
        <p className="text-gray-800 font-semibold">Fraud Monitoring Dashboard</p>
        <p className="text-gray-500 text-sm mt-2">Live monitoring of suspicious patterns and automated alerts. Coming soon.</p>
      </div>
    </div>
  </div>
);

export default FraudMonitoring;
