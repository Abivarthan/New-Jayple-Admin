import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Phone, Zap, Store, User } from 'lucide-react';
import { fetchAutoAcceptedReview, confirmAutoAccepted, type AdminBooking } from '../services/adminDataService';

export const AutoAcceptedReview: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchAutoAcceptedReview()); }
    catch (e) { flash(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const confirm = async (id: string) => {
    setBusyId(id);
    try { await confirmAutoAccepted(id); flash('Confirmed.'); await load(); }
    catch (e) { flash(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusyId(null); }
  };

  const list = rows.filter((r) => showReviewed || !r.adminReviewed);
  const pending = rows.filter((r) => !r.adminReviewed).length;

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm shadow-xl">
          <CheckCircle2 size={16} /><span>{toast}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Auto-Accepted Bookings</h1>
          <p className="text-sm text-slate-400">Bookings auto-accepted because the vendor didn't respond in time. Review &amp; confirm —
            this is oversight only; it doesn't change money or state.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={showReviewed} onChange={(e) => setShowReviewed(e.target.checked)} /> Show reviewed
          </label>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
        <Zap size={15} /> <b>{pending}</b> awaiting review
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((r) => (
          <div key={r.id} className={`rounded-xl border p-5 bg-slate-800 ${r.adminReviewed ? 'border-slate-700 opacity-70' : 'border-amber-500/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500">#{r.id.slice(-6).toUpperCase()} · {r.slotDate} {r.slotTime}</span>
              {r.adminReviewed
                ? <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-semibold">Reviewed</span>
                : <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-semibold">Needs review</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-700 bg-[#0f172a]/40 p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1"><User size={11} /> Customer</div>
                <div className="font-semibold text-slate-200">{r.customerName}</div>
                {r.customerPhone && <a href={`tel:${r.customerPhone}`} className="text-violet-400 flex items-center gap-1 mt-0.5"><Phone size={10} />{r.customerPhone}</a>}
              </div>
              <div className="rounded-lg border border-slate-700 bg-[#0f172a]/40 p-3">
                <div className="flex items-center gap-1.5 text-slate-500 mb-1"><Store size={11} /> Vendor</div>
                <div className="font-semibold text-slate-200">{r.vendorName}</div>
                {r.vendorPhone && <a href={`tel:${r.vendorPhone}`} className="text-violet-400 flex items-center gap-1 mt-0.5"><Phone size={10} />{r.vendorPhone}</a>}
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-3">{r.serviceNames} · ₹{r.totalAmount} · {r.paymentMethod}</div>
            {!r.adminReviewed && (
              <button onClick={() => confirm(r.id)} disabled={busyId === r.id}
                className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold py-2 disabled:opacity-50">
                {busyId === r.id ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Confirm
              </button>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div className="md:col-span-2 py-10 text-center text-slate-500">{loading ? 'Loading…' : 'Nothing to review.'}</div>
        )}
      </div>
    </div>
  );
};
