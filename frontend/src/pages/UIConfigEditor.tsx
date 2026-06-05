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
import type { ThemeMap, UiSection, VersionInfo } from '../services/uiConfigService';
import { fileToBase64 } from '../services/catalogService';

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
    <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
    <div className="flex gap-2">
      <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)}
        className="rounded border border-slate-700 h-9 w-10 cursor-pointer bg-[#0f172a] p-0.5" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-slate-600 bg-[#0f172a] py-1.5 px-2 text-xs text-slate-200 outline-none focus:border-violet-500" />
    </div>
  </div>
);

const TextField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
    <input type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500" />
  </div>
);

const NumberField: React.FC<{ label: string; value: number; onChange: (v: number) => void; step?: string }> = ({ label, value, onChange, step }) => (
  <div>
    <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
    <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500" />
  </div>
);

const ColorListField: React.FC<{ label: string; value: string[]; onChange: (v: string[]) => void }> = ({ label, value, onChange }) => (
  <div>
    <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input type="color" value={c || '#000000'} onChange={(e) => { const n = [...value]; n[i] = e.target.value; onChange(n); }}
            className="rounded border border-slate-700 h-8 w-9 cursor-pointer bg-[#0f172a] p-0.5" />
          <input type="text" value={c} onChange={(e) => { const n = [...value]; n[i] = e.target.value; onChange(n); }}
            className="flex-1 rounded-lg border border-slate-600 bg-[#0f172a] py-1.5 px-2 text-xs text-slate-200 outline-none focus:border-violet-500" />
          <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-slate-500 hover:text-rose-400 p-1"><Trash2 size={14} /></button>
        </div>
      ))}
      <button onClick={() => onChange([...value, '#0E7490'])} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold"><Plus size={13} /> Add color</button>
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
      } else {
        setTemplateId((src?.templateId as string) || 'marketplace');
        setSectionVisibility((src?.sectionVisibility as Record<string, boolean>) || {});
        setSectionData((src?.sectionData as Record<string, Record<string, unknown>>) || {});
        setThemeOverride((src?.themeOverride as ThemeMap) || {});
        setTheme({ ...DEFAULT_THEME });
        setGlobalHero({});
      }
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
  useEffect(() => { load(target); }, [target, load]);

  const draftPayload = useCallback(() => (
    isGlobal
      ? { target, theme, globalHero }
      : { target, templateId, sectionVisibility, sectionData, themeOverride }
  ), [isGlobal, target, theme, globalHero, templateId, sectionVisibility, sectionData, themeOverride]);

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

  // Effective theme used by the preview (global edits the theme; a zone previews
  // the default theme + its override — approximate, since the real global theme
  // is published separately).
  const previewTheme: ThemeMap = isGlobal ? theme : { ...DEFAULT_THEME, ...themeOverride };
  const previewSections: UiSection[] = (isGlobal ? templateById('marketplace') : templateById(templateId))
    .sections.map((type) => ({
      type,
      enabled: isGlobal ? true : sectionVisibility[type] !== false,
      data: (isGlobal ? (type === 'hero' ? globalHero : {}) : sectionData[type]) || {},
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">UI Configuration & Theme Engine</h1>
          <p className="text-sm text-slate-400">Dynamic homepage — theme, hero & sections. Edit a draft, preview, then publish. Rollback any version.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 font-semibold">Target:</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-800 py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500">
            <option value="_global">🌐 Global Theme</option>
            {zones.map((z) => <option key={z.id} value={z.id}>📍 {z.name}</option>)}
          </select>
        </div>
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
          <button onClick={onSeed} disabled={busy} className="rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold py-1.5 px-3 text-xs disabled:opacity-50">Seed default theme</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700">
        {(isGlobal ? ['theme', 'hero', 'preview'] : ['template', 'theme', 'preview']).map((t) => (
          <button key={t} onClick={() => setTab(t as typeof tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t ? 'border-violet-500 text-violet-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            {t === 'theme' && <Palette size={15} />}{t === 'template' && <LayoutList size={15} />}{t === 'hero' && <UploadCloud size={15} />}{t === 'preview' && <Eye size={15} />}
            {t === 'theme' ? (isGlobal ? 'Theme' : 'Theme Override') : t === 'template' ? 'Template' : t === 'hero' ? 'Hero (global)' : 'Live Preview'}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-1.5">
          <button onClick={onBackfill} disabled={busy || loading} title="Recompute vendor offer flags for the landing row"
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-2 px-3 text-sm disabled:opacity-50">
            <RefreshCw size={14} /> Backfill offers
          </button>
          <button onClick={onSaveDraft} disabled={busy || loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2 px-3 text-sm disabled:opacity-50">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save size={15} />} Save Draft
          </button>
          <button onClick={onPublish} disabled={busy || loading}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-3 text-sm disabled:opacity-50">
            {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudLightning size={15} />} Publish
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500"><RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Editors (left/main) ── */}
          <div className="lg:col-span-2 space-y-6">
            {tab === 'theme' && (
              <ThemeEditor
                isGlobal={isGlobal}
                value={isGlobal ? theme : themeOverride}
                base={isGlobal ? theme : { ...DEFAULT_THEME, ...themeOverride }}
                onChange={(k, v) => (isGlobal ? setTheme({ ...theme, [k]: v }) : setThemeOverride({ ...themeOverride, [k]: v }))}
              />
            )}
            {tab === 'hero' && isGlobal && (
              <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                <HeroEditor data={globalHero} onPatch={(p) => setGlobalHero({ ...globalHero, ...p })} />
                <p className="text-xs text-slate-500 mt-4 border-t border-slate-700 pt-3">This hero (video / GIF / image) is the default for <span className="text-slate-300">every zone</span>. A specific zone can still override it from its Template → Hero section.</p>
              </div>
            )}
            {tab === 'template' && !isGlobal && (
              <TemplateEditor
                templateId={templateId} setTemplateId={setTemplateId}
                sectionVisibility={sectionVisibility} toggleVisibility={toggleVisibility}
                sectionData={sectionData} patchSectionData={patchSectionData}
                activeType={activeType} setActiveType={setActiveType}
              />
            )}
            {tab === 'preview' && (
              <PreviewPane theme={previewTheme} sections={previewSections} device={device} setDevice={setDevice} />
            )}
          </div>

          {/* ── Version history (right) ── */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 h-fit">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400 mb-3"><History size={15} /> Version History</h3>
            {versions.length === 0 ? (
              <p className="text-xs text-slate-500">No previous versions yet. Publish to create the first restore point.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v) => (
                  <div key={v.version} className="flex items-center justify-between rounded-lg border border-slate-700 bg-[#0f172a]/40 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Version {v.version}</p>
                      <p className="text-[11px] text-slate-500">{v.publishedAt ? new Date(v.publishedAt).toLocaleString() : '—'}{v.publishedBy ? ` · ${v.publishedBy}` : ''}</p>
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
      <div className="h-9 w-9 rounded-lg border border-slate-600" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-slate-500">{label}</span>
    </div>
  );
  return (
    <div className="space-y-6">
      {!isGlobal && (
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-300">
          Per-zone override — set a theme colour here to override the global theme for this zone, or leave blank to inherit global.
        </div>
      )}
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">Theme color</h3>
          <p className="text-xs text-slate-500 mb-4">One colour drives the entire top section — header gradient, search, category chips, buttons and promo cards are all derived from it.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField label="Theme color" value={seed} onChange={(v) => onChange('seed', v)} />
            <ColorField label="Accent (highlights)" value={accent} onChange={(v) => onChange('accent', v)} />
            <ColorField label="Content background" value={str(value.sheetBg ?? base.sheetBg ?? '#F8FAFC')} onChange={(v) => onChange('sheetBg', v)} />
          </div>
        </div>
        <div className="border-t border-slate-700 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Derived palette (auto)</h4>
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
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Template</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {TEMPLATES.map((t) => (
            <button key={t.id} onClick={() => { setTemplateId(t.id); setActiveType(null); }}
              className={`rounded-lg border p-4 text-left transition-all ${templateId === t.id ? 'border-violet-500 bg-violet-600/10' : 'border-slate-700 bg-[#0f172a]/30 hover:border-slate-600'}`}>
              <p className="text-sm font-bold text-slate-200">{t.label}</p>
              <p className="text-xs text-slate-500 mt-1">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Section visibility (order fixed by template) */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-5 space-y-3 h-fit">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Sections — visibility</h3>
          {tpl.sections.map((type) => {
            const visible = sectionVisibility[type] !== false;
            return (
              <div key={type} className={`flex items-center justify-between rounded-lg border p-3 ${activeType === type ? 'border-violet-500 bg-violet-600/5' : 'border-slate-700 bg-[#0f172a]/30'}`}>
                <button onClick={() => setActiveType(type)} className="text-left">
                  <p className="text-sm font-semibold text-slate-200">{sectionLabel(type)}</p>
                  <p className="text-xs text-slate-500">{visible ? '🟢 Visible' : '🔴 Hidden'}</p>
                </button>
                <button onClick={() => toggleVisibility(type)} className="p-1">
                  {visible ? <ToggleRight className="h-5 w-5 text-violet-500" /> : <ToggleLeft className="h-5 w-5 text-slate-600" />}
                </button>
              </div>
            );
          })}
          <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-700">Order is fixed by the template. Switch templates above to change the layout.</p>
        </div>

        {/* Selected section sub-editor */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
          {activeType === null ? (
            <p className="text-sm text-slate-500">Select a section to edit its content.</p>
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
        <h3 className="text-base font-bold text-slate-200">Queue Banner</h3>
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
          <label className="block text-xs text-slate-400 mb-1.5">Height</label>
          <select value={str(d.heightMode, 'medium')} onChange={(e) => onPatch({ heightMode: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500">
            <option value="compact">Compact</option><option value="medium">Medium</option><option value="campaign">Campaign</option>
          </select>
        </div>
      </div>
    );
  if (section.type === 'landing')
    return (
      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-200">Landing (top picks)</h3>
        <TextField label="Section title" value={str(d.title)} onChange={(v) => onPatch({ title: v })} placeholder="Top picks near you" />
        <p className="text-xs text-slate-500">Shows the top-3 vendors with active offers (else top-rated). Run <span className="text-slate-300">Backfill offers</span> once after deploy so existing vendors get the offer flag.</p>
      </div>
    );
  if (section.type === 'popularServices')
    return (
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-200">Categories</h3>
        <TextField label="Section title" value={str(d.title)} onChange={(v) => onPatch({ title: v })} placeholder="Popular Services" />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Chip size (px)" value={num(d.iconSize, 58)} onChange={(v) => onPatch({ iconSize: v })} />
          <NumberField label="Spacing between chips (px)" value={num(d.spacing, 12)} onChange={(v) => onPatch({ spacing: v })} />
        </div>
      </div>
    );
  if (section.type === 'services' || section.type === 'sponsor')
    return <div className="space-y-4"><h3 className="text-base font-bold text-slate-200">{sectionLabel(section.type)}</h3><TextField label="Section title" value={str(d.title)} onChange={(v) => onPatch({ title: v })} placeholder="Popular Services" /></div>;
  if (section.type === 'referral')
    return <div><h3 className="text-base font-bold text-slate-200 mb-2">Referral Banner</h3><p className="text-sm text-slate-500">Show/hide and order this banner here. Its <span className="text-slate-300">headline & subtext are managed under Home Content (CMS)</span> — the customer banner reads those, not this section.</p></div>;
  if (section.type === 'vendorList')
    return <div className="space-y-4"><h3 className="text-base font-bold text-slate-200">Vendor List</h3><div><label className="block text-xs text-slate-400 mb-1.5">Max vendors</label><input type="number" value={num(d.limit, 20)} onChange={(e) => onPatch({ limit: Number(e.target.value) })} className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500" /></div></div>;
  return <div><h3 className="text-base font-bold text-slate-200 mb-2">{sectionLabel(section.type)}</h3><p className="text-sm text-slate-500">This section has no editable content — its data is admin-managed elsewhere (CMS) or auto-generated.</p></div>;
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
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const accept = mediaType === 'video' ? 'video/*' : mediaType === 'lottie' ? 'application/json,.json' : 'image/*';
  return (
    <div className="space-y-5">
      <h3 className="text-base font-bold text-slate-200">Hero Section</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Media type</label>
          <select value={mediaType} onChange={(e) => onPatch({ mediaType: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500">
            <option value="video">Video</option><option value="image">Image</option><option value="lottie">Lottie</option><option value="gif">GIF</option><option value="none">None (color/gradient)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Height</label>
          <select value={str(data.heightMode, '')} onChange={(e) => onPatch({ heightMode: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500">
            <option value="">Default (banner)</option><option value="compact">Compact (~38%)</option><option value="medium">Medium (~50%)</option><option value="campaign">Campaign (~66%)</option>
          </select>
        </div>
      </div>
      {mediaType !== 'none' && (
        <div className="space-y-2">
          <TextField label="Media URL" value={str(data.mediaUrl)} onChange={(v) => onPatch({ mediaUrl: v })} placeholder="https://… (or upload)" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold disabled:opacity-50">
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
        <label className="block text-xs text-slate-400 mb-1.5">Overlay opacity (0–1)</label>
        <input type="number" step="0.05" min="0" max="1" value={num(data.overlayOpacity, 0)} onChange={(e) => onPatch({ overlayOpacity: Number(e.target.value) })} className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2 px-3 text-sm text-slate-200 outline-none focus:border-violet-500" />
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
    } catch (err) { window.alert(err instanceof Error ? err.message : 'Upload failed'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-slate-200">Cashback Banner</h3>
      <p className="text-xs text-slate-500">Overrides the CMS copy/visual for this banner. Leave headline/subtext blank to inherit the Home Content (CMS) copy.</p>
      <TextField label="Headline (optional override)" value={str(data.headline)} onChange={(v) => onPatch({ headline: v })} />
      <TextField label="Subtext (optional override)" value={str(data.subtext)} onChange={(v) => onPatch({ subtext: v })} />
      <ColorListField label="Background gradient colors" value={arr(data.bgColors)} onChange={(v) => onPatch({ bgColors: v })} />
      <div className="space-y-2">
        <TextField label="Left visual image URL (optional)" value={str(data.imageUrl)} onChange={(v) => onPatch({ imageUrl: v })} placeholder="https://… (or upload)" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold disabled:opacity-50">
          {uploading ? <RefreshCw size={13} className="animate-spin" /> : <UploadCloud size={13} />} Upload image
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
      </div>
      <TextField label="Lottie URL (optional, used if no image)" value={str(data.lottieUrl)} onChange={(v) => onPatch({ lottieUrl: v })} />
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
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-amber-400/90"><AlertTriangle size={14} /> Approximate preview — colors/layout indicative; verify on device.</div>
        <div className="flex gap-1 bg-[#0f172a] rounded-lg p-1">
          <button onClick={() => setDevice('mobile')} className={`p-1.5 rounded ${device === 'mobile' ? 'bg-violet-600 text-white' : 'text-slate-400'}`}><Smartphone size={15} /></button>
          <button onClick={() => setDevice('desktop')} className={`p-1.5 rounded ${device === 'desktop' ? 'bg-violet-600 text-white' : 'text-slate-400'}`}><Monitor size={15} /></button>
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
              {str(heroData.title) && <div className="text-white font-extrabold text-lg leading-tight">{str(heroData.title)}</div>}
              {str(heroData.subtitle) && <div className="text-white/90 text-xs">{str(heroData.subtitle)}</div>}
              {str(heroData.ctaText) && <span className="inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: t('ctaBg'), color: t('ctaFg') }}>{str(heroData.ctaText)}</span>}
            </div>
            {!str(heroData.title) && <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs uppercase tracking-wide">{str(heroData.mediaType, 'video')} hero</div>}
          </div>
        )}
        {/* Queue banner (themed top, Template C) */}
        {queue && (
          <div className="relative w-full flex items-center justify-between px-4" style={{ height: qH, background: qBg }}>
            <div className="pr-2">
              <div className="text-white font-extrabold text-xl leading-tight">{str(qd.title) || 'Still Waiting?'}</div>
              <div className="text-white/80 text-[11px] mt-1">{str(qd.subtitle) || 'Long queues. Uncertain time.'}</div>
              <span className="inline-block mt-3 text-[11px] font-bold px-3 py-1 rounded-full" style={{ backgroundColor: t('ctaBg'), color: t('ctaFg') }}>{str(qd.ctaText) || 'Book Now'}</span>
            </div>
            <div className="rounded-xl px-3 py-3 text-center shrink-0" style={{ border: `1.5px solid ${t('accent')}`, boxShadow: `0 0 18px ${t('accent')}55` }}>
              <div className="text-[8px] font-bold tracking-wide" style={{ color: t('accent') }}>{str(qd.tokenLabel) || 'YOUR TOKEN'}</div>
              <div className="text-white text-3xl font-extrabold">{str(qd.tokenNumber) || '45'}</div>
              <div className="text-white/70 text-[7px] tracking-wide">{str(qd.tokenCaption) || 'PEOPLE AHEAD'}</div>
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
                    <span className="text-white text-xs font-extrabold">{j === 0 ? 'Flat Offer' : 'Refer & Earn'}</span>
                    <span className="text-white/85 text-[10px]">{j === 0 ? 'Up to 20% OFF' : 'Earn with friends'}</span>
                  </div>
                ))}
              </div>
            );
            if (s.type === 'cashback') {
              const cb = arr(s.data?.bgColors);
              const cbBg = cb.length >= 2 ? `linear-gradient(90deg, ${cb.join(',')})` : 'linear-gradient(90deg,#0B1326,#14233F)';
              return <div key={i} className="rounded-xl p-3 text-white" style={{ background: cbBg }}><div className="text-xs font-extrabold">{str(s.data?.headline) || '2% Cashback on every booking'}</div><div className="text-[10px] text-white/70">{str(s.data?.subtext) || 'Credited instantly to your Jayple Wallet'}</div></div>;
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
            return <div key={i} className="rounded-lg border border-dashed border-slate-300/40 p-2 text-[10px] text-slate-400 text-center">{sectionLabel(s.type)}</div>;
          })}
        </div>
      </div>
    </div>
  );
};
