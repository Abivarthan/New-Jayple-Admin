import React, { useState } from 'react';
import { Plus, Search, Edit3, Trash2, X, PlusCircle, Check } from 'lucide-react';

interface Zone {
  id: string;
  name: string;
  city: string;
  pincodes: string[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } | null;
  services: ('salon' | 'home' | 'bridal')[];
  vendorsCount: number;
  waitlistCount: number;
  isActive: boolean;
  sponsorMode: 'CURATED' | 'AUTO';
}

const mockZones: Zone[] = [
  {
    id: 'zone_01',
    name: 'Chennai Central',
    city: 'Chennai',
    pincodes: ['600001', '600002', '600003', '600004', '600005', '600006', '600007', '600008', '600014', '600018', '600028', '600040'],
    bounds: { minLat: 13.00, maxLat: 13.12, minLng: 80.20, maxLng: 80.30 },
    services: ['salon', 'home', 'bridal'],
    vendorsCount: 14,
    waitlistCount: 0,
    isActive: true,
    sponsorMode: 'CURATED'
  },
  {
    id: 'zone_02',
    name: 'Trichy East',
    city: 'Tiruchirappalli',
    pincodes: ['620001', '620002', '620008', '620010', '620012', '620013', '620014', '620020'],
    bounds: { minLat: 10.75, maxLat: 10.85, minLng: 78.68, maxLng: 78.78 },
    services: ['salon'],
    vendorsCount: 6,
    waitlistCount: 0,
    isActive: true,
    sponsorMode: 'AUTO'
  },
  {
    id: 'zone_03',
    name: 'Madurai North',
    city: 'Madurai',
    pincodes: [],
    bounds: null,
    services: [],
    vendorsCount: 0,
    waitlistCount: 42,
    isActive: false,
    sponsorMode: 'AUTO'
  }
];

