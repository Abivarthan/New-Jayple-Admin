import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Power, AlertTriangle, Download, Plus } from 'lucide-react';
import { fetchVendors, setVendorStatus, type AdminVendor } from '../../services/adminDataService';

type VendorListItem = AdminVendor;

export const AllVendors: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['adminVendors'], queryFn: fetchVendors });
  const statusMut = useMutation({
    mutationFn: ({ uid, status, reason }: { uid: string; status: AdminVendor['status']; reason?: string }) =>
      setVendorStatus(uid, status, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['adminVendors'] }),
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter States
  const [filterZone, setFilterZone] = useState('ALL');
  const [filterTier, setFilterTier] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterGst, setFilterGst] = useState('ALL');

  const [suspendingVendor, setSuspendingVendor] = useState<VendorListItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const handleToggleStatus = (vendor: VendorListItem) => {
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
      setSuspendingVendor(null);
    }
  };

  // Filter evaluation logic
  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.phone.includes(searchQuery);

    const matchesZone = filterZone === 'ALL' || v.zoneName === filterZone;
    const matchesTier = filterTier === 'ALL' || v.tier === filterTier.toLowerCase();
    const matchesStatus = filterStatus === 'ALL' || v.status === filterStatus.toLowerCase();
    const matchesGst =
      filterGst === 'ALL' ||
      (filterGst === 'GST' && v.isGstRegistered) ||
      (filterGst === 'NON-GST' && !v.isGstRegistered);

    return matchesSearch && matchesZone && matchesTier && matchesStatus && matchesGst;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">All Registered Vendors</h1>
          <p className="text-sm text-slate-400">Search, monitor, suspend, or override platform status parameters for merchants.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendors/approvals')}
            className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-violet-600/10"
          >
            <Plus size={16} />
            Onboarding Approvals
          </button>
          <button className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-750 text-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Options grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-6 bg-slate-800 p-4 rounded-xl border border-slate-600">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop name, owner, phone..."
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Zone */}
        <div>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500"
          >
            <option value="ALL">All Zones</option>
            <option value="Chennai Central">Chennai Central</option>
            <option value="Trichy East">Trichy East</option>
          </select>
        </div>

        {/* Tier */}
        <div>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500"
          >
            <option value="ALL">All Tiers</option>
            <option value="PREMIUM">Premium</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

        {/* GST */}
        <div>
          <select
            value={filterGst}
            onChange={(e) => setFilterGst(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500"
          >
            <option value="ALL">All Tax Statuses</option>
            <option value="GST">GST Registered</option>
            <option value="NON-GST">Non-GST</option>
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-600 bg-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
              <th className="py-4 px-6">Shop Name</th>
              <th className="py-4 px-6">Owner details</th>
              <th className="py-4 px-6">Zone</th>
              <th className="py-4 px-6">Tier</th>
              <th className="py-4 px-6 text-center">Rating</th>
              <th className="py-4 px-6 text-center">Bookings</th>
              <th className="py-4 px-6 text-right">Weekly Net</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm text-slate-350">
            {filteredVendors.map((vendor) => (
              <tr key={vendor.uid} className="hover:bg-[#0f172a]/10 transition-colors">
                <td className="py-4 px-6">
                  <div>
                    <span className="font-semibold text-slate-200 block">{vendor.shopName}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">{vendor.uid}</span>
                    <span
                      className={`mt-1 inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                        vendor.isGstRegistered
                          ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30'
                          : 'bg-slate-700 text-slate-400 border border-slate-600'
                      }`}
                    >
                      {vendor.isGstRegistered ? 'GST' : 'Non-GST'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <p className="text-slate-300">{vendor.ownerName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">+91 {vendor.phone}</p>
                  </div>
                </td>
                <td className="py-4 px-6 text-xs">{vendor.zoneName}</td>
                <td className="py-4 px-6">
                  <span
                    className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                      vendor.tier === 'premium'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-700 text-slate-400 border border-slate-750'
                    }`}
                  >
                    {vendor.tier}
                  </span>
                </td>
                <td className="py-4 px-6 text-center font-bold text-slate-200">
                  ⭐ {vendor.rating.toFixed(1)}
                </td>
                <td className="py-4 px-6 text-center font-medium">{vendor.bookingsCount}</td>
                <td className="py-4 px-6 text-right font-semibold text-slate-200">
                  ₹{vendor.weeklyEarnings.toLocaleString()}
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      vendor.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : vendor.status === 'suspended'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      vendor.status === 'active'
                        ? 'bg-emerald-500'
                        : vendor.status === 'suspended'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`} />
                    <span className="capitalize">{vendor.status}</span>
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/vendors/${vendor.uid}`)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                      title="View Full Profile Details"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(vendor)}
                      className={`rounded p-1.5 transition-colors ${
                        vendor.status === 'active'
                          ? 'text-amber-500 hover:bg-amber-950/20'
                          : 'text-emerald-500 hover:bg-emerald-950/20'
                      }`}
                      title={vendor.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                    >
                      <Power size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredVendors.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  {isLoading ? 'Loading vendors…' : 'No matching vendors found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Suspend Vendor Action Dialog */}
      {suspendingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-amber-455">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
              <h3 className="text-lg font-bold text-slate-100">Suspend Vendor Account</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Confirm suspending <span className="text-slate-200 font-semibold">{suspendingVendor.shopName}</span>. 
              This will block them from receiving new client bookings and hide their card from search listings.
            </p>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Reason for Suspension</label>
              <textarea
                required
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Multiple booking cancellations or customer support complaints."
                className="w-full h-24 rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-slate-200 outline-none focus:border-violet-500 placeholder-slate-650 resize-none text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setSuspendingVendor(null)}
                className="rounded-lg border border-slate-700 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-xs font-semibold py-2 px-4 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeSuspend}
                disabled={!suspendReason.trim()}
                className="rounded-lg bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-xs font-semibold text-white py-2 px-4 transition-colors disabled:opacity-50"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
