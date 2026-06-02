import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MapPin, Save, Check } from 'lucide-react';

const DEFAULT_RADIUS = 10;

/**
 * Service Radius — platform-level control over how far a shop can be from a
 * customer and still appear / count as "serviceable". Writes
 * `platformConfig/settings.serviceRadiusKm`, which is read by BOTH the
 * `checkServiceAvailability` Cloud Function and the customer app's nearby-vendor
 * filter, so changing it here adjusts service visibility everywhere.
 */
export const ServiceRadius: React.FC = () => {
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'platformConfig', 'settings'));
        const v = snap.exists() ? Number((snap.data() as Record<string, unknown>).serviceRadiusKm) : NaN;
        if (isFinite(v) && v > 0) setRadius(v);
      } catch {
        // keep default
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    if (!(radius > 0)) {
      setError('Radius must be greater than 0 km.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setDoc(
        doc(db, 'platformConfig', 'settings'),
        { serviceRadiusKm: Number(radius), updatedAt: serverTimestamp() },
        { merge: true },
      );
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Service Radius</h1>
        <p className="text-sm text-slate-400 mt-1">
          Controls how far a shop can be from a customer and still appear in their app. Applies platform-wide
          (customer home list + service-availability gate).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</div>
      )}
      {savedAt && !saving && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          <Check size={15} /> Saved — new radius is {radius} km. (Customer apps pick it up on next refresh/reopen; the
          availability function applies it immediately.)
        </div>
      )}

      <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20 p-2.5">
            <MapPin size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Visibility radius</h2>
            <p className="text-xs text-slate-400">Shops within this distance of the customer are shown.</p>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Radius (kilometers)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              step={0.5}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 px-4 text-slate-200 outline-none focus:border-violet-500"
            />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-100">{radius}</div>
            <div className="text-xs text-slate-500">km</div>
          </div>
        </div>

        <input
          type="range"
          min={1}
          max={50}
          step={0.5}
          value={Math.min(radius, 50)}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>1 km</span>
          <span>25 km</span>
          <span>50 km</span>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-600">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Saving…' : 'Save Radius'}
          </button>
        </div>
      </div>
    </div>
  );
};
