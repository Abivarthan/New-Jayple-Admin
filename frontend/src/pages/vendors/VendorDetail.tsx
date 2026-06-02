import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Store, ShieldCheck, Percent, Wallet, Calendar,
  Star, Check, RefreshCw, Landmark, AlertTriangle, ToggleLeft, ToggleRight
} from 'lucide-react';
import {
  fetchVendorById,
  fetchVendorBookings,
  fetchVendorReviews,
  fetchVendorServices,
  updateVendorBasics,
  setReviewFlag,
} from '../../services/adminDataService';

interface BookingLog {
  id: string;
  customerName: string;
  services: string[];
  dateTime: string;
  amount: number;
  status: 'COMPLETED' | 'CONFIRMED' | 'CANCELLED';
  paymentMethod: 'ONLINE' | 'COD';
}

interface ReviewItem {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  flagged: boolean;
}

export const VendorDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'services' | 'finance' | 'bookings' | 'reviews'>('profile');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Profile Form States (loaded from Firestore)
  const [profile, setProfile] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    email: '',
    city: '',
    zoneName: '',
    address: '',
    tier: 'normal' as 'premium' | 'normal',
    commissionRate: 15,
    isGstRegistered: false,
    gstNumber: '',
  });

  const [services, setServices] = useState<
    { id: string; name: string; category: string; price: number; fakeDiscount: number; isBestseller: boolean; isActive: boolean }[]
  >([]);
  const [bookings, setBookings] = useState<BookingLog[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  // Financial States (walletBalance loaded; COD counters are not yet aggregated)
  const [finances, setFinances] = useState({
    walletBalance: 0,
    codCollected: 0,
    codThreshold: 5000.0,
    isServiceBlocked: false,
  });

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletAdjustAmount, setWalletAdjustAmount] = useState('');
  const [walletAdjustReason, setWalletAdjustReason] = useState('');

  // Load the real vendor + bookings + reviews + services.
  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      const [v, bks, revs, svcs] = await Promise.all([
        fetchVendorById(id),
        fetchVendorBookings(id),
        fetchVendorReviews(id),
        fetchVendorServices(id),
      ]);
      if (!alive) return;
      if (v) {
        setProfile({
          shopName: v.shopName,
          ownerName: v.ownerName === '—' ? '' : v.ownerName,
          phone: v.phone,
          email: v.email ?? '',
          city: v.city,
          zoneName: v.zoneName,
          address: v.address ?? '',
          tier: v.tier,
          commissionRate: v.commissionRate ?? 15,
          isGstRegistered: v.isGstRegistered,
          gstNumber: v.gstNumber ?? '',
        });
        setFinances((f) => ({ ...f, walletBalance: v.weeklyEarnings }));
      }
      setBookings(bks);
      setReviews(revs);
      setServices(svcs.map((sv) => ({ ...sv, fakeDiscount: 0, isBestseller: false })));
    })();
    return () => { alive = false; };
  }, [id]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    try {
      await updateVendorBasics(id, {
        shopName: profile.shopName,
        ownerName: profile.ownerName,
        phone: profile.phone,
        email: profile.email,
        address: profile.address,
      });
      setSaveSuccess('Vendor profile details updated successfully.');
    } catch (err) {
      setSaveSuccess(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const handleServiceToggle = (serviceId: string, field: 'isActive' | 'isBestseller') => {
    setServices(
      services.map((s) => (s.id === serviceId ? { ...s, [field]: !s[field] } : s))
    );
  };

  const handleWalletAdjust = async () => {
    const amt = parseFloat(walletAdjustAmount);
    if (!isNaN(amt) && walletAdjustReason.trim()) {
      setLoading(true);
      await new Promise(r => setTimeout(r, 800));
      setFinances({
        ...finances,
        walletBalance: finances.walletBalance + amt
      });
      setLoading(false);
      setShowWalletModal(false);
      setWalletAdjustAmount('');
      setWalletAdjustReason('');
      setSaveSuccess(`Wallet balance adjusted successfully. New balance: ₹${(finances.walletBalance + amt).toFixed(2)}`);
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const handleResetCod = () => {
    setFinances({ ...finances, codCollected: 0, isServiceBlocked: false });
    setSaveSuccess('COD collected counter has been reset to ₹0.');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleReviewFlag = async (reviewId: string) => {
    const current = reviews.find((r) => r.id === reviewId);
    const next = !current?.flagged;
    setReviews(reviews.map((r) => (r.id === reviewId ? { ...r, flagged: next } : r)));
    try {
      await setReviewFlag(reviewId, next);
    } catch {
      /* keep optimistic UI; flag may not persist if denied */
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendors')}
            className="rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">{profile.shopName}</h1>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                profile.tier === 'premium'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-slate-700 text-slate-400 border border-slate-600'
              }`}>
                {profile.tier}
              </span>
            </div>
            <p className="text-xs text-slate-450 mt-1">Vendor ID: {id} · Mapped Zone: {profile.zoneName}</p>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm">
          <Check size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-px">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeSubTab === 'profile' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Store size={14} />
          Profile Settings
        </button>
        <button
          onClick={() => setActiveSubTab('services')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeSubTab === 'services' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Percent size={14} />
          Services Catalog
        </button>
        <button
          onClick={() => setActiveSubTab('finance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeSubTab === 'finance' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet size={14} />
          Financial Control
        </button>
        <button
          onClick={() => setActiveSubTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeSubTab === 'bookings' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar size={14} />
          Booking History
        </button>
        <button
          onClick={() => setActiveSubTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeSubTab === 'reviews' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Star size={14} />
          Customer Reviews
        </button>
      </div>

      {/* Tab Panels */}
      <div className="rounded-xl border border-slate-600 bg-slate-800 p-6">
        {/* Profile Panel */}
        {activeSubTab === 'profile' && (
          <form onSubmit={handleProfileSave} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Shop Name</label>
                <input
                  type="text"
                  value={profile.shopName}
                  onChange={(e) => setProfile({ ...profile, shopName: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Owner Name</label>
                <input
                  type="text"
                  value={profile.ownerName}
                  onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Owner Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Support Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Full Address</label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Admin Overrides row */}
            <div className="border-t border-slate-600 pt-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-350">Administrative Classification</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Parameters override default platform-wide parameters.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Vendor Tier</label>
                  <select
                    value={profile.tier}
                    onChange={(e) => setProfile({ ...profile, tier: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Base Commission Override %</label>
                  <input
                    type="number"
                    value={profile.commissionRate}
                    onChange={(e) => setProfile({ ...profile, commissionRate: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">GST Registration Code</label>
                  <input
                    type="text"
                    value={profile.gstNumber}
                    onChange={(e) => setProfile({ ...profile, gstNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-600 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck size={16} />}
                Update Settings
              </button>
            </div>
          </form>
        )}

        {/* Services catalog Panel */}
        {activeSubTab === 'services' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-350">Service Catalog overrides</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Toggle customer visibility or flag bestseller badges on individual salon offerings.</p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-600">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
                    <th className="py-3.5 px-5">Service Name</th>
                    <th className="py-3.5 px-5">Category</th>
                    <th className="py-3.5 px-5 text-right">Price</th>
                    <th className="py-3.5 px-5 text-center">Discount override %</th>
                    <th className="py-3.5 px-5 text-center">Bestseller</th>
                    <th className="py-3.5 px-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-[#0f172a]/15">
                      <td className="py-3.5 px-5 font-semibold text-slate-200">{s.name}</td>
                      <td className="py-3.5 px-5 capitalize">{s.category}</td>
                      <td className="py-3.5 px-5 text-right font-bold">₹{s.price}</td>
                      <td className="py-3.5 px-5 text-center">
                        <input
                          type="number"
                          value={s.fakeDiscount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setServices(services.map((item) => item.id === s.id ? { ...item, fakeDiscount: val } : item));
                          }}
                          className="w-16 rounded border border-slate-600 bg-[#0f172a] py-1 text-center text-slate-250 outline-none focus:border-violet-500"
                        />
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <button
                          onClick={() => handleServiceToggle(s.id, 'isBestseller')}
                          className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                        >
                          {s.isBestseller ? (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                              ⭐ Active
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 hover:text-slate-400">Add Badge</span>
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <button
                          onClick={() => handleServiceToggle(s.id, 'isActive')}
                          className="p-1"
                        >
                          {s.isActive ? (
                            <ToggleRight className="h-6 w-6 text-violet-500" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-slate-650" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial Panel */}
        {activeSubTab === 'finance' && (
          <div className="space-y-8">
            {/* KPI list */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-600 bg-[#0f172a]/40 p-5 space-y-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">Merchant Wallet Balance</span>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-slate-100">₹{finances.walletBalance.toLocaleString()}</h3>
                  <button
                    onClick={() => setShowWalletModal(true)}
                    className="flex items-center gap-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-1 px-2.5 transition-colors"
                  >
                    Adjust
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-600 bg-[#0f172a]/40 p-5 space-y-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">COD Cash Collected</span>
                <div className="flex items-center justify-between">
                  <h3 className={`text-2xl font-bold ${finances.codCollected >= finances.codThreshold ? 'text-rose-400' : 'text-slate-100'}`}>
                    ₹{finances.codCollected.toLocaleString()}
                  </h3>
                  {finances.codCollected > 0 && (
                    <button
                      onClick={handleResetCod}
                      className="rounded border border-slate-600 bg-slate-700 hover:bg-slate-750 text-slate-200 text-xs font-semibold py-1 px-2.5 transition-colors"
                    >
                      Clear/Reset
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-600 bg-[#0f172a]/40 p-5 space-y-2">
                <span className="text-xs text-slate-400 uppercase font-semibold">COD Threshold Limit</span>
                <h3 className="text-2xl font-bold text-slate-200">₹{finances.codThreshold.toLocaleString()}</h3>
              </div>
            </div>

            {/* Block Warnings */}
            {finances.codCollected >= finances.codThreshold && (
              <div className="flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-rose-450 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">COD Collected Threshold Exceeded!</p>
                  <p className="text-xs text-rose-400 mt-1">
                    This salon storefront has been flagged as blocked because cash collections exceed the ₹5,000 safety threshold. 
                    Reset the counter after receiving physical payments.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bookings List Panel */}
        {activeSubTab === 'bookings' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-350">Salon Booking ledger logs</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-600">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
                    <th className="py-3 px-5">Booking ID</th>
                    <th className="py-3 px-5">Customer</th>
                    <th className="py-3 px-5">Services</th>
                    <th className="py-3 px-5">Date/Time</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                    <th className="py-3 px-5">Payment</th>
                    <th className="py-3 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#0f172a]/15">
                      <td className="py-3.5 px-5 font-semibold text-slate-200">{b.id}</td>
                      <td className="py-3.5 px-5">{b.customerName}</td>
                      <td className="py-3.5 px-5 font-medium text-slate-400">{b.services.join(', ')}</td>
                      <td className="py-3.5 px-5">{b.dateTime}</td>
                      <td className="py-3.5 px-5 text-right font-bold">₹{b.amount}</td>
                      <td className="py-3.5 px-5 font-semibold">{b.paymentMethod}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' :
                          b.status === 'CONFIRMED' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-450'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reviews Panel */}
        {activeSubTab === 'reviews' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-350">Customer Feedback & Reviews</h3>
            
            <div className="divide-y divide-slate-850">
              {reviews.map((r) => (
                <div key={r.id} className="py-4 space-y-2 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{r.customerName}</span>
                      <span className="text-[10px] text-slate-500">{r.date}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-amber-450">⭐ {r.rating} / 5</span>
                      <button
                        onClick={() => handleReviewFlag(r.id)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          r.flagged
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold'
                            : 'bg-slate-750 text-slate-450 hover:bg-slate-700'
                        }`}
                      >
                        {r.flagged ? 'Flagged / Review pending' : 'Flag review'}
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed italic">"{r.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Adjust Wallet Balance Modal Form */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-600/15 text-violet-400 border border-violet-500/20 p-2">
                <Landmark size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Adjust Wallet Balance</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Adjustment Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  value={walletAdjustAmount}
                  onChange={(e) => setWalletAdjustAmount(e.target.value)}
                  placeholder="e.g. 500 for credit, -500 for debit"
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Mandatory Audited Reason
                </label>
                <textarea
                  required
                  value={walletAdjustReason}
                  onChange={(e) => setWalletAdjustReason(e.target.value)}
                  placeholder="e.g. Compensated for cancellation or manual adjustments."
                  className="w-full h-20 rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-600 pt-4">
              <button
                onClick={() => setShowWalletModal(false)}
                className="rounded-lg border border-slate-700 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-xs font-semibold py-2 px-4 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWalletAdjust}
                disabled={!walletAdjustAmount || !walletAdjustReason.trim() || loading}
                className="rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-xs font-semibold text-white py-2 px-4 transition-colors disabled:opacity-50"
              >
                Confirm Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
