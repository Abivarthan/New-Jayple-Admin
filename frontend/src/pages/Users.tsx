import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Eye, ShieldAlert, Download, X,
  User, Calendar, CreditCard, Lock, Unlock, Phone, Mail,
  MapPin, RefreshCw, ArrowRight, Check, AlertTriangle
} from 'lucide-react';
import {
  fetchCustomers,
  fetchCustomerDetail,
  setCustomerLock,
  adjustCustomerWallet,
  type AdminCustomer,
} from '../services/adminDataService';

interface BookingLog {
  id: string;
  shopName: string;
  services: string[];
  dateTime: string;
  amount: number;
  status: 'COMPLETED' | 'CONFIRMED' | 'CANCELLED';
  paymentMethod: 'ONLINE' | 'COD';
}

interface WalletTransaction {
  id: string;
  dateTime: string;
  amount: number; // positive for credit, negative for debit
  type: 'CREDIT' | 'DEBIT';
  description: string;
  actionedBy: string; // e.g. "admin_super"
}

interface CustomerListItem {
  uid: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  pincode: string;
  walletBalance: number;
  bookingsCount: number;
  status: 'active' | 'locked';
  createdAt: string;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  bookings: BookingLog[];
  transactions: WalletTransaction[];
}

const mapCustomer = (c: AdminCustomer): CustomerListItem => ({
  uid: c.uid,
  name: c.name,
  email: c.email,
  phone: c.phone,
  city: c.city,
  pincode: c.pincode || '—',
  walletBalance: c.walletBalance,
  bookingsCount: c.bookingsCount,
  status: c.status,
  createdAt: c.joinedAt ? new Date(c.joinedAt).toLocaleDateString() : '—',
  referralCode: c.referralCode || '—',
  referredBy: c.referredBy,
  referralCount: c.referralCount,
  bookings: [],
  transactions: [],
});

