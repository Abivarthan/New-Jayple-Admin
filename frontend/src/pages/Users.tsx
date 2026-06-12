import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Eye, ShieldAlert, Download, X,
  User, Calendar, Lock, Unlock, Phone, Mail,
  MapPin, AlertTriangle, AlertCircle, RefreshCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchCustomers,
  fetchCustomerDetail,
  setCustomerLock,
  type AdminCustomer,
  type AdminCustomerBooking,
  type AdminCustomerRefund,
  type AdminCustomerComplaint
} from '../services/adminDataService';

interface CustomerListItem {
  uid: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  city: string;
  pincode: string;
  bookingsCount: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpending: number;
  status: 'active' | 'locked';
  createdAt: string;
  lastBookingDate: string;
  bookings: AdminCustomerBooking[];
  refunds: AdminCustomerRefund[];
  complaints: AdminCustomerComplaint[];
}

const mapCustomer = (c: AdminCustomer): CustomerListItem => ({
  uid: c.uid,
  name: c.name,
  email: c.email || '—',
  phone: c.phone || '—',
  alternatePhone: c.alternatePhone,
  city: c.city || '—',
  pincode: c.pincode || '—',
  bookingsCount: c.bookingsCount || 0,
  completedBookings: c.completedBookings || 0,
  cancelledBookings: c.cancelledBookings || 0,
  totalSpending: c.totalSpending || 0,
  status: c.status,
  createdAt: c.joinedAt ? new Date(c.joinedAt).toLocaleDateString() : '—',
  lastBookingDate: c.lastBookingDate ? new Date(c.lastBookingDate).toLocaleDateString() : '—',
  bookings: [],
  refunds: [],
  complaints: [],
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
  const [drawerTab, setDrawerTab] = useState<'overview' | 'bookings' | 'refunds' | 'complaints' | 'activity'>('overview');

  // Lock status states
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [lockReason, setLockReason] = useState('');


  // Open the drawer and lazy-load the customer's real bookings + refunds/complaints.
  const openUser = async (user: CustomerListItem) => {
    setSelectedUser(user);
    setDrawerTab('overview');
    const detail = await fetchCustomerDetail(user.uid);
    setSelectedUser((prev) =>
      prev && prev.uid === user.uid
        ? { ...prev, bookings: detail.bookings, refunds: detail.refunds, complaints: detail.complaints }
        : prev,
    );
  };

  const toggleAccountLock = async () => {
    if (!selectedUser) return;
    const locked = selectedUser.status === 'active';
    try {
      await setCustomerLock(selectedUser.uid, locked, lockReason.trim() || undefined);
      setSelectedUser((prev) => (prev ? { ...prev, status: locked ? 'locked' : 'active' } : prev));
      qc.invalidateQueries({ queryKey: ['adminCustomers'] });
      toast.success(`User account status updated to ${locked ? 'LOCKED' : 'ACTIVE'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update account status');
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Customer Support Console</h1>
          <p className="text-sm text-gray-500">Search customer profiles, view complete booking histories, monitor complaints, and track refunds.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 text-sm font-semibold transition-colors">
            <Download size={16} />
            Export Customers
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 bg-white p-4 rounded-xl border border-gray-200">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, phone, email, or User ID..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-xs text-gray-900 placeholder-slate-500 outline-none focus:border-black transition-colors"
          />
        </div>

        {/* City Filter */}
        <div>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs text-gray-500 outline-none focus:border-black transition-all cursor-pointer"
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
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs text-gray-500 outline-none focus:border-black transition-all cursor-pointer"
          >
            <option value="ALL">All Account Statuses</option>
            <option value="ACTIVE">Active Accounts</option>
            <option value="LOCKED">Locked Accounts</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm font-semibold">
              <th className="py-4 px-6">Customer Details</th>
              <th className="py-4 px-6">Location</th>
              <th className="py-4 px-6 text-center">Completed Bookings</th>
              <th className="py-4 px-6 text-right">Total Spending</th>
              <th className="py-4 px-6">Registration Date</th>
              <th className="py-4 px-6">Account Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {filteredCustomers.map((user) => (
              <tr key={user.uid} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openUser(user)}>
                <td className="py-4 px-6">
                  <div>
                    <span className="font-bold text-gray-900 block">{user.name}</span>
                    <span className="text-xs font-medium text-gray-500 mt-0.5 block">{user.phone} · {user.uid.slice(-6).toUpperCase()}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <p className="font-medium text-gray-900">{user.city}</p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">PIN: {user.pincode}</p>
                  </div>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="font-bold text-gray-900 text-base">{user.completedBookings}</span>
                  <span className="text-xs font-medium text-gray-500 block">/ {user.bookingsCount} total</span>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="font-bold text-gray-900 text-base">
                    ₹{user.totalSpending.toLocaleString()}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm font-medium text-gray-600">{user.createdAt}</td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                  >
                    <span className="capitalize">{user.status}</span>
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); openUser(user); }}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 px-4 py-2 ml-auto transition-colors"
                  >
                    <Eye size={16} />
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <User size={48} className="text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900">{isLoading ? 'Loading customers…' : 'No customers found'}</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                  </div>
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
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-gray-200 shadow-2xl overflow-y-auto transform transition-all duration-300 ease-out flex flex-col">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-gray-100 border border-gray-200 p-3 text-gray-900 font-semibold">
                  <User size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">{selectedUser.name}</h2>
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ${
                      selectedUser.status === 'active'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      {selectedUser.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500 mt-1">UID: {selectedUser.uid} · Reg: {selectedUser.createdAt}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tab selection */}
            <div className="flex gap-2 border-b border-gray-200 px-6 bg-gray-50/50">
              {(['overview', 'bookings', 'refunds', 'complaints', 'activity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`flex items-center gap-2 py-4 px-3 text-sm font-bold border-b-2 capitalize transition-all ${
                    drawerTab === tab
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab === 'overview' && <User size={16} />}
                  {tab === 'bookings' && <Calendar size={16} />}
                  {tab === 'refunds' && <RefreshCcw size={16} />}
                  {tab === 'complaints' && <AlertCircle size={16} />}
                  {tab === 'activity' && <ShieldAlert size={16} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Drawer Body content */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              
              {/* 1. Overview Tab */}
              {drawerTab === 'overview' && (
                <div className="space-y-8">
                  {/* Grid items */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                      <User size={14} /> Contact Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Email Address</span>
                        <span className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <Mail size={16} className="text-gray-400" />
                          {selectedUser.email}
                        </span>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Primary Phone</span>
                        <span className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" />
                          +91 {selectedUser.phone}
                        </span>
                      </div>
                      
                      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Alternate Phone</span>
                        <span className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <Phone size={16} className="text-gray-400" />
                          {selectedUser.alternatePhone ? `+91 ${selectedUser.alternatePhone}` : 'Not Provided'}
                        </span>
                      </div>

                      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                        <span className="text-xs uppercase font-bold text-gray-500 block mb-2">City & Pincode</span>
                        <span className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <MapPin size={16} className="text-gray-400" />
                          {selectedUser.city} ({selectedUser.pincode})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Stats Summary */}
                  <div>
                     <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                        <Calendar size={14} /> Lifetime Activity
                     </h3>
                     <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
                      <div className="grid gap-4 sm:grid-cols-4">
                        <div>
                          <span className="text-xs font-bold text-gray-500 block mb-1">Total Spending</span>
                          <span className="text-2xl font-bold text-gray-900 block">
                            ₹{selectedUser.totalSpending.toLocaleString()}
                          </span>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-gray-500 block mb-1">Completed</span>
                          <span className="text-2xl font-bold text-gray-900 block">
                            {selectedUser.completedBookings} <span className="text-sm text-gray-500 font-medium">orders</span>
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-xs font-bold text-gray-500 block mb-1">Cancelled</span>
                          <span className="text-2xl font-bold text-gray-900 block">
                            {selectedUser.cancelledBookings} <span className="text-sm text-gray-500 font-medium">orders</span>
                          </span>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-gray-500 block mb-1">Last Booking</span>
                          <span className="text-sm font-semibold text-gray-900 block mt-2">
                            {selectedUser.lastBookingDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* 2. Bookings Logs Tab */}
              {drawerTab === 'bookings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">Historical Bookings Placed ({selectedUser.bookings.length})</h3>
                    <p className="text-xs font-medium text-gray-500">Sorted by newest bookings</p>
                  </div>

                  <div className="space-y-4">
                    {selectedUser.bookings.map((booking) => (
                      <div key={booking.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-base font-bold text-gray-900 block">{booking.shopName}</span>
                            <span className="text-xs font-medium text-gray-500 block mt-1">Booking ID: {booking.id} · {booking.dateTime}</span>
                          </div>
                          
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                            booking.status === 'COMPLETED' ? 'bg-green-100 text-green-800 border border-green-200' :
                            booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {booking.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm border-t border-gray-100 pt-4">
                          <span className="text-gray-600">Services: <span className="font-bold text-gray-900">{booking.services.join(', ')}</span></span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-gray-900">₹{booking.amount}</span>
                            <span className="text-xs font-medium text-gray-500 block mt-0.5">{booking.paymentMethod}</span>
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

              {/* 3. Refunds Tab */}
              {drawerTab === 'refunds' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Refund History</h3>
                    <p className="text-[10px] text-gray-400">Processed refunds for cancelled bookings</p>
                  </div>

                  <div className="space-y-3">
                    {selectedUser.refunds.map((refund) => (
                      <div key={refund.id} className="rounded-xl border border-gray-200 bg-gray-50/20 p-4 flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-900 block">Booking: #{refund.id.slice(-6).toUpperCase()}</span>
                          <span className="text-[10px] text-gray-500 block mt-0.5">Reason: {refund.reason}</span>
                          <span className="text-[10px] text-gray-500 block mt-1">{refund.dateTime}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-amber-400">₹{refund.amount}</span>
                          <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400 block mt-1">{refund.status}</span>
                        </div>
                      </div>
                    ))}
                    {selectedUser.refunds.length === 0 && (
                      <div className="py-8 text-center text-slate-650 text-xs italic">
                        No refunds found for this customer.
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 4. Complaints Tab */}
              {drawerTab === 'complaints' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Support Tickets</h3>
                    <p className="text-[10px] text-gray-400">Open & resolved complaints</p>
                  </div>

                  <div className="space-y-3">
                    {selectedUser.complaints.map((complaint) => (
                      <div key={complaint.id} className="rounded-xl border border-gray-200 bg-gray-50/20 p-4 flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-gray-900 block">{complaint.subject}</span>
                          <span className="text-[10px] text-gray-500 block mt-1">Ticket ID: {complaint.id} · {complaint.dateTime}</span>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          complaint.status.toLowerCase() === 'resolved' ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {complaint.status}
                        </span>
                      </div>
                    ))}
                    {selectedUser.complaints.length === 0 && (
                      <div className="py-8 text-center text-slate-650 text-xs italic">
                        No support tickets or complaints recorded.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. Activity Log & Account Safety Tab */}
              {drawerTab === 'activity' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Account Lock & Access Protection Control</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">Toggle this status to lock or unlock the user account immediately.</p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-gray-900 block">Account status:</span>
                        <span className="text-xs text-gray-500 mt-1 block max-w-sm">
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
                      <div className="border-t border-gray-200 pt-4 space-y-4 animate-fade-in">
                        <div className="flex items-start gap-2.5 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                          <span>
                            WARNING: Toggling user block parameters takes effect immediately. The user will be logged out of active mobile sessions and blocked from placing salon booking requests.
                          </span>
                        </div>

                        {selectedUser.status === 'active' && (
                          <div>
                            <label className="block text-[10px] font-semibold uppercase text-gray-400 mb-1.5">
                              Mandatory Auditor Reason for Lockout
                            </label>
                            <input
                              type="text"
                              required
                              value={lockReason}
                              onChange={(e) => setLockReason(e.target.value)}
                              placeholder="e.g. Suspected credit card abuse or spam booking creations."
                              className="w-full rounded border border-gray-200 bg-gray-50 py-1.5 px-3 text-xs text-gray-900 outline-none focus:border-black placeholder-slate-700"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => {
                              setShowLockConfirm(false);
                              setLockReason('');
                            }}
                            className="rounded border border-gray-200 bg-gray-50/20 text-gray-500 hover:bg-gray-100 text-xs font-semibold py-1.5 px-3 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={toggleAccountLock}
                            disabled={selectedUser.status === 'active' && !lockReason.trim()}
                            className={`rounded text-xs font-semibold py-1.5 px-4 text-gray-900 transition-colors ${
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
