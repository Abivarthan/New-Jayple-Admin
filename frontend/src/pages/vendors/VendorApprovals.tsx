import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X, ShieldAlert, Phone, Store, User } from 'lucide-react';
import { fetchVendorRequests, approveVendor, rejectVendor } from '../../services/adminDataService';

interface RegistrationRequest {
  uid: string;
  shopName: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  pincode: string;
  requestedAt: string;
  gstNumber?: string;
}

export const VendorApprovals: React.FC = () => {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['vendorRequests'],
    queryFn: async (): Promise<RegistrationRequest[]> => {
      const raw = await fetchVendorRequests();
      return raw.map((r) => ({
        uid: r.uid,
        shopName: r.shopName,
        ownerName: r.ownerName,
        phone: r.phone,
        email: '',
        city: r.city,
        pincode: r.pincode || '—',
        requestedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—',
        gstNumber: r.gstNumber || undefined,
      }));
    },
  });
  const [rejectingRequest, setRejectingRequest] = useState<RegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['vendorRequests'] });

  const approveMut = useMutation({
    mutationFn: (uid: string) => approveVendor(uid),
    onSuccess: () => refresh(),
  });
  const rejectMut = useMutation({
    mutationFn: ({ uid, reason }: { uid: string; reason: string }) => rejectVendor(uid, reason),
    onSuccess: () => refresh(),
  });
  const submitting = approveMut.isPending || rejectMut.isPending;

  const handleApprove = async (uid: string, shopName: string) => {
    await approveMut.mutateAsync(uid);
    setActionMessage(`Vendor "${shopName}" approved successfully.`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleTriggerReject = (req: RegistrationRequest) => {
    setRejectingRequest(req);
    setRejectionReason('');
  };

  const executeReject = async () => {
    if (rejectingRequest && rejectionReason.trim()) {
      await rejectMut.mutateAsync({ uid: rejectingRequest.uid, reason: rejectionReason.trim() });
      setActionMessage(`Application for "${rejectingRequest.shopName}" has been rejected.`);
      setRejectingRequest(null);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vendor Registration Approvals</h1>
        <p className="text-sm text-gray-500">Review, approve, or reject new merchant applications requesting live access.</p>
      </div>

      {/* Action alert banner */}
      {actionMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm">
          <Check className="h-5 w-5 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Requests table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs font-semibold uppercase bg-gray-50/20">
              <th className="py-4 px-6">Shop details</th>
              <th className="py-4 px-6">Owner details</th>
              <th className="py-4 px-6">Coverage Area</th>
              <th className="py-4 px-6">Tax Status</th>
              <th className="py-4 px-6">Submitted</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm text-gray-600">
            {requests.map((req) => (
              <tr key={req.uid} className="hover:bg-gray-50/10 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-black text-white p-2 text-black font-semibold border border-black">
                      <Store size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{req.shopName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">UID: {req.uid}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-800">
                      <User size={13} className="text-gray-500" />
                      <span>{req.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Phone size={13} className="text-gray-500" />
                      <span>+91 {req.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <p className="text-xs text-gray-800">{req.city}</p>
                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Pincode: {req.pincode}</p>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {req.gstNumber ? (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-400 border border-emerald-900/30">
                      GST: {req.gstNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-750 text-gray-500 border border-gray-200">
                      Non-GST
                    </span>
                  )}
                </td>
                <td className="py-4 px-6 text-xs text-slate-450">{req.requestedAt}</td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleApprove(req.uid, req.shopName)}
                      disabled={submitting}
                      className="flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-500 text-gray-900 text-xs font-semibold py-1 px-3 transition-colors disabled:opacity-50"
                    >
                      <Check size={12} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleTriggerReject(req)}
                      disabled={submitting}
                      className="flex items-center gap-1 rounded border border-rose-900/30 bg-rose-600/10 hover:bg-rose-950/30 text-rose-400 text-xs font-semibold py-1 px-3 transition-colors disabled:opacity-50"
                    >
                      <X size={12} />
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  {isLoading ? 'Loading…' : 'No registrations pending approvals.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Reason input Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-500/10 text-rose-450 border border-rose-500/20 p-2">
                <ShieldAlert size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Reject Application</h3>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              State the reason for rejecting <span className="text-gray-900 font-semibold">{rejectingRequest.shopName}</span>. 
              The vendor will see this rejection comment inside their registration app flow.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Rejection Reason</label>
              <textarea
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incomplete verification documentation or area pincode not yet operational."
                className="w-full h-24 rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-gray-900 outline-none focus:border-black placeholder-slate-650 resize-none text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectingRequest(null)}
                className="rounded-lg border border-gray-200 bg-gray-50/20 text-gray-500 hover:bg-gray-100 hover:text-gray-900 text-xs font-semibold py-2 px-4 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeReject}
                disabled={!rejectionReason.trim() || submitting}
                className="rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-xs font-semibold text-gray-900 py-2 px-4 transition-colors disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
