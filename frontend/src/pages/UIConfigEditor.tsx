import toast from 'react-hot-toast';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye, CloudLightning, ToggleLeft, ToggleRight, Plus, Trash2,
  CheckCircle, AlertTriangle, RefreshCw, Save, History, RotateCcw, Smartphone, Monitor,
  Palette, LayoutList, UploadCloud,
} from 'lucide-react';
import {
  DEFAULT_THEME,
  fetchPublishedUiConfig, fetchDraftUiConfig, fetchZones,
  saveUiConfigDraft, publishUiConfig, getUiConfigVersions, rollbackUiConfig, seedGlobalUiTheme,
  backfillVendorOffers, uploadCmsImage, uploadUiConfigFile,
} from '../services/uiConfigService';
import type { ThemeMap, UiSection, FeedSection, VersionInfo } from '../services/uiConfigService';
import { fileToBase64 } from '../services/catalogService';
import { ArrowUp, ArrowDown, Layers, Crosshair, SlidersHorizontal } from 'lucide-react';

// Customer-supported section types (must match home_screen.dart _renderSection).
const SECTION_CATALOG: { type: string; label: string }[] = [
  { type: 'hero', label: 'Hero (top banner)' },
  { type: 'queueBanner', label: 'Queue Banner' },
  { type: 'offers', label: 'Offer Cards' },
  { type: 'cashback', label: 'Cashback Banner' },
  { type: 'popularServices', label: 'Categories' },
  { type: 'landing', label: 'Landing (top picks)' },
  { type: 'promoCarousel', label: 'Promo Carousel' },
  { type: 'promotions', label: 'Promotions Strip' },
  { type: 'announcements', label: 'Announcements' },
  { type: 'trustBadges', label: 'Trust Badges' },
  { type: 'referral', label: 'Referral Banner' },
  { type: 'sponsor', label: 'Top Rated Row' },
  { type: 'vendorList', label: 'Vendor List' },
];
const sectionLabel = (t: string) => SECTION_CATALOG.find((s) => s.type === t)?.label || t;

// ── SDUI feed composer (v3) helpers ─────────────────────────────────────────
// Type-keyed default for `themed` — these sections paint on the gradient TOP
// zone, so a composed descriptor MUST default them true or the unified blue top
// breaks (the app splits top/body by this flag). Everything else flows in body.
const THEMED_TYPES = new Set(['hero', 'cashback', 'queueBanner']);
const defaultThemed = (type: string) => THEMED_TYPES.has(type);

// Bounded layout enums — MUST mirror Flutter `section_layout.dart`.
const PADDING_OPTS = ['normal', 'none', 'tight', 'roomy'] as const;
const DIVIDER_OPTS = ['none', 'line'] as const;
const HEIGHT_OPTS = ['', 'sm', 'md', 'lg', 'xl', 'fullbleed'] as const; // '' = default (hero self-sizes)
const GENDER_OPTS = ['men', 'women', 'all'] as const;

let _feedSeq = 0;
const newFeedSection = (type: string, order: number): FeedSection => ({
  type,
  id: `${type}_${Date.now()}_${_feedSeq++}`,
  order,
  visible: true,
  themed: defaultThemed(type),
  layout: {},
  targeting: {},
  data: {},
});

// Predefined templates — MUST mirror lib/features/home/home_templates.dart.
const TEMPLATES: { id: string; label: string; desc: string; sections: string[] }[] = [
  { id: 'marketplace', label: 'Marketplace', desc: 'Hero banner + cashback, then categories & vendors.',
    sections: ['hero', 'cashback', 'popularServices', 'landing', 'vendorList'] },
  { id: 'campaign', label: 'Campaign', desc: 'Promo hero + offer cards, then categories & vendors.',
    sections: ['hero', 'offers', 'popularServices', 'landing', 'vendorList'] },
  { id: 'queue', label: 'Queue Management', desc: '"Still Waiting?" token banner + cashback.',
    sections: ['queueBanner', 'cashback', 'popularServices', 'landing', 'vendorList'] },
];
const templateById = (id: string) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

// ── Seed → palette derivation (mirrors Flutter ThemeConfig getters) so the
//    preview stays accurate from just the one theme colour. ──
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
function hexToHsl(hex: string): [number, number, number] {
  let h = (hex || '').replace('#', '').replace('0x', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(2);
  if (h.length !== 6) return [0, 0, 0.3];
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue /= 6;
  }
  return [hue, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  const to = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
const shiftL = (hex: string, d: number) => { const [h, s, l] = hexToHsl(hex); return hslToHex(h, s, clamp01(l + d)); };
const withL = (hex: string, l: number, sMin = 0, sMax = 1) => { const [h, s] = hexToHsl(hex); return hslToHex(h, Math.max(sMin, Math.min(sMax, s)), clamp01(l)); };

function derivePalette(seed: string, accent: string) {
  const dark = withL(seed, 0.16, 0.25, 0.7);
  return {
    headerTop: seed,
    headerBottom: shiftL(seed, -0.08),
    headerGradient: [seed, shiftL(seed, -0.05), shiftL(seed, -0.13)],
    primary: dark,
    secondary: seed,
    ctaBg: dark,
    ctaFg: '#FFFFFF',
    searchBg: '#FFFFFF',
    searchText: '#475569',
    searchIcon: seed,
    searchRadius: 15,
    chipBg: withL(seed, 0.95, 0, 0.4),
    chipSelectedBg: dark,
    chipText: '#0F172A',
    promoCardColors: [seed, accent],
  } as Record<string, string | string[] | number>;
}

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : typeof v === 'string' && v !== '' ? Number(v) : d);
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);

// ── Small reusable inputs ───────────────────────────────────────────────────
const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    <div className="flex gap-2">
      <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-200 h-9 w-10 cursor-pointer bg-gray-50 p-0.5" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2 text-xs text-gray-900 outline-none focus:border-black" />
    </div>
  </div>
);

const TextField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black" />
  </div>
);

const NumberField: React.FC<{ label: string; value: number; onChange: (v: number) => void; step?: string }> = ({ label, value, onChange, step }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black" />
  </div>
);

const ColorListField: React.FC<{ label: string; value: string[]; onChange: (v: string[]) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input type="color" value={c || '#000000'} onChange={(e) => { const n = [...value]; n[i] = e.target.value; onChange(n); }}
            className="rounded border border-gray-200 h-8 w-9 cursor-pointer bg-gray-50 p-0.5" />
          <input type="text" value={c} onChange={(e) => { const n = [...value]; n[i] = e.target.value; onChange(n); }}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-1.5 px-2 text-xs text-gray-900 outline-none focus:border-black" />
          <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-gray-500 hover:text-rose-400 p-1"><Trash2 size={14} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...value, '#0E7490'])} className="flex items-center gap-1 text-xs text-black font-semibold hover:text-black font-semibold font-semibold"><Plus size={13} /> Add color</button>
    </div>
  </div>
);

