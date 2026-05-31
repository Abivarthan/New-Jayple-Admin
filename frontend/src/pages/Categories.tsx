import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, AlertTriangle, X, Image as ImageIcon } from 'lucide-react';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  type Category,
} from '../services/catalogService';

const GENDERS: Category['genderTarget'][] = ['unisex', 'men', 'women'];
const ICONS = ['content_cut', 'color_lens', 'face_retouching_natural', 'face', 'spa', 'brush', 'water_drop', 'self_improvement', 'accessibility_new', 'visibility', 'favorite', 'category'];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const emptyForm: Category = {
  slug: '', name: '', imageUrl: '', fallbackIcon: 'category', genderTarget: 'unisex', order: 0, isActive: true,
};

export const Categories: React.FC = () => {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<Category>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });

  const saveMut = useMutation({
    mutationFn: async (c: Category) => {
      if (editing) return updateCategory(c);
      return createCategory(c);
    },
    onSuccess: () => { invalidate(); setModalOpen(false); setError(null); },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Save failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (slug: string) => deleteCategory(slug),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });

  const toggleMut = useMutation({
    mutationFn: (c: Category) => updateCategory({ ...c, isActive: !c.isActive }),
    onSuccess: invalidate,
  });

  const reorderMut = useMutation({
    mutationFn: (pairs: { slug: string; order: number }[]) => reorderCategories(pairs),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, order: categories.length });
    setError(null);
    setModalOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm(c);
    setError(null);
    setModalOpen(true);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= categories.length) return;
    const a = categories[i], b = categories[j];
    reorderMut.mutate([{ slug: a.slug, order: b.order }, { slug: b.slug, order: a.order }]);
  };

  const submit = () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    const slug = editing ? editing.slug : (form.slug.trim() || slugify(form.name));
    saveMut.mutate({ ...form, slug });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Categories</h1>
          <p className="text-sm text-slate-400">The service taxonomy shown live in the vendor app and customer dashboard.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      <div className="rounded-xl border border-slate-600 bg-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No categories yet. Click “New Category”.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-600 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Image</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Slug</th>
                <th className="px-4 py-3 font-semibold">Gender</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c, i) => (
                <tr key={c.slug} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="w-6 text-slate-400">{c.order}</span>
                      <div className="flex flex-col">
                        <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-500 hover:text-violet-400 disabled:opacity-30">
                          <ChevronUp size={14} />
                        </button>
                        <button onClick={() => move(i, 1)} disabled={i === categories.length - 1} className="text-slate-500 hover:text-violet-400 disabled:opacity-30">
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-11 w-11 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon size={16} className="text-slate-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-100">{c.name}</td>
                  <td className="px-4 py-3 text-slate-400 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-3 capitalize text-slate-300">{c.genderTarget}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleMut.mutate(c)}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        c.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-600/40 text-slate-400'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(c)} className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-violet-400" title="Edit">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setConfirmDelete(c)} className="rounded p-1.5 text-rose-500 hover:bg-rose-950/30" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-100">{editing ? 'Edit Category' : 'New Category'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200"><X size={20} /></button>
            </div>

            {error && <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</div>}

            <div className="space-y-4">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Hair Spa"
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
                />
              </Field>
              {!editing && (
                <Field label="Slug (auto)">
                  <input
                    value={form.slug || slugify(form.name)}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] px-3 py-2 text-sm text-slate-400 font-mono outline-none focus:border-violet-500"
                  />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Gender target">
                  <select
                    value={form.genderTarget}
                    onChange={(e) => setForm({ ...form, genderTarget: e.target.value as Category['genderTarget'] })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500 capitalize"
                  >
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Fallback icon">
                  <select
                    value={form.fallbackIcon}
                    onChange={(e) => setForm({ ...form, fallbackIcon: e.target.value })}
                    className="w-full rounded-lg border border-slate-600 bg-[#0f172a] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
                  >
                    {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Image URL (optional — or manage in Image Library)">
                <input
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-slate-600 bg-[#0f172a] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-500"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-violet-500" />
                Active (visible in apps)
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700">Cancel</button>
              <button onClick={submit} disabled={saveMut.isPending} className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {saveMut.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100">Delete “{confirmDelete.name}”?</h3>
              <p className="text-sm text-slate-400">Vendors & customers will no longer see this category. Existing services keep their data but may need re-categorising.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border border-slate-600 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700">Cancel</button>
              <button onClick={() => deleteMut.mutate(confirmDelete.slug)} disabled={deleteMut.isPending} className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
    {children}
  </div>
);
