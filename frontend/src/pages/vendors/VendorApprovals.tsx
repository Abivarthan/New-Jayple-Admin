import React, { useState } from 'react';
import { Check, X, ShieldAlert, Phone, Store, User, Sparkles, RefreshCw } from 'lucide-react';

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

const mockRequests: RegistrationRequest[] = [
  {
    uid: 'req_01',
    shopName: 'Grace Beauty Salon',
    ownerName: 'Grace Maria',
    phone: '9876543210',
    email: 'grace@gmail.com',
    city: 'Chennai',
    pincode: '600040',
    requestedAt: '2 hours ago',
    gstNumber: '33AAAAA1111A1Z1'
  },
  {
    uid: 'req_02',
    shopName: 'Elite Grooming Studio',
    ownerName: 'Rahul Kumar',
    phone: '9876543211',
    email: 'rahul@grooming.in',
    city: 'Chennai',
    pincode: '600001',
    requestedAt: '1 day ago'
  },
  {
    uid: 'req_03',
    shopName: 'Vibe Spa & Salons',
    ownerName: 'Vignesh K',
    phone: '9876543212',
    email: 'vignesh@vibespa.com',
    city: 'Tiruchirappalli',
    pincode: '620008',
    requestedAt: '3 days ago'
  }
];

export const VendorApprovals: React.FC = () => {
  const [requests, setRequests] = useState<RegistrationRequest[]>(mockRequests);
  const [rejectingRequest, setRejectingRequest] = useState<RegistrationRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // AI OCR States
  const [aiVerifyingUid, setAiVerifyingUid] = useState<string | null>(null);
  const [verifiedUids, setVerifiedUids] = useState<string[]>([]);

  const handleAiVerify = async (uid: string) => {
    setAiVerifyingUid(uid);
    // Simulate ocrVerifyVendorDocument Cloud Function call
    await new Promise((r) => setTimeout(r, 1200));
    setVerifiedUids((prev) => [...prev, uid]);
    setAiVerifyingUid(null);
  };

  const handleApprove = async (uid: string, shopName: string) => {
    setSubmitting(true);
    // Simulate approveVendor Cloud Function call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setRequests(requests.filter((r) => r.uid !== uid));
    setSubmitting(false);
    setActionMessage(`Vendor "${shopName}" approved successfully.`);
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleTriggerReject = (req: RegistrationRequest) => {
    setRejectingRequest(req);
    setRejectionReason('');
  };

  const executeReject = async () => {
    if (rejectingRequest && rejectionReason.trim()) {
      setSubmitting(true);
      // Simulate rejectVendor Cloud Function call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setRequests(requests.filter((r) => r.uid !== rejectingRequest.uid));
      setSubmitting(false);
      setActionMessage(`Application for "${rejectingRequest.shopName}" has been rejected.`);
      setRejectingRequest(null);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Vendor Registration Approvals</h1>
        <p className="text-sm text-slate-400">Review, approve, or reject new merchant applications requesting live access.</p>
      </div>

      {/* Action alert banner */}
      {actionMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm">
          <Check className="h-5 w-5 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Requests table */}
      <div className="overflow-x-auto rounded-xl border border-slate-600 bg-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
              <th className="py-4 px-6">Shop details</th>
              <th className="py-4 px-6">Owner details</th>
              <th className="py-4 px-6">Coverage Area</th>
              <th className="py-4 px-6">Tax Status</th>
              <th className="py-4 px-6">Submitted</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm text-slate-350">
            {requests.map((req) => (
              <tr key={req.uid} className="hover:bg-[#0f172a]/10 transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-violet-600/15 p-2 text-violet-400 border border-violet-500/20">
                      <Store size={18} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200">{req.shopName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">UID: {req.uid}</p>
                      {verifiedUids.includes(req.uid) && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          <Sparkles size={8} className="animate-pulse text-violet-400" />
                          Gemini OCR Verified
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <User size={13} className="text-slate-500" />
                      <span>{req.ownerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Phone size={13} className="text-slate-500" />
                      <span>+91 {req.phone}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <p className="text-xs text-slate-300">{req.city}</p>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Pincode: {req.pincode}</p>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {req.gstNumber ? (
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/30 text-emerald-400 border border-emerald-900/30">
                        GST: {req.gstNumber}
                      </span>
                      {verifiedUids.includes(req.uid) ? (
                        <span className="text-[9px] text-slate-400">Match Validated</span>
                      ) : aiVerifyingUid === req.uid ? (
                        <span className="text-[9px] text-violet-400 flex items-center gap-1">
                          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          AI checking...
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAiVerify(req.uid)}
                          className="flex items-center gap-1 rounded bg-slate-700 hover:bg-slate-750 text-slate-300 text-[9px] font-semibold py-0.5 px-2 border border-slate-600 transition-colors"
                        >
                          <Sparkles size={10} className="text-violet-400 animate-pulse" />
                          AI Verify
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-750 text-slate-500 border border-slate-600">
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
                      className="flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1 px-3 transition-colors disabled:opacity-50"
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
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No registrations pending approvals.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Reason input Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-rose-500/10 text-rose-450 border border-rose-500/20 p-2">
                <ShieldAlert size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Reject Application</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              State the reason for rejecting <span className="text-slate-200 font-semibold">{rejectingRequest.shopName}</span>. 
              The vendor will see this rejection comment inside their registration app flow.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Rejection Reason</label>
              <textarea
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incomplete verification documentation or area pincode not yet operational."
                className="w-full h-24 rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-slate-200 outline-none focus:border-violet-500 placeholder-slate-650 resize-none text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectingRequest(null)}
                className="rounded-lg border border-slate-700 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-xs font-semibold py-2 px-4 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeReject}
                disabled={!rejectionReason.trim() || submitting}
                className="rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-xs font-semibold text-white py-2 px-4 transition-colors disabled:opacity-50"
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
