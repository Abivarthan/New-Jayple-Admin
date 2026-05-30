import React, { useState } from 'react';
import { Eye, CloudLightning, ToggleLeft, ToggleRight, Plus, Trash2, ArrowUp, ArrowDown, CheckCircle, Info, RefreshCw } from 'lucide-react';

interface HeroCard {
  title: string;
  subtitle: string;
  imageUrl: string;
  gifUrl?: string;
  gender: 'ALL' | 'MEN' | 'WOMEN';
  badgeText?: string;
}

interface ServiceItem {
  label: string;
  iconUrl: string;
  gender: 'ALL' | 'MEN' | 'WOMEN';
  category: string;
}

interface ZoneConfig {
  zoneId: string;
  version: number;
  sectionOrder: string[]; // ['hero', 'sponsor', 'cashback', 'services']
  sectionsEnabled: Record<string, boolean>;
  hero: HeroCard[];
  sponsor: {
    mode: 'CURATED' | 'AUTO';
    limit: number;
    title: string;
  };
  cashback: {
    headline: string;
    subtext: string;
    imageUrl: string;
    bgColor: string;
    showAmount: boolean;
  };
  services: ServiceItem[];
}

const mockZoneConfigs: Record<string, ZoneConfig> = {
  'zone_01': {
    zoneId: 'zone_01',
    version: 14,
    sectionOrder: ['hero', 'sponsor', 'cashback', 'services'],
    sectionsEnabled: { hero: true, sponsor: true, cashback: true, services: true },
    hero: [
      { title: 'Bridal Glow Combo', subtitle: 'Get 25% Off on premium packages', imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80', badgeText: 'BEST DEAL', gender: 'WOMEN' },
      { title: 'Men\'s Summer Haircut', subtitle: 'Includes standard beard styling', imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=400&q=80', badgeText: 'POPULAR', gender: 'MEN' }
    ],
    sponsor: { mode: 'CURATED', limit: 6, title: 'Top Featured Salons' },
    cashback: { headline: 'Flat 10% Cashback', subtext: 'Earned instantly on all online transactions', imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80', bgColor: '#4C1D95', showAmount: true },
    services: [
      { label: 'Haircut', iconUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=100&q=80', gender: 'ALL', category: 'haircut' },
      { label: 'Facial', iconUrl: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=100&q=80', gender: 'WOMEN', category: 'facial' }
    ]
  },
  'zone_02': {
    zoneId: 'zone_02',
    version: 3,
    sectionOrder: ['hero', 'services', 'sponsor'],
    sectionsEnabled: { hero: true, sponsor: true, cashback: false, services: true },
    hero: [
      { title: 'Basic Haircuts ₹199', subtitle: 'At verified neighborhood salons', imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=400&q=80', gender: 'ALL' }
    ],
    sponsor: { mode: 'AUTO', limit: 4, title: 'Salons Near You' },
    cashback: { headline: 'Welcome Bonus', subtext: '₹50 credited on signup', imageUrl: '', bgColor: '#064E3B', showAmount: false },
    services: [
      { label: 'Haircut', iconUrl: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=100&q=80', gender: 'ALL', category: 'haircut' }
    ]
  }
};

export const UIConfigEditor: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState('zone_01');
  const [config, setConfig] = useState<ZoneConfig>(mockZoneConfigs['zone_01']);
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleZoneChange = (zoneId: string) => {
    setSelectedZone(zoneId);
    setConfig(mockZoneConfigs[zoneId]);
  };

  const toggleSection = (section: string) => {
    setConfig({
      ...config,
      sectionsEnabled: {
        ...config.sectionsEnabled,
        [section]: !config.sectionsEnabled[section]
      }
    });
  };

  // Drag and Drop (Simulated via Up/Down Button arrays)
  const moveSection = (index: number, direction: 'UP' | 'DOWN') => {
    const newOrder = [...config.sectionOrder];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      setConfig({ ...config, sectionOrder: newOrder });
    }
  };

  // Section Editors
  const handleHeroChange = (index: number, field: keyof HeroCard, value: string) => {
    const updatedHero = config.hero.map((card, i) => {
      if (i === index) {
        return { ...card, [field]: value };
      }
      return card;
    });
    setConfig({ ...config, hero: updatedHero });
  };

  const handleAddHeroCard = () => {
    const newCard: HeroCard = {
      title: 'New Combo Deal',
      subtitle: 'Description of package deals',
      imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
      gender: 'ALL'
    };
    setConfig({ ...config, hero: [...config.hero, newCard] });
  };

  const handleRemoveHeroCard = (index: number) => {
    setConfig({ ...config, hero: config.hero.filter((_, i) => i !== index) });
  };

  const handlePublish = async () => {
    setLoading(true);
    setSuccessMsg(null);
    // Simulate cloud functions publish UI config
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    setSuccessMsg(`Home screen configuration for Zone successfully published. New version: ${config.version + 1}`);
    setConfig({ ...config, version: config.version + 1 });
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">UI Configuration Editor</h1>
          <p className="text-sm text-slate-400">Control sections, promotions, and visual layout order on the customer home screen.</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 font-semibold">Operational Zone:</span>
          <select
            value={selectedZone}
            onChange={(e) => handleZoneChange(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
          >
            <option value="zone_01">Chennai Central</option>
            <option value="zone_02">Trichy East</option>
          </select>
        </div>
      </div>

      {/* Alert banner */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400 text-sm">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Workspace split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Panel: Sections List & Order */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 space-y-6 h-fit">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Layout Section Ordering</h3>
            <p className="text-xs text-slate-500 mt-1">Configure visibility and stack sequence of home screen blocks.</p>
          </div>

          <div className="space-y-3">
            {config.sectionOrder.map((section, index) => {
              const isEnabled = config.sectionsEnabled[section];
              return (
                <div
                  key={section}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                    activeSection === section
                      ? 'border-violet-500 bg-violet-600/5'
                      : 'border-slate-600 bg-[#0f172a]/20 hover:border-slate-600'
                  }`}
                >
                  {/* Info Column */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveSection(section)}
                      className="text-left"
                    >
                      <p className="text-sm font-semibold text-slate-200 capitalize">{section} Section</p>
                      <p className="text-xs text-slate-500">
                        {isEnabled ? '🟢 Active on Home' : '🔴 Hidden on Home'}
                      </p>
                    </button>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {/* Toggle button */}
                    <button
                      onClick={() => toggleSection(section)}
                      className={`text-slate-400 hover:text-slate-200 transition-colors p-1`}
                    >
                      {isEnabled ? (
                        <ToggleRight className="h-6 w-6 text-violet-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-slate-600" />
                      )}
                    </button>

                    {/* Up/Down buttons for ordering */}
                    <div className="flex flex-col gap-0.5 border-l border-slate-600 pl-2">
                      <button
                        onClick={() => moveSection(index, 'UP')}
                        disabled={index === 0}
                        className="text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-500"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => moveSection(index, 'DOWN')}
                        disabled={index === config.sectionOrder.length - 1}
                        className="text-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-500"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-600">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-750 text-slate-200 font-semibold py-2.5 text-sm transition-all"
            >
              <Eye size={16} />
              Interactive Simulator
            </button>
            <button
              onClick={handlePublish}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold py-2.5 text-sm transition-all disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <CloudLightning size={16} />
              )}
              Publish Layout
            </button>
          </div>
        </div>

        {/* Right Panel: Selected Section Sub-Editor */}
        <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-600 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-200 capitalize">Editing: {activeSection} Section</h2>
              <p className="text-xs text-slate-500 mt-0.5">Parameters governing configuration logic.</p>
            </div>
            {!config.sectionsEnabled[activeSection] && (
              <span className="flex items-center gap-1 text-xs text-amber-500 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                <Info size={12} /> Currently Disabled
              </span>
            )}
          </div>

          {/* Sub-Editor: Hero Section */}
          {activeSection === 'hero' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Combo Cards (Max 8)</span>
                <button
                  onClick={handleAddHeroCard}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                >
                  <Plus size={14} /> Add Card
                </button>
              </div>

              <div className="space-y-4">
                {config.hero.map((card, index) => (
                  <div key={index} className="rounded-lg border border-slate-600 bg-[#0f172a]/30 p-4 space-y-4 relative">
                    <button
                      onClick={() => handleRemoveHeroCard(index)}
                      className="absolute top-4 right-4 text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Remove Card"
                    >
                      <Trash2 size={16} />
                    </button>

                    <span className="inline-block text-xs font-bold text-slate-500">Card #{index + 1}</span>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Headline Title</label>
                        <input
                          type="text"
                          value={card.title}
                          onChange={(e) => handleHeroChange(index, 'title', e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Subtitle description</label>
                        <input
                          type="text"
                          value={card.subtitle}
                          onChange={(e) => handleHeroChange(index, 'subtitle', e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-400 mb-1.5">Cover Image URL</label>
                        <input
                          type="text"
                          value={card.imageUrl}
                          onChange={(e) => handleHeroChange(index, 'imageUrl', e.target.value)}
                          className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">Gender Target</label>
                        <select
                          value={card.gender}
                          onChange={(e) => handleHeroChange(index, 'gender', e.target.value as any)}
                          className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-3 text-xs text-slate-200 outline-none focus:border-violet-500"
                        >
                          <option value="ALL">All</option>
                          <option value="MEN">Men</option>
                          <option value="WOMEN">Women</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Editor: Sponsor Row */}
          {activeSection === 'sponsor' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Row Header Title</label>
                  <input
                    type="text"
                    value={config.sponsor.title}
                    onChange={(e) => setConfig({ ...config, sponsor: { ...config.sponsor, title: e.target.value } })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Max Vendor Limit</label>
                  <input
                    type="number"
                    value={config.sponsor.limit}
                    onChange={(e) => setConfig({ ...config, sponsor: { ...config.sponsor, limit: parseInt(e.target.value) || 0 } })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-3">Sponsor Sourcing Mode</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, sponsor: { ...config.sponsor, mode: 'CURATED' } })}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      config.sponsor.mode === 'CURATED'
                        ? 'border-violet-500 bg-violet-600/10 text-violet-400'
                        : 'border-slate-600 bg-[#0f172a]/20 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <p className="text-sm font-semibold">Admin Curated</p>
                    <p className="text-xs text-slate-500 mt-0.5">Select specific vendors manually via picker search.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, sponsor: { ...config.sponsor, mode: 'AUTO' } })}
                    className={`rounded-lg border p-4 text-left transition-all ${
                      config.sponsor.mode === 'AUTO'
                        ? 'border-violet-500 bg-violet-600/10 text-violet-400'
                        : 'border-slate-600 bg-[#0f172a]/20 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <p className="text-sm font-semibold">Top Rated Auto</p>
                    <p className="text-xs text-slate-500 mt-0.5">Pulls most active high-scoring shops in target zone.</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Editor: Cashback Banner */}
          {activeSection === 'cashback' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Banner Headline</label>
                  <input
                    type="text"
                    value={config.cashback.headline}
                    onChange={(e) => setConfig({ ...config, cashback: { ...config.cashback, headline: e.target.value } })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Subtext</label>
                  <input
                    type="text"
                    value={config.cashback.subtext}
                    onChange={(e) => setConfig({ ...config, cashback: { ...config.cashback, subtext: e.target.value } })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Background Color Picker</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={config.cashback.bgColor}
                      onChange={(e) => setConfig({ ...config, cashback: { ...config.cashback, bgColor: e.target.value } })}
                      className="rounded border border-slate-700 h-10 w-12 cursor-pointer bg-[#0f172a] p-1"
                    />
                    <input
                      type="text"
                      value={config.cashback.bgColor}
                      onChange={(e) => setConfig({ ...config, cashback: { ...config.cashback, bgColor: e.target.value } })}
                      className="flex-1 rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Cover Background Image URL</label>
                  <input
                    type="text"
                    value={config.cashback.imageUrl}
                    onChange={(e) => setConfig({ ...config, cashback: { ...config.cashback, imageUrl: e.target.value } })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-[#0f172a]/40 border border-slate-600">
                <div>
                  <p className="text-sm font-medium text-slate-200">Auto-Extract Cashback Amount</p>
                  <p className="text-xs text-slate-500 mt-0.5">Pulls dynamic value directly from Platform config rules.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.cashback.showAmount}
                    onChange={(e) => setConfig({ ...config, cashback: { ...config.cashback, showAmount: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white" />
                </label>
              </div>
            </div>
          )}

          {/* Sub-Editor: Services Row */}
          {activeSection === 'services' && (
            <div className="space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Configured Quick Categories (Max 15)</span>
              
              <div className="divide-y divide-slate-800">
                {config.services.map((item, index) => (
                  <div key={index} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-[#0f172a] overflow-hidden border border-slate-600">
                        <img src={item.iconUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{item.label}</p>
                        <p className="text-xs text-slate-500 capitalize">{item.gender.toLowerCase()} target · Category: {item.category}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setConfig({ ...config, services: config.services.filter((_, i) => i !== index) })}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Remove Category"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulator Modal */}
      {showPreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowPreview(false)}
        >
          {/* Close button at top right */}
          <button 
            onClick={() => setShowPreview(false)}
            className="absolute top-6 right-6 p-2 bg-slate-700 text-slate-300 hover:text-white rounded-full transition-colors z-[60]"
          >
            <Trash2 size={20} className="hidden" /> {/* just for sizing or use X if available */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          <div 
            className="relative flex flex-col items-center max-w-sm w-full bg-slate-800 border border-slate-600 rounded-[40px] p-4 shadow-2xl overflow-hidden aspect-[9/19.5] max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Phone Top Notch */}
            <div className="w-32 h-6 bg-black rounded-b-xl absolute top-0 z-10 flex items-center justify-center">
              <span className="w-12 h-1 bg-slate-700 rounded-full" />
            </div>

            {/* Simulated Phone Screen workspace */}
            <div className="w-full flex-1 rounded-[32px] overflow-y-auto bg-[#0f172a] pt-8 pb-4 px-3 flex flex-col gap-5 scrollbar-thin">
              {/* Phone Header Status Bar */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 mt-1">
                <span>9:41</span>
                <span className="flex items-center gap-1">5G 🔋</span>
              </div>

              {/* Dynamic configs render */}
              {config.sectionOrder.map((section) => {
                const isEnabled = config.sectionsEnabled[section];
                if (!isEnabled) return null;

                if (section === 'hero') {
                  return (
                    <div key={section} className="space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-1">Exclusive Combo Deals</span>
                      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                        {config.hero.map((card, i) => (
                          <div key={i} className="relative w-52 shrink-0 aspect-[16/10] rounded-xl overflow-hidden bg-slate-800 border border-slate-600">
                            <img src={card.imageUrl} alt="" className="h-full w-full object-cover opacity-60" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent p-3 flex flex-col justify-end">
                              {card.badgeText && (
                                <span className="absolute top-2 right-2 text-[8px] font-extrabold bg-violet-600 px-1.5 py-0.5 rounded-full text-white">
                                  {card.badgeText}
                                </span>
                              )}
                              <h4 className="text-xs font-bold text-white truncate">{card.title}</h4>
                              <p className="text-[9px] text-slate-300 truncate mt-0.5">{card.subtitle}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (section === 'sponsor') {
                  return (
                    <div key={section} className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{config.sponsor.title}</span>
                        <span className="text-[9px] text-violet-400 font-semibold">View All</span>
                      </div>
                      
                      {/* Grid mock */}
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="rounded-lg bg-slate-800 border border-slate-600 p-2 space-y-1.5">
                            <div className="aspect-video w-full rounded bg-slate-700 overflow-hidden">
                              <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=200&q=80" alt="" className="h-full w-full object-cover" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-200 truncate">Elite Salon Studio</p>
                            <div className="flex items-center justify-between text-[8px] text-slate-400">
                              <span>⭐ 4.9 (42)</span>
                              <span>2.1 km</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (section === 'cashback') {
                  return (
                    <div
                      key={section}
                      className="rounded-xl p-3.5 flex items-center justify-between border border-slate-600/40 relative overflow-hidden"
                      style={{ backgroundColor: config.cashback.bgColor }}
                    >
                      <div className="space-y-0.5 z-10">
                        <h4 className="text-xs font-extrabold text-white">{config.cashback.headline}</h4>
                        <p className="text-[9px] text-slate-200 leading-snug">{config.cashback.subtext}</p>
                      </div>
                      {config.cashback.imageUrl && (
                        <img src={config.cashback.imageUrl} alt="" className="absolute right-0 top-0 bottom-0 h-full w-24 object-cover opacity-20" />
                      )}
                    </div>
                  );
                }

                if (section === 'services') {
                  return (
                    <div key={section} className="space-y-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 px-1">Quick Services</span>
                      <div className="flex gap-4 overflow-x-auto py-1 scrollbar-none">
                        {config.services.map((item, i) => (
                          <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                            <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
                              <img src={item.iconUrl} alt="" className="h-full w-full object-cover" />
                            </div>
                            <span className="text-[9px] text-slate-400">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
