import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, RefreshCw, CheckCircle, AlertTriangle, Compass } from 'lucide-react';
import { fetchExploreDiscovery, updateExploreDiscovery } from '../../services/cmsService';
import { ImageUploader } from '../../components/content/ImageUploader';

interface Pick { label: string; category: string; imageUrl: string; }

export const ExploreDiscovery: React.FC = () => {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [trendingInput, setTrendingInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const flash = (type: 'ok' | 'err', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchExploreDiscovery();
        if (d) {
          setPicks(Array.isArray(d.picks) ? (d.picks as Pick[]).map((p) => ({ label: p.label || '', category: p.category || p.label || '', imageUrl: p.imageUrl || '' })) : []);
          setTrending(Array.isArray(d.trending) ? (d.trending as string[]) : []);
        }
      } catch (e) { flash('err', e instanceof Error ? e.message : 'Load failed'); }
      finally { setLoading(false); }
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      await updateExploreDiscovery({
        picks: picks.filter((p) => p.label.trim()).map((p) => ({ label: p.label.trim(), category: (p.category || p.label).trim(), imageUrl: p.imageUrl || '' })),
        trending: trending.map((t) => t.trim()).filter(Boolean),
      });
      flash('ok', 'Explore discovery saved. Live on the app within the cache window (or pull-to-refresh).');
    } catch (e) { flash('err', e instanceof Error ? e.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const setPick = (i: number, patch: Partial<Pick>) => setPicks(picks.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-500"><RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading…</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900"><Compass size={22} /> Explore Discovery</h1>
          <p className="text-sm text-gray-500">Popular Picks + Trending searches on the customer Explore page. Tapping any of these runs a search → shows the salons that offer it.</p>
        </div>
        <button onClick={onSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-black text-white hover:bg-gray-900 text-gray-900 font-semibold py-2.5 px-4 text-sm disabled:opacity-50">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save size={16} />} Save
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-3 rounded-lg border p-4 text-sm ${msg.type === 'ok' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}>
          {msg.type === 'ok' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}<span>{msg.text}</span>
        </div>
      )}

      {/* Popular Picks */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Popular Picks</h2>
          <button onClick={() => setPicks([...picks, { label: '', category: '', imageUrl: '' }])} className="flex items-center gap-1 text-xs text-black font-semibold hover:text-black font-semibold font-semibold"><Plus size={14} /> Add pick</button>
        </div>
        {picks.length === 0 && <p className="text-xs text-gray-500">No picks yet — the app shows sensible defaults until you add some.</p>}
        <div className="space-y-4">
          {picks.map((p, i) => (
            <div key={i} className="grid gap-4 sm:grid-cols-[120px_1fr_auto] items-start rounded-lg border border-gray-200 bg-gray-50/30 p-4">
              <div className="w-[120px]"><ImageUploader value={p.imageUrl} onChange={(url) => setPick(i, { imageUrl: url })} folder="explore" label="Image" /></div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Label (shown on the card)</label>
                  <input type="text" value={p.label} onChange={(e) => setPick(i, { label: e.target.value })} placeholder="Haircut" className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Search category (what tapping it searches for)</label>
                  <input type="text" value={p.category} onChange={(e) => setPick(i, { category: e.target.value })} placeholder="Haircut" className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black" />
                </div>
              </div>
              <button onClick={() => setPicks(picks.filter((_, j) => j !== i))} className="text-gray-500 hover:text-rose-400 p-1"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Trending */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">Trending Searches</h2>
        <div className="flex gap-2">
          <input type="text" value={trendingInput} onChange={(e) => setTrendingInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && trendingInput.trim()) { setTrending([...trending, trendingInput.trim()]); setTrendingInput(''); } }} placeholder="Type a term and press Enter (e.g. Hair Spa)" className="flex-1 rounded-lg border border-gray-200 bg-gray-50 py-2 px-3 text-sm text-gray-900 outline-none focus:border-black" />
          <button onClick={() => { if (trendingInput.trim()) { setTrending([...trending, trendingInput.trim()]); setTrendingInput(''); } }} className="rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-900 font-semibold px-4 text-sm">Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {trending.map((t, i) => (
            <span key={i} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 py-1.5 px-3 text-sm text-gray-900">
              {t}
              <button onClick={() => setTrending(trending.filter((_, j) => j !== i))} className="text-gray-500 hover:text-rose-400"><Trash2 size={12} /></button>
            </span>
          ))}
          {trending.length === 0 && <p className="text-xs text-gray-500">No trending terms yet — defaults are shown in the app.</p>}
        </div>
      </div>
    </div>
  );
};
