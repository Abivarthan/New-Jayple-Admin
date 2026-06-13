import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, Eye, Power, AlertTriangle, Download, RefreshCw, X,
  Briefcase, MapPin, Phone, Mail, FileText, CheckCircle, Clock, Check, Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  fetchVendors, 
  setVendorStatus, 
  recomputeAllVendorRatings, 
  fetchVendorBookings,
  fetchVendorServices,
  fetchVendorSettlementData,
  fetchVendorSettlementHistory,
  processVendorSettlement,
  type AdminVendor,
  type AdminVendorBooking,
  type AdminVendorService
} from '../../services/adminDataService';

interface VendorDrawerData extends AdminVendor {
  bookings?: AdminVendorBooking[];
  services?: AdminVendorService[];
}

export const AllVendors: React.FC = () => {
  const qc = useQueryClient();
  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['adminVendors'], queryFn: fetchVendors });
  const statusMut = useMutation({
    mutationFn: ({ uid, status, reason }: { uid: string; status: AdminVendor['status']; reason?: string }) =>
      setVendorStatus(uid, status, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminVendors'] }),
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter States
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [suspendingVendor, setSuspendingVendor] = useState<AdminVendor | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Drawer states
  const [selectedVendor, setSelectedVendor] = useState<VendorDrawerData | null>(null);
  const [drawerTab, setDrawerTab] = useState<'business' | 'location' | 'services' | 'bookings' | 'finance' | 'documents'>('business');

  // Settlement states
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementNotes, setSettlementNotes] = useState('');
  
  const { data: settlementData, refetch: refetchSettlementData } = useQuery({
    queryKey: ['vendorSettlement', selectedVendor?.uid],
    queryFn: () => fetchVendorSettlementData(selectedVendor!.uid),
    enabled: !!selectedVendor && drawerTab === 'finance',
  });

  const { data: settlementHistory, refetch: refetchSettlementHistory } = useQuery({
    queryKey: ['vendorSettlementHistory', selectedVendor?.uid],
    queryFn: () => fetchVendorSettlementHistory(selectedVendor!.uid),
    enabled: !!selectedVendor && drawerTab === 'finance',
  });

  const settleMut = useMutation({
    mutationFn: () => processVendorSettlement(
      selectedVendor!.uid,
      selectedVendor!.shopName,
      settlementData!,
      settlementNotes,
      'Admin'
    ),
    onSuccess: () => {
      toast.success('Settlement processed successfully');
      setIsSettlementModalOpen(false);
      setSettlementNotes('');
      qc.invalidateQueries({ queryKey: ['adminVendors'] });
      refetchSettlementData();
      refetchSettlementHistory();
    },
    onError: (e: any) => {
      toast.error(e.message || 'Settlement failed');
    }
  });

  const syncRatingsMut = useMutation({
    mutationFn: recomputeAllVendorRatings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminVendors'] }),
  });

  const handleToggleStatus = (vendor: AdminVendor) => {
    if (vendor.status === 'active') {
      setSuspendingVendor(vendor);
      setSuspendReason('');
    } else {
      statusMut.mutate({ uid: vendor.uid, status: 'active' });
    }
  };

  const executeSuspend = () => {
    if (suspendingVendor && suspendReason.trim()) {
      statusMut.mutate({ uid: suspendingVendor.uid, status: 'suspended', reason: suspendReason.trim() });
      toast.success('Vendor suspended successfully');
      setSuspendingVendor(null);
    }
  };

  const openVendorDrawer = async (vendor: AdminVendor) => {
    setSelectedVendor(vendor);
    setDrawerTab('business');
    try {
      const [bookings, services] = await Promise.all([
        fetchVendorBookings(vendor.uid),
        fetchVendorServices(vendor.uid)
      ]);
      setSelectedVendor((prev) => prev && prev.uid === vendor.uid ? {
        ...prev, bookings, services
      } : prev);
    } catch (e) {
      console.error("Error fetching vendor details", e);
    }
  };

  // Filter evaluation logic
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.phone.includes(searchQuery) ||
      (v.email && v.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCity = filterCity === 'ALL' || v.city === filterCity;
    const matchesStatus = filterStatus === 'ALL' || v.status === filterStatus.toLowerCase();

    return matchesSearch && matchesCity && matchesStatus;
  });

  const cities = Array.from(new Set(vendors.map(v => v.city).filter(Boolean))).sort();

  return (
    <div className="space-y-6 relative min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vendors List</h1>
          <p className="text-sm text-gray-500">Search and monitor active vendors across cities.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => syncRatingsMut.mutate()}
            disabled={syncRatingsMut.isPending}
            title="Recompute every vendor's rating"
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncRatingsMut.isPending ? 'animate-spin' : ''} />
            {syncRatingsMut.isPending ? 'Syncing…' : 'Sync Data'}
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 text-sm font-semibold transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Filter Options grid */}
      <div className="grid gap-4 sm:grid-cols-3 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop name, owner, phone..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs text-gray-900 placeholder-slate-500 outline-none focus:border-black transition-colors"
          />
        </div>

        <div>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs text-gray-500 outline-none focus:border-black"
          >
            <option value="ALL">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs text-gray-500 outline-none focus:border-black"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending Approval</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm font-semibold">
              <th className="py-4 px-6">Vendor Details</th>
              <th className="py-4 px-6">Owner Info</th>
              <th className="py-4 px-6">Service Category</th>
              <th className="py-4 px-6">Location</th>
              <th className="py-4 px-6 text-center">Active Bookings</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {filteredVendors.map((v) => (
              <tr key={v.uid} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openVendorDrawer(v)}>
                <td className="py-4 px-6">
                  <span className="font-bold text-gray-900 block text-base">{v.shopName}</span>
                  <span className="text-xs font-medium text-gray-500 mt-1 block">ID: {v.uid.slice(-6).toUpperCase()}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="block text-gray-900 font-bold">{v.ownerName}</span>
                  <span className="text-xs font-medium text-gray-500 block mt-0.5">+{v.phone}</span>
                  {v.alternatePhone && <span className="text-xs font-medium text-gray-500 block">Alt: +{v.alternatePhone}</span>}
                  {v.email && <span className="text-xs font-medium text-gray-900 block mt-0.5">{v.email}</span>}
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200">{v.primaryCategory}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="block text-gray-900 font-medium">{v.city}</span>
                  <span className="text-xs font-medium text-gray-500 block mt-0.5">{v.area}</span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className={`font-bold text-base ${v.ongoingBookings > 0 ? 'text-amber-500' : 'text-gray-500'}`}>{v.ongoingBookings}</span>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    v.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' :
                    v.status === 'suspended' || v.status === 'blocked' ? 'bg-red-100 text-red-800 border border-red-200' :
                    'bg-orange-100 text-orange-800 border border-orange-200'
                  }`}>
                    {v.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button onClick={(e) => { e.stopPropagation(); openVendorDrawer(v); }} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 px-4 py-2 ml-auto transition-colors" title="View Details">
                    <Eye size={16} /> View
                  </button>
                </td>
              </tr>
            ))}
            {filteredVendors.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Store size={48} className="text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900">{isLoading ? 'Loading vendors…' : 'No vendors matched the criteria.'}</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out Drawer */}
      {selectedVendor && (
        <>
          <div className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedVendor(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white border-l border-gray-200 shadow-2xl overflow-y-auto transform transition-all duration-300 ease-out flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-gray-100 border border-gray-200 p-3 text-gray-900 font-semibold">
                  <Store size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">{selectedVendor.shopName}</h2>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      selectedVendor.status === 'active' ? 'bg-green-100 text-green-800 border border-green-200' :
                      'bg-orange-100 text-orange-800 border border-orange-200'
                    }`}>
                      {selectedVendor.status}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500 mt-1 block">ID: {selectedVendor.uid}</span>
                </div>
              </div>
              <button onClick={() => setSelectedVendor(null)} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 px-6 bg-gray-50/50 overflow-x-auto scrollbar-hide">
              {(['business', 'location', 'services', 'bookings', 'finance', 'documents'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  className={`flex shrink-0 items-center gap-2 py-4 px-3 text-sm font-bold border-b-2 capitalize transition-all ${
                    drawerTab === tab ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab === 'business' && <Briefcase size={16} />}
                  {tab === 'location' && <MapPin size={16} />}
                  {tab === 'services' && <CheckCircle size={16} />}
                  {tab === 'bookings' && <Clock size={16} />}
                  {tab === 'finance' && <FileText size={16} />}
                  {tab === 'documents' && <Check size={16} />}
                  {tab}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              
              {/* Business Info Tab */}
              {drawerTab === 'business' && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Business Name</span>
                      <span className="text-base font-semibold text-gray-900">{selectedVendor.shopName}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Owner Name</span>
                      <span className="text-base font-semibold text-gray-900">{selectedVendor.ownerName}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Primary Mobile</span>
                      <span className="text-base font-semibold text-gray-900 flex items-center gap-2"><Phone size={16} className="text-gray-400"/> +{selectedVendor.phone}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Alternate Mobile</span>
                      <span className="text-base font-semibold text-gray-900 flex items-center gap-2"><Phone size={16} className="text-gray-400"/> {selectedVendor.alternatePhone ? `+${selectedVendor.alternatePhone}` : 'Not Provided'}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Email Address</span>
                      <span className="text-base font-semibold text-gray-900 flex items-center gap-2"><Mail size={16} className="text-gray-400"/> {selectedVendor.email || 'Not Provided'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Info Tab */}
              {drawerTab === 'location' && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:col-span-2">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Full Address</span>
                      <span className="text-base font-semibold text-gray-900">{selectedVendor.address || 'Address not provided'}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">City</span>
                      <span className="text-base font-semibold text-gray-900">{selectedVendor.city || 'N/A'}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">State</span>
                      <span className="text-base font-semibold text-gray-900">{selectedVendor.state || 'N/A'}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Pincode</span>
                      <span className="text-base font-semibold text-gray-900">{selectedVendor.pincode || 'N/A'}</span>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Coordinates</span>
                      <span className="text-sm font-mono text-gray-800">{selectedVendor.latitude}, {selectedVendor.longitude}</span>
                    </div>
                  </div>
                  
                  {/* Map Preview Placeholder */}
                  <div className="w-full h-48 rounded-xl border border-gray-200 bg-gray-50/50 flex items-center justify-center overflow-hidden relative">
                    <MapPin size={32} className="text-gray-400 z-10" />
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                    <span className="absolute bottom-4 right-4 text-[10px] text-gray-500">Google Map Preview Area</span>
                  </div>
                </div>
              )}

              {/* Services Info Tab */}
              {drawerTab === 'services' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 mb-6">
                    <span className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Primary Category</span>
                    <span className="text-sm font-medium text-gray-900">{selectedVendor.primaryCategory}</span>
                  </div>

                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">Offered Services ({selectedVendor.services?.length || 0})</h3>
                  <div className="space-y-2">
                    {selectedVendor.services?.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white">
                        <div>
                          <span className="text-sm font-semibold text-gray-900 block">{s.name}</span>
                          <span className="text-[10px] text-gray-500">{s.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900 block">₹{s.price}</span>
                          <span className={`text-[10px] font-bold uppercase ${s.isActive ? 'text-emerald-400' : 'text-gray-500'}`}>{s.isActive ? 'Active' : 'Hidden'}</span>
                        </div>
                      </div>
                    ))}
                    {(!selectedVendor.services || selectedVendor.services.length === 0) && (
                      <div className="text-center py-6 text-xs text-gray-500 italic">No services listed yet.</div>
                    )}
                  </div>
                </div>
              )}

              {/* Bookings Stats Tab */}
              {drawerTab === 'bookings' && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <span className="text-xs uppercase font-bold text-gray-500 block mb-1">Total Lifetime</span>
                      <span className="text-2xl font-bold text-gray-900">{selectedVendor.bookingsCount}</span>
                    </div>
                    <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                      <span className="text-xs uppercase font-bold text-green-700 block mb-1">Completed</span>
                      <span className="text-2xl font-bold text-green-800">{selectedVendor.completedBookings}</span>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                      <span className="text-xs uppercase font-bold text-red-700 block mb-1">Cancelled</span>
                      <span className="text-2xl font-bold text-red-800">{selectedVendor.cancelledBookings}</span>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                      <span className="text-xs uppercase font-bold text-amber-700 block mb-1">Ongoing</span>
                      <span className="text-2xl font-bold text-amber-800">{selectedVendor.ongoingBookings}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Recent Booking Logs</h3>
                    <div className="space-y-4">
                      {selectedVendor.bookings?.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div>
                            <span className="text-sm font-bold text-gray-900 block">{b.customerName}</span>
                            <span className="text-xs font-medium text-gray-500 mt-1">{b.dateTime} · ID: {b.id.slice(-6).toUpperCase()}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-bold text-gray-900 block">₹{b.amount}</span>
                            <span className={`text-[10px] font-bold uppercase mt-1 inline-block px-2 py-0.5 rounded-full ${b.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : b.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{b.status}</span>
                          </div>
                        </div>
                      ))}
                      {(!selectedVendor.bookings || selectedVendor.bookings.length === 0) && (
                        <div className="text-center py-6 text-sm text-gray-500 italic">No bookings found.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Info Tab */}
              {drawerTab === 'finance' && (
                <div className="space-y-6">
                  {/* Settlement Dashboard */}
                  {settlementData ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                          <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Total Lifetime Earnings</span>
                          <span className="text-3xl font-bold text-gray-900">₹{settlementData.totalLifetimeEarnings.toLocaleString()}</span>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                          <span className="text-xs uppercase font-bold text-gray-500 block mb-2">Platform Commission Rate</span>
                          <span className="text-3xl font-bold text-black font-semibold">{settlementData.commissionRate}%</span>
                        </div>
                        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                          <span className="text-xs uppercase font-bold text-green-700 block mb-2">Total Settlements Paid</span>
                          <span className="text-3xl font-bold text-green-800">₹{settlementData.totalSettlementsPaid.toLocaleString()}</span>
                          <span className="text-xs font-medium text-green-700 block mt-2">Last Settled: {settlementData.lastSettlementDate ? new Date(settlementData.lastSettlementDate).toLocaleDateString() : 'Never'}</span>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                          <div className="flex flex-col xl:flex-row justify-between items-start gap-4">
                            <div>
                              <span className="text-xs uppercase font-bold text-amber-700 block mb-2">Pending Settlement</span>
                              <span className="text-3xl font-bold text-amber-800">₹{settlementData.netSettlementAmount.toLocaleString()}</span>
                              <span className="text-xs font-medium text-amber-700 block mt-2">Included Bookings: {settlementData.includedBookingIds.length}</span>
                            </div>
                            
                            {settlementData.netSettlementAmount > 0 && (
                              <button 
                                onClick={() => setIsSettlementModalOpen(true)}
                                className="shrink-0 px-4 py-2 bg-black text-white rounded-lg text-sm font-bold shadow-md hover:bg-gray-900 transition-colors mt-2 xl:mt-0"
                              >
                                Settle Amount
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Settlement History */}
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4 mt-8">Settlement History</h3>
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-xs font-semibold uppercase">
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4 text-right">Gross Rev.</th>
                                <th className="py-3 px-4 text-right">Commission</th>
                                <th className="py-3 px-4 text-right">Net Settled</th>
                                <th className="py-3 px-4">Settled By</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                              {settlementHistory?.map(sh => (
                                <tr key={sh.id} className="hover:bg-gray-50">
                                  <td className="py-3 px-4 font-medium text-gray-900">{sh.date}<br/><span className="text-[10px] text-gray-500 font-mono">{sh.id.slice(0,8)}</span></td>
                                  <td className="py-3 px-4 text-right">₹{sh.grossRevenue.toLocaleString()}</td>
                                  <td className="py-3 px-4 text-right text-red-600">-₹{sh.commissionAmount.toLocaleString()}</td>
                                  <td className="py-3 px-4 text-right font-bold text-green-700">₹{sh.netSettlement.toLocaleString()}</td>
                                  <td className="py-3 px-4 text-gray-500 text-xs">{sh.settledBy}</td>
                                </tr>
                              ))}
                              {(!settlementHistory || settlementHistory.length === 0) && (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">No past settlements found.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-gray-500">Loading settlement data...</div>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {drawerTab === 'documents' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                    <span className="text-base font-semibold text-gray-900">KYC Verification Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      selectedVendor.documents?.verificationStatus === 'verified' ? 'bg-green-100 text-green-800 border border-green-200' :
                      selectedVendor.documents?.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                      'bg-orange-100 text-orange-800 border border-orange-200'
                    }`}>
                      {selectedVendor.documents?.verificationStatus || 'PENDING'}
                    </span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900">GST Document</h4>
                      {selectedVendor.documents?.gst ? (
                        <>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-mono text-gray-900">{selectedVendor.documents.gst}</div>
                          <button className="text-sm text-black font-semibold hover:text-black font-semibold flex items-center gap-1.5"><Eye size={16}/> View Uploaded File</button>
                        </>
                      ) : <span className="text-sm text-gray-500 italic">Not uploaded</span>}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900">PAN Card</h4>
                      {selectedVendor.documents?.pan ? (
                        <>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-mono text-gray-900">{selectedVendor.documents.pan}</div>
                          <button className="text-sm text-black font-semibold hover:text-black font-semibold flex items-center gap-1.5"><Eye size={16}/> View Uploaded File</button>
                        </>
                      ) : <span className="text-sm text-gray-500 italic">Not uploaded</span>}
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4 sm:col-span-2">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-gray-900">Business/Trade License</h4>
                      {selectedVendor.documents?.license ? (
                        <>
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm font-mono text-gray-900">{selectedVendor.documents.license}</div>
                          <button className="text-sm text-black font-semibold hover:text-black font-semibold flex items-center gap-1.5"><Eye size={16}/> View Uploaded File</button>
                        </>
                      ) : <span className="text-sm text-gray-500 italic">Not uploaded</span>}
                    </div>
                  </div>

                  {/* Override Actions */}
                  <div className="border-t border-gray-200 pt-8 mt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-4">Admin Overrides</h3>
                    <div className="flex gap-3">
                      {selectedVendor.status === 'active' ? (
                        <button onClick={() => setSuspendingVendor(selectedVendor)} className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold transition-colors hover:bg-red-700">
                          Suspend Vendor Account
                        </button>
                      ) : (
                        <button onClick={() => handleToggleStatus(selectedVendor)} className="px-5 py-2.5 bg-black text-white rounded-lg text-sm font-bold transition-colors hover:bg-gray-900">
                          Re-activate Account
                        </button>
                      )}
                    </div>

                    {suspendingVendor?.uid === selectedVendor.uid && (
                      <div className="mt-6 p-6 rounded-xl border border-red-200 bg-red-50 space-y-4">
                        <label className="block text-sm font-bold uppercase text-gray-900">Reason for suspension (required)</label>
                        <input
                          type="text"
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                          placeholder="e.g. Repeated customer complaints"
                          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />
                        <div className="flex gap-3 justify-end pt-2">
                          <button onClick={() => setSuspendingVendor(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg">Cancel</button>
                          <button onClick={executeSuspend} disabled={!suspendReason.trim()} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold disabled:opacity-50 transition-colors">Confirm Suspension</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}      {/* Settlement Confirmation Modal */}
      {isSettlementModalOpen && selectedVendor && settlementData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><CheckCircle size={20} className="text-green-600" /> Confirm Settlement</h3>
              <button onClick={() => setIsSettlementModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Vendor:</span>
                  <span className="font-bold text-gray-900">{selectedVendor.shopName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Vendor ID:</span>
                  <span className="font-mono text-gray-900">{selectedVendor.uid}</span>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Included Bookings:</span>
                  <span className="font-bold text-gray-900">{settlementData.includedBookingIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Gross Revenue:</span>
                  <span className="font-bold text-gray-900">₹{settlementData.grossRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="font-medium">Platform Commission ({settlementData.commissionRate}%):</span>
                  <span className="font-bold">-₹{settlementData.commissionAmount.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="flex justify-between text-lg">
                  <span className="text-gray-900 font-bold">Net Settlement:</span>
                  <span className="font-black text-green-700">₹{settlementData.netSettlementAmount.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-2">Payment Reference / Notes</label>
                <input
                  type="text"
                  value={settlementNotes}
                  onChange={(e) => setSettlementNotes(e.target.value)}
                  placeholder="e.g. UTR / Bank Ref Number"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3 justify-end">
              <button 
                onClick={() => setIsSettlementModalOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg transition-colors"
                disabled={settleMut.isPending}
              >
                Cancel
              </button>
              <button 
                onClick={() => settleMut.mutate()}
                disabled={settleMut.isPending}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {settleMut.isPending ? 'Processing...' : 'Confirm Settlement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