export const UIConfigEditor: React.FC = () => {
  const [target, setTarget] = useState('_global');
  const [zones, setZones] = useState<{ id: string; name: string }[]>([]);
  const [theme, setTheme] = useState<ThemeMap>({ ...DEFAULT_THEME });
  const [templateId, setTemplateId] = useState('marketplace');
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>({});
  const [sectionData, setSectionData] = useState<Record<string, Record<string, unknown>>>({});
  const [globalHero, setGlobalHero] = useState<Record<string, unknown>>({});
  const [themeOverride, setThemeOverride] = useState<ThemeMap>({});
  // v3 SDUI explicit feed (per-zone). Non-empty → it is the source of truth and
  // the template picker/visibility toggles are ignored by the app (modal).
  const [feed, setFeed] = useState<FeedSection[]>([]);
  const [layoutMode, setLayoutMode] = useState<'template' | 'feed'>('template');
  const [feedSel, setFeedSel] = useState<number | null>(null);
  // Per-gender override blocks + active editing scope (All edits the base).
  const [scope, setScope] = useState<'all' | 'men' | 'women'>('all');
  const [men, setMen] = useState<Record<string, unknown>>({});
  const [women, setWomen] = useState<Record<string, unknown>>({});
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [tab, setTab] = useState<'theme' | 'hero' | 'template' | 'preview'>('theme');
  const [activeType, setActiveType] = useState<string | null>(null);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasPublished, setHasPublished] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const isGlobal = target === '_global';
  const flash = (type: 'ok' | 'err', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4500); };

  const load = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const [draft, published, vres] = await Promise.all([
        fetchDraftUiConfig(t),
        fetchPublishedUiConfig(t),
        getUiConfigVersions({ target: t }).then((r) => r.data.versions).catch(() => [] as VersionInfo[]),
      ]);
      setHasPublished(!!published);
      const src = draft || published;
      if (t === '_global') {
        setTheme({ ...DEFAULT_THEME, ...((src?.theme as ThemeMap) || {}) });
        setGlobalHero((src?.globalHero as Record<string, unknown>) || {});
        setTemplateId('marketplace');
        setSectionVisibility({});
        setSectionData({});
        setThemeOverride({});
        setFeed([]);
        setLayoutMode('template');
      } else {
        setTemplateId((src?.templateId as string) || 'marketplace');
        setSectionVisibility((src?.sectionVisibility as Record<string, boolean>) || {});
        setSectionData((src?.sectionData as Record<string, Record<string, unknown>>) || {});
        setThemeOverride((src?.themeOverride as ThemeMap) || {});
        setTheme({ ...DEFAULT_THEME });
        setGlobalHero({});
        const loadedFeed = Array.isArray(src?.feed) ? (src!.feed as FeedSection[]) : [];
        setFeed(loadedFeed);
        // Modal: a saved non-empty feed IS the live layout → open in feed mode.
        setLayoutMode(loadedFeed.length > 0 ? 'feed' : 'template');
      }
      setFeedSel(null);
      setScope('all');
      setMen((src?.men as Record<string, unknown>) || {});
      setWomen((src?.women as Record<string, unknown>) || {});
      setVersions(vres);
      setTab(t === '_global' ? 'theme' : 'template');
      setActiveType(null);
    } catch (e) {
      flash('err', e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchZones().then(setZones).catch(() => setZones([])); }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(target); }, [target, load]);

  const draftPayload = useCallback(() => {
    if (isGlobal) return { target, theme, globalHero, men, women };
    // Modal: feed mode persists the explicit feed (order = array position);
    // template mode persists an empty feed so the app falls back to the preset.
    const outFeed: FeedSection[] = layoutMode === 'feed'
      ? feed.map((s, i) => ({ ...s, order: i }))
      : [];
    return { target, templateId, sectionVisibility, sectionData, themeOverride, men, women, feed: outFeed };
  }, [isGlobal, target, theme, globalHero, templateId, sectionVisibility, sectionData, themeOverride, men, women, layoutMode, feed]);

  const onSaveDraft = async () => {
    setBusy(true);
    try { await saveUiConfigDraft(draftPayload()); flash('ok', 'Draft saved.'); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  };

  const onPublish = async () => {
    setBusy(true);
    try {
      await saveUiConfigDraft(draftPayload());
      const res = await publishUiConfig({ target });
      flash('ok', `Published v${res.data.version}. Live on the app within the cache window (or pull-to-refresh).`);
      await load(target);
    } catch (e) { flash('err', e instanceof Error ? e.message : 'Publish failed'); }
    finally { setBusy(false); }
  };

  const onRollback = async (version: number) => {
    if (!window.confirm(`Roll back ${isGlobal ? 'the global theme' : 'this zone'} to version ${version}? This becomes the new live config.`)) return;
    setBusy(true);
    try { const res = await rollbackUiConfig({ target, version }); flash('ok', `Rolled back to v${version} (now live as v${res.data.version}).`); await load(target); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Rollback failed'); }
    finally { setBusy(false); }
  };

  const onSeed = async () => {
    setBusy(true);
    try { await seedGlobalUiTheme({}); flash('ok', 'Default global theme seeded.'); await load('_global'); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Seed failed'); }
    finally { setBusy(false); }
  };

  const onBackfill = async () => {
    setBusy(true);
    try { const r = await backfillVendorOffers({}); flash('ok', `Vendor offers backfilled (${r.data.vendorsUpdated} vendors).`); }
    catch (e) { flash('err', e instanceof Error ? e.message : 'Backfill failed'); }
    finally { setBusy(false); }
  };

  // Template ops
  const toggleVisibility = (type: string) =>
    setSectionVisibility({ ...sectionVisibility, [type]: sectionVisibility[type] === false });
  const patchSectionData = (type: string, patch: Record<string, unknown>) =>
    setSectionData({ ...sectionData, [type]: { ...(sectionData[type] || {}), ...patch } });

  // ── Scope-aware editing bindings: 'all' edits the base; 'men'/'women' edit
  //    that gender block (base shown as the inherited default). ──
  const gObj: Record<string, unknown> | null =
    scope === 'men' ? men : scope === 'women' ? women : null;
  const setGObj = (patch: Record<string, unknown>) =>
    scope === 'men' ? setMen({ ...men, ...patch }) : setWomen({ ...women, ...patch });

  const sTheme: ThemeMap = scope === 'all' ? theme : ((gObj?.theme as ThemeMap) || {});
  const sThemeBase: ThemeMap = scope === 'all' ? theme : { ...DEFAULT_THEME, ...theme };
  const setSTheme = (k: string, v: unknown) => scope === 'all'
    ? setTheme({ ...theme, [k]: v })
    : setGObj({ theme: { ...((gObj?.theme as ThemeMap) || {}), [k]: v } });

  const sHero: Record<string, unknown> = scope === 'all' ? globalHero : ((gObj?.globalHero as Record<string, unknown>) || {});
  const setSHero = (patch: Record<string, unknown>) => scope === 'all'
    ? setGlobalHero({ ...globalHero, ...patch })
    : setGObj({ globalHero: { ...((gObj?.globalHero as Record<string, unknown>) || {}), ...patch } });

  const sTemplateId: string = scope === 'all' ? templateId : ((gObj?.templateId as string) || templateId);
  const setSTemplateId = (id: string) => scope === 'all' ? setTemplateId(id) : setGObj({ templateId: id });
  const sVis: Record<string, boolean> = scope === 'all' ? sectionVisibility : ((gObj?.sectionVisibility as Record<string, boolean>) || {});
  const toggleSVis = (type: string) => scope === 'all'
    ? toggleVisibility(type)
    : setGObj({ sectionVisibility: { ...sVis, [type]: sVis[type] === false } });
  const sData: Record<string, Record<string, unknown>> = scope === 'all' ? sectionData : ((gObj?.sectionData as Record<string, Record<string, unknown>>) || {});
  const patchSData = (type: string, patch: Record<string, unknown>) => scope === 'all'
    ? patchSectionData(type, patch)
    : setGObj({ sectionData: { ...sData, [type]: { ...(sData[type] || {}), ...patch } } });

  const sThemeOverride: ThemeMap = scope === 'all' ? themeOverride : ((gObj?.themeOverride as ThemeMap) || {});
  const setSThemeOverride = (k: string, v: unknown) => scope === 'all'
    ? setThemeOverride({ ...themeOverride, [k]: v })
    : setGObj({ themeOverride: { ...sThemeOverride, [k]: v } });

  // Preview reflects the active scope (base ⊕ gender block).
  const previewTheme: ThemeMap = isGlobal
    ? (scope === 'all' ? theme : { ...theme, ...sTheme })
    : { ...DEFAULT_THEME, ...themeOverride, ...(scope !== 'all' ? sThemeOverride : {}) };
  const previewSections: UiSection[] = (!isGlobal && layoutMode === 'feed')
    ? feed.map((s) => ({ type: s.type, enabled: s.visible !== false, data: (s.data as Record<string, unknown>) || {} }))
    : (isGlobal ? templateById('marketplace') : templateById(sTemplateId))
        .sections.map((type) => ({
          type,
          enabled: isGlobal ? true : sVis[type] !== false,
          data: (isGlobal ? (type === 'hero' ? sHero : {}) : sData[type]) || {},
        }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">UI Configuration & Theme Engine</h1>
          <p className="text-sm text-gray-500">Dynamic homepage — theme, hero & sections. Edit a draft, preview, then publish. Rollback any version.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-semibold">Target:</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 outline-none focus:border-black">
            <option value="_global">🌐 Global Theme</option>
            {zones.map((z) => <option key={z.id} value={z.id}>📍 {z.name}</option>)}
          </select>
        </div>
      </div>

      {/* Audience scope: All = base config; Men/Women override it for that
          audience (shown when the customer's gender filter matches). */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 font-semibold">Audience:</span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {(['all', 'men', 'women'] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-md capitalize transition-colors ${scope === s ? 'bg-black text-white text-gray-900' : 'text-gray-800 hover:text-gray-900'}`}>
              {s === 'all' ? 'All (base)' : s}
            </button>
          ))}
        </div>
        {scope !== 'all' && (
          <span className="text-xs text-gray-500">Editing the <b className="text-gray-800 capitalize">{scope}</b> override — only changed fields override the base.</span>
        )}
      </div>

      {/* Alerts */}
      {msg && (
        <div className={`flex items-center gap-3 rounded-lg border p-4 text-sm ${msg.type === 'ok' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}>
          {msg.type === 'ok' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}
      {isGlobal && !hasPublished && !loading && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-400 text-sm">
          <span>No global theme published yet. Seed the default (matches the current app) to start.</span>
          <button onClick={onSeed} disabled={busy} className="rounded-lg bg-amber-600 hover:bg-amber-500 text-gray-900 font-semibold py-1.5 px-3 text-xs disabled:opacity-50">Seed default theme</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        {(isGlobal ? ['theme', 'hero', 'preview'] : ['template', 'theme', 'preview']).map((t) => (
          <button key={t} onClick={() => setTab(t as typeof tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t ? 'border-black text-black font-semibold' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            {t === 'theme' && <Palette size={15} />}{t === 'template' && <LayoutList size={15} />}{t === 'hero' && <UploadCloud size={15} />}{t === 'preview' && <Eye size={15} />}
            {t === 'theme' ? (isGlobal ? 'Theme' : 'Theme Override') : t === 'template' ? 'Template' : t === 'hero' ? 'Hero (global)' : 'Live Preview'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-1.5">
          <button onClick={onBackfill} disabled={busy || loading} title="Recompute vendor offer flags for the landing row"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-slate-700 hover:bg-slate-600 text-gray-800 font-semibold py-2 px-3 text-sm disabled:opacity-50">
            <RefreshCw size={14} /> Backfill offers
          </button>
          <button onClick={onSaveDraft} disabled={busy || loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-slate-700 hover:bg-slate-600 text-gray-900 font-semibold py-2 px-3 text-sm disabled:opacity-50">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save size={15} />} Save Draft
          </button>
          <button onClick={onPublish} disabled={busy || loading}
            className="flex items-center gap-1.5 rounded-lg bg-black text-white hover:bg-gray-900 text-gray-900 font-semibold py-2 px-3 text-sm disabled:opacity-50">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudLightning size={15} />} Publish
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500"><RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Editors (left/main) ── */}
          <div className="lg:col-span-2 space-y-6">
            {tab === 'theme' && (
              <ThemeEditor
                isGlobal={isGlobal}
                value={isGlobal ? sTheme : sThemeOverride}
                base={isGlobal ? sThemeBase : { ...DEFAULT_THEME, ...themeOverride }}
                onChange={(k, v) => (isGlobal ? setSTheme(k, v) : setSThemeOverride(k, v))}
              />
            )}
            {tab === 'hero' && isGlobal && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <HeroEditor data={sHero} onPatch={(p) => setSHero(p)} />
                <p className="text-xs text-gray-500 mt-4 border-t border-gray-200 pt-3">{scope === 'all' ? 'Default hero for every zone (video / GIF / image). A zone can override it.' : `${scope.toUpperCase()} audience hero — overrides the base hero only for ${scope} users.`}</p>
              </div>
            )}
            {tab === 'template' && !isGlobal && (
              <div className="space-y-5">
                {/* Layout mode (modal): Template preset vs Custom feed. A non-empty
                    custom feed is the app's source of truth — the template picker
                    below is ignored while in feed mode. */}
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-2"><Layers size={15} className="text-black font-semibold" /><h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Layout mode</h3></div>
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                    {(['template', 'feed'] as const).map((m) => (
                      <button key={m} onClick={() => { setLayoutMode(m); setFeedSel(null); }}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${layoutMode === m ? 'bg-black text-white text-gray-900' : 'text-gray-800 hover:text-gray-900'}`}>
                        {m === 'template' ? 'Template preset' : 'Custom feed (advanced)'}
                      </button>
                    ))}
                  </div>
                  {scope !== 'all' && layoutMode === 'feed' && (
                    <p className="text-[11px] text-amber-400/90 mt-2">Custom feed edits the <b>base</b> layout (all audiences). Per-gender feed authoring is a separate follow-up — the Men/Women scope here still applies to theme/hero.</p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-2">
                    {layoutMode === 'feed'
                      ? 'Custom feed is LIVE for this zone — full control of order, visibility, per-section layout & targeting. Switch back to Template preset (then Save) to discard it.'
                      : 'Using a predefined template. Switch to Custom feed for drag-style reordering, per-section targeting & layout params.'}
                  </p>
                </div>

                {layoutMode === 'template' ? (
                  <TemplateEditor
                    templateId={sTemplateId} setTemplateId={setSTemplateId}
                    sectionVisibility={sVis} toggleVisibility={toggleSVis}
                    sectionData={sData} patchSectionData={patchSData}
                    activeType={activeType} setActiveType={setActiveType}
                  />
                ) : (
                  <FeedComposer
                    feed={feed} setFeed={setFeed}
                    sel={feedSel} setSel={setFeedSel}
                    zones={zones}
                  />
                )}
              </div>
            )}
            {tab === 'preview' && (
              <PreviewPane theme={previewTheme} sections={previewSections} device={device} setDevice={setDevice} />
            )}
          </div>

          {/* ── Version history (right) ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 h-fit">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 mb-3"><History size={15} /> Version History</h3>
            {versions.length === 0 ? (
              <p className="text-xs text-gray-500">No previous versions yet. Publish to create the first restore point.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.version} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/40 p-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Version {v.version}</p>
                      <p className="text-[11px] text-gray-500">{v.publishedAt ? new Date(v.publishedAt).toLocaleString() : '—'}{v.publishedBy ? ` · ${v.publishedBy}` : ''}</p>
                    </div>
                    <button onClick={() => onRollback(v.version)} disabled={busy}
                      className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold disabled:opacity-50"><RotateCcw size={13} /> Restore</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Theme editor
// ════════════════════════════════════════════════════════════════════════════
const ThemeEditor: React.FC<{ isGlobal: boolean; value: ThemeMap; base: ThemeMap; onChange: (k: string, v: unknown) => void }> = ({ isGlobal, value, base, onChange }) => {
  const seed = str(value.seed ?? base.seed ?? '#0E7490');
  const accent = str(value.accent ?? base.accent ?? '#22D3EE');
  const pal = derivePalette(seed, accent);
  const swatch = (label: string, color: string) => (
    <div className="flex flex-col items-center gap-1">
      <div className="h-9 w-9 rounded-lg border border-gray-200" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-gray-500">{label}</span>
    </div>
  );
  return (
    <div className="space-y-6">
      {!isGlobal && (
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-300">
          Per-zone override — set a theme colour here to override the global theme for this zone, or leave blank to inherit global.
        </div>
      )}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1">Theme color</h3>
          <p className="text-xs text-gray-500 mb-4">One colour drives the entire top section — header gradient, search, category chips, buttons and promo cards are all derived from it.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField label="Theme color" value={seed} onChange={(v) => onChange('seed', v)} />
            <ColorField label="Accent (highlights)" value={accent} onChange={(v) => onChange('accent', v)} />
            <ColorField label="Content background" value={str(value.sheetBg ?? base.sheetBg ?? '#F8FAFC')} onChange={(v) => onChange('sheetBg', v)} />
          </div>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Derived palette (auto)</h4>
          <div className="flex flex-wrap gap-4">
            {swatch('Header', pal.headerTop as string)}
            {swatch('Header ↓', pal.headerBottom as string)}
            {swatch('Buttons', pal.primary as string)}
            {swatch('Accent', accent)}
            {swatch('Chip', pal.chipBg as string)}
            {swatch('Search', seed)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Template editor — pick a template, toggle section visibility, edit section data.
// (Order is fixed by the template; admins do NOT reorder/add/remove.)
// ════════════════════════════════════════════════════════════════════════════
const TemplateEditor: React.FC<{
  templateId: string; setTemplateId: (id: string) => void;
  sectionVisibility: Record<string, boolean>; toggleVisibility: (type: string) => void;
  sectionData: Record<string, Record<string, unknown>>; patchSectionData: (type: string, p: Record<string, unknown>) => void;
  activeType: string | null; setActiveType: (t: string | null) => void;
}> = ({ templateId, setTemplateId, sectionVisibility, toggleVisibility, sectionData, patchSectionData, activeType, setActiveType }) => {
  const tpl = templateById(templateId);
  return (
    <div className="space-y-6">
      {/* Template picker */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Template</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => { setTemplateId(t.id); setActiveType(null); }}
              className={`rounded-lg border p-4 text-left transition-all ${templateId === t.id ? 'border-black bg-black text-white' : 'border-gray-200 bg-gray-50/30 hover:border-gray-200'}`}>
              <p className="text-sm font-bold text-gray-900">{t.label}</p>
              <p className="text-xs text-gray-500 mt-1">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Section visibility (order fixed by template) */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Sections — visibility</h3>
          {tpl.sections.map((type) => {
            const visible = sectionVisibility[type] !== false;
            return (
              <div key={type} className={`flex items-center justify-between rounded-lg border p-3 ${activeType === type ? 'border-black bg-black text-white' : 'border-gray-200 bg-gray-50/30'}`}>
                <button onClick={() => setActiveType(type)} className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{sectionLabel(type)}</p>
                  <p className="text-xs text-gray-500">{visible ? '🟢 Visible' : '🔴 Hidden'}</p>
                </button>
                <button onClick={() => toggleVisibility(type)} className="p-1">
                  {visible ? <ToggleRight className="h-5 w-5 text-violet-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
            );
          })}
          <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-200">Order is fixed by the template. Switch templates above to change the layout.</p>
        </div>

        {/* Selected section sub-editor */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          {activeType === null ? (
            <p className="text-sm text-gray-500">Select a section to edit its content.</p>
          ) : (
            <SectionDataEditor section={{ type: activeType, data: sectionData[activeType] || {} }} onPatch={(p) => patchSectionData(activeType, p)} />
          )}
        </div>
      </div>
    </div>
  );
};

const SectionDataEditor: React.FC<{ section: UiSection; onPatch: (p: Record<string, unknown>) => void }> = ({ section, onPatch }) => {
  const d = section.data || {};
  if (section.type === 'hero') return <HeroEditor data={d} onPatch={onPatch} />;
  if (section.type === 'cashback') return <CashbackEditor data={d} onPatch={onPatch} />;
  if (section.type === 'queueBanner')
    return (
      <div className="space-y-4">
        <h3 className="text-base font-bold text-gray-900">Queue Banner</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Title" value={str(d.title)} onChange={(v) => onPatch({ title: v })} placeholder="Still Waiting?" />
          <TextField label="Subtitle" value={str(d.subtitle)} onChange={(v) => onPatch({ subtitle: v })} placeholder="Long queues. Uncertain time." />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Token label" value={str(d.tokenLabel)} onChange={(v) => onPatch({ tokenLabel: v })} placeholder="YOUR TOKEN" />
          <TextField label="Token number" value={str(d.tokenNumber)} onChange={(v) => onPatch({ tokenNumber: v })} placeholder="45" />
          <TextField label="Token caption" value={str(d.tokenCaption)} onChange={(v) => onPatch({ tokenCaption: v })} placeholder="PEOPLE AHEAD" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="CTA text" value={str(d.ctaText)} onChange={(v) => onPatch({ ctaText: v })} placeholder="Book Now" />
          <TextField label="CTA route" value={str(d.ctaRoute)} onChange={(v) => onPatch({ ctaRoute: v })} placeholder="/search" />
        </div>
        <ColorListField label="Background gradient colors" value={arr(d.bgColors)} onChange={(v) => onPatch({ bgColors: v })} />
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Height</label>
          <select value={str(d.heightMode, 'medium')} onChange={(e) => onPatch({ heightMode: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black">
            <option value="compact">Compact</option><option value="medium">Medium</option><option value="campaign">Campaign</option>
          </select>
        </div>
      </div>
    );
  if (section.type === 'landing')
    return (
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-900">Landing (top picks)</h3>
        <TextField label="Section title" value={str(d.title)} onChange={(v) => onPatch({ title: v })} placeholder="Top picks near you" />
        <p className="text-xs text-gray-500">Shows the top-3 vendors with active offers (else top-rated). Run <span className="text-gray-800">Backfill offers</span> once after deploy so existing vendors get the offer flag.</p>
      </div>
    );
  if (section.type === 'popularServices')
    return (
      <div className="space-y-4">
        <h3 className="text-base font-bold text-gray-900">Categories</h3>
        <TextField label="Section title" value={str(d.title)} onChange={(v) => onPatch({ title: v })} placeholder="Popular Services" />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Chip size (px)" value={num(d.iconSize, 58)} onChange={(v) => onPatch({ iconSize: v })} />
          <NumberField label="Spacing between chips (px)" value={num(d.spacing, 12)} onChange={(v) => onPatch({ spacing: v })} />
        </div>
      </div>
    );
  if (section.type === 'services' || section.type === 'sponsor')
    return <div className="space-y-4"><h3 className="text-base font-bold text-gray-900">{sectionLabel(section.type)}</h3><TextField label="Section title" value={str(d.title)} onChange={(v) => onPatch({ title: v })} placeholder="Popular Services" /></div>;
  if (section.type === 'referral')
    return <div><h3 className="text-base font-bold text-gray-900 mb-2">Referral Banner</h3><p className="text-sm text-gray-500">Show/hide and order this banner here. Its <span className="text-gray-800">headline & subtext are managed under Home Content (CMS)</span> — the customer banner reads those, not this section.</p></div>;
  if (section.type === 'vendorList')
    return <div className="space-y-4"><h3 className="text-base font-bold text-gray-900">Vendor List</h3><div><label className="block text-xs text-gray-500 mb-1.5">Max vendors</label><input type="number" value={num(d.limit, 20)} onChange={(e) => onPatch({ limit: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black" /></div></div>;
  return <div><h3 className="text-base font-bold text-gray-900 mb-2">{sectionLabel(section.type)}</h3><p className="text-sm text-gray-500">This section has no editable content — its data is admin-managed elsewhere (CMS) or auto-generated.</p></div>;
};

// ── Hero section editor (media + height + overlay + copy) ───────────────────
const HeroEditor: React.FC<{ data: Record<string, unknown>; onPatch: (p: Record<string, unknown>) => void }> = ({ data, onPatch }) => {
  const mediaType = str(data.mediaType, 'video');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      let url: string;
      if (mediaType === 'image' || mediaType === 'gif') {
        const b64 = await fileToBase64(file);
        const res = await uploadCmsImage({ fileBase64: b64, contentType: file.type, folder: 'hero' });
        url = (res.data as { url?: string }).url || '';
      } else {
        url = await uploadUiConfigFile(file); // video / lottie json
      }
      if (url) onPatch({ mediaUrl: url });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const accept = mediaType === 'video' ? 'video/*' : mediaType === 'lottie' ? 'application/json,.json' : 'image/*';
  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-gray-900">Hero Section</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Media type</label>
          <select value={mediaType} onChange={(e) => onPatch({ mediaType: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black">
            <option value="video">Video</option><option value="image">Image</option><option value="lottie">Lottie</option><option value="gif">GIF</option><option value="none">None (color/gradient)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Height</label>
          <select value={str(data.heightMode, '')} onChange={(e) => onPatch({ heightMode: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black">
            <option value="">Default (banner)</option><option value="compact">Compact (~38%)</option><option value="medium">Medium (~50%)</option><option value="campaign">Campaign (~66%)</option>
          </select>
        </div>
      </div>
      {mediaType !== 'none' && (
        <div className="space-y-2">
          <TextField label="Media URL" value={str(data.mediaUrl)} onChange={(v) => onPatch({ mediaUrl: v })} placeholder="https://… (or upload)" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-xs text-black font-semibold hover:text-black font-semibold font-semibold disabled:opacity-50">
            {uploading ? <RefreshCw size={13} className="animate-spin" /> : <UploadCloud size={13} />} Upload {mediaType}
          </button>
          <input ref={fileRef} type="file" accept={accept} onChange={onUpload} className="hidden" />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <ColorField label="Background color" value={str(data.bgColor, '#155E75')} onChange={(v) => onPatch({ bgColor: v })} />
        <ColorField label="Overlay color" value={str(data.overlayColor, '#000000')} onChange={(v) => onPatch({ overlayColor: v })} />
      </div>
      <ColorListField label="Background gradient (optional)" value={arr(data.gradientColors)} onChange={(v) => onPatch({ gradientColors: v })} />
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Overlay opacity (0–1)</label>
        <input type="number" step="0.05" min="0" max="1" value={num(data.overlayOpacity, 0)} onChange={(e) => onPatch({ overlayOpacity: Number(e.target.value) })} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Title (optional)" value={str(data.title)} onChange={(v) => onPatch({ title: v })} />
        <TextField label="Subtitle (optional)" value={str(data.subtitle)} onChange={(v) => onPatch({ subtitle: v })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="CTA text (optional)" value={str(data.ctaText)} onChange={(v) => onPatch({ ctaText: v })} />
        <TextField label="CTA route (optional)" value={str(data.ctaRoute)} onChange={(v) => onPatch({ ctaRoute: v })} placeholder="/search" />
      </div>
    </div>
  );
};

// ── Cashback section editor (copy + background colors + visual) ─────────────
const CashbackEditor: React.FC<{ data: Record<string, unknown>; onPatch: (p: Record<string, unknown>) => void }> = ({ data, onPatch }) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const b64 = await fileToBase64(file);
      const res = await uploadCmsImage({ fileBase64: b64, contentType: file.type, folder: 'cashback' });
      const url = (res.data as { url?: string }).url || '';
      if (url) onPatch({ imageUrl: url });
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-gray-900">Cashback Banner</h3>
      <p className="text-xs text-gray-500">Overrides the CMS copy/visual for this banner. Leave headline/subtext blank to inherit the Home Content (CMS) copy.</p>
      <TextField label="Headline (optional override)" value={str(data.headline)} onChange={(v) => onPatch({ headline: v })} />
      <TextField label="Subtext (optional override)" value={str(data.subtext)} onChange={(v) => onPatch({ subtext: v })} />
      <ColorListField label="Background gradient colors" value={arr(data.bgColors)} onChange={(v) => onPatch({ bgColors: v })} />
      <div className="space-y-2">
        <TextField label="Left visual image URL (optional)" value={str(data.imageUrl)} onChange={(v) => onPatch({ imageUrl: v })} placeholder="https://… (or upload)" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-xs text-black font-semibold hover:text-black font-semibold font-semibold disabled:opacity-50">
          {uploading ? <RefreshCw size={13} className="animate-spin" /> : <UploadCloud size={13} />} Upload image
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
      </div>
      <TextField label="Lottie URL (optional, used if no image)" value={str(data.lottieUrl)} onChange={(v) => onPatch({ lottieUrl: v })} />
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Feed Composer (v3 SDUI) — author the explicit ordered feed: add/remove/reorder
// sections, set per-section visibility/themed, bounded layout params, targeting
// predicates, and content (reusing the per-type data editors).
// ════════════════════════════════════════════════════════════════════════════
const cleanObj = (o: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) continue;
    out[k] = v;
  }
  return out;
};
type PatchAt = (i: number, p: Partial<FeedSection>) => void;
const patchTarget = (i: number, cur: FeedSection, patchAt: PatchAt, key: string, val: unknown) =>
  patchAt(i, { targeting: cleanObj({ ...(cur.targeting || {}), [key]: val }) });
const schedStr = (sched: unknown, key: 'start' | 'end') => {
  const s = sched && typeof sched === 'object' ? (sched as Record<string, unknown>)[key] : undefined;
  return typeof s === 'string' ? s : '';
};
const patchSchedule = (i: number, cur: FeedSection, patchAt: PatchAt, key: 'start' | 'end', val: string) => {
  const prev: Record<string, unknown> =
    cur.targeting?.schedule && typeof cur.targeting.schedule === 'object'
      ? { ...(cur.targeting.schedule as Record<string, unknown>) }
      : {};
  if (val) prev[key] = val; else delete prev[key];
  const schedule = Object.keys(prev).length ? prev : undefined;
  patchAt(i, { targeting: cleanObj({ ...(cur.targeting || {}), schedule }) });
};

const LayoutSelect: React.FC<{ label: string; value: string; opts: string[]; labels?: Record<string, string>; onChange: (v: string) => void }> = ({ label, value, opts, labels, onChange }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black capitalize">
      {opts.map((o) => <option key={o} value={o}>{labels?.[o] ?? (o === '' ? 'Default' : o)}</option>)}
    </select>
  </div>
);

const ChipMultiSelect: React.FC<{ label: string; all: string[]; value: string[]; labelFor?: (v: string) => string; onChange: (v: string[]) => void }> = ({ label, all, value, labelFor, onChange }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    <div className="flex flex-wrap gap-1.5">
      {all.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors capitalize ${on ? 'border-black bg-black text-white text-violet-200' : 'border-gray-200 bg-gray-50 text-gray-500 hover:text-gray-900'}`}>
            {labelFor ? labelFor(o) : o}
          </button>
        );
      })}
    </div>
  </div>
);

const ScheduleField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
    <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black" />
  </div>
);

const FeedComposer: React.FC<{
  feed: FeedSection[]; setFeed: (f: FeedSection[]) => void;
  sel: number | null; setSel: (i: number | null) => void;
  zones: { id: string; name: string }[];
}> = ({ feed, setFeed, sel, setSel, zones }) => {
  const [addType, setAddType] = useState(SECTION_CATALOG[0].type);

  const addSection = () => { const next = [...feed, newFeedSection(addType, feed.length)]; setFeed(next); setSel(next.length - 1); };
  const removeAt = (i: number) => { setFeed(feed.filter((_, j) => j !== i)); setSel(null); };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= feed.length) return;
    const next = [...feed]; [next[i], next[j]] = [next[j], next[i]]; setFeed(next); setSel(j);
  };
  const patchAt: PatchAt = (i, patch) => setFeed(feed.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const cur = sel !== null ? feed[sel] : null;
  const lay = (cur?.layout || {}) as Record<string, unknown>;
  const tgt = (cur?.targeting || {}) as Record<string, unknown>;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Section list + add */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3 h-fit">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Feed — order & visibility</h3>
        {feed.length === 0 && <p className="text-xs text-gray-500">Empty feed. Add sections below to compose the home, top to bottom.</p>}
        {feed.map((s, i) => {
          const visible = s.visible !== false;
          const targeted = !!s.targeting && Object.keys(s.targeting).length > 0;
          return (
            <div key={s.id || i} className={`flex items-center gap-1.5 rounded-lg border p-2.5 ${sel === i ? 'border-black bg-black text-white' : 'border-gray-200 bg-gray-50/30'}`}>
              <span className="text-[10px] text-gray-500 w-4 text-center shrink-0">{i + 1}</span>
              <button onClick={() => setSel(i)} className="text-left flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{sectionLabel(s.type)}</p>
                <p className="text-[11px] text-gray-500 truncate">{visible ? '🟢' : '🔴'}{s.themed ? ' · themed' : ''}{targeted ? ' · 🎯' : ''}</p>
              </button>
              <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-gray-500 hover:text-black font-semibold disabled:opacity-30"><ArrowUp size={14} /></button>
              <button onClick={() => move(i, 1)} disabled={i === feed.length - 1} className="p-1 text-gray-500 hover:text-black font-semibold disabled:opacity-30"><ArrowDown size={14} /></button>
              <button onClick={() => patchAt(i, { visible: !visible })} className="p-1">{visible ? <ToggleRight className="h-5 w-5 text-violet-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}</button>
              <button onClick={() => removeAt(i)} className="p-1 text-gray-500 hover:text-rose-400"><Trash2 size={14} /></button>
            </div>
          );
        })}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <select value={addType} onChange={(e) => setAddType(e.target.value)} className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-2 px-2 text-xs text-gray-900 outline-none focus:border-black">
            {SECTION_CATALOG.map((s) => <option key={s.type} value={s.type}>{s.label}</option>)}
          </select>
          <button onClick={addSection} className="flex items-center gap-1 rounded-lg bg-black text-white hover:bg-gray-900 text-gray-900 font-semibold py-2 px-3 text-xs"><Plus size={13} /> Add</button>
        </div>
        <p className="text-[11px] text-gray-500">Use ▲▼ to reorder; renders top→bottom. Themed sections paint on the blue top zone.</p>
      </div>

      {/* Per-section panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
        {cur === null || sel === null ? (
          <p className="text-sm text-gray-500">Select a section to edit its placement, layout, targeting & content.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-gray-900">{sectionLabel(cur.type)}</h3>
              <label className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                <input type="checkbox" checked={!!cur.themed} onChange={(e) => patchAt(sel, { themed: e.target.checked })} />
                Themed (blue top)
              </label>
            </div>

            {/* Layout params */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500"><SlidersHorizontal size={13} /> Layout</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <LayoutSelect label="Vertical spacing" value={str(lay.padding, 'normal')} opts={[...PADDING_OPTS]} onChange={(v) => patchAt(sel, { layout: { ...lay, padding: v } })} />
                <LayoutSelect label="Divider after" value={str(lay.divider, 'none')} opts={[...DIVIDER_OPTS]} onChange={(v) => patchAt(sel, { layout: { ...lay, divider: v } })} />
                {cur.type === 'hero' && (
                  <LayoutSelect label="Hero height" value={str(lay.height, '')} opts={[...HEIGHT_OPTS]} labels={{ '': 'Default (banner)' }} onChange={(v) => patchAt(sel, { layout: cleanObj({ ...lay, height: v }) })} />
                )}
                {cur.type === 'popularServices' && (
                  <>
                    <NumberField label="Chip size (px)" value={num(lay.iconSize, 58)} onChange={(v) => patchAt(sel, { layout: { ...lay, iconSize: v } })} />
                    <NumberField label="Chip spacing (px)" value={num(lay.spacing, 12)} onChange={(v) => patchAt(sel, { layout: { ...lay, spacing: v } })} />
                  </>
                )}
              </div>
            </div>

            {/* Targeting predicates */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-500"><Crosshair size={13} /> Targeting <span className="normal-case font-normal text-gray-400">· empty = always show</span></div>
              <ChipMultiSelect label="Genders" all={[...GENDER_OPTS]} value={arr(tgt.genders)} onChange={(v) => patchTarget(sel, cur, patchAt, 'genders', v)} />
              {zones.length > 0 && (
                <ChipMultiSelect label="Zones" all={zones.map((z) => z.id)} labelFor={(id) => zones.find((z) => z.id === id)?.name || id} value={arr(tgt.zones)} onChange={(v) => patchTarget(sel, cur, patchAt, 'zones', v)} />
              )}
              <TextField label="Segments (comma-separated)" value={arr(tgt.segments).join(', ')} onChange={(v) => patchTarget(sel, cur, patchAt, 'segments', v.split(',').map((x) => x.trim()).filter(Boolean))} placeholder="vip, new, lapsed" />
              <div className="grid gap-3 sm:grid-cols-2">
                <ScheduleField label="Show from" value={schedStr(tgt.schedule, 'start')} onChange={(v) => patchSchedule(sel, cur, patchAt, 'start', v)} />
                <ScheduleField label="Show until" value={schedStr(tgt.schedule, 'end')} onChange={(v) => patchSchedule(sel, cur, patchAt, 'end', v)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Min app version" value={str(tgt.minAppVersion)} onChange={(v) => patchTarget(sel, cur, patchAt, 'minAppVersion', v)} placeholder="1.2.0" />
                <TextField label="Max app version" value={str(tgt.maxAppVersion)} onChange={(v) => patchTarget(sel, cur, patchAt, 'maxAppVersion', v)} placeholder="" />
              </div>
            </div>

            {/* Content — reuse the existing per-type data editors */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Content</div>
              <SectionDataEditor section={{ type: cur.type, data: (cur.data as Record<string, unknown>) || {} }} onPatch={(p) => patchAt(sel, { data: { ...(cur.data || {}), ...p } })} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// Preview (approximate — verify on device)
// ════════════════════════════════════════════════════════════════════════════
const PreviewPane: React.FC<{ theme: ThemeMap; sections: UiSection[]; device: 'mobile' | 'desktop'; setDevice: (d: 'mobile' | 'desktop') => void }> = ({ theme, sections, device, setDevice }) => {
  const seed = str(theme.seed ?? DEFAULT_THEME.seed);
  const accent = str(theme.accent ?? DEFAULT_THEME.accent);
  const pal = derivePalette(seed, accent);
  // Prefer derived palette values; fall back to raw theme/sheetBg for non-derived keys.
  const t = (k: string) => (typeof pal[k] === 'string' ? (pal[k] as string) : str(theme[k] ?? DEFAULT_THEME[k]));
  const headerStops = pal.headerGradient as string[];
  const headerBg = `linear-gradient(${headerStops.join(',')})`;
  const promo = pal.promoCardColors as string[];
  const ordered = useMemo(() => sections.filter((s) => s.enabled !== false), [sections]);
  const hero = ordered.find((s) => s.type === 'hero');
  const heroData = (hero?.data || {}) as Record<string, unknown>;
  const heroH = { compact: 150, medium: 200, campaign: 260 }[str(heroData.heightMode)] ?? 110;
  const heroGrad = arr(heroData.gradientColors);
  const heroBg = heroGrad.length >= 2 ? `linear-gradient(135deg, ${heroGrad.join(',')})` : (str(heroData.bgColor) || `linear-gradient(135deg, ${t('headerTop')}, ${t('headerBottom')})`);

  const queue = ordered.find((s) => s.type === 'queueBanner');
  const qd = (queue?.data || {}) as Record<string, unknown>;
  const qStops = arr(qd.bgColors);
  const qBg = qStops.length >= 2 ? `linear-gradient(135deg, ${qStops.join(',')})` : 'linear-gradient(135deg,#0B1220,#111A30,#0A1326)';
  const qH = ({ compact: 150, medium: 190, campaign: 240 } as Record<string, number>)[str(qd.heightMode, 'medium')] ?? 190;

  const frameW = device === 'mobile' ? 'max-w-[360px]' : 'max-w-[760px]';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-amber-400/90"><AlertTriangle size={14} /> Approximate preview — colors/layout indicative; verify on device.</div>
        <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
          <button onClick={() => setDevice('mobile')} className={`p-1.5 rounded ${device === 'mobile' ? 'bg-black text-white text-gray-900' : 'text-gray-500'}`}><Smartphone size={15} /></button>
          <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded ${device === 'desktop' ? 'bg-black text-white text-gray-900' : 'text-gray-500'}`}><Monitor size={15} /></button>
        </div>
      </div>
      <div className={`mx-auto ${frameW} rounded-[28px] border-4 border-slate-950 overflow-hidden shadow-2xl`} style={{ backgroundColor: t('sheetBg') }}>
        {/* Header band */}
        <div style={{ background: headerBg }} className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between text-[11px] mb-3" style={{ color: '#F0FDFF' }}><span>📍 Manachanallur ▾</span><span>₹50</span></div>
          <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ backgroundColor: t('searchBg'), borderRadius: num(pal.searchRadius) }}>
            <span style={{ color: t('searchIcon') }}>🔍</span>
            <span className="text-sm font-semibold" style={{ color: t('searchText') }}>Search for 'Spa'</span>
            <span className="ml-auto rounded-md px-1.5 py-1" style={{ backgroundColor: t('primary'), color: t('ctaFg') }}>⚙</span>
          </div>
        </div>
        {/* Hero */}
        {hero && (
          <div className="relative w-full flex items-end" style={{ height: heroH, background: heroBg }}>
            {num(heroData.overlayOpacity, 0) > 0 && <div className="absolute inset-0" style={{ backgroundColor: str(heroData.overlayColor, '#000'), opacity: num(heroData.overlayOpacity, 0) }} />}
            <div className="relative p-3">
              {str(heroData.title) && <div className="text-gray-900 font-extrabold text-lg leading-tight">{str(heroData.title)}</div>}
              {str(heroData.subtitle) && <div className="text-gray-900/90 text-xs">{str(heroData.subtitle)}</div>}
              {str(heroData.ctaText) && <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: t('ctaBg'), color: t('ctaFg') }}>{str(heroData.ctaText)}</span>}
            </div>
            {!str(heroData.title) && <div className="absolute inset-0 flex items-center justify-center text-gray-900/70 text-xs uppercase tracking-wide">{str(heroData.mediaType, 'video')} hero</div>}
          </div>
        )}
        {/* Queue banner (themed top, Template C) */}
        {queue && (
          <div className="relative w-full flex items-center justify-between px-4" style={{ height: qH, background: qBg }}>
            <div className="pr-2">
              <div className="text-gray-900 font-extrabold text-xl leading-tight">{str(qd.title) || 'Still Waiting?'}</div>
              <div className="text-gray-900/80 text-[11px] mt-1">{str(qd.subtitle) || 'Long queues. Uncertain time.'}</div>
              <span className="inline-block mt-3 text-[11px] font-bold px-3 py-1 rounded-full" style={{ backgroundColor: t('ctaBg'), color: t('ctaFg') }}>{str(qd.ctaText) || 'Book Now'}</span>
            </div>
            <div className="rounded-xl px-3 py-3 text-center shrink-0" style={{ border: `1.5px solid ${t('accent')}`, boxShadow: `0 0 18px ${t('accent')}55` }}>
              <div className="text-[8px] font-bold tracking-wide" style={{ color: t('accent') }}>{str(qd.tokenLabel) || 'YOUR TOKEN'}</div>
              <div className="text-gray-900 text-3xl font-extrabold">{str(qd.tokenNumber) || '45'}</div>
              <div className="text-gray-900/70 text-[7px] tracking-wide">{str(qd.tokenCaption) || 'PEOPLE AHEAD'}</div>
            </div>
          </div>
        )}
        {/* Sheet sections */}
        <div className="p-3 space-y-3" style={{ backgroundColor: t('sheetBg') }}>
          {ordered.filter((s) => s.type !== 'hero' && s.type !== 'queueBanner').map((s, i) => {
            if (s.type === 'offers') return (
              <div key={i} className="grid grid-cols-2 gap-2">
                {[promo[0] || '#14B8A6', promo[1] || '#7C3AED'].map((c, j) => (
                  <div key={j} className="rounded-xl p-3 h-16 flex flex-col justify-center" style={{ background: `linear-gradient(135deg, ${c}, ${c})` }}>
                    <span className="text-gray-900 text-xs font-extrabold">{j === 0 ? 'Flat Offer' : 'Refer & Earn'}</span>
                    <span className="text-gray-900/85 text-[10px]">{j === 0 ? 'Up to 20% OFF' : 'Earn with friends'}</span>
                  </div>
                ))}
              </div>
            );
            if (s.type === 'cashback') {
              const cb = arr(s.data?.bgColors);
              const cbBg = cb.length >= 2 ? `linear-gradient(90deg, ${cb.join(',')})` : 'linear-gradient(90deg,#0B1326,#14233F)';
              return <div key={i} className="rounded-xl p-3 text-gray-900" style={{ background: cbBg }}><div className="text-xs font-extrabold">{str(s.data?.headline) || '2% Cashback on every booking'}</div><div className="text-[10px] text-gray-900/70">{str(s.data?.subtext) || 'Credited instantly to your Jayple Wallet'}</div></div>;
            }
            if (s.type === 'popularServices' || s.type === 'services') {
              const sz = num(s.data?.iconSize, 48);
              return (
                <div key={i}><div className="text-sm font-extrabold mb-2" style={{ color: t('chipText') }}>{str(s.data?.title) || 'Popular Services'}</div>
                  <div className="flex gap-2">{['Haircut', 'Facial', 'Spa', 'Waxing'].map((n) => (<div key={n} className="flex flex-col items-center gap-1"><div className="rounded-xl" style={{ width: sz, height: sz, backgroundColor: t('chipBg') }} /><span className="text-[9px]" style={{ color: t('chipText') }}>{n}</span></div>))}</div></div>
              );
            }
            if (s.type === 'landing') return (
              <div key={i}><div className="text-sm font-extrabold mb-2" style={{ color: t('chipText') }}>{str(s.data?.title) || 'Top picks near you'}</div>
                <div className="flex gap-2">{[0, 1, 2].map((j) => (<div key={j} className="w-28 shrink-0 rounded-xl overflow-hidden border border-slate-200/30"><div className="h-16 bg-slate-300/30" /><div className="p-1.5"><div className="h-2 w-16 bg-slate-300/40 rounded mb-1" /><div className="h-2 w-10 bg-slate-300/30 rounded" /></div></div>))}</div></div>
            );
            return <div key={i} className="rounded-lg border border-dashed border-slate-300/40 p-2 text-[10px] text-gray-500 text-center">{sectionLabel(s.type)}</div>;
          })}
        </div>
      </div>
    </div>
  );
};
