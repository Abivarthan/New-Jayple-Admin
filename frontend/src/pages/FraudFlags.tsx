import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, ShieldAlert, AlertTriangle, UserCheck, Eye, Store } from 'lucide-react';
import { fetchFraudFlags, type FraudFlag } from '../modules/fraud/services/fraudService';
import { InvestigationDrawer } from '../modules/fraud/components/InvestigationDrawer';

export const FraudFlags: React.FC = () => {
  const [selectedVendor, setSelectedVendor] = useState<FraudFlag | null>(null);

  const { data: rows = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['fraudFlags'],
    queryFn: fetchFraudFlags
  });

  const highRiskCount = rows.filter(r => r.riskLevel === 'High Risk').length;
  const mediumRiskCount = rows.filter(r => r.riskLevel === 'Medium Risk').length;
  const underReviewCount = rows.filter(r => r.status === 'Under Review').length;

  return (
    <div className="space-y-6 pb-12 relative min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Fraud Management Dashboard</h1>
          <p className="text-sm text-gray-500">
            Real-time operational detection of suspicious vendor cancellation behaviors.
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isRefetching}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 text-sm font-bold disabled:opacity-50 transition-colors">
          <RefreshCw size={15} className={isRefetching ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Vendors Flagged</span>
            <div className="bg-rose-100 text-rose-600 p-2 rounded-lg"><ShieldAlert size={18} /></div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">{rows.length}</h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">High Risk</span>
            <div className="bg-red-100 text-red-600 p-2 rounded-lg"><AlertTriangle size={18} /></div>
          </div>
          <h3 className="text-3xl font-bold text-red-600">{highRiskCount}</h3>
          <p className="text-xs text-gray-400 mt-1">&gt;75% Cancellation Rate</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Medium Risk</span>
            <div className="bg-orange-100 text-orange-600 p-2 rounded-lg"><AlertTriangle size={18} /></div>
          </div>
          <h3 className="text-3xl font-bold text-orange-600">{mediumRiskCount}</h3>
          <p className="text-xs text-gray-400 mt-1">50%-75% Cancellation Rate</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Under Investigation</span>
            <div className="bg-blue-100 text-blue-600 p-2 rounded-lg"><UserCheck size={18} /></div>
          </div>
          <h3 className="text-3xl font-bold text-blue-600">{underReviewCount}</h3>
          <p className="text-xs text-gray-400 mt-1">Manual review pending</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <UserCheck size={32} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-emerald-800 mb-2">✅ No suspicious vendors detected.</h3>
          <p className="text-sm text-emerald-600/80 max-w-md mx-auto">
            All vendors are operating within acceptable cancellation thresholds. The automated detection job continues to monitor real-time booking behavior.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Vendor Details</th>
                <th className="py-4 px-6">Location / Type</th>
                <th className="py-4 px-6 text-center">Total</th>
                <th className="py-4 px-6 text-center">Cancelled</th>
                <th className="py-4 px-6 text-center">Rate</th>
                <th className="py-4 px-6">Risk Level</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {rows.map((row) => (
                <tr key={row.vendorId} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500">
                        <Store size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{row.vendorName}</div>
                        <div className="text-[10px] text-gray-500 font-medium">UID: {row.vendorId.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900">Chennai</div>
                    <div className="text-[10px] text-gray-500">Salon</div>
                  </td>
                  <td className="py-4 px-6 text-center font-bold text-gray-900">{row.totalBookings}</td>
                  <td className="py-4 px-6 text-center font-bold text-rose-600">{row.cancelledBookings}</td>
                  <td className="py-4 px-6 text-center">
                    <span className="font-bold text-gray-900">{Math.round(row.cancellationRate)}%</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      row.riskLevel === 'High Risk' ? 'bg-red-100 text-red-800 border border-red-200' :
                      row.riskLevel === 'Medium Risk' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                      'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}>
                      {row.riskLevel}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      row.status === 'Flagged' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                      row.status === 'Under Review' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => setSelectedVendor(row)}
                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 text-xs font-bold transition-colors"
                    >
                      <Eye size={14} /> Investigate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Investigation Drawer */}
      <InvestigationDrawer 
        vendor={selectedVendor} 
        onClose={() => setSelectedVendor(null)} 
      />
    </div>
  );
};
