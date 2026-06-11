import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, Percent } from 'lucide-react';
import { fetchAppFinancials, saveAppFinancials } from '../services/adminDataService';

const num = (v: unknown, d: number): number => (typeof v === 'number' && isFinite(v) ? v : d);
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const str = (v: unknown, d: string): string => (typeof v === 'string' && v ? v : d);

export const PlatformConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tax' | 'discount' | 'vendor' | 'financial' | 'app'>('tax');
  const [loading, setLoading] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Form State
  const [taxConfig, setTaxConfig] = useState({
    gstRegisteredTax: 18.0,
    nonGstTax: 5.0,
    convenienceFee: 9.00,
    taxIncluded: true,
    taxDisplayLabel: 'GST'
  });

  const [discountConfig, setDiscountConfig] = useState({
    defaultFakeDiscount: 10,
    minPercentForBadge: 5,
    maxAllowedDiscount: 70,
    badgeStyle: 'PERCENT' as 'PERCENT' | 'AMOUNT',
    showStrikethrough: true
  });

  const [vendorConfig, setVendorConfig] = useState({
    autoApproveVendors: false,
    defaultCommission: 15,
    defaultCodThreshold: 5000,
    walletBlockThreshold: -500,
    slotLockDuration: 2
  });

  // Booking money model v2 — the SAME keys the Cloud Functions read
  // (functions/config.js). These are the live, dynamic financial controls; the
  // retired v1 keys (cancellationFreeWindowMinutes / cancellationPenaltyPercent /
  // vendorCancelPenaltyAmount / vendorCancelCompensationAmount) are no longer
  // read by the booking engine and have been removed.
  const [financialConfig, setFinancialConfig] = useState({
    cancelFullRefundWindowMin: 60,    // >= this many min before slot → 100% service refund, no vendor comp
    lateCancelRefundPercent: 75,      // < full-refund window → refund this % of service to wallet
    lateCancelVendorCompPercent: 5,   // vendor compensation on a late cancel = this % of service
    rejectVendorPenaltyPercent: 5,    // vendor reject penalty = this % of service (debited from wallet)
    autoAcceptSeconds: 60,            // unanswered pending booking auto-accepts after this
    serviceGracePeriodMin: 15,        // grace after slot start before delayed-service handling
    lastMinuteWindowMin: 15,          // <= this many min before slot counts as "last-minute"
    noShowPenaltyPercent: 25,         // no-show penalty = this % of service
    welcomeBonus: 50,
    normalCashback: 2,
    minWeeklyPayout: 500
  });

  const [appBehaviorConfig, setAppBehaviorConfig] = useState({
    codEligibilityCompleted: 1,
    maxServicesPerBooking: 10,
    maxAdvanceBookingDays: 30,
    vendorRePingInterval: 5,
    autoTimeoutWindow: 5
  });

  // Load the real config (appConfig/financials) into the forms on mount.
  useEffect(() => {
    let alive = true;
    (async () => {
      const f = await fetchAppFinancials();
      if (!alive) return;
      setTaxConfig({
        // Canonical keys the customer FinancialConfig reads.
        gstRegisteredTax: num(f.gstRegisteredTaxPercent, 18),
        nonGstTax: num(f.nonGstTaxPercent, 5),
        convenienceFee: num(f.convenienceFee, 9),
        taxIncluded: bool(f.taxIncludedInPrice, true),
        taxDisplayLabel: str(f.taxDisplayLabel, 'GST'),
      });
      setDiscountConfig({
        defaultFakeDiscount: num(f.defaultFakeDiscount, 10),
        minPercentForBadge: num(f.minPercentForBadge, 5),
        maxAllowedDiscount: num(f.maxAllowedDiscount, 70),
        badgeStyle: (f.badgeStyle === 'AMOUNT' ? 'AMOUNT' : 'PERCENT'),
        showStrikethrough: bool(f.showStrikethrough, true),
      });
      setVendorConfig({
        autoApproveVendors: bool(f.autoApproveVendors, false),
        defaultCommission: num(f.platformCommissionPercent, 15),
        defaultCodThreshold: num(f.codMaxCollectionThreshold, 5000),
        walletBlockThreshold: num(f.vendorWalletBlockThreshold, -500),
        slotLockDuration: num(f.slotLockTTLMinutes, 2),
      });
      setFinancialConfig({
        cancelFullRefundWindowMin: num(f.cancelFullRefundWindowMin, 60),
        lateCancelRefundPercent: num(f.lateCancelRefundPercent, 75),
        lateCancelVendorCompPercent: num(f.lateCancelVendorCompPercent, 5),
        rejectVendorPenaltyPercent: num(f.rejectVendorPenaltyPercent, 5),
        autoAcceptSeconds: num(f.autoAcceptSeconds, 60),
        serviceGracePeriodMin: num(f.serviceGracePeriodMin, 15),
        lastMinuteWindowMin: num(f.lastMinuteWindowMin, 15),
        noShowPenaltyPercent: num(f.noShowPenaltyPercent, 25),
        welcomeBonus: num(f.welcomeBonusAmount, 50),
        normalCashback: num(f.cashbackPercentNormal, 2),
        minWeeklyPayout: num(f.vendorMinWeeklyPayout, 500),
      });
      setAppBehaviorConfig({
        codEligibilityCompleted: num(f.codEligibilityCompleted, 1),
        maxServicesPerBooking: num(f.maxServicesPerBooking, 10),
        maxAdvanceBookingDays: num(f.maxAdvanceBookingDays, 30),
        vendorRePingInterval: num(f.vendorRePingInterval, 5),
        autoTimeoutWindow: num(f.autoTimeoutWindow, 5),
      });
    })();
    return () => { alive = false; };
  }, []);

  const handleSave = async (section: string) => {
    setLoading(true);
    setSavedMessage(null);
    // Map the form state to the canonical appConfig/financials keys the Cloud
    // Functions read (functions/config.js). Saved with merge so every tab's
    // Save persists the full current config.
    const patch: Record<string, unknown> = {
      // Tax & fees — canonical keys the customer/vendor apps read.
      convenienceFee: taxConfig.convenienceFee,
      gstRegisteredTaxPercent: taxConfig.gstRegisteredTax,
      nonGstTaxPercent: taxConfig.nonGstTax,
      taxIncludedInPrice: taxConfig.taxIncluded,
      taxDisplayLabel: taxConfig.taxDisplayLabel,
      // Discount/badge
      defaultFakeDiscount: discountConfig.defaultFakeDiscount,
      minPercentForBadge: discountConfig.minPercentForBadge,
      maxAllowedDiscount: discountConfig.maxAllowedDiscount,
      badgeStyle: discountConfig.badgeStyle,
      showStrikethrough: discountConfig.showStrikethrough,
      // Vendor parameters
      platformCommissionPercent: vendorConfig.defaultCommission,
      codMaxCollectionThreshold: vendorConfig.defaultCodThreshold,
      vendorWalletBlockThreshold: vendorConfig.walletBlockThreshold,
      slotLockTTLMinutes: vendorConfig.slotLockDuration,
      autoApproveVendors: vendorConfig.autoApproveVendors,
      // Financial policies — booking money model v2 (keys read by functions/config.js)
      cancelFullRefundWindowMin: financialConfig.cancelFullRefundWindowMin,
      lateCancelRefundPercent: financialConfig.lateCancelRefundPercent,
      lateCancelVendorCompPercent: financialConfig.lateCancelVendorCompPercent,
      rejectVendorPenaltyPercent: financialConfig.rejectVendorPenaltyPercent,
      autoAcceptSeconds: financialConfig.autoAcceptSeconds,
      serviceGracePeriodMin: financialConfig.serviceGracePeriodMin,
      lastMinuteWindowMin: financialConfig.lastMinuteWindowMin,
      noShowPenaltyPercent: financialConfig.noShowPenaltyPercent,
      welcomeBonusAmount: financialConfig.welcomeBonus,
      cashbackPercentNormal: financialConfig.normalCashback,
      vendorMinWeeklyPayout: financialConfig.minWeeklyPayout,
      // App behavior
      codEligibilityCompleted: appBehaviorConfig.codEligibilityCompleted,
      maxServicesPerBooking: appBehaviorConfig.maxServicesPerBooking,
      maxAdvanceBookingDays: appBehaviorConfig.maxAdvanceBookingDays,
      vendorRePingInterval: appBehaviorConfig.vendorRePingInterval,
      autoTimeoutWindow: appBehaviorConfig.autoTimeoutWindow,
    };
    try {
      await saveAppFinancials(patch);
      setSavedMessage(`Configuration settings for "${section}" saved live.`);
    } catch (err) {
      setSavedMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
      setTimeout(() => setSavedMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Platform Configuration</h1>
          <p className="text-sm text-slate-400">Manage global operational rules, dynamic variables, and system parameters.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-600">
          <span>Config Version: 5</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Notifications */}
      {savedMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm animate-fade-in">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Main Tabs Layout */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Tabs List */}
        <div className="flex md:flex-col gap-2 overflow-x-auto md:w-64 shrink-0 bg-slate-800 p-2 rounded-xl border border-slate-600">
          <button
            onClick={() => setActiveTab('tax')}
            className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${
              activeTab === 'tax' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            Tax Rates & Fees
          </button>
          <button
            onClick={() => setActiveTab('discount')}
            className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${
              activeTab === 'discount' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            Discount Rules
          </button>
          <button
            onClick={() => setActiveTab('vendor')}
            className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${
              activeTab === 'vendor' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            Vendor Parameters
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${
              activeTab === 'financial' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            Financial Policies
          </button>
          <button
            onClick={() => setActiveTab('app')}
            className={`px-4 py-2.5 rounded-lg text-left text-sm font-medium transition-all ${
              activeTab === 'app' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            App Behavior
          </button>
        </div>

        {/* Tab Workspaces */}
        <div className="flex-1 rounded-xl border border-slate-600 bg-slate-800 p-6">
          {/* Tab 1: Tax Rates */}
          {activeTab === 'tax' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Tax Rates & Convenience Fees</h2>
                <p className="text-xs text-slate-400 mt-1">Configure the base taxes assessed per service booking transaction.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">GST Registered Tax %</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={taxConfig.gstRegisteredTax}
                      onChange={(e) => setTaxConfig({ ...taxConfig, gstRegisteredTax: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-12 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Non-GST Tax %</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={taxConfig.nonGstTax}
                      onChange={(e) => setTaxConfig({ ...taxConfig, nonGstTax: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-12 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Platform Convenience Fee</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">₹</span>
                    <input
                      type="number"
                      value={taxConfig.convenienceFee}
                      onChange={(e) => setTaxConfig({ ...taxConfig, convenienceFee: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-8 pr-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tax Display Label</label>
                  <input
                    type="text"
                    value={taxConfig.taxDisplayLabel}
                    onChange={(e) => setTaxConfig({ ...taxConfig, taxDisplayLabel: e.target.value })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-[#0f172a]/40 border border-slate-600">
                <div>
                  <p className="text-sm font-medium text-slate-200">Include Tax in Listed Service Prices</p>
                  <p className="text-xs text-slate-400 mt-0.5">Toggle whether customer application shows price inclusive of taxes.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxConfig.taxIncluded}
                    onChange={(e) => setTaxConfig({ ...taxConfig, taxIncluded: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white" />
                </label>
              </div>

              <div className="flex justify-end border-t border-slate-600 pt-4">
                <button
                  onClick={() => handleSave('Tax Settings')}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save & Publish
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Discount Rules */}
          {activeTab === 'discount' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Discount & Badge Rules</h2>
                <p className="text-xs text-slate-400 mt-1">Parameters determining badge display conditions and default fake discount caps.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Default Fake Discount %</label>
                  <input
                    type="number"
                    value={discountConfig.defaultFakeDiscount}
                    onChange={(e) => setDiscountConfig({ ...discountConfig, defaultFakeDiscount: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Min % to Display Badge</label>
                  <input
                    type="number"
                    value={discountConfig.minPercentForBadge}
                    onChange={(e) => setDiscountConfig({ ...discountConfig, minPercentForBadge: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Allowed Discount %</label>
                  <input
                    type="number"
                    value={discountConfig.maxAllowedDiscount}
                    onChange={(e) => setDiscountConfig({ ...discountConfig, maxAllowedDiscount: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Badge Style Template</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setDiscountConfig({ ...discountConfig, badgeStyle: 'PERCENT' })}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                      discountConfig.badgeStyle === 'PERCENT'
                        ? 'border-violet-500 bg-violet-600/10 text-violet-400'
                        : 'border-slate-600 bg-[#0f172a]/20 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Percent size={18} />
                    <div>
                      <p className="text-sm font-semibold">Percent Style</p>
                      <p className="text-xs text-slate-500 mt-0.5">Example: "10% OFF"</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscountConfig({ ...discountConfig, badgeStyle: 'AMOUNT' })}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                      discountConfig.badgeStyle === 'AMOUNT'
                        ? 'border-violet-500 bg-violet-600/10 text-violet-400'
                        : 'border-slate-600 bg-[#0f172a]/20 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-sm font-bold">₹</span>
                    <div>
                      <p className="text-sm font-semibold">Amount Style</p>
                      <p className="text-xs text-slate-500 mt-0.5">Example: "Save ₹50"</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-[#0f172a]/40 border border-slate-600">
                <div>
                  <p className="text-sm font-medium text-slate-200">Show Strikethrough Original Price</p>
                  <p className="text-xs text-slate-400 mt-0.5">Displays standard markdown original price alongside discount price.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={discountConfig.showStrikethrough}
                    onChange={(e) => setDiscountConfig({ ...discountConfig, showStrikethrough: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white" />
                </label>
              </div>

              <div className="flex justify-end border-t border-slate-600 pt-4">
                <button
                  onClick={() => handleSave('Discount Rules')}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save & Publish
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Vendor Settings */}
          {activeTab === 'vendor' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Vendor Management Rules</h2>
                <p className="text-xs text-slate-400 mt-1">Configure default commission structures, credit margins, and safety policies.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Default Base Commission %</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={vendorConfig.defaultCommission}
                      onChange={(e) => setVendorConfig({ ...vendorConfig, defaultCommission: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-12 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Default COD Limit Threshold</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">₹</span>
                    <input
                      type="number"
                      value={vendorConfig.defaultCodThreshold}
                      onChange={(e) => setVendorConfig({ ...vendorConfig, defaultCodThreshold: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-8 pr-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Wallet Disabling Limit</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">₹</span>
                    <input
                      type="number"
                      value={vendorConfig.walletBlockThreshold}
                      onChange={(e) => setVendorConfig({ ...vendorConfig, walletBlockThreshold: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-8 pr-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">If wallet balance drops below this, vendor bookings lock automatically.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Booking Slot Lock Lifetime</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={vendorConfig.slotLockDuration}
                      onChange={(e) => setVendorConfig({ ...vendorConfig, slotLockDuration: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-20 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">minutes</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-[#0f172a]/40 border border-slate-600">
                <div>
                  <p className="text-sm font-medium text-slate-200">Auto-Approve New Registered Vendors</p>
                  <p className="text-xs text-slate-400 mt-0.5">When active, registrations immediately deploy as active instead of pending review.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vendorConfig.autoApproveVendors}
                    onChange={(e) => setVendorConfig({ ...vendorConfig, autoApproveVendors: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white" />
                </label>
              </div>

              <div className="flex justify-end border-t border-slate-600 pt-4">
                <button
                  onClick={() => handleSave('Vendor Rules')}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save & Publish
                </button>
              </div>
            </div>
          )}

          {/* Tab 4: Financial Rules */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Financial Policies & Penalties</h2>
                <p className="text-xs text-slate-400 mt-1">Configure compensation rates, cashback rules, and cancellation parameters.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full-Refund Window</label>
                  <p className="text-[11px] text-slate-500 mb-2">Cancel ≥ this many minutes before the slot → 100% service refund (no vendor compensation).</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialConfig.cancelFullRefundWindowMin}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, cancelFullRefundWindowMin: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-16 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">min</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Late-Cancel Refund %</label>
                  <p className="text-[11px] text-slate-500 mb-2">Inside the full-refund window → refund this % of the service price to the customer wallet.</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialConfig.lateCancelRefundPercent}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, lateCancelRefundPercent: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-12 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Late-Cancel Vendor Compensation %</label>
                  <p className="text-[11px] text-slate-500 mb-2">Credited to the vendor wallet when a customer cancels late, as % of service price.</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialConfig.lateCancelVendorCompPercent}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, lateCancelVendorCompPercent: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-12 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Vendor Reject Penalty %</label>
                  <p className="text-[11px] text-slate-500 mb-2">Debited from the vendor wallet when a vendor rejects a booking, as % of service price.</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialConfig.rejectVendorPenaltyPercent}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, rejectVendorPenaltyPercent: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-12 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Auto-Accept Timeout</label>
                  <p className="text-[11px] text-slate-500 mb-2">An unanswered pending booking auto-accepts after this many seconds.</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialConfig.autoAcceptSeconds}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, autoAcceptSeconds: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-16 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">sec</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Service Grace Period</label>
                  <p className="text-[11px] text-slate-500 mb-2">Grace after the slot start before delayed-service handling kicks in.</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialConfig.serviceGracePeriodMin}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, serviceGracePeriodMin: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-16 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">min</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last-Minute Window</label>
                  <p className="text-[11px] text-slate-500 mb-2">A cancel ≤ this many minutes before the slot is treated as last-minute (fraud window).</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialConfig.lastMinuteWindowMin}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, lastMinuteWindowMin: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-16 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">min</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">No-Show Penalty %</label>
                  <p className="text-[11px] text-slate-500 mb-2">Penalty as % of service price when a customer no-shows.</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialConfig.noShowPenaltyPercent}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, noShowPenaltyPercent: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-12 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Customer Cashback %</label>
                  <p className="text-[11px] text-slate-500 mb-2">Wallet cashback credited on a normal completed booking.</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={financialConfig.normalCashback}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, normalCashback: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-12 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">New Account Welcome Bonus</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">₹</span>
                    <input
                      type="number"
                      value={financialConfig.welcomeBonus}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, welcomeBonus: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-8 pr-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Platform Payout Threshold</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 text-sm">₹</span>
                    <input
                      type="number"
                      value={financialConfig.minWeeklyPayout}
                      onChange={(e) => setFinancialConfig({ ...financialConfig, minWeeklyPayout: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-8 pr-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-600 pt-4">
                <button
                  onClick={() => handleSave('Financial Policies')}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save & Publish
                </button>
              </div>
            </div>
          )}

          {/* Tab 5: App Behavior */}
          {activeTab === 'app' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-200">Application Parameters & Behavior</h2>
                <p className="text-xs text-slate-400 mt-1">Variables configuration for customer client flow operations.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">COD Eligibility Threshold</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={appBehaviorConfig.codEligibilityCompleted}
                      onChange={(e) => setAppBehaviorConfig({ ...appBehaviorConfig, codEligibilityCompleted: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-24 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">bookings</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Number of completed bookings required before user unlocks COD payment.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Max Service Selection per Booking</label>
                  <input
                    type="number"
                    value={appBehaviorConfig.maxServicesPerBooking}
                    onChange={(e) => setAppBehaviorConfig({ ...appBehaviorConfig, maxServicesPerBooking: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Advance Scheduling Horizon Limit</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={appBehaviorConfig.maxAdvanceBookingDays}
                      onChange={(e) => setAppBehaviorConfig({ ...appBehaviorConfig, maxAdvanceBookingDays: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-16 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">days</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Vendor Notification Re-ping Interval</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={appBehaviorConfig.vendorRePingInterval}
                      onChange={(e) => setAppBehaviorConfig({ ...appBehaviorConfig, vendorRePingInterval: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-4 pr-16 text-slate-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 text-sm">minutes</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-600 pt-4">
                <button
                  onClick={() => handleSave('App Behavior')}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save & Publish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
