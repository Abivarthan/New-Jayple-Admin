import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, CheckCircle2, AlertTriangle, Phone, IndianRupee, Wallet, CreditCard, Search,
} from 'lucide-react';
import { fetchRefundCases, markRefundProcessed, type RefundCase } from '../services/adminDataService';

export const RefundCases: React.FC = () => {
  const [rows, setRows] = useState<RefundCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending_admin' | 'refunded'>('pending_admin');
  const [confirming, setConfirming] = useState<RefundCase | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchRefundCases()); }
    catch (e) { flash(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doRefund = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      const r = await markRefundProcessed(confirming.id);
      flash(r.walletCredited ? `Refunded. ₹${r.walletCredited} wallet portion credited.` : 'Marked as refunded.');
      setConfirming(null);
      await load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Failed to process'); }
    finally { setBusy(false); }
  };

  const filtered = rows.filter((r) => {
    const mq = !search ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      r.customerPhone.includes(search) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const ms = statusFilter === 'ALL' || r.refundStatus === statusFilter;
    return mq && ms;
  });

  const pendingCount = rows.filter((r) => r.refundStatus === 'pending_admin').length;
  const pendingTotal = rows.filter((r) => r.refundStatus === 'pending_admin')
    .reduce((sum, r) => sum + r.refundAmount, 0);

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm shadow-xl">
          <CheckCircle2 size={16} /><span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Refund Cases</h1>
          <p className="text-sm text-slate-400">Vendor-rejected bookings awaiting a manual refund. Pay the customer's online/card
            portion, then mark it refunded — the wallet portion is credited automatically.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Pending Refunds</span>
            <div className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 p-1.5"><AlertTriangle size={14} /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100 mt-2">{pendingCount}</h3>
        </div>
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Amount Owed to Customers</span>
            <div className="rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 p-1.5"><IndianRupee size={14} /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100 mt-2">₹{pendingTotal.toLocaleString()}</h3>
        </div>
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-semibold">Processed</span>
            <div className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-1.5"><CheckCircle2 size={14} /></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100 mt-2">{rows.length - pendingCount}</h3>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-3 bg-slate-800 p-4 rounded-xl border border-slate-600">
        <div className="relative sm:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500"><Search size={16} /></span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, salon, phone, booking id…"
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500 cursor-pointer">
          <option value="pending_admin">Pending refund</option>
          <option value="refunded">Refunded</option>
          <option value="ALL">All</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-600 bg-slate-800 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
              <th className="py-4 px-6">Customer</th>
              <th className="py-4 px-6">Salon (rejected)</th>
              <th className="py-4 px-6">Booking</th>
              <th className="py-4 px-6 text-right">Refund split</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-sm text-slate-300">
            {filtered.map((r) => (
              <tr key={r.id} className={`hover:bg-[#0f172a]/10 ${r.refundStatus === 'pending_admin' ? 'bg-amber-500/[0.03]' : ''}`}>
                <td className="py-4 px-6">
                  <span className="font-semibold text-slate-200 block">{r.customerName}</span>
                  {r.customerPhone && (
                    <a href={`tel:${r.customerPhone}`} className="text-[11px] text-violet-400 flex items-center gap-1 mt-0.5">
                      <Phone size={10} /> {r.customerPhone}
                    </a>
                  )}
                </td>
                <td className="py-4 px-6">
                  <span className="font-medium text-slate-300 block">{r.vendorName}</span>
                  <span className="text-[10px] text-rose-400">Rejected by vendor</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-xs text-slate-400 block">{r.serviceNames}</span>
                  <span className="text-[10px] text-slate-500">{r.slotDate} {r.slotTime} · #{r.id.slice(-6).toUpperCase()}</span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="text-xs font-bold text-slate-100">₹{r.refundAmount.toLocaleString()}</div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-end gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5"><CreditCard size={9} /> ₹{r.refundOnlineAmount}</span>
                    <span className="flex items-center gap-0.5"><Wallet size={9} /> ₹{r.refundWalletAmount}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    r.refundStatus === 'refunded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${r.refundStatus === 'refunded' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {r.refundStatus === 'refunded' ? 'Refunded' : 'Pending'}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  {r.refundStatus === 'pending_admin' ? (
                    <button onClick={() => setConfirming(r)}
                      className="rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3.5">
                      Mark Refunded
                    </button>
                  ) : <span className="text-[11px] text-slate-500">—</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-500">
                {loading ? 'Loading…' : 'No refund cases.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2.5"><CheckCircle2 size={18} /></div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Mark refund processed?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Confirm you have paid the online/card portion to the customer.</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-[#0f172a]/40 p-4 text-xs text-slate-300 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-400">Customer</span><span className="font-semibold">{confirming.customerName} · {confirming.customerPhone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-1"><CreditCard size={11} /> Pay manually (online/card)</span><span className="font-bold text-slate-100">₹{confirming.refundOnlineAmount}</span></div>
              <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-1"><Wallet size={11} /> Auto-credited to wallet</span><span className="font-bold text-emerald-400">₹{confirming.refundWalletAmount}</span></div>
              <div className="flex justify-between border-t border-slate-700 pt-1.5 mt-1"><span className="font-semibold text-slate-300">Total refund</span><span className="font-extrabold text-slate-100">₹{confirming.refundAmount}</span></div>
            </div>
            <p className="text-[11px] text-amber-400/90 flex items-start gap-1.5">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              This credits the wallet portion now and marks the case refunded. Make sure the card refund is actually done.
            </p>
            <div className="flex items-center justify-end gap-3 border-t border-slate-600 pt-4">
              <button onClick={() => setConfirming(null)} disabled={busy}
                className="rounded-lg border border-slate-700 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 text-xs font-semibold py-2 px-4 disabled:opacity-40">Cancel</button>
              <button onClick={doRefund} disabled={busy}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white py-2 px-4 disabled:opacity-50">
                {busy ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Confirm Refunded
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