export const Users: React.FC = () => {
  const qc = useQueryClient();
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['adminCustomers'],
    queryFn: async (): Promise<CustomerListItem[]> => (await fetchCustomers()).map(mapCustomer),
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering States
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Selected customer for Drawer
  const [selectedUser, setSelectedUser] = useState<CustomerListItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<'profile' | 'bookings' | 'wallet' | 'safety'>('profile');

  // Wallet Form states
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [walletSaving, setWalletSaving] = useState(false);

  // Lock status states
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [lockReason, setLockReason] = useState('');
  
  // Notification alert Banner
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  // Open the drawer and lazy-load the customer's real bookings + transactions.
  const openUser = async (user: CustomerListItem) => {
    setSelectedUser(user);
    setDrawerTab('profile');
    const detail = await fetchCustomerDetail(user.uid);
    setSelectedUser((prev) =>
      prev && prev.uid === user.uid
        ? { ...prev, bookings: detail.bookings, transactions: detail.transactions }
        : prev,
    );
  };

  const handleWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const amountNum = parseFloat(walletAmount);
    if (isNaN(amountNum) || amountNum === 0 || !walletReason.trim()) return;

    setWalletSaving(true);
    try {
      const res = await adjustCustomerWallet(selectedUser.uid, amountNum, walletReason.trim());
      const balanceAfter = res.data?.balanceAfter ?? selectedUser.walletBalance + amountNum;
      const detail = await fetchCustomerDetail(selectedUser.uid);
      setSelectedUser((prev) =>
        prev ? { ...prev, walletBalance: balanceAfter, transactions: detail.transactions } : prev,
      );
      qc.invalidateQueries({ queryKey: ['adminCustomers'] });
      showNotification(`Adjusted wallet balance for ${selectedUser.name} by ₹${amountNum.toFixed(2)}`);
      setWalletAmount('');
      setWalletReason('');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Wallet adjustment failed');
    } finally {
      setWalletSaving(false);
    }
  };

  const toggleAccountLock = async () => {
    if (!selectedUser) return;
    const locked = selectedUser.status === 'active';
    try {
      await setCustomerLock(selectedUser.uid, locked, lockReason.trim() || undefined);
      setSelectedUser((prev) => (prev ? { ...prev, status: locked ? 'locked' : 'active' } : prev));
      qc.invalidateQueries({ queryKey: ['adminCustomers'] });
      showNotification(`User account status updated to ${locked ? 'LOCKED' : 'ACTIVE'}`);
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to update account status');
    } finally {
      setShowLockConfirm(false);
      setLockReason('');
    }
  };

  // Filter evaluation logic
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.uid.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCity = filterCity === 'ALL' || c.city === filterCity;
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus.toLowerCase();

    return matchesSearch && matchesCity && matchesStatus;
  });

  return (
    <div className="space-y-6 relative min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Customer Support Console</h1>
          <p className="text-sm text-slate-400">Search profiles, view booking activity ledger logs, adjust wallet balances, or lock malicious accounts.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-750 text-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors">
            <Download size={16} />
            Export Customers CSV
          </button>
        </div>
      </div>

      {/* Action Notification Alert Toast */}
      {notification && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm animate-fade-in shadow-lg shadow-emerald-950/20">
          <Check size={16} className="shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter and Search Panel */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 bg-slate-800 p-4 rounded-xl border border-slate-600">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, phone, email, or User ID..."
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* City Filter */}
        <div>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500 transition-all cursor-pointer"
          >
            <option value="ALL">All Cities</option>
            <option value="Chennai">Chennai</option>
            <option value="Tiruchirappalli">Tiruchirappalli</option>
            <option value="Coimbatore">Coimbatore</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500 transition-all cursor-pointer"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="LOCKED">Locked Accounts</option>
          </select>
        </div>
      </div>

      {/* Customer List Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-600 bg-slate-800 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
              <th className="py-4 px-6">Customer Details</th>
              <th className="py-4 px-6">Location</th>
              <th className="py-4 px-6 text-center">Bookings Placed</th>
              <th className="py-4 px-6 text-right">Wallet Balance</th>
              <th className="py-4 px-6">Registration Date</th>
              <th className="py-4 px-6">Account Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm text-slate-350">
            {filteredCustomers.map((user) => (
              <tr key={user.uid} className="hover:bg-[#0f172a]/10 transition-colors">
                <td className="py-4 px-6">
                  <div>
                    <span className="font-semibold text-slate-200 block">{user.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">{user.uid}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <p className="text-slate-300">{user.city}</p>
                    <p className="text-xs text-slate-500 mt-0.5">PIN: {user.pincode}</p>
                  </div>
                </td>
                <td className="py-4 px-6 text-center font-bold text-slate-200">
                  {user.bookingsCount}
                </td>
                <td className="py-4 px-6 text-right">
                  <span className={`font-semibold ${user.walletBalance < 0 ? 'text-rose-450' : user.walletBalance > 0 ? 'text-emerald-450' : 'text-slate-400'}`}>
                    ₹{user.walletBalance.toFixed(2)}
                  </span>
                </td>
                <td className="py-4 px-6 text-xs text-slate-400">{user.createdAt}</td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      user.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-450'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    <span className="capitalize">{user.status}</span>
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={() => openUser(user)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-700 hover:text-slate-100 text-xs font-medium text-slate-300 px-3.5 py-1.5 ml-auto transition-colors"
                  >
                    <Eye size={13} />
                    Inspect Details
                  </button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  {isLoading ? 'Loading customers…' : 'No matching user accounts located.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out User Profile Drawer */}
      {selectedUser && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedUser(null)}
          />

          {/* Drawer content panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-800 border-l border-slate-600 shadow-2xl overflow-y-auto transform transition-all duration-300 ease-out flex flex-col">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-700 bg-[#0f172a]/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-violet-500/15 border border-violet-500/20 p-2.5 text-violet-400">
                  <User size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-100">{selectedUser.name}</h2>
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      selectedUser.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {selectedUser.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">UID: {selectedUser.uid} · Contact: +91 {selectedUser.phone}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg border border-slate-600 bg-slate-800 p-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab selection */}
            <div className="flex gap-2 border-b border-slate-700 px-6 bg-[#0f172a]/20">
              {(['profile', 'bookings', 'wallet', 'safety'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 capitalize transition-all ${
                    drawerTab === tab
                      ? 'border-violet-500 text-violet-450'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'profile' && <User size={13} />}
                  {tab === 'bookings' && <Calendar size={13} />}
                  {tab === 'wallet' && <CreditCard size={13} />}
                  {tab === 'safety' && <ShieldAlert size={13} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Drawer Body content */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              
              {/* 1. Profile Overview Tab */}
              {drawerTab === 'profile' && (
                <div className="space-y-6">
                  {/* Grid items */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-600 bg-[#0f172a]/30 p-4">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Email Address</span>
                      <span className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" />
                        {selectedUser.email}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-600 bg-[#0f172a]/30 p-4">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Phone Number</span>
                      <span className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" />
                        +91 {selectedUser.phone}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-600 bg-[#0f172a]/30 p-4">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">City / Region</span>
                      <span className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400" />
                        {selectedUser.city}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-600 bg-[#0f172a]/30 p-4">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Pincode Mapping</span>
                      <span className="text-sm font-medium text-slate-200">{selectedUser.pincode}</span>
                    </div>
                  </div>

                  {/* Referral Network Stats */}
                  <div className="rounded-xl border border-slate-600 bg-[#0f172a]/35 p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-350">Referral Program Metadata</h4>
                      <span className="text-[10px] text-slate-500">Program active status</span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <span className="text-[10px] text-slate-550 block mb-0.5">Referral Code</span>
                        <span className="text-xs font-bold text-slate-200 bg-slate-800 border border-slate-600 px-2.5 py-1 rounded select-all tracking-wider inline-block">
                          {selectedUser.referralCode}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-550 block mb-0.5">Referred By User</span>
                        {selectedUser.referredBy ? (
                          <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
                            {selectedUser.referredBy}
                            <ArrowRight size={10} className="text-slate-500" />
                          </span>
                        ) : (
                          <span className="text-xs text-slate-550 italic">Organic Sign-up</span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-550 block mb-0.5">Completed Referrals</span>
                        <span className="text-xs font-bold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded inline-block">
                          {selectedUser.referralCount} sign-ups
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registration History */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 justify-end italic">
                    <span>Registered on the Jayple platform: {selectedUser.createdAt}</span>
                  </div>
                </div>
              )}

              {/* 2. Bookings Logs Tab */}
              {drawerTab === 'bookings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Historical Bookings Placed ({selectedUser.bookingsCount})</h3>
                    <p className="text-[10px] text-slate-550">Sorted by newest bookings</p>
                  </div>

                  <div className="space-y-3">
                    {selectedUser.bookings.map((booking) => (
                      <div key={booking.id} className="rounded-xl border border-slate-600 bg-[#0f172a]/20 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{booking.shopName}</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Booking ID: {booking.id} · {booking.dateTime}</span>
                          </div>
                          
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            booking.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-450' :
                            booking.status === 'CONFIRMED' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-450'
                          }`}>
                            {booking.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs border-t border-slate-700/60 pt-2.5">
                          <span className="text-slate-400">Services: <span className="font-semibold text-slate-300">{booking.services.join(', ')}</span></span>
                          <div className="text-right">
                            <span className="font-bold text-slate-200">₹{booking.amount}</span>
                            <span className="text-[9px] text-slate-500 block mt-0.5">{booking.paymentMethod}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {selectedUser.bookings.length === 0 && (
                      <div className="py-8 text-center text-slate-650 text-xs italic">
                        No bookings found for this customer account.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Wallet Ledger Tab */}
              {drawerTab === 'wallet' && (
                <div className="space-y-6">
                  {/* Current Balance card */}
                  <div className="rounded-xl border border-slate-600 bg-[#0f172a]/45 p-5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Available Wallet balance</span>
                      <h4 className={`text-2xl font-bold ${selectedUser.walletBalance < 0 ? 'text-rose-450' : 'text-slate-100'}`}>
                        ₹{selectedUser.walletBalance.toFixed(2)}
                      </h4>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xs text-slate-500 italic block">Total ledger events</span>
                      <span className="text-sm font-semibold text-slate-300 block">{selectedUser.transactions.length} adjustments</span>
                    </div>
                  </div>

                  {/* Adjustment Form wrapper */}
                  <div className="rounded-xl border border-slate-600 bg-[#0f172a]/20 p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Trigger Wallet Adjustment</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Adjustment will execute immediately. Auditor notes are logged to the audit log collection.</p>
                    </div>

                    <form onSubmit={handleWalletAdjustment} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-semibold uppercase text-slate-450 mb-1.5">Adjustment Amount (₹)</label>
                          <input
                            type="number"
                            required
                            step="any"
                            value={walletAmount}
                            onChange={(e) => setWalletAmount(e.target.value)}
                            placeholder="e.g. 200 or -150"
                            className="w-full rounded border border-slate-600 bg-[#0f172a] py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-violet-500 placeholder-slate-700"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold uppercase text-slate-450 mb-1.5">Reason for Auditor adjustment</label>
                          <input
                            type="text"
                            required
                            value={walletReason}
                            onChange={(e) => setWalletReason(e.target.value)}
                            placeholder="e.g. Compensation for late cancellation on order BKG-99201"
                            className="w-full rounded border border-slate-600 bg-[#0f172a] py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-violet-500 placeholder-slate-700"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={walletSaving || !walletAmount || !walletReason.trim()}
                          className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-4 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50"
                        >
                          {walletSaving ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <CreditCard size={12} />
                          )}
                          Execute Payout adjustment
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Transaction ledger list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-350">Transaction Ledger History</h4>
                    
                    <div className="divide-y divide-slate-800 border border-slate-700 rounded-xl overflow-hidden bg-[#0f172a]/10">
                      {selectedUser.transactions.map((txn) => (
                        <div key={txn.id} className="p-4 flex items-start justify-between gap-4 text-xs">
                          <div>
                            <span className="font-semibold text-slate-250 block">{txn.description}</span>
                            <span className="text-[10px] text-slate-550 block mt-1">
                              ID: {txn.id} · Audit: {txn.actionedBy} · {txn.dateTime}
                            </span>
                          </div>

                          <span className={`font-bold shrink-0 ${txn.amount >= 0 ? 'text-emerald-450' : 'text-rose-450'}`}>
                            {txn.amount >= 0 ? '+' : ''}₹{txn.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {selectedUser.transactions.length === 0 && (
                        <div className="py-6 text-center text-slate-600 text-xs italic">
                          No wallet ledger transaction logs recorded.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Account Safety Tab */}
              {drawerTab === 'safety' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Account Lock & Access Protection Control</h3>
                    <p className="text-[10px] text-slate-550 mt-0.5">Toggle this status to lock or unlock the user account immediately.</p>
                  </div>

                  <div className="rounded-xl border border-slate-600 bg-[#0f172a]/30 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-slate-200 block">Account status:</span>
                        <span className="text-xs text-slate-500 mt-1 block">
                          {selectedUser.status === 'active'
                            ? 'The user is active and can perform booking transactions.'
                            : 'This account is locked. The user will receive an access error on next app boot.'}
                        </span>
                      </div>

                      <button
                        onClick={() => setShowLockConfirm(true)}
                        className={`flex items-center gap-1.5 rounded-lg text-xs font-bold py-2.5 px-4 transition-colors ${
                          selectedUser.status === 'active'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25'
                        }`}
                      >
                        {selectedUser.status === 'active' ? (
                          <>
                            <Lock size={13} />
                            Lock User Account
                          </>
                        ) : (
                          <>
                            <Unlock size={13} />
                            Unlock Account
                          </>
                        )}
                      </button>
                    </div>

                    {/* Show lock confirmation dialog form inline */}
                    {showLockConfirm && (
                      <div className="border-t border-slate-700 pt-4 space-y-4 animate-fade-in">
                        <div className="flex items-start gap-2.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                          <span>
                            WARNING: Toggling user block parameters takes effect immediately. The user will be logged out of active mobile sessions and blocked from placing salon booking requests.
                          </span>
                        </div>

                        {selectedUser.status === 'active' && (
                          <div>
                            <label className="block text-[10px] font-semibold uppercase text-slate-550 mb-1.5">
                              Mandatory Auditor Reason for Lockout
                            </label>
                            <input
                              type="text"
                              required
                              value={lockReason}
                              onChange={(e) => setLockReason(e.target.value)}
                              placeholder="e.g. Suspected credit card abuse or spam booking creations."
                              className="w-full rounded border border-slate-600 bg-[#0f172a] py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-violet-500 placeholder-slate-700"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setShowLockConfirm(false);
                              setLockReason('');
                            }}
                            className="rounded border border-slate-700 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-750 text-xs font-semibold py-1.5 px-3 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={toggleAccountLock}
                            disabled={selectedUser.status === 'active' && !lockReason.trim()}
                            className={`rounded text-xs font-semibold py-1.5 px-4 text-white transition-colors ${
                              selectedUser.status === 'active'
                                ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700'
                                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                            } disabled:opacity-50`}
                          >
                            Confirm {selectedUser.status === 'active' ? 'Lockout' : 'Activation'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}
    </div>
  );
};
