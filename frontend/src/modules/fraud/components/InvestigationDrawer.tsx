import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, User, Phone, MapPin, Store, AlertTriangle, ShieldAlert, PhoneCall, CheckCircle, RefreshCcw, Hand } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchVendorCancelledBookings, saveFraudInvestigation, updateFraudFlagStatus, type FraudFlag, type RecentBooking } from '../services/fraudService';

interface Props {
  vendor: FraudFlag | null;
  onClose: () => void;
}

export const InvestigationDrawer: React.FC<Props> = ({ vendor, onClose }) => {
  const qc = useQueryClient();
  const [showCallForm, setShowCallForm] = useState(false);
  const [notes, setNotes] = useState('');

  // Fetch recent cancelled bookings
  const { data: cancelledBookings = [], isLoading } = useQuery({
    queryKey: ['vendorCancelledBookings', vendor?.vendorId],
    queryFn: () => fetchVendorCancelledBookings(vendor!.vendorId),
    enabled: !!vendor,
  });

  const saveInvestigationMut = useMutation({
    mutationFn: (actionTaken: string) => saveFraudInvestigation({
      vendorId: vendor!.vendorId,
      vendorName: vendor!.vendorName,
      investigatedBy: 'AdminUser', // In reality, get from AuthContext
      notes,
      actionTaken,
      status: 'Closed'
    }),
    onSuccess: () => {
      toast.success('Investigation notes saved.');
      setNotes('');
      setShowCallForm(false);
    }
  });

  const updateStatusMut = useMutation({
    mutationFn: ({ status, riskLevel }: { status: string; riskLevel?: string }) => updateFraudFlagStatus(vendor!.vendorId, status, riskLevel),
    onSuccess: () => {
      toast.success('Vendor status updated.');
      qc.invalidateQueries({ queryKey: ['fraudFlags'] });
      onClose();
    }
  });

  if (!vendor) return null;

  // Mocked details since we don't have a full vendor fetch here yet, normally we'd fetch full vendor profile
  const vendorDetails = {
    ownerName: 'Owner of ' + vendor.vendorName,
    phone: '+91 9876543210',
    email: 'contact@' + vendor.vendorName.replace(/\s/g, '').toLowerCase() + '.com',
    address: '123 Main Street',
    city: 'Chennai',
    completedBookings: vendor.totalBookings - vendor.cancelledBookings,
    pendingBookings: 0,
    revenueGenerated: (vendor.totalBookings - vendor.cancelledBookings) * 500 // Mock revenue
  };

  const cancelByVendor = cancelledBookings.filter(b => b.cancelledBy?.toLowerCase().includes('vendor')).length;
  const cancelByCustomer = cancelledBookings.filter(b => b.cancelledBy?.toLowerCase().includes('customer')).length;
  const cancelByAdmin = cancelledBookings.length - cancelByVendor - cancelByCustomer;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-gray-200 shadow-2xl flex flex-col overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-rose-100 border border-rose-200 p-3 text-rose-600">
              <ShieldAlert size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{vendor.vendorName}</h2>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                  vendor.riskLevel === 'High Risk' ? 'bg-red-100 text-red-800' : 
                  vendor.riskLevel === 'Medium Risk' ? 'bg-orange-100 text-orange-800' : 
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {vendor.riskLevel}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-500 mt-1">UID: {vendor.vendorId} · Flagged: {vendor.flaggedAt}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-8 bg-gray-50/50">
          
          {/* Vendor Information */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <Store size={14} /> Vendor Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="text-xs uppercase font-bold text-gray-500 block mb-1">Owner Name</span>
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-2"><User size={14} className="text-gray-400"/> {vendorDetails.ownerName}</span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="text-xs uppercase font-bold text-gray-500 block mb-1">Phone Number</span>
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Phone size={14} className="text-gray-400"/> {vendorDetails.phone}</span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:col-span-2">
                <span className="text-xs uppercase font-bold text-gray-500 block mb-1">Business Address</span>
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-2"><MapPin size={14} className="text-gray-400"/> {vendorDetails.address}, {vendorDetails.city}</span>
              </div>
            </div>
          </section>

          {/* Booking Statistics */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <AlertTriangle size={14} /> 7-Day Booking Statistics
            </h3>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-xs font-bold text-gray-500 block mb-1">Total Bookings</span>
                <span className="text-xl font-bold text-gray-900">{vendor.totalBookings}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 block mb-1">Cancelled</span>
                <span className="text-xl font-bold text-rose-600">{vendor.cancelledBookings}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 block mb-1">Completed</span>
                <span className="text-xl font-bold text-emerald-600">{vendorDetails.completedBookings}</span>
              </div>
              <div>
                <span className="text-xs font-bold text-gray-500 block mb-1">Cancel Rate</span>
                <span className="text-xl font-bold text-gray-900">{Math.round(vendor.cancellationRate)}%</span>
              </div>
            </div>
          </section>

          {/* Cancellation Breakdown */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
              <RefreshCcw size={14} /> Cancellation Breakdown
            </h3>
            <div className="flex rounded-xl overflow-hidden h-6 bg-gray-200">
              {cancelledBookings.length > 0 ? (
                <>
                  <div style={{ width: `${(cancelByVendor/cancelledBookings.length)*100}%` }} className="bg-rose-500 h-full" title="Vendor" />
                  <div style={{ width: `${(cancelByCustomer/cancelledBookings.length)*100}%` }} className="bg-orange-400 h-full" title="Customer" />
                  <div style={{ width: `${(cancelByAdmin/cancelledBookings.length)*100}%` }} className="bg-slate-500 h-full" title="Admin" />
                </>
              ) : (
                <div className="w-full h-full bg-rose-500" />
              )}
            </div>
            <div className="flex gap-6 mt-3 text-sm font-medium">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500"/> Vendor ({cancelByVendor})</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-400"/> Customer ({cancelByCustomer})</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-slate-500"/> Admin ({cancelByAdmin})</div>
            </div>
          </section>

          {/* Call Vendor Workflow */}
          <section className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                  <PhoneCall size={16} /> Contact Vendor
                </h3>
                <p className="text-xs text-indigo-700/70 mt-1">Record statements directly from the vendor regarding high cancellation rates.</p>
              </div>
              {!showCallForm && (
                <button onClick={() => setShowCallForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors">
                  Call Vendor
                </button>
              )}
            </div>

            {showCallForm && (
              <div className="space-y-4 animate-fade-in border-t border-indigo-200/50 pt-4">
                <div className="bg-white p-3 rounded-lg border border-indigo-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Phone Number:</span>
                  <span className="text-lg font-bold text-indigo-700 select-all">{vendorDetails.phone}</span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-indigo-900/60 mb-2">Investigation Notes</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter vendor's explanation, reason for cancellations, and action taken..."
                    className="w-full h-24 rounded-lg border border-indigo-200 p-3 text-sm focus:border-indigo-500 outline-none resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowCallForm(false)} className="text-xs font-semibold text-indigo-600 hover:bg-indigo-100 py-2 px-4 rounded-lg">Cancel</button>
                  <button 
                    disabled={!notes.trim()} 
                    onClick={() => saveInvestigationMut.mutate('Notes Recorded')}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-lg"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Recent Cancelled Bookings Table */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Recent Cancelled Bookings</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                  <tr>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Service</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cancelledBookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900">{b.customerName}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{b.id}</div>
                      </td>
                      <td className="p-4 text-gray-600">{b.dateTime}</td>
                      <td className="p-4 text-gray-900 truncate max-w-[150px]">{b.services}</td>
                      <td className="p-4 text-gray-600 truncate max-w-[150px]">{b.cancellationReason}</td>
                      <td className="p-4 text-right font-bold text-gray-900">₹{b.amount}</td>
                    </tr>
                  ))}
                  {cancelledBookings.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No cancelled bookings found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-white flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <button 
            onClick={() => updateStatusMut.mutate({ status: 'Under Review' })}
            className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-bold py-2.5 px-4 transition-colors"
          >
            <AlertTriangle size={14} /> Mark Under Review
          </button>
          <button 
            onClick={() => updateStatusMut.mutate({ status: 'Cleared', riskLevel: 'None' })}
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold py-2.5 px-4 transition-colors"
          >
            <CheckCircle size={14} /> Clear Flag
          </button>
          <button 
            onClick={() => updateStatusMut.mutate({ status: 'Suspended' })}
            className="flex items-center gap-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold py-2.5 px-4 transition-colors"
          >
            <Hand size={14} /> Suspend Vendor
          </button>
        </div>

      </div>
    </>
  );
};
