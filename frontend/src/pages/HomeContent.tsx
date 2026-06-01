import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { fetchHomeContent, saveHomeContent, type HomeContent as HC } from '../services/catalogService';

export const HomeContent: React.FC = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['homeContent'], queryFn: fetchHomeContent });
  const [form, setForm] = useState<HC | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (data) setForm(structuredClone(data)); }, [data]);

  const mut = useMutation({
    mutationFn: (c: HC) => saveHomeContent(c),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homeContent'] });
      setSavedAt(Date.now());
      setError(null);
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Save failed'),
  });

  if (isLoading || !form) {
    return <div className="p-8 text-slate-400 text-sm">Loading…</div>;
  }

  const setCard = (i: number, k: keyof HC['offerCards'][number], v: string) => {
    const cards = structuredClone(form.offerCards);
    cards[i][k] = v;
    setForm({ ...form, offerCards: cards });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Home Content</h1>
          <p className="text-sm text-slate-400">Offer cards + cashback &amp; referral copy. Saves live to the customer home.</p>
        </div>
        <button
          onClick={() => mut.mutate(form)}
          disabled={mut.isPending}
          className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save size={16} /> {mut.isPending ? 'Saving…' : 'Save & Publish'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</div>}
      {savedAt && !mut.isPending && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Saved — live on the customer app.
        </div>
      )}

      {/* Offer cards */}
      <Section title="Offer Cards">
        {form.offerCards.slice(0, 2).map((c, i) => (
          <div key={i} className="rounded-xl border border-slate-600 bg-[#0f172a] p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {i === 0 ? 'Left tile (gift image)' : 'Right tile (gift animation)'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title"><Input value={c.title} onChange={(v) => setCard(i, 'title', v)} /></Field>
              <Field label="Subtitle"><Input value={c.subtitle} onChange={(v) => setCard(i, 'subtitle', v)} /></Field>
            </div>
            <Field label="Tap route (e.g. /explore, /refer-earn)">
              <Input value={c.route} onChange={(v) => setCard(i, 'route', v)} mono />
            </Field>
          </div>
        ))}
      </Section>

      {/* Cashback */}
      <Section title="Cashback Banner">
        <Field label="Headline">
          <Input value={form.cashback.headline} onChange={(v) => setForm({ ...form, cashback: { ...form.cashback, headline: v } })} />
        </Field>
        <Field label="Subtext">
          <Input value={form.cashback.subtext} onChange={(v) => setForm({ ...form, cashback: { ...form.cashback, subtext: v } })} />
        </Field>
      </Section>

      {/* Referral */}
      <Section title="Referral Banner">
        <Field label="Headline">
          <Input value={form.referral.headline} onChange={(v) => setForm({ ...form, referral: { ...form.referral, headline: v } })} />
        </Field>
        <Field label="Subtext">
          <Input value={form.referral.subtext} onChange={(v) => setForm({ ...form, referral: { ...form.referral, subtext: v } })} />
        </Field>
      </Section>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-xl border border-slate-600 bg-slate-800 p-5 space-y-4">
    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">{title}</h2>
    {children}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
    {children}
  </div>
);

const Input: React.FC<{ value: string; onChange: (v: string) => void; mono?: boolean }> = ({ value, onChange, mono }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full rounded-lg border border-slate-600 bg-[#0f172a] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500 ${mono ? 'font-mono' : ''}`}
  />
);
