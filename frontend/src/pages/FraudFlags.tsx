import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldAlert, TrendingDown, Store } from 'lucide-react';
import { fetchFraudFlags, type FraudFlag } from '../services/adminDataService';

export const FraudFlags: React.FC = () => {
  const [rows, setRows] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchFraudFlags(4)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Fraud Flags</h1>
          <p className="text-sm text-slate-400">Vendors whose bookings this week are <b>more than 50%</b> last-minute cancellations
            (min 4 bookings). Investigate for potential fraudulent behavior.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-8 text-center text-emerald-300">
          {loading ? 'Analyzing this week’s bookings…' : '✅ No vendors flagged this week.'}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
            <ShieldAlert size={15} /> <b>{rows.length}</b> vendor{rows.length === 1 ? '' : 's'} flagged for review
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => (
              <div key={r.vendorId} className="rounded-xl border border-rose-500/30 bg-slate-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <Store size={15} className="text-rose-400" /> {r.vendorName}
                  </div>
                  <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                    <TrendingDown size={11} /> {Math.round(r.ratio * 100)}%
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  <b className="text-rose-300">{r.lastMinuteCancels}</b> last-minute cancellations of{' '}
                  <b className="text-slate-200">{r.totalBookings}</b> bookings this week
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, Math.round(r.ratio * 100))}%` }} />
                </div>
                <div className="text-[10px] text-slate-500 mt-2 select-all">UID: {r.vendorId}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
