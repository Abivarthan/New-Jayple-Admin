import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Phone, Clock, AlertTriangle, Store, XCircle } from 'lucide-react';
import { fetchDelayedServices, adminCancelBooking, type AdminBooking } from '../services/adminDataService';

export const DelayedServices: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchDelayedServices(15)); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const cancel = async (r: AdminBooking) => {
    if (!window.confirm(`Cancel ${r.customerName}'s delayed booking? Customer gets 75% to wallet, vendor gets 5% compensation.`)) return;
    setBusyId(r.id);
    try {
      const res = await adminCancelBooking(r.id, 'Delayed service — cancelled by admin');
      flash(`Cancelled. ₹${res.refundAmount ?? 0} refunded to wallet.`);
      await load();
    } catch (e) { flash(e instanceof Error ? e.message : 'Cancel failed'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm shadow-xl">
          <span>{toast}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Delayed Services</h1>
          <p className="text-sm text-slate-400">Confirmed bookings whose slot passed by 15+ minutes with no service-start OTP entered.
            Call the customer — only cancellation is allowed (75% refund + 5% vendor compensation).</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
        <AlertTriangle size={15} /> <b>{rows.length}</b> delayed service{rows.length === 1 ? '' : 's'} need attention
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border border-rose-500/30 bg-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500">#{r.id.slice(-6).toUpperCase()}</span>
              <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Clock size={10} /> Slot {r.slotDate} {r.slotTime} · not started
              </span>
            </div>
            <div className="font-semibold text-slate-200">{r.customerName}</div>
            {r.customerPhone && (
              <a href={`tel:${r.customerPhone}`} className="inline-flex items-center gap-1.5 mt-1 text-sm text-violet-400 font-semibold">
                <Phone size={13} /> Call {r.customerPhone}
              </a>
            )}
            <div className="text-xs text-slate-400 mt-2 flex items-center gap-1.5"><Store size={11} /> {r.vendorName}</div>
            <div className="text-xs text-slate-500 mt-1">{r.serviceNames} · ₹{r.totalAmount} · {r.paymentMethod}</div>
            <button onClick={() => cancel(r)} disabled={busyId === r.id}
              className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold py-2 disabled:opacity-50">
              {busyId === r.id ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />} Cancel (75% refund · 5% comp)
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="md:col-span-2 py-10 text-center text-slate-500">{loading ? 'Loading…' : 'No delayed services right now. ✅'}</div>
        )}
      </div>
      <p className="text-[11px] text-slate-500">Cancellation of a delayed service (75% / 5%) is performed from the admin cancellation
        action (Phase 3) or from the customer app — it follows the standard last-minute cancellation rule.</p>
    </div>
  );
};
