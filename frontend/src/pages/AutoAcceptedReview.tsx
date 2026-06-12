import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, Phone, Zap, Store, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchAutoAcceptedReview, confirmAutoAccepted, type AdminBooking } from '../services/adminDataService';

export const AutoAcceptedReview: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchAutoAcceptedReview()); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const confirmAction = async (id: string) => {
    setBusyId(id);
    try { await confirmAutoAccepted(id); toast.success('Confirmed.'); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusyId(null); }
  };

  const list = rows.filter((r) => showReviewed || !r.adminReviewed);
  const pending = rows.filter((r) => !r.adminReviewed).length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Auto-Accepted Bookings</h1>
          <p className="text-base text-gray-500 mt-1">Bookings auto-accepted because the vendor didn't respond in time. Review & confirm.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showReviewed} onChange={(e) => setShowReviewed(e.target.checked)} className="rounded border-gray-300 text-black focus:ring-black" /> Show reviewed
          </label>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-black px-4 py-2 font-medium disabled:opacity-50 transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-300 flex items-center gap-2">
        <Zap size={15} /> <b>{pending}</b> awaiting review
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {list.map((r) => (
          <div key={r.id} className={`rounded-2xl border bg-white p-5 shadow-sm transition-all ${r.adminReviewed ? 'border-gray-200 opacity-60' : 'border-orange-200 hover:shadow-md'}`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-500">#{r.id.slice(-6).toUpperCase()} · {r.slotDate} {r.slotTime}</span>
              {r.adminReviewed
                ? <span className="text-xs text-green-800 bg-green-100 border border-green-200 px-2.5 py-0.5 rounded-full font-semibold">Reviewed</span>
                : <span className="text-xs text-orange-800 bg-orange-100 border border-orange-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1"><Zap size={10} />Needs review</span>}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-1.5 text-gray-500 font-semibold mb-2"><User size={14} /> Customer</div>
                <div className="font-bold text-gray-900">{r.customerName}</div>
                {r.customerPhone && <a href={`tel:${r.customerPhone}`} className="text-gray-900 font-semibold flex items-center gap-1.5 mt-1 hover:underline"><Phone size={12} />{r.customerPhone}</a>}
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-1.5 text-gray-500 font-semibold mb-2"><Store size={14} /> Vendor</div>
                <div className="font-bold text-gray-900">{r.vendorName}</div>
                {r.vendorPhone && <a href={`tel:${r.vendorPhone}`} className="text-gray-900 font-semibold flex items-center gap-1.5 mt-1 hover:underline"><Phone size={12} />{r.vendorPhone}</a>}
              </div>
            </div>

            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500 flex flex-col">
                <span className="font-semibold text-gray-900">{r.serviceNames}</span>
                <span className="text-xs uppercase mt-0.5">{r.paymentMethod}</span>
              </div>
              <span className="text-lg font-bold text-gray-900">₹{r.totalAmount}</span>
            </div>

            {!r.adminReviewed && (
              <div className="pt-4 mt-4 border-t border-gray-100">
                <button onClick={() => confirmAction(r.id)} disabled={busyId === r.id}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-black hover:bg-gray-900 text-white font-medium py-3 disabled:opacity-50 transition-colors">
                  {busyId === r.id ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm Review
                </button>
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div className="md:col-span-2 py-10 text-center text-gray-500">{loading ? 'Loading…' : 'Nothing to review.'}</div>
        )}
      </div>
    </div>
  );
};
