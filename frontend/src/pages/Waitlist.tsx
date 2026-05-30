import React, { useState } from 'react';
import {
  Send, Search, Download, Check,
  RefreshCw, AlertTriangle, Users, Volume2,
  TrendingUp, Award, Building, Sparkles
} from 'lucide-react';

interface WaitlistLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  pincode: string;
  signedUpAt: string;
  notifiedStatus: 'PENDING' | 'SENT';
}

interface RegionPriority {
  pincode: string;
  city: string;
  leadsCount: number;
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  status: 'PENDING' | 'LAUNCHED';
}

const mockLeads: WaitlistLead[] = [
  { id: 'WLT-001', name: 'Divya Nair', email: 'divya.n@gmail.com', phone: '9840112233', city: 'Chennai', pincode: '600040', signedUpAt: '2 hours ago', notifiedStatus: 'PENDING' },
  { id: 'WLT-002', name: 'Sujatha R', email: 'sujatha@outlook.com', phone: '9840112234', city: 'Chennai', pincode: '600028', signedUpAt: '1 day ago', notifiedStatus: 'PENDING' },
  { id: 'WLT-003', name: 'Madhavan Nair', email: 'madhavan.n@yahoo.com', phone: '9940112281', city: 'Coimbatore', pincode: '641002', signedUpAt: '2 days ago', notifiedStatus: 'PENDING' },
  { id: 'WLT-004', name: 'Gayathri S', email: 'gayu.s@gmail.com', phone: '9789012351', city: 'Tiruchirappalli', pincode: '620015', signedUpAt: '4 days ago', notifiedStatus: 'SENT' }
];

const mockPriorities: RegionPriority[] = [
  { pincode: '600040', city: 'Chennai', leadsCount: 142, priorityLevel: 'CRITICAL', status: 'PENDING' },
  { pincode: '600028', city: 'Chennai', leadsCount: 98, priorityLevel: 'HIGH', status: 'PENDING' },
  { pincode: '641002', city: 'Coimbatore', leadsCount: 64, priorityLevel: 'MEDIUM', status: 'PENDING' },
  { pincode: '620015', city: 'Tiruchirappalli', leadsCount: 42, priorityLevel: 'MEDIUM', status: 'LAUNCHED' }
];