export const Zones: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>(mockZones);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDeactivateZone, setConfirmDeactivateZone] = useState<Zone | null>(null);

  // Form Fields State
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('');
  const [pincodeInput, setPincodeInput] = useState('');
  const [formPincodes, setFormPincodes] = useState<string[]>([]);
  const [formMinLat, setFormMinLat] = useState('');
  const [formMaxLat, setFormMaxLat] = useState('');
  const [formMinLng, setFormMinLng] = useState('');
  const [formMaxLng, setFormMaxLng] = useState('');
  const [formSalon, setFormSalon] = useState(false);
  const [formHome, setFormHome] = useState(false);
  const [formBridal, setFormBridal] = useState(false);
  const [formSponsorMode, setFormSponsorMode] = useState<'CURATED' | 'AUTO'>('AUTO');
  const [formActive, setFormActive] = useState(true);

  // Pincode Addition
  const handleAddPincode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pincodeInput.trim();
    if (/^\d{6}$/.test(clean) && !formPincodes.includes(clean)) {
      setFormPincodes([...formPincodes, clean]);
      setPincodeInput('');
    }
  };

  const handleRemovePincode = (pin: string) => {
    setFormPincodes(formPincodes.filter((p) => p !== pin));
  };

  const handleOpenCreate = () => {
    setEditingZone(null);
    setFormName('');
    setFormCity('');
    setPincodeInput('');
    setFormPincodes([]);
    setFormMinLat('');
    setFormMaxLat('');
    setFormMinLng('');
    setFormMaxLng('');
    setFormSalon(false);
    setFormHome(false);
    setFormBridal(false);
    setFormSponsorMode('AUTO');
    setFormActive(true);
    setShowForm(true);
  };

  const handleOpenEdit = (zone: Zone) => {
    setEditingZone(zone);
    setFormName(zone.name);
    setFormCity(zone.city);
    setPincodeInput('');
    setFormPincodes(zone.pincodes);
    setFormMinLat(zone.bounds?.minLat.toString() || '');
    setFormMaxLat(zone.bounds?.maxLat.toString() || '');
    setFormMinLng(zone.bounds?.minLng.toString() || '');
    setFormMaxLng(zone.bounds?.maxLng.toString() || '');
    setFormSalon(zone.services.includes('salon'));
    setFormHome(zone.services.includes('home'));
    setFormBridal(zone.services.includes('bridal'));
    setFormSponsorMode(zone.sponsorMode);
    setFormActive(zone.isActive);
    setShowForm(true);
  };

  const handleSave = () => {
    const servicesList: ('salon' | 'home' | 'bridal')[] = [];
    if (formSalon) servicesList.push('salon');
    if (formHome) servicesList.push('home');
    if (formBridal) servicesList.push('bridal');

    const hasBounds = formMinLat && formMaxLat && formMinLng && formMaxLng;
    const boundsVal = hasBounds
      ? {
          minLat: parseFloat(formMinLat) || 0,
          maxLat: parseFloat(formMaxLat) || 0,
          minLng: parseFloat(formMinLng) || 0,
          maxLng: parseFloat(formMaxLng) || 0
        }
      : null;

    if (editingZone) {
      // Edit
      setZones(
        zones.map((z) =>
          z.id === editingZone.id
            ? {
                ...z,
                name: formName,
                city: formCity,
                pincodes: formPincodes,
                bounds: boundsVal,
                services: servicesList,
                sponsorMode: formSponsorMode,
                isActive: formActive
              }
            : z
        )
      );
    } else {
      // Create
      const newZone: Zone = {
        id: `zone_${Date.now()}`,
        name: formName,
        city: formCity,
        pincodes: formPincodes,
        bounds: boundsVal,
        services: servicesList,
        vendorsCount: 0,
        waitlistCount: 0,
        isActive: formActive,
        sponsorMode: formSponsorMode
      };
      setZones([...zones, newZone]);
    }

    setShowForm(false);
  };

  const executeDeactivation = () => {
    if (confirmDeactivateZone) {
      setZones(
        zones.map((z) =>
          z.id === confirmDeactivateZone.id ? { ...z, isActive: false } : z
        )
      );
      setConfirmDeactivateZone(null);
    }
  };

  const filteredZones = zones.filter(
    (z) =>
      z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Zone Management</h1>
          <p className="text-sm text-slate-400">Add cities, configure operational pincodes, bounding boxes, and service delivery configurations.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-violet-600/10"
        >
          <Plus size={16} />
          Create Zone
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
          <Search size={18} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter zones by name or city..."
          className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* Table view */}
      <div className="overflow-x-auto rounded-xl border border-slate-600 bg-slate-800">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-600 text-slate-400 text-xs font-semibold uppercase bg-[#0f172a]/20">
              <th className="py-4 px-6">Zone Name</th>
              <th className="py-4 px-6">City</th>
              <th className="py-4 px-6">Pincodes</th>
              <th className="py-4 px-6">Active Services</th>
              <th className="py-4 px-6 text-center">Vendors</th>
              <th className="py-4 px-6 text-center">Waitlist</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
            {filteredZones.map((zone) => (
              <tr key={zone.id} className="hover:bg-[#0f172a]/20 transition-colors">
                <td className="py-4 px-6 font-semibold text-slate-200">{zone.name}</td>
                <td className="py-4 px-6">{zone.city}</td>
                <td className="py-4 px-6">
                  {zone.pincodes.length > 0 ? (
                    <span className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-1 rounded">
                      {zone.pincodes.length} configured
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">None</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex gap-1.5 flex-wrap">
                    {zone.services.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-950/30 text-violet-400 border border-violet-900/30"
                      >
                        {s}
                      </span>
                    ))}
                    {zone.services.length === 0 && (
                      <span className="text-xs text-slate-500 italic">None</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6 text-center font-medium">{zone.vendorsCount}</td>
                <td className="py-4 px-6 text-center font-medium">
                  {zone.waitlistCount > 0 ? (
                    <span className="text-amber-400 font-semibold">{zone.waitlistCount} users</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-4 px-6">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      zone.isActive
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${zone.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {zone.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(zone)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
                      title="Edit Zone"
                    >
                      <Edit3 size={16} />
                    </button>
                    {zone.isActive && (
                      <button
                        onClick={() => setConfirmDeactivateZone(zone)}
                        className="rounded p-1 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition-colors"
                        title="Deactivate Zone"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredZones.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No matching service zones found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Editor Modal / Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-600 pb-4">
              <h3 className="text-lg font-bold text-slate-100">
                {editingZone ? 'Edit Operational Zone' : 'Create Operational Zone'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              {/* Row 1: Name and City */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Zone Reference Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Chennai Central"
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Operational City
                  </label>
                  <input
                    type="text"
                    required
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="e.g. Chennai"
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500 transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Bounding Box Coordinates (Optional) */}
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Geo-Bounding Box Coordinates (Optional)
                </span>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Min Lat</label>
                    <input
                      type="number"
                      step="any"
                      value={formMinLat}
                      onChange={(e) => setFormMinLat(e.target.value)}
                      placeholder="13.00"
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Max Lat</label>
                    <input
                      type="number"
                      step="any"
                      value={formMaxLat}
                      onChange={(e) => setFormMaxLat(e.target.value)}
                      placeholder="13.12"
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Min Lng</label>
                    <input
                      type="number"
                      step="any"
                      value={formMinLng}
                      onChange={(e) => setFormMinLng(e.target.value)}
                      placeholder="80.20"
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Max Lng</label>
                    <input
                      type="number"
                      step="any"
                      value={formMaxLng}
                      onChange={(e) => setFormMaxLng(e.target.value)}
                      placeholder="80.30"
                      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-slate-200 placeholder-slate-700 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Available Services & Sponsor mode */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Available Deliverables
                  </span>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formSalon}
                        onChange={(e) => setFormSalon(e.target.checked)}
                        className="rounded border-slate-600 bg-[#0f172a] text-violet-600 focus:ring-violet-500 h-4.5 w-4.5"
                      />
                      <span className="text-sm text-slate-200">Salon Bookings (In-Store)</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formHome}
                        onChange={(e) => setFormHome(e.target.checked)}
                        className="rounded border-slate-600 bg-[#0f172a] text-violet-600 focus:ring-violet-500 h-4.5 w-4.5"
                      />
                      <span className="text-sm text-slate-200">Home Beauty Services</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formBridal}
                        onChange={(e) => setFormBridal(e.target.checked)}
                        className="rounded border-slate-600 bg-[#0f172a] text-violet-600 focus:ring-violet-500 h-4.5 w-4.5"
                      />
                      <span className="text-sm text-slate-200">Bridal Packages</span>
                    </label>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Sponsor Row Strategy
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormSponsorMode('CURATED')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                        formSponsorMode === 'CURATED'
                          ? 'border-violet-500 bg-violet-600/10 text-violet-400'
                          : 'border-slate-600 bg-[#0f172a]/20 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Curated List
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormSponsorMode('AUTO')}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all ${
                        formSponsorMode === 'AUTO'
                          ? 'border-violet-500 bg-violet-600/10 text-violet-400'
                          : 'border-slate-600 bg-[#0f172a]/20 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Top Rated Auto
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: Pincode Config Chips Input */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target Pincodes
                </label>
                
                <form onSubmit={handleAddPincode} className="flex gap-2">
                  <input
                    type="text"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value)}
                    placeholder="Enter 6-digit pincode..."
                    maxLength={6}
                    className="flex-1 rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 placeholder-slate-750 outline-none focus:border-violet-500"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-750 text-slate-200 border border-slate-600 py-2.5 px-4 text-sm font-semibold transition-colors"
                  >
                    <PlusCircle size={16} />
                    Add
                  </button>
                </form>

                <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto p-3 rounded-lg border border-slate-600 bg-[#0f172a]/40">
                  {formPincodes.map((pin) => (
                    <span
                      key={pin}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-slate-700 text-slate-200 border border-slate-600"
                    >
                      <span>{pin}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePincode(pin)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  {formPincodes.length === 0 && (
                    <span className="text-xs text-slate-500 italic py-0.5">No pincodes configured for this zone yet.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-600 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-600 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-sm font-semibold py-2 px-4 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-sm font-semibold text-white py-2 px-4 transition-colors"
              >
                <Check size={16} />
                Save & Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivation Confirmation Modal */}
      {confirmDeactivateZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Trash2 size={24} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">Deactivate Operational Zone?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                This will immediately display the "Service Not Available" prompt to all client users within pincodes mapped to 
                <span className="text-slate-200 font-semibold"> {confirmDeactivateZone.name}</span>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeactivateZone(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-sm font-semibold py-2.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDeactivation}
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-sm font-semibold text-white py-2.5 transition-colors"
              >
                Confirm Deactivation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
