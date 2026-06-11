import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Phone, Clock, PhoneCall, CheckCircle2, XCircle, CalendarClock, Store } from 'lucide-react';
import {
  fetchCallWorkflow, setBookingCallStatus, adminCancelBooking, adminRescheduleBooking, type AdminBooking,
} from '../services/adminDataService';

const callBadge = (st: string): [string, string] => {
  switch (st) {
    case 'reached_confirmed': return ['Confirmed on call', 'bg-emerald-500/10 text-emerald-400'];
    case 'no_answer': return ['No answer', 'bg-amber-500/10 text-amber-400'];
    case 'customer_cancel': return ['Wants cancel', 'bg-rose-500/10 text-rose-400'];
    case 'customer_reschedule': return ['Wants reschedule', 'bg-sky-500/10 text-sky-400'];
    default: return ['Not called', 'bg-slate-600/30 text-slate-400'];
  }
};

export const CallWorkflow: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchCallWorkflow()); }
    catch (e) { flash(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const run = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusyId(id);
    try { await fn(); flash(ok); await load(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusyId(null); }
  };

  const mark = (r: AdminBooking, status: string) =>
    run(r.id, () => setBookingCallStatus(r.id, status, r.oneHourAlert ? 'one_hour_before' : 'post_confirmation'), 'Saved.');
  const cancel = (r: AdminBooking) => {
    if (!window.confirm(`Cancel ${r.customerName}'s booking? Refund follows the standard tier (≥1hr 100% / <1hr 75% + 5% comp).`)) return;
    run(r.id, async () => { await adminCancelBooking(r.id, 'Cancelled by admin (call workflow)'); await setBookingCallStatus(r.id, 'customer_cancel'); }, 'Cancelled.');
  };
  const reschedule = (r: AdminBooking) => {
    const date = window.prompt('New date (YYYY-MM-DD):', r.slotDate); if (!date) return;
    const time = window.prompt('New time (HH:MM):', r.slotTime); if (!time) return;
    run(r.id, async () => { await adminRescheduleBooking(r.id, date.trim(), time.trim()); await setBookingCallStatus(r.id, 'customer_reschedule'); }, 'Rescheduled.');
  };

  const alerts = rows.filter((r) => r.oneHourAlert).length;

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm shadow-xl">
          <span>{toast}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Call Workflow</h1>
          <p className="text-sm text-slate-400">Confirmed bookings to call — confirm with the customer, and on the 1-hour-before alert
            confirm / cancel / reschedule as they ask.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
        <Clock size={15} /> <b>{alerts}</b> booking{alerts === 1 ? '' : 's'} within the 1-hour pre-slot window
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => {
          const [label, cls] = callBadge(r.callStatus);
          return (
            <div key={r.id} className={`rounded-xl border p-5 bg-slate-800 ${r.oneHourAlert ? 'border-amber-500/40' : 'border-slate-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500">#{r.id.slice(-6).toUpperCase()} · {r.slotDate} {r.slotTime}</span>
                <div className="flex items-center gap-2">
                  {r.oneHourAlert && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Clock size={9} />1 hr</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cls}`}>{label}</span>
                </div>
              </div>
              <div className="font-semibold text-slate-200">{r.customerName}</div>
              {r.customerPhone && (
                <a href={`tel:${r.customerPhone}`} className="inline-flex items-center gap-1.5 mt-1 text-sm text-violet-400 font-semibold">
                  <Phone size={13} /> Call {r.customerPhone}
                </a>
              )}
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Store size={11} />{r.vendorName} · {r.serviceNames} · ₹{r.totalAmount}</div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={() => mark(r, 'reached_confirmed')} disabled={busyId === r.id}
                  className="flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2 disabled:opacity-50">
                  <CheckCircle2 size={12} /> Confirmed
                </button>
                <button onClick={() => mark(r, 'no_answer')} disabled={busyId === r.id}
                  className="flex items-center justify-center gap-1 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-2 disabled:opacity-50">
                  <PhoneCall size={12} /> No answer
                </button>
                <button onClick={() => reschedule(r)} disabled={busyId === r.id}
                  className="flex items-center justify-center gap-1 rounded-lg border border-sky-600/40 bg-sky-600/10 hover:bg-sky-600/20 text-sky-300 text-xs font-semibold py-2 disabled:opacity-50">
                  <CalendarClock size={12} /> Reschedule
                </button>
                <button onClick={() => cancel(r)} disabled={busyId === r.id}
                  className="flex items-center justify-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2 disabled:opacity-50">
                  <XCircle size={12} /> Cancel
                </button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="md:col-span-2 py-10 text-center text-slate-500">{loading ? 'Loading…' : 'No confirmed bookings to call.'}</div>
        )}
      </div>
    </div>
  );
};