export const Waitlist: React.FC = () => {
  const [leads, setLeads] = useState<WaitlistLead[]>(mockLeads);
  const [priorities, setPriorities] = useState<RegionPriority[]>(mockPriorities);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('ALL');
  
  // Launch Broadcast modal states
  const [launchingRegion, setLaunchingRegion] = useState<RegionPriority | null>(null);
  const [broadcastHeadline, setBroadcastHeadline] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // General Notification alert Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Launch broadcast FCM calculations
  const executeBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!launchingRegion || !broadcastHeadline.trim() || !broadcastBody.trim()) return;

    setIsBroadcasting(true);
    // Simulate Cloud Function call: broadcastWaitlistNotification
    await new Promise((r) => setTimeout(r, 1200));

    // Update priorities
    setPriorities(
      priorities.map((p) =>
        p.pincode === launchingRegion.pincode ? { ...p, status: 'LAUNCHED' as const } : p
      )
    );

    // Update leads notifiedStatus
    setLeads(
      leads.map((l) =>
        l.pincode === launchingRegion.pincode ? { ...l, notifiedStatus: 'SENT' as const } : l
      )
    );

    setIsBroadcasting(false);
    triggerToast(`FCM Broadcast successfully sent to ${launchingRegion.leadsCount} waitlist leads in PIN ${launchingRegion.pincode}!`);
    setLaunchingRegion(null);
    setBroadcastHeadline('');
    setBroadcastBody('');
  };

  // Filter evaluation logic
  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      l.pincode.includes(searchQuery);

    const matchesCity = filterCity === 'ALL' || l.city === filterCity;
    return matchesSearch && matchesCity;
  });

  const totalWaitlistCount = priorities.reduce((sum, item) => sum + item.leadsCount, 0);
  const criticalCount = priorities.filter((p) => p.priorityLevel === 'CRITICAL' && p.status === 'PENDING').length;

  return (
    <div className="space-y-6 relative pb-12">
      {/* Toast message alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-450 text-sm animate-fade-in shadow-xl shadow-slate-950/40">
          <Check size={16} className="shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Waitlist Management & Priority Tracker</h1>
          <p className="text-sm text-slate-400">Monitor high-demand unlaunched zones, check geolocations, and dispatch live push announcements via FCM.</p>
        </div>
        
        <button className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-750 text-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors">
          <Download size={15} />
          Export Waitlist CSV
        </button>
      </div>

      {/* KPI stats section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-450 uppercase font-semibold">Total Waitlist Signups</span>
            <div className="rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 p-1.5">
              <Users size={14} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100">{totalWaitlistCount} leads</h3>
          <p className="text-[10px] text-slate-500">Aggregated sign-ups from non-live areas</p>
        </div>

        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-450 uppercase font-semibold">Critical Priority Zones</span>
            <div className="rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 p-1.5">
              <AlertTriangle size={14} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100">{criticalCount} regions</h3>
          <p className="text-[10px] text-slate-500">Waitlist thresholds exceeding 100+ requests</p>
        </div>

        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-450 uppercase font-semibold">Top Priority Region</span>
            <div className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 p-1.5">
              <Award size={14} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-200">PIN 600040</h3>
          <p className="text-[10px] text-slate-550">Chennai · 142 waitlist requests</p>
        </div>

        <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-450 uppercase font-semibold">Conversion Rate</span>
            <div className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-1.5">
              <TrendingUp size={14} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-slate-100">18.4%</h3>
          <p className="text-[10px] text-slate-500">Launched zone waitlist conversions</p>
        </div>
      </div>

      {/* Main Priority grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left side: Region priority listings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Geographical priority thresholds</h3>
              <span className="text-[10px] text-slate-500">Sorted by demand count</span>
            </div>

            <div className="divide-y divide-slate-800 text-xs">
              {priorities.map((item) => (
                <div key={item.pincode} className="py-3.5 flex items-center justify-between gap-4 hover:bg-[#0f172a]/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="rounded bg-slate-750 p-2 border border-slate-600 text-slate-400">
                      <Building size={16} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-200 block">PIN: {item.pincode}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{item.city} region</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-200 block">{item.leadsCount} Leads</span>
                      <span
                        className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-1 inline-block ${
                          item.priorityLevel === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                            : item.priorityLevel === 'HIGH'
                            ? 'bg-amber-500/10 text-amber-450 border border-amber-500/20'
                            : 'bg-slate-700 text-slate-500'
                        }`}
                      >
                        {item.priorityLevel}
                      </span>
                    </div>

                    <div>
                      {item.status === 'LAUNCHED' ? (
                        <span className="text-[10px] font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
                          Launched & Notified
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setLaunchingRegion(item);
                            setBroadcastHeadline(`We're live in PIN ${item.pincode}! 🎉`);
                            setBroadcastBody(`Hey, home beauty salon & bridal services are now active in your area. Use code WELCOME20 to get 20% off your first booking!`);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-750 text-white text-xs font-semibold py-1.5 px-3 transition-colors shadow shadow-violet-750/15"
                        >
                          <Volume2 size={12} />
                          Launch Region
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Sandbox / document tester */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
              <Sparkles size={16} className="text-violet-400 animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">AI OCR Document Sandbox</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Test the AI verification engine by simulating an OCR document upload (GST Certificate scans). Evaluates values using the Google Gemini model.
            </p>

            <div className="rounded-xl border border-slate-600 bg-[#0f172a]/30 p-4 text-xs text-slate-500 space-y-3">
              <span className="text-[10px] text-slate-450 uppercase font-semibold block">Simulate OCR document parsing:</span>
              
              <button
                onClick={() => {
                  triggerToast('AI OCR: Analyzed image of GST Certificate. Extracted GSTIN: "33AAAAA1111A1Z1", Legal Name: "ELITE SALON PVT LTD". Status: MATCHED.');
                }}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-750 bg-slate-700 hover:bg-slate-750 text-slate-250 py-2.5 font-semibold transition-colors"
              >
                <Sparkles size={14} className="text-violet-400" />
                Upload & Verify GST Sample
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Waitlist Registry Table */}
      <div className="space-y-4 mt-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-350">Waitlisted Leads Registry</h3>

        <div className="grid gap-4 sm:grid-cols-3 bg-slate-800 p-4 rounded-xl border border-slate-600">
          <div className="relative sm:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search size={16} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads by name, email, phone, or Pincode..."
              className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-400 outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="ALL">All Cities</option>
              <option value="Chennai">Chennai</option>
              <option value="Tiruchirappalli">Tiruchirappalli</option>
              <option value="Coimbatore">Coimbatore</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-600 bg-slate-800 shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
                <th className="py-4 px-6">Lead details</th>
                <th className="py-4 px-6">Contact info</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Signed Up</th>
                <th className="py-4 px-6">Notification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-350">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-[#0f172a]/10 transition-colors">
                  <td className="py-4 px-6">
                    <div>
                      <span className="font-semibold text-slate-200 block">{lead.name}</span>
                      <span className="text-[10px] text-slate-550 mt-0.5 block">{lead.id}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-xs">
                      <p className="text-slate-300">{lead.email}</p>
                      <p className="text-slate-500 mt-0.5">+91 {lead.phone}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-xs">
                    <div>
                      <p className="text-slate-300">{lead.city}</p>
                      <p className="text-[10px] text-slate-550 mt-0.5">PIN: {lead.pincode}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-450">{lead.signedUpAt}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                        lead.notifiedStatus === 'SENT'
                          ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                          : 'bg-slate-700 text-slate-500 border border-slate-750'
                      }`}
                    >
                      {lead.notifiedStatus === 'SENT' ? 'Sent' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No waitlisted leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LAUNCH REGION BROADCAST FCM MODAL */}
      {launchingRegion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 p-2.5">
                <Volume2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Launch Region Broadcast</h3>
                <p className="text-xs text-slate-400 mt-0.5">Launches services and triggers targeted FCM push alerts.</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed bg-[#0f172a]/40 p-4 border border-slate-700 rounded-lg">
              Confirm activating beauty services in <span className="text-slate-100 font-bold">{launchingRegion.city} (PIN: {launchingRegion.pincode})</span>. 
              This will broadcast a push notification to <span className="text-slate-100 font-bold">{launchingRegion.leadsCount} waitlist accounts</span> in that postal boundary.
            </p>

            <form onSubmit={executeBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Push Notification Headline
                </label>
                <input
                  type="text"
                  required
                  value={broadcastHeadline}
                  onChange={(e) => setBroadcastHeadline(e.target.value)}
                  placeholder="e.g. We are live in your area!"
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  FCM Push Alert Body Text
                </label>
                <textarea
                  required
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Describe details, launch offers, coupons, etc."
                  className="w-full h-24 rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500 text-xs placeholder-slate-750 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-600 pt-4">
                <button
                  type="button"
                  onClick={() => setLaunchingRegion(null)}
                  className="rounded-lg border border-slate-700 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-xs font-semibold py-2 px-4 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!broadcastHeadline.trim() || !broadcastBody.trim() || isBroadcasting}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-750 text-xs font-semibold text-white py-2 px-5 transition-colors disabled:opacity-50"
                >
                  {isBroadcasting ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Broadcasting...
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      Launch & Broadcast
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
