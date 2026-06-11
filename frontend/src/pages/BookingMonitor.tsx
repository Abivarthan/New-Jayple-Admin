import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Search, Phone, Zap, CalendarClock } from 'lucide-react';
import { fetchBookingsMonitor, type AdminBooking } from '../services/adminDataService';

const statusColor = (st: string): string => {
  if (st === 'completed' || st === 'reviewed') return 'bg-emerald-500/10 text-emerald-400';
  if (st === 'confirmed' || st === 'accepted') return 'bg-sky-500/10 text-sky-400';
  if (st === 'in_progress') return 'bg-violet-500/10 text-violet-400';
  if (st === 'cancelled' || st === 'rejected' || st === 'failed') return 'bg-rose-500/10 text-rose-400';
  return 'bg-amber-500/10 text-amber-400';
};

export const BookingMonitor: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchBookingsMonitor(300)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const statuses = useMemo(() => Array.from(new Set(rows.map((r) => r.status))).sort(), [rows]);
  const filtered = rows.filter((r) => {
    const mq = !search ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      r.customerPhone.includes(search) || r.id.toLowerCase().includes(search.toLowerCase());
    return mq && (status === 'ALL' || r.status === status);
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Booking Monitor</h1>
          <p className="text-sm text-slate-400">Every booking with full payment breakdown — online, cash & wallet — status, and flags.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 bg-slate-800 p-4 rounded-xl border border-slate-600">
        <div className="relative sm:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Search size={16} /></span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, salon, phone, booking id…"
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500 cursor-pointer">
          <option value="ALL">All statuses</option>
          {statuses.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-600 bg-slate-800 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
              <th className="py-4 px-5">Customer</th>
              <th className="py-4 px-5">Vendor</th>
              <th className="py-4 px-5">Booking</th>
              <th className="py-4 px-5 text-right">Online</th>
              <th className="py-4 px-5 text-right">Cash</th>
              <th className="py-4 px-5 text-right">Wallet</th>
              <th className="py-4 px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-sm text-slate-300">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-[#0f172a]/10">
                <td className="py-3.5 px-5">
                  <span className="font-semibold text-slate-200 block">{r.customerName}</span>
                  {r.customerPhone && <a href={`tel:${r.customerPhone}`} className="text-[11px] text-violet-400 flex items-center gap-1"><Phone size={9} />{r.customerPhone}</a>}
                </td>
                <td className="py-3.5 px-5"><span className="text-slate-300">{r.vendorName}</span></td>
                <td className="py-3.5 px-5">
                  <span className="text-xs text-slate-400 block">{r.serviceNames}</span>
                  <span className="text-[10px] text-slate-500">{r.slotDate} {r.slotTime} · #{r.id.slice(-6).toUpperCase()}</span>
                  <div className="flex gap-1.5 mt-1">
                    {r.autoAccepted && <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded"><Zap size={8} />auto{r.adminReviewed ? '' : ' · review'}</span>}
                    {r.rescheduled && <span className="inline-flex items-center gap-0.5 text-[9px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded"><CalendarClock size={8} />resched</span>}
                  </div>
                </td>
                <td className="py-3.5 px-5 text-right text-slate-200">{r.onlineAmount ? `₹${r.onlineAmount}` : '—'}</td>
                <td className="py-3.5 px-5 text-right text-amber-400">{r.cashAmount ? `₹${r.cashAmount}` : '—'}</td>
                <td className="py-3.5 px-5 text-right text-emerald-400">{r.walletUsed ? `₹${r.walletUsed}` : '—'}</td>
                <td className="py-3.5 px-5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor(r.status)}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-slate-500">{loading ? 'Loading…' : 'No bookings.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">Showing the latest {rows.length} bookings.</p>
    </div>
  );
};
