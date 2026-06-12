import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Search, Phone, Zap, CalendarClock, Eye, X, User, Briefcase, CreditCard, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { fetchBookingsMonitor, type AdminBooking } from '../services/adminDataService';

const statusColor = (st: string): string => {
  if (st === 'completed' || st === 'reviewed') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  if (st === 'confirmed' || st === 'accepted') return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
  if (st === 'in_progress') return 'bg-violet-500/10 text-black font-semibold border border-black';
  if (st === 'cancelled' || st === 'rejected' || st === 'failed') return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
};

export const BookingMonitor: React.FC = () => {
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);

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
    <div className="space-y-6 pb-12 relative min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Booking Monitor</h1>
          <p className="text-sm text-gray-500">Every booking with full payment breakdown — online, cash & wallet — status, and flags.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-slate-700 hover:bg-slate-600 text-gray-900 px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative sm:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500"><Search size={16} /></span>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, salon, phone, booking id…"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-xs text-gray-900 placeholder-slate-500 outline-none focus:border-black transition-colors" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs text-gray-500 outline-none focus:border-black cursor-pointer transition-colors">
          <option value="ALL">All statuses</option>
          {statuses.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase bg-gray-50/20">
              <th className="py-4 px-5">Customer</th>
              <th className="py-4 px-5">Vendor</th>
              <th className="py-4 px-5">Booking</th>
              <th className="py-4 px-5 text-right">Online</th>
              <th className="py-4 px-5 text-right">Cash</th>
              <th className="py-4 px-5 text-right">Wallet</th>
              <th className="py-4 px-5">Status</th>
              <th className="py-4 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-sm text-gray-800">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/10 transition-colors cursor-pointer" onClick={() => setSelectedBooking(r)}>
                <td className="py-3.5 px-5">
                  <span className="font-semibold text-gray-900 block">{r.customerName}</span>
                  {r.customerPhone && <span className="text-[11px] text-black font-semibold flex items-center gap-1"><Phone size={9} />{r.customerPhone}</span>}
                </td>
                <td className="py-3.5 px-5"><span className="text-gray-800 font-medium">{r.vendorName}</span></td>
                <td className="py-3.5 px-5">
                  <span className="text-xs text-gray-500 block truncate max-w-[200px]">{r.serviceNames}</span>
                  <span className="text-[10px] text-gray-500">{r.slotDate} {r.slotTime} · #{r.id.slice(-6).toUpperCase()}</span>
                  <div className="flex gap-1.5 mt-1">
                    {r.autoAccepted && <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded"><Zap size={8} />auto{r.adminReviewed ? '' : ' · review'}</span>}
                    {r.rescheduled && <span className="inline-flex items-center gap-0.5 text-[9px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded"><CalendarClock size={8} />resched</span>}
                  </div>
                </td>
                <td className="py-3.5 px-5 text-right font-medium text-gray-900">{r.onlineAmount ? `₹${r.onlineAmount}` : '—'}</td>
                <td className="py-3.5 px-5 text-right font-medium text-amber-400">{r.cashAmount ? `₹${r.cashAmount}` : '—'}</td>
                <td className="py-3.5 px-5 text-right font-medium text-emerald-400">{r.walletUsed ? `₹${r.walletUsed}` : '—'}</td>
                <td className="py-3.5 px-5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${statusColor(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="py-3.5 px-5 text-right">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedBooking(r); }}
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors" 
                    title="View Booking Details"
                  >
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center text-gray-500">{loading ? 'Loading bookings…' : 'No bookings found.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500">Showing the latest {rows.length} bookings.</p>

      {/* Slide-out Booking Drawer */}
      {selectedBooking && (
        <>
          <div className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedBooking(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl overflow-y-auto transform transition-all duration-300 ease-out flex flex-col">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50/40 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
                <button onClick={() => setSelectedBooking(null)} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Booking #{selectedBooking.id.slice(-6).toUpperCase()}</h2>
                <p className="text-xs text-gray-500 mt-1">ID: {selectedBooking.id}</p>
                <p className="text-xs text-gray-500 mt-0.5">Created at: {selectedBooking.createdAt ? new Date(selectedBooking.createdAt).toLocaleString() : 'Unknown'}</p>
              </div>
            </div>

            {/* Drawer Body content */}
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              
              {/* Schedule Info */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                  <Clock size={12} /> Date & Time
                </h3>
                <div className="bg-gray-50/30 border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selectedBooking.slotDate}</p>
                    <p className="text-xs text-gray-500">{selectedBooking.slotTime}</p>
                  </div>
                  {selectedBooking.rescheduled && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">
                      <CalendarClock size={10} /> Rescheduled
                    </span>
                  )}
                </div>
              </section>

              {/* Service Info */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                  <Briefcase size={12} /> Services
                </h3>
                <div className="bg-gray-50/30 border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-900 font-medium leading-relaxed">{selectedBooking.serviceNames}</p>
                </div>
              </section>

              {/* Parties */}
              <section className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                    <User size={12} /> Customer
                  </h3>
                  <div className="bg-gray-50/30 border border-gray-200 rounded-xl p-4 h-full">
                    <p className="text-sm font-semibold text-gray-900">{selectedBooking.customerName}</p>
                    <a href={`tel:${selectedBooking.customerPhone}`} className="text-xs text-black font-semibold flex items-center gap-1 mt-1 hover:underline">
                      <Phone size={10} /> {selectedBooking.customerPhone || 'N/A'}
                    </a>
                  </div>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                    <Briefcase size={12} /> Vendor
                  </h3>
                  <div className="bg-gray-50/30 border border-gray-200 rounded-xl p-4 h-full">
                    <p className="text-sm font-semibold text-gray-900">{selectedBooking.vendorName}</p>
                    <a href={`tel:${selectedBooking.vendorPhone}`} className="text-xs text-black font-semibold flex items-center gap-1 mt-1 hover:underline">
                      <Phone size={10} /> {selectedBooking.vendorPhone || 'N/A'}
                    </a>
                  </div>
                </div>
              </section>

              {/* Payment Summary */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                  <CreditCard size={12} /> Payment Summary
                </h3>
                <div className="bg-gray-50/30 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Total Amount</span>
                    <span className="text-sm font-bold text-gray-900">₹{selectedBooking.totalAmount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Payment Method</span>
                    <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">{selectedBooking.paymentMethod}</span>
                  </div>
                  
                  <hr className="border-gray-200" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Online Paid</span>
                    <span className="text-xs font-medium text-gray-900">₹{selectedBooking.onlineAmount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Cash Collection (COD)</span>
                    <span className="text-xs font-medium text-amber-400">₹{selectedBooking.cashAmount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Wallet Used</span>
                    <span className="text-xs font-medium text-emerald-400">₹{selectedBooking.walletUsed}</span>
                  </div>
                </div>
              </section>

              {/* Flags & Admin */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                  <AlertTriangle size={12} /> Flags & Administration
                </h3>
                <div className="bg-gray-50/30 border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Auto Accepted</span>
                    {selectedBooking.autoAccepted ? <span className="text-amber-400 text-xs font-bold flex items-center gap-1"><Zap size={12} /> Yes</span> : <span className="text-gray-500 text-xs">No</span>}
                  </div>
                  {selectedBooking.autoAccepted && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Admin Reviewed</span>
                      {selectedBooking.adminReviewed ? <span className="text-emerald-400 text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> Yes</span> : <span className="text-rose-400 text-xs font-bold flex items-center gap-1"><AlertTriangle size={12} /> Pending</span>}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Call Status</span>
                    <span className="text-xs font-semibold text-gray-800 capitalize">{selectedBooking.callStatus}</span>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </>
      )}

    </div>
  );
};
