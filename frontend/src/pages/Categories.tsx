import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, AlertTriangle, X, Image as ImageIcon, Eye, Layers, Briefcase, Info } from 'lucide-react';
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
  slug: '', name: '', imageUrl: '', fallbackIcon: 'category', genderTarget: 'unisex', order: 0, isActive: true, subCategories: [], services: []
};

export const Categories: React.FC = () => {
  const qc = useQueryClient();
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    onSubmit: (value: string) => void;
  }>({
    isOpen: false,
    title: '',
    onSubmit: () => {},
  });
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<Category>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [drawerTab, setDrawerTab] = useState<'info' | 'subcategories' | 'services'>('info');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });

  const saveMut = useMutation({
    mutationFn: async (c: Category) => {
      if (editing) return updateCategory(c);
      return createCategory(c);
    },
    onSuccess: () => { 
      invalidate(); 
      setIsCategoryModalOpen(false); 
      setError(null);
      if (selectedCategory) {
        setSelectedCategory(null); // Close drawer if open
      }
    },
    onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Save failed'),
  });

  const updateMappingMut = useMutation({
    mutationFn: async (c: Category) => updateCategory(c),
    onSuccess: (_, updated) => { 
      invalidate(); 
      if (selectedCategory && selectedCategory.slug === updated.slug) {
        setSelectedCategory(updated);
      }
    },
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
    setIsCategoryModalOpen(true);
  };

  const openDrawer = (c: Category) => {
    setSelectedCategory(c);
    setForm(c);
    setEditing(c);
    setDrawerTab('info');
    setError(null);
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

  const addSubCategory = () => {
    setPromptConfig({
      isOpen: true,
      title: "Enter new sub-category slug:",
      onSubmit: (newSub) => {
        if (newSub && selectedCategory) {
          const updated = { ...selectedCategory, subCategories: [...(selectedCategory.subCategories || []), newSub] };
          updateMappingMut.mutate(updated);
        }
      }
    });
  };

  const removeSubCategory = (sub: string) => {
    if (selectedCategory) {
      const updated = { ...selectedCategory, subCategories: (selectedCategory.subCategories || []).filter(s => s !== sub) };
      updateMappingMut.mutate(updated);
    }
  };

  const addService = () => {
    setPromptConfig({
      isOpen: true,
      title: "Enter new service ID to map:",
      onSubmit: (newSvc) => {
        if (newSvc && selectedCategory) {
          const updated = { ...selectedCategory, services: [...(selectedCategory.services || []), newSvc] };
          updateMappingMut.mutate(updated);
        }
      }
    });
  };

  const removeService = (svc: string) => {
    if (selectedCategory) {
      const updated = { ...selectedCategory, services: (selectedCategory.services || []).filter(s => s !== svc) };
      updateMappingMut.mutate(updated);
    }
  };

  return (
    <div className="space-y-6 min-h-screen relative pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Categories & Mapping</h1>
          <p className="text-sm text-gray-500">Manage top-level categories and map them to sub-categories and services.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-black text-white hover:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 transition-colors"
        >
          <Plus size={16} /> New Category
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No categories yet. Click “New Category”.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/20">
                  <th className="px-5 py-4">Order</th>
                  <th className="px-5 py-4">Image</th>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Slug</th>
                  <th className="px-5 py-4">Gender</th>
                  <th className="px-5 py-4 text-center">Mapped</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {categories.map((c, i) => (
                  <tr key={c.slug} className="hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => openDrawer(c)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-gray-500 font-medium">{c.order}</span>
                        <div className="flex flex-col">
                          <button onClick={(e) => { e.stopPropagation(); move(i, -1); }} disabled={i === 0} className="text-gray-500 hover:text-black font-semibold disabled:opacity-30 p-0.5">
                            <ChevronUp size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); move(i, 1); }} disabled={i === categories.length - 1} className="text-gray-500 hover:text-black font-semibold disabled:opacity-30 p-0.5">
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center shadow-inner">
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-semibold text-gray-900">{c.name}</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{c.slug}</td>
                    <td className="px-5 py-3 capitalize text-gray-800">{c.genderTarget}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded-full text-gray-700 border border-gray-200">{c.subCategories?.length || 0} sub</span>
                        <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded-full text-gray-700 border border-gray-200">{c.services?.length || 0} svc</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleMut.mutate(c); }}
                        className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold transition-colors ${
                          c.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25' : 'bg-slate-600/40 text-gray-500 border border-gray-200 hover:bg-slate-600'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={(e) => { e.stopPropagation(); openDrawer(c); }} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-black font-semibold transition-colors" title="Edit Category & Mapping">
                          <Eye size={15} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }} className="rounded p-1.5 text-gray-500 hover:bg-rose-950/50 hover:text-rose-400 transition-colors" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-out Category Drawer */}
      {selectedCategory && (
        <>
          <div className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedCategory(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-gray-200 shadow-2xl overflow-y-auto transform transition-all duration-300 ease-out flex flex-col">
            
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl overflow-hidden h-12 w-12 bg-gray-50 border border-gray-200 flex items-center justify-center">
                   {selectedCategory.imageUrl ? (
                     <img src={selectedCategory.imageUrl} alt="" className="h-full w-full object-cover" />
                   ) : (
                     <ImageIcon size={20} className="text-gray-400" />
                   )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedCategory.name}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{selectedCategory.slug}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCategory(null)} className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Tab selection */}
            <div className="flex gap-2 border-b border-gray-200 px-6 bg-gray-50/20">
              <button onClick={() => setDrawerTab('info')} className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${drawerTab === 'info' ? 'border-black text-violet-450' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                <Info size={13} /> Basic Info
              </button>
              <button onClick={() => setDrawerTab('subcategories')} className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${drawerTab === 'subcategories' ? 'border-black text-violet-450' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                <Layers size={13} /> Sub-Categories
              </button>
              <button onClick={() => setDrawerTab('services')} className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-all ${drawerTab === 'services' ? 'border-black text-violet-450' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                <Briefcase size={13} /> Services
              </button>
            </div>

            {/* Drawer Body content */}
            <div className="flex-1 p-6 overflow-y-auto">
              
              {drawerTab === 'info' && (
                <div className="space-y-5">
                  {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</div>}
                  <Field label="Name">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black" />
                  </Field>
                  <Field label="Slug (cannot be changed easily without re-mapping)">
                    <input value={form.slug} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-500 font-mono outline-none" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Gender target">
                      <select value={form.genderTarget} onChange={(e) => setForm({ ...form, genderTarget: e.target.value as Category['genderTarget'] })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black capitalize">
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="Fallback icon">
                      <select value={form.fallbackIcon} onChange={(e) => setForm({ ...form, fallbackIcon: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black">
                        {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Image URL">
                    <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black" />
                  </Field>
                  <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button onClick={submit} disabled={saveMut.isPending} className="w-full rounded-lg bg-black text-white hover:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-900 disabled:opacity-50 transition-colors">
                      {saveMut.isPending ? 'Saving…' : 'Save Basic Info'}
                    </button>
                  </div>
                </div>
              )}

              {drawerTab === 'subcategories' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Mapped Sub-Categories</h3>
                    <button onClick={addSubCategory} className="flex items-center gap-1.5 text-xs font-semibold text-black font-semibold hover:text-black font-semibold">
                      <Plus size={14} /> Add Sub
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {selectedCategory.subCategories?.map(sub => (
                      <div key={sub} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/30 p-3">
                        <span className="text-sm font-mono text-gray-800">{sub}</span>
                        <button onClick={() => removeSubCategory(sub)} className="text-gray-500 hover:text-rose-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {(!selectedCategory.subCategories || selectedCategory.subCategories.length === 0) && (
                      <div className="rounded-lg border border-gray-200 border-dashed p-6 text-center text-gray-500 text-sm">
                        No sub-categories mapped yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === 'services' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Mapped Services</h3>
                    <button onClick={addService} className="flex items-center gap-1.5 text-xs font-semibold text-black font-semibold hover:text-black font-semibold">
                      <Plus size={14} /> Add Service
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {selectedCategory.services?.map(svc => (
                      <div key={svc} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50/30 p-3">
                        <span className="text-sm font-mono text-gray-800">{svc}</span>
                        <button onClick={() => removeService(svc)} className="text-gray-500 hover:text-rose-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    {(!selectedCategory.services || selectedCategory.services.length === 0) && (
                      <div className="rounded-lg border border-gray-200 border-dashed p-6 text-center text-gray-500 text-sm">
                        No services mapped yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* Original Create Modal (for pure creation) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">New Category</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500 hover:text-gray-900"><X size={20} /></button>
            </div>
            {error && <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</div>}
            <div className="space-y-4">
              <Field label="Name">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Hair Spa" className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black" />
              </Field>
              <Field label="Slug (auto)">
                <input value={form.slug || slugify(form.name)} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 font-mono outline-none focus:border-black" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Gender target">
                  <select value={form.genderTarget} onChange={(e) => setForm({ ...form, genderTarget: e.target.value as Category['genderTarget'] })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black capitalize">
                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Fallback icon">
                  <select value={form.fallbackIcon} onChange={(e) => setForm({ ...form, fallbackIcon: e.target.value })} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-black">
                    {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </Field>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsCategoryModalOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100">Cancel</button>
              <button onClick={submit} disabled={saveMut.isPending} className="rounded-lg bg-black text-white hover:bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-900 disabled:opacity-50">
                {saveMut.isPending ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center space-y-5 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Delete “{confirmDelete.name}”?</h3>
              <p className="text-sm text-gray-500">Vendors & customers will no longer see this category. Existing services keep their data but may need re-categorising.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100">Cancel</button>
              <button onClick={() => deleteMut.mutate(confirmDelete.slug)} disabled={deleteMut.isPending} className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 py-2.5 text-sm font-semibold text-gray-900 disabled:opacity-50">
                {deleteMut.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Prompt Modal */}
      {promptConfig.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{promptConfig.title}</h3>
            <input 
              type="text" 
              autoFocus
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 mb-4 text-gray-900 focus:border-black focus:ring-black"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  promptConfig.onSubmit(e.currentTarget.value);
                  setPromptConfig({ ...promptConfig, isOpen: false });
                }
              }}
              onBlur={(e) => {
                promptConfig.onSubmit(e.target.value);
                setPromptConfig({ ...promptConfig, isOpen: false });
              }}
            />
            <p className="text-xs text-gray-500">Press Enter to save.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-gray-500">{label}</label>
    {children}
  </div>
);
