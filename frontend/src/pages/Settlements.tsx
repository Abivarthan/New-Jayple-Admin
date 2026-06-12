import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, Download, Play, CheckCircle2, Clock,
  Search, Eye, Check, X, RefreshCw, AlertTriangle, FileText, Banknote, HelpCircle, Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchSettlements, runSettlements, markSettlementPaid } from '../services/adminDataService';
import type { AdminSettlement } from '../services/adminDataService';

export const Settlements: React.FC = () => {
  const [settlements, setSettlements] = useState<AdminSettlement[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  
  const load = useCallback(async () => {
    setLoadingList(true);
    try {
      setSettlements(await fetchSettlements());
    } finally {
      setLoadingList(false);
    }
  }, []);
  
  useEffect(() => { load(); }, [load]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterWeek, setFilterWeek] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Settlement detail modal state
  const [selectedSettlement, setSelectedSettlement] = useState<AdminSettlement | null>(null);

  // Settlement Execution Run Simulation States
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runStep, setRunStep] = useState<number>(0);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Manual payment state
  const [approvingItem, setApprovingItem] = useState<AdminSettlement | null>(null);
  const [payoutTxnId, setPayoutTxnId] = useState('');
  
  const triggerToast = (msg: string) => {
    toast.success(msg);
  };

  const handleExecuteWeeklyRun = async () => {
    setIsRunning(true);
    setRunStep(1);
    setRunLog(['[INIT] Calling runWeeklySettlements…']);
    try {
      const res = await runSettlements();
      const data = (res.data as { processed?: number; weekId?: string }) || {};
      setRunStep(5);
      setRunLog((prev) => [
        ...prev,
        `[SUCCESS] Processed ${data.processed ?? 0} vendor ledger(s) for week ${data.weekId ?? ''}.`,
        '[INFO] Payouts ≥ ₹500 are now PENDING; smaller balances carried forward.',
        '[COMPLETE] Settlement run finished.',
      ]);
      await load();
    } catch (err) {
      setRunStep(5);
      setRunLog((prev) => [...prev, `[ERROR] ${err instanceof Error ? err.message : 'Run failed'}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const finalizeWeeklyRun = () => {
    setRunModalOpen(false);
    setRunStep(0);
    setRunLog([]);
    triggerToast('Settlement run complete — payout list refreshed.');
  };

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingItem || !payoutTxnId.trim()) return;
    try {
      await markSettlementPaid(approvingItem.vendorId, approvingItem.id, payoutTxnId.trim());
      toast.success(`Payout ${approvingItem.id} marked as PAID.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark paid');
    } finally {
      setApprovingItem(null);
      setPayoutTxnId('');
    }
  };

  const handleExportCSV = () => {
    const headers = 'Settlement_ID,Merchant_Name,Bank_Account_Number,IFSC_Code,Holder_Name,Net_Payout_Amount,Week_Key\n';
    const rows = filteredSettlements
      .filter((s) => s.status === 'PENDING')
      .map((s) => `"${s.id}","${s.shopName}","${s.bankAccount.accountNumber}","${s.bankAccount.ifscCode}","${s.bankAccount.holderName}",${s.netPayoutDue},"${s.weekKey}"`)
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jayple_Weekly_Payouts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Bank Payout CSV file exported successfully!');
  };

  // Filter evaluation logic
  const filteredSettlements = settlements.filter((s) => {
    const matchesSearch =
      s.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vendorId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vendorPhone.includes(searchQuery);

    const matchesWeek = filterWeek === 'ALL' || s.weekKey === filterWeek;
    const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus.toUpperCase();
    const matchesCity = filterCity === 'ALL' || s.vendorCity === filterCity;
    const matchesCategory = filterCategory === 'ALL' || s.vendorCategory === filterCategory;

    return matchesSearch && matchesWeek && matchesStatus && matchesCity && matchesCategory;
  });

  const cities = Array.from(new Set(settlements.map(s => s.vendorCity).filter(Boolean))).sort();
  const categories = Array.from(new Set(settlements.map(s => s.vendorCategory).filter(Boolean))).sort();
  const weeks = Array.from(new Set(settlements.map(s => s.weekKey).filter(Boolean))).sort((a, b) => b.localeCompare(a));

  // KPI Pool Computations
  const totalPaid = settlements.filter((s) => s.status === 'PAID').reduce((sum, item) => sum + item.netPayoutDue, 0);
  const pendingSettlements = settlements.filter((s) => s.status === 'PENDING').reduce((sum, item) => sum + item.netPayoutDue, 0);
  const totalPayable = totalPaid + pendingSettlements;
  const failedSettlements = settlements.filter((s) => s.status === 'FAILED').reduce((sum, item) => sum + item.netPayoutDue, 0);

  return (
    <div className="space-y-6 relative pb-12">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Vendor Settlements</h1>
          <p className="text-sm text-gray-500">Compute weekly ledger settlements, verify thresholds, and clear bank payouts.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRunModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-black hover:bg-gray-900 text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Play size={16} className="fill-current" />
            Run Settlement
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 text-sm font-semibold transition-colors"
          >
            <Download size={16} />
            Export Bank CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Payable</span>
            <div className="rounded-full bg-gray-100 text-gray-600 border border-gray-200 p-2">
              <Banknote size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900">₹{totalPayable.toLocaleString()}</h3>
          <p className="text-xs font-medium text-gray-500">Gross total generated for payout</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Paid</span>
            <div className="rounded-full bg-green-50 text-green-600 border border-green-200 p-2">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</h3>
          <p className="text-xs font-medium text-gray-500">Cleared and deposited to bank</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Pending</span>
            <div className="rounded-full bg-orange-50 text-orange-600 border border-orange-200 p-2">
              <Clock size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-orange-600">₹{pendingSettlements.toLocaleString()}</h3>
          <p className="text-xs font-medium text-gray-500">Queued for the next bank clearing cycle</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Failed</span>
            <div className="rounded-full bg-red-50 text-red-600 border border-red-200 p-2">
              <AlertTriangle size={16} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-red-600">₹{failedSettlements.toLocaleString()}</h3>
          <p className="text-xs font-medium text-gray-500">Bank reversals or errors</p>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 bg-white p-4 rounded-xl border border-gray-200">
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by vendor, ID, phone..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-xs text-gray-900 placeholder-slate-500 outline-none focus:border-black transition-colors"
          />
        </div>

        <div>
          <select value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs text-gray-500 outline-none focus:border-black cursor-pointer">
            <option value="ALL">All Periods</option>
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        <div>
          <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs text-gray-500 outline-none focus:border-black cursor-pointer">
            <option value="ALL">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        
        <div>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-3 text-xs text-gray-500 outline-none focus:border-black cursor-pointer">
            <option value="ALL">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="md:col-span-5 border-t border-gray-200 pt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase font-bold tracking-wider text-gray-500">Status:</span>
          {(['ALL', 'PENDING', 'PROCESSING', 'PAID', 'FAILED'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors border ${
              filterStatus === s ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Settlements Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-600 text-sm font-semibold">
              <th className="py-4 px-6">Vendor & Settlement ID</th>
              <th className="py-4 px-6 text-center">Bookings</th>
              <th className="py-4 px-6 text-right">Gross Revenue</th>
              <th className="py-4 px-6 text-right">Platform Comm.</th>
              <th className="py-4 px-6 text-right font-bold text-gray-900">Net Payable</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Settled Date</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {filteredSettlements.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6">
                  <span className="font-bold text-gray-900 block text-base">{s.shopName}</span>
                  <span className="text-xs font-medium text-gray-500 mt-1 block">+{s.vendorPhone}</span>
                  <span className="text-xs text-gray-500 font-medium mt-0.5 block">ID: {s.id.slice(-8).toUpperCase()}</span>
                </td>
                <td className="py-4 px-6 text-center font-bold text-gray-900 text-base">{s.bookingCount}</td>
                <td className="py-4 px-6 text-right font-medium text-gray-900 text-base">₹{s.grossEarnings.toLocaleString()}</td>
                <td className="py-4 px-6 text-right text-red-600 font-medium text-base">-₹{s.commissionPaid.toLocaleString()}</td>
                <td className="py-4 px-6 text-right font-bold text-green-700 text-base">₹{s.netPayoutDue.toLocaleString()}</td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    s.status === 'PAID' ? 'bg-green-100 text-green-800 border border-green-200' : 
                    s.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 
                    s.status === 'FAILED' ? 'bg-red-100 text-red-800 border border-red-200' :
                    'bg-orange-100 text-orange-800 border border-orange-200'
                  }`}>
                    {s.status === 'PENDING' ? 'Pending Bank File' : s.status}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm font-medium text-gray-600">
                  {s.processedAt || s.weekKey}
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setSelectedSettlement(s)} className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 px-3 py-1.5 text-xs font-semibold transition-colors" title="Inspect Payout">
                      <Eye size={16} />
                    </button>
                    {s.status === 'PENDING' && (
                      <button onClick={() => setApprovingItem(s)} className="flex items-center gap-1.5 rounded-lg bg-black text-white hover:bg-gray-900 px-3 py-1.5 text-xs font-semibold transition-colors" title="Mark Paid">
                        <Check size={14} /> Clear
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredSettlements.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Receipt size={48} className="text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-900">{loadingList ? 'Loading settlements…' : 'No settlements found'}</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedSettlement.shopName}</h3>
                <span className="text-[10px] text-gray-500 block mt-0.5">Settlement ID: {selectedSettlement.id} · Period: {selectedSettlement.weekKey}</span>
              </div>
              <button onClick={() => setSelectedSettlement(null)} className="rounded-lg border border-gray-200 bg-gray-50/30 p-2 text-gray-500 hover:text-gray-900 transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <IndianRupee size={14} className="text-black font-semibold" />
                <span>Vendor Details</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Vendor Phone</span>
                  <span className="font-semibold text-gray-900">+{selectedSettlement.vendorPhone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Service Category</span>
                  <span className="font-semibold text-gray-900">{selectedSettlement.vendorCategory}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Settlement Ledger Computation</span>
              <div className="rounded-xl border border-gray-200 divide-y divide-slate-850/80 bg-gray-50/10 text-xs">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-gray-500">Total Bookings Completed</span>
                  <span className="font-bold text-gray-900">{selectedSettlement.bookingCount}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-gray-500">Gross Weekly Revenue</span>
                  <span className="font-bold text-gray-900">₹{selectedSettlement.grossEarnings.toLocaleString()}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5">Platform Commission</span>
                  <span className="font-bold text-rose-450">-₹{selectedSettlement.commissionPaid.toLocaleString()}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-gray-500">Cash-on-Delivery Offset</span>
                  <span className="font-bold text-amber-500">-₹{selectedSettlement.codCollected.toLocaleString()}</span>
                </div>
                <div className="p-3.5 flex items-center justify-between bg-gray-50/20 border-t border-gray-200">
                  <span className="font-bold text-gray-800">Net Payable Amount</span>
                  <span className="font-extrabold text-emerald-400 text-sm">₹{selectedSettlement.netPayoutDue.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* Bank details card */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                <Banknote size={12} className="text-emerald-400" />
                <span>Beneficiary Bank Account</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Holder Name</span>
                  <span className="font-semibold text-gray-900">{selectedSettlement.bankAccount.holderName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Account Number</span>
                  <span className="font-semibold text-gray-900 select-all font-mono">{selectedSettlement.bankAccount.accountNumber}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">IFSC Code</span>
                  <span className="font-semibold text-gray-900 select-all font-mono">{selectedSettlement.bankAccount.ifscCode}</span>
                </div>
              </div>
            </div>

            {selectedSettlement.status === 'PAID' && (
              <div className="rounded-xl border border-emerald-950/30 bg-emerald-950/10 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                  <CheckCircle2 size={14} />
                  <span>Clearing Reference Recorded</span>
                </div>
                <div className="grid gap-2 text-gray-500 mt-2">
                  <p>Bank Ref ID: <span className="font-semibold text-gray-900 select-all font-mono">{selectedSettlement.paymentTxnId}</span></p>
                  <p>Cleared on: <span className="font-semibold text-gray-900">{selectedSettlement.processedAt}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clearing Modal */}
      {approvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2.5"><Check size={18} /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Clear Settlement Payout</h3>
                <p className="text-xs text-gray-500 mt-0.5">Logs manual bank wire clearances once paid.</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed bg-gray-50/40 p-4 border border-gray-200 rounded-lg">
              Confirm that a bank transfer of <span className="text-emerald-400 font-bold">₹{approvingItem.netPayoutDue.toLocaleString()}</span> has been successfully cleared to <span className="text-gray-900 font-bold">{approvingItem.shopName}</span>'s bank account:
              <span className="block mt-2.5 font-mono text-[11px] text-gray-600">A/C: {approvingItem.bankAccount.accountNumber} · IFSC: {approvingItem.bankAccount.ifscCode}</span>
            </p>
            <form onSubmit={handleMarkAsPaid} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Bank Reference Transaction ID</label>
                <input type="text" required value={payoutTxnId} onChange={(e) => setPayoutTxnId(e.target.value)} placeholder="e.g. UTR128821900192" className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 px-4 text-gray-900 outline-none focus:border-black placeholder-slate-700 text-sm font-mono" />
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
                <button type="button" onClick={() => setApprovingItem(null)} className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 text-sm font-semibold transition-colors">Cancel</button>
                <button type="submit" disabled={!payoutTxnId.trim()} className="rounded-xl bg-black hover:bg-gray-900 text-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50">Confirm Payout Paid</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {runModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl space-y-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-black text-white text-black font-semibold border border-black p-2.5"><Play size={20} /></div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Run Weekly Payout Settlement</h3>
                <p className="text-xs text-gray-500 mt-0.5">Evaluates current ledger states and triggers settlement function.</p>
              </div>
            </div>

            {runStep > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-450 font-bold uppercase tracking-wide">Processing Pipeline</span>
                  <span className="text-black font-semibold font-bold">Step {runStep} of 5</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((stepNum) => (
                    <div key={stepNum} className={`h-1.5 rounded-full transition-all ${runStep >= stepNum ? stepNum === 5 && !isRunning ? 'bg-emerald-500' : 'bg-black text-white' : 'bg-slate-700'}`} />
                  ))}
                </div>
              </div>
            )}

            {runStep > 0 ? (
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-[10px] text-gray-600 space-y-2 overflow-y-auto min-h-[160px] max-h-[300px]">
                {runLog.map((logLine, idx) => (
                  <p key={idx} className={`${logLine.includes('[SUCCESS]') || logLine.includes('[COMPLETE]') ? 'text-emerald-400 font-semibold' : logLine.includes('[SKIP]') || logLine.includes('[CALC]') ? 'text-amber-450' : logLine.includes('[INIT]') ? 'text-black font-semibold font-bold' : 'text-gray-500'}`}>{logLine}</p>
                ))}
                {isRunning && <p className="text-gray-500 italic animate-pulse flex items-center gap-1.5"><RefreshCw className="h-2.5 w-2.5 animate-spin" /> Executing background settlement calculator loops...</p>}
              </div>
            ) : (
              <div className="space-y-4 text-xs text-gray-500 leading-relaxed bg-gray-50/20 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-900 block mb-1">Information</span>
                    Running this triggers the automated payout calculation for the current week. It reads pending bookings and calculates platform margin.
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
              <button onClick={() => setRunModalOpen(false)} disabled={isRunning} className="rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-30">Close</button>
              {runStep === 0 ? (
                <button onClick={handleExecuteWeeklyRun} className="rounded-xl bg-black hover:bg-gray-900 text-white px-4 py-2 text-sm font-semibold transition-colors shadow-lg">Start Calculator Run</button>
              ) : (
                <button onClick={finalizeWeeklyRun} disabled={isRunning} className="rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-35">Apply Settlement Run</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
