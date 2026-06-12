import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Phone, Clock, PhoneCall, CheckCircle2, XCircle, CalendarClock, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchCallWorkflow, setBookingCallStatus, adminCancelBooking, adminRescheduleBooking, type AdminBooking } from '../services/adminDataService';
import { StatusBadge } from '../shared/components/feedback/StatusBadge';
import { RescheduleDrawer } from '../modules/bookings/components/RescheduleDrawer';
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal';

export const CallWorkflow: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [rescheduleBooking, setRescheduleBooking] = useState<AdminBooking | null>(null);
  
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: false,
    onConfirm: () => {},
  });

  const load = useCallback(async () => {
    setLoading(true);
    try { 
      setRows(await fetchCallWorkflow()); 
    } catch (e) { 
      toast.error(e instanceof Error ? e.message : 'Failed to load bookings'); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const run = async (id: string, fn: () => Promise<unknown>, okMsg: string) => {
    setBusyId(id);
    try { 
      await fn(); 
      toast.success(okMsg); 
      await load(); 
    } catch (e) { 
      toast.error(e instanceof Error ? e.message : 'Action failed'); 
    } finally { 
      setBusyId(null); 
    }
  };

  const mark = (r: AdminBooking, status: string) =>
    run(r.id, () => setBookingCallStatus(r.id, status, r.oneHourAlert ? 'one_hour_before' : 'post_confirmation'), 'Booking status updated.');

  const cancel = (r: AdminBooking) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Cancel Booking',
      message: `Cancel ${r.customerName}'s booking? Refund follows the standard tier (≥1hr 100% / <1hr 75% + 5% comp).`,
      isDestructive: true,
      onConfirm: () => {
        run(r.id, async () => { 
          await adminCancelBooking(r.id, 'Cancelled by admin (call workflow)'); 
          await setBookingCallStatus(r.id, 'customer_cancel'); 
        }, 'Booking cancelled successfully.');
      }
    });
  };

  const handleRescheduleConfirm = async (date: string, time: string, note?: string) => {
    if (!rescheduleBooking) return;
    const r = rescheduleBooking;
    await run(r.id, async () => { 
      await adminRescheduleBooking(r.id, date.trim(), time.trim()); 
      await setBookingCallStatus(r.id, 'customer_reschedule'); 
    }, 'Booking rescheduled successfully.');
  };

  const alerts = rows.filter((r) => r.oneHourAlert).length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Call Workflow</h1>
          <p className="text-base text-gray-500 mt-1">
            Confirmed bookings to call — confirm with the customer, and manage their requests.
          </p>
        </div>
        <button 
          onClick={load} 
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-black px-4 py-2 font-medium disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800 flex items-center gap-2 font-medium">
        <Clock size={16} /> <b>{alerts}</b> booking{alerts === 1 ? '' : 's'} within the 1-hour pre-slot window
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {rows.map((r) => {
          return (
            <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              
              {/* Top Row: ID, Badges */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">#{r.id.slice(-6).toUpperCase()}</span>
                <div className="flex items-center gap-2">
                  {r.oneHourAlert && (
                    <span className="text-xs text-orange-800 bg-orange-100 border border-orange-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <Clock size={10} /> 1 hr
                    </span>
                  )}
                  <StatusBadge status={r.callStatus} />
                </div>
              </div>

              {/* Middle Row: Customer details */}
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
                  <span className="text-lg font-bold text-gray-900">₹{r.totalAmount}</span>
                </div>
              </div>

              {/* Bottom Row: Actions */}
              <div className="grid grid-cols-4 gap-2 pt-2">
                <button 
                  onClick={() => mark(r, 'reached_confirmed')} 
                  disabled={busyId === r.id}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-black text-white hover:bg-gray-900 py-3 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Confirm</span>
                </button>
                <button 
                  onClick={() => mark(r, 'no_answer')} 
                  disabled={busyId === r.id}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 py-3 disabled:opacity-50 transition-colors"
                >
                  <PhoneCall size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">No Answer</span>
                </button>
                <button 
                  onClick={() => setRescheduleBooking(r)} 
                  disabled={busyId === r.id}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 py-3 disabled:opacity-50 transition-colors"
                >
                  <CalendarClock size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Reschedule</span>
                </button>
                <button 
                  onClick={() => cancel(r)} 
                  disabled={busyId === r.id}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 py-3 disabled:opacity-50 transition-colors"
                >
                  <XCircle size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Cancel</span>
                </button>
              </div>

            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="md:col-span-2 lg:col-span-2 py-16 text-center text-gray-500 bg-white rounded-2xl border border-gray-200">
            {loading ? 'Loading...' : 'No confirmed bookings to call.'}
          </div>
        )}
      </div>

      <RescheduleDrawer 
        isOpen={!!rescheduleBooking} 
        booking={rescheduleBooking} 
        onClose={() => setRescheduleBooking(null)} 
        onConfirm={handleRescheduleConfirm} 
      />

      <ConfirmModal 
        {...confirmConfig} 
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
      />

    </div>
  );
};
