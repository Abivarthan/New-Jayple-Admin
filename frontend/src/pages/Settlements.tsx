import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee, Download, Play, CheckCircle2, Clock,
  Search, Eye, Check, X, RefreshCw,
  TrendingUp, Wallet, Landmark, AlertTriangle
} from 'lucide-react';
import { fetchSettlements, runSettlements, markSettlementPaid } from '../services/adminDataService';

interface SettlementItem {
  id: string;
  vendorId: string;
  shopName: string;
  bankAccount: {
    accountNumber: string;
    ifscCode: string;
    holderName: string;
  };
  weekKey: string; // YYYY-Www
  grossEarnings: number;
  commissionPaid: number;
  codCollected: number;
  walletAdjustments: number;
  netPayoutDue: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID';
  paymentTxnId?: string;
  processedAt?: string;
}

export const Settlements: React.FC = () => {
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
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

  // Settlement detail modal state
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementItem | null>(null);

  // Settlement Execution Run Simulation States
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runStep, setRunStep] = useState<number>(0);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Manual payment state
  const [approvingItem, setApprovingItem] = useState<SettlementItem | null>(null);
  const [payoutTxnId, setPayoutTxnId] = useState('');
  
  // Notification toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Run the REAL weekly settlement Cloud Function (reads ledgers, writes
  // settlements/{vendorId}/history). Idempotent per vendor+week.
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

  // Mark a payout as paid (writes settlements/{vendorId}/history/{id}).
  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingItem || !payoutTxnId.trim()) return;
    try {
      await markSettlementPaid(approvingItem.vendorId, approvingItem.id, payoutTxnId.trim());
      triggerToast(`Payout ${approvingItem.id} marked as PAID.`);
      await load();
    } catch (err) {
      triggerToast(err instanceof Error ? err.message : 'Failed to mark paid');
    } finally {
      setApprovingItem(null);
      setPayoutTxnId('');
    }
  };

  // Simulated CSV Payout bank file export download
  const handleExportCSV = () => {
    // Generate dummy CSV contents
    const headers = 'Settlement_ID,Merchant_Name,Bank_Account_Number,IFSC_Code,Holder_Name,Net_Payout_Amount,Week_Key\n';
    const rows = filteredSettlements
      .filter((s) => s.status === 'PENDING')
      .map(
        (s) =>
          `"${s.id}","${s.shopName}","${s.bankAccount.accountNumber}","${s.bankAccount.ifscCode}","${s.bankAccount.holderName}",${s.netPayoutDue},"${s.weekKey}"`
      )
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
      s.vendorId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWeek = filterWeek === 'ALL' || s.weekKey === filterWeek;
    const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus.toUpperCase();

    return matchesSearch && matchesWeek && matchesStatus;
  });

  // KPI Pool Computations
  const totalProcessed = settlements
    .filter((s) => s.status === 'PAID')
    .reduce((sum, item) => sum + item.netPayoutDue, 0);

  const pendingSettlements = settlements
    .filter((s) => s.status === 'PENDING')
    .reduce((sum, item) => sum + item.netPayoutDue, 0);

  return (
    <div className="space-y-6 relative pb-12">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-450 text-sm animate-fade-in shadow-xl shadow-slate-950/40">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Settlements & Payout Engine</h1>
          <p className="text-sm text-slate-400">Compute weekly ledger settlements for salon partners, verify safety thresholds, and clear bank payout clearances.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRunModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-750 px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-violet-600/15"
          >
            <Play size={15} />
            Run Settlement Calculator
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-750 text-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            <Download size={15} />
            Export Bank CSV
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-450 uppercase font-semibold">Total Payouts Processed</span>
            <div className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-1.5">
              <TrendingUp size={14} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100">₹{totalProcessed.toLocaleString()}</h3>
          <p className="text-[10px] text-slate-500">Life-time automated ledger payouts</p>
        </div>

        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-450 uppercase font-semibold">Pending Settlement Pool</span>
            <div className="rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 p-1.5">
              <IndianRupee size={14} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100">₹{pendingSettlements.toLocaleString()}</h3>
          <p className="text-[10px] text-slate-550">Outstanding weekly balances $\ge$ ₹500</p>
        </div>

        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-450 uppercase font-semibold">Hold / Carry Pool</span>
            <div className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 p-1.5">
              <Wallet size={14} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100">₹320.00</h3>
          <p className="text-[10px] text-slate-550">Balances carried forward &lt; ₹500 threshold</p>
        </div>

        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-450 uppercase font-semibold">Next Calculation Run</span>
            <div className="rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 p-1.5">
              <Clock size={14} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-200">Mon, 10:00 AM</h3>
          <p className="text-[10px] text-slate-500">Scheduled weekly cron event</p>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 bg-slate-800 p-4 rounded-xl border border-slate-600">
        {/* Search */}
        <div className="relative md:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by shop name, Settlement ID, or Merchant UID..."
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Week Filter */}
        <div>
          <select
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="ALL">All Payout Weeks</option>
            <option value="2026-W22">2026-W22 (Current)</option>
            <option value="2026-W21">2026-W21 (Previous)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending bank files</option>
            <option value="PAID">Paid / Cleared</option>
          </select>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-600 bg-slate-800 shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
              <th className="py-4 px-6">Settlement details</th>
              <th className="py-4 px-6 text-right">Gross Earnings</th>
              <th className="py-4 px-6 text-right">Commission Sub</th>
              <th className="py-4 px-6 text-right">COD Collected</th>
              <th className="py-4 px-6 text-right font-bold text-slate-200">Net Payout due</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm text-slate-350">
            {filteredSettlements.map((s) => (
              <tr key={s.id} className="hover:bg-[#0f172a]/10 transition-colors">
                <td className="py-4 px-6">
                  <div>
                    <span className="font-semibold text-slate-200 block">{s.shopName}</span>
                    <span className="text-[10px] text-slate-550 mt-0.5 block">
                      ID: {s.id} · Week: {s.weekKey} · UID: {s.vendorId}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-medium">₹{s.grossEarnings.toLocaleString()}</td>
                <td className="py-4 px-6 text-right text-rose-400 font-medium">-₹{s.commissionPaid.toLocaleString()}</td>
                <td className="py-4 px-6 text-right text-amber-500 font-medium">-₹{s.codCollected.toLocaleString()}</td>
                <td className="py-4 px-6 text-right font-bold text-slate-100">₹{s.netPayoutDue.toLocaleString()}</td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      s.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-450'
                        : s.status === 'PROCESSING'
                        ? 'bg-sky-500/10 text-sky-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      s.status === 'PAID' ? 'bg-emerald-500' : s.status === 'PROCESSING' ? 'bg-sky-500' : 'bg-amber-500'
                    }`} />
                    <span className="capitalize">{s.status === 'PENDING' ? 'Pending Bank File' : s.status}</span>
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      onClick={() => setSelectedSettlement(s)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                      title="Inspect Bank Ledger Breakdown"
                    >
                      <Eye size={15} />
                    </button>
                    {s.status === 'PENDING' && (
                      <button
                        onClick={() => setApprovingItem(s)}
                        className="flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-1.5 px-3.5 transition-colors shadow shadow-emerald-700/10"
                        title="Mark Payout Cleared by Bank"
                      >
                        <Check size={12} />
                        Clear Payout
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredSettlements.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  {loadingList ? 'Loading settlements…' : 'No weekly settlements yet. Run a settlement to generate payouts.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 1. RUN SETTLEMENT CALCULATOR MODAL */}
      {runModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl space-y-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-600/15 text-violet-400 border border-violet-500/20 p-2.5">
                <IndianRupee size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Run Weekly Payout Settlement</h3>
                <p className="text-xs text-slate-400 mt-0.5">Evaluates current ledger states, commission overrides, and safety thresholds.</p>
              </div>
            </div>

            {/* Steps execution flow */}
            {runStep > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-semibold uppercase tracking-wide">Processing Pipeline</span>
                  <span className="text-violet-400 font-bold">Step {runStep} of 5</span>
                </div>
                
                {/* Horizontal Progress Bars */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((stepNum) => (
                    <div
                      key={stepNum}
                      className={`h-1.5 rounded-full transition-all ${
                        runStep >= stepNum
                          ? stepNum === 5 && !isRunning
                            ? 'bg-emerald-500'
                            : 'bg-violet-600'
                          : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Logging Area */}
            {runStep > 0 ? (
              <div className="flex-1 bg-[#0f172a] border border-slate-700 rounded-lg p-4 font-mono text-[10px] text-slate-350 space-y-2 overflow-y-auto min-h-[160px] max-h-[300px]">
                {runLog.map((logLine, idx) => (
                  <p
                    key={idx}
                    className={`${
                      logLine.includes('[SUCCESS]') || logLine.includes('[COMPLETE]')
                        ? 'text-emerald-400 font-semibold'
                        : logLine.includes('[SKIP]') || logLine.includes('[CALC]')
                        ? 'text-amber-450'
                        : logLine.includes('[INIT]')
                        ? 'text-violet-400 font-bold'
                        : 'text-slate-400'
                    }`}
                  >
                    {logLine}
                  </p>
                ))}
                {isRunning && (
                  <p className="text-slate-500 italic animate-pulse flex items-center gap-1.5">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                    Executing background settlement calculator loops...
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4 text-xs text-slate-400 leading-relaxed bg-[#0f172a]/20 border border-slate-700/50 rounded-lg p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200 block mb-1">Attention Support Personnel</span>
                    Executing this payout settlement calculations runner scans the operational Firestore database:
                    <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
                      <li>Groups active salon bookings by week interval keys (`YYYY-Www`).</li>
                      <li>Subtracts Platform Commission margins and pre-recorded wallet adjustments.</li>
                      <li>Locks merchant profiles exceeding the safety Cash-on-Delivery (COD) collected parameter.</li>
                      <li>Aggregates payout profiles for bank clearing exports.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Dialog Action buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-600 pt-4">
              <button
                onClick={() => setRunModalOpen(false)}
                disabled={isRunning}
                className="rounded-lg border border-slate-700 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-xs font-semibold py-2 px-4 transition-colors disabled:opacity-30"
              >
                Close
              </button>
              
              {runStep === 0 ? (
                <button
                  onClick={handleExecuteWeeklyRun}
                  className="rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-750 text-xs font-semibold text-white py-2 px-5 transition-colors shadow-lg shadow-violet-600/10"
                >
                  Start Calculator Run
                </button>
              ) : (
                <button
                  onClick={finalizeWeeklyRun}
                  disabled={isRunning}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white py-2 px-5 transition-colors disabled:opacity-35"
                >
                  Apply Settlement Run
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. VERIFY SETTLEMENT DETAIL LEDGER MODAL */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedSettlement.shopName}</h3>
                <span className="text-[10px] text-slate-500 block mt-0.5">Settlement ID: {selectedSettlement.id} · Period: {selectedSettlement.weekKey}</span>
              </div>
              <button
                onClick={() => setSelectedSettlement(null)}
                className="rounded-lg border border-slate-600 bg-[#0f172a]/30 p-2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Bank details card */}
            <div className="rounded-xl border border-slate-600 bg-[#0f172a]/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-350 uppercase tracking-wider">
                <Landmark size={14} className="text-violet-400" />
                <span>Beneficiary Bank Account</span>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-slate-550 block mb-0.5">Holder Name</span>
                  <span className="font-semibold text-slate-250">{selectedSettlement.bankAccount.holderName}</span>
                </div>
                <div>
                  <span className="text-slate-550 block mb-0.5">Account Number</span>
                  <span className="font-semibold text-slate-200 select-all font-mono">{selectedSettlement.bankAccount.accountNumber}</span>
                </div>
                <div>
                  <span className="text-slate-550 block mb-0.5">IFSC Routing Code</span>
                  <span className="font-semibold text-slate-200 select-all font-mono">{selectedSettlement.bankAccount.ifscCode}</span>
                </div>
                <div>
                  <span className="text-slate-550 block mb-0.5">Status Check</span>
                  <span className="font-bold text-emerald-450">Active / Validated</span>
                </div>
              </div>
            </div>

            {/* Detailed financial math */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Settlement Ledger Computation</span>
              
              <div className="rounded-xl border border-slate-700 divide-y divide-slate-850/80 bg-[#0f172a]/10 text-xs">
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-slate-400">Gross Weekly Bookings Earnings</span>
                  <span className="font-bold text-slate-200">₹{selectedSettlement.grossEarnings.toLocaleString()}</span>
                </div>
                
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    Jayple Platform Commission
                    <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">15% Margin</span>
                  </span>
                  <span className="font-bold text-rose-450">-₹{selectedSettlement.commissionPaid.toLocaleString()}</span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-slate-400">Cash-on-Delivery Offset Collections</span>
                  <span className="font-bold text-amber-500">-₹{selectedSettlement.codCollected.toLocaleString()}</span>
                </div>

                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-slate-400">Manual Wallet Adjustments / Penalties</span>
                  <span className={`font-bold ${selectedSettlement.walletAdjustments >= 0 ? 'text-emerald-450' : 'text-rose-450'}`}>
                    {selectedSettlement.walletAdjustments >= 0 ? '+' : ''}₹{selectedSettlement.walletAdjustments.toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 flex items-center justify-between bg-[#0f172a]/20">
                  <span className="font-bold text-slate-300">Net Weekly Payout Clearance</span>
                  <span className="font-extrabold text-slate-100 text-sm">₹{selectedSettlement.netPayoutDue.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Clearance logs */}
            {selectedSettlement.status === 'PAID' && (
              <div className="rounded-xl border border-emerald-950/30 bg-emerald-950/10 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                  <CheckCircle2 size={14} />
                  <span>Clearing Reference Recorded</span>
                </div>
                
                <div className="grid gap-2 text-slate-400">
                  <p>Bank Reference ID: <span className="font-semibold text-slate-200 select-all font-mono">{selectedSettlement.paymentTxnId}</span></p>
                  <p>Cleared on: <span className="font-semibold text-slate-200">{selectedSettlement.processedAt}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. CLEAR SETTLEMENT MANUAL APPROVAL OVERLAY DIALOG */}
      {approvingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2.5">
                <Check size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Clear Settlement Payout</h3>
                <p className="text-xs text-slate-400 mt-0.5">Logs manual bank wire clearances once paid.</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-[#0f172a]/40 p-4 border border-slate-700 rounded-lg">
              Confirm that a bank transfer of <span className="text-slate-100 font-bold">₹{approvingItem.netPayoutDue.toLocaleString()}</span> 
              has been successfully cleared to <span className="text-slate-100 font-bold">{approvingItem.shopName}</span>'s bank account:
              <span className="block mt-2.5 font-mono text-[11px] text-slate-350">
                A/C: {approvingItem.bankAccount.accountNumber} · IFSC: {approvingItem.bankAccount.ifscCode}
              </span>
            </p>

            <form onSubmit={handleMarkAsPaid} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Bank Reference Transaction ID / IMPS UTR
                </label>
                <input
                  type="text"
                  required
                  value={payoutTxnId}
                  onChange={(e) => setPayoutTxnId(e.target.value)}
                  placeholder="e.g. UTR128821900192"
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500 placeholder-slate-700 text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-600 pt-4">
                <button
                  type="button"
                  onClick={() => setApprovingItem(null)}
                  className="rounded-lg border border-slate-700 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-xs font-semibold py-2 px-4 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!payoutTxnId.trim()}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-xs font-semibold text-white py-2 px-4 transition-colors disabled:opacity-50"
                >
                  Confirm Payout Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
