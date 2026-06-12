import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Phone, Clock, AlertTriangle, Store, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchDelayedServices, adminCancelBooking, type AdminBooking } from '../services/adminDataService';
import { useConfirm } from '../shared/components/feedback/useConfirm';

export const DelayedServices: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { confirm, ConfirmComponent } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await fetchDelayedServices(15)); }
    finally { setLoading(false); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const cancel = async (r: AdminBooking) => {
    const isConfirmed = await confirm({
      title: 'Cancel Delayed Booking',
      message: `Cancel ${r.customerName}'s delayed booking? Customer gets 75% to wallet, vendor gets 5% compensation.`,
      isDestructive: true,
      confirmText: 'Yes, Cancel Booking'
    });
    if (!isConfirmed) return;

    setBusyId(r.id);
    try {
      const res = await adminCancelBooking(r.id, 'Delayed service — cancelled by admin');
      toast.success(`Cancelled. ₹${res.refundAmount ?? 0} refunded to wallet.`);
      await load();
    } catch (e) { 
      toast.error(e instanceof Error ? e.message : 'Cancel failed'); 
    } finally { 
      setBusyId(null); 
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Delayed Services</h1>
          <p className="text-base text-gray-500 mt-1">Confirmed bookings whose slot passed by 15+ minutes with no service-start OTP entered.
            Call the customer — only cancellation is allowed.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-black px-4 py-2 font-medium disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
        <AlertTriangle size={15} /> <b>{rows.length}</b> delayed service{rows.length === 1 ? '' : 's'} need attention
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
            
            {/* Top Row */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-500">#{r.id.slice(-6).toUpperCase()}</span>
              <span className="text-xs text-red-800 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Clock size={10} /> Slot {r.slotDate} {r.slotTime} · not started
              </span>
            </div>

            {/* Middle Row */}
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">{r.customerName}</span>
                {r.customerPhone && (
                  <a href={`tel:${r.customerPhone}`} className="inline-flex items-center gap-1.5 mt-1 text-sm text-gray-900 font-semibold hover:underline w-fit">
                    <Phone size={14} /> {r.customerPhone}
                  </a>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-500 flex flex-col">
                  <span className="font-semibold text-gray-900 truncate max-w-[200px]">{r.serviceNames}</span>
                  <span className="flex items-center gap-1.5 mt-0.5"><Store size={12} /> {r.vendorName}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-lg font-bold text-gray-900">₹{r.totalAmount}</span>
                  <span className="text-xs text-gray-500 uppercase">{r.paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="pt-2">
              <button onClick={() => cancel(r)} disabled={busyId === r.id}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium py-3 disabled:opacity-50 transition-colors">
                {busyId === r.id ? <RefreshCw size={16} className="animate-spin" /> : <XCircle size={16} />} 
                Cancel (75% refund · 5% comp)
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="md:col-span-2 py-10 text-center text-gray-500">{loading ? 'Loading…' : 'No delayed services right now. ✅'}</div>
        )}
      </div>
      <p className="text-[11px] text-gray-500 mt-4">Cancellation of a delayed service (75% / 5%) is performed from the admin cancellation
        action (Phase 3) or from the customer app — it follows the standard last-minute cancellation rule.</p>
        
      {ConfirmComponent}
    </div>
  );
};
