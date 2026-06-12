import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Upload, Trash2, AlertTriangle, ImageOff } from 'lucide-react';
import {
  fetchCategories,
  fetchImageLibrary,
  addLibraryImage,
  removeLibraryImage,
  setLibraryDefault,
  fileToBase64,
  type ImageGender,
} from '../services/catalogService';

export const ImageLibrary: React.FC = () => {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const { data: library = {}, isLoading } = useQuery({ queryKey: ['imageLibrary'], queryFn: fetchImageLibrary });

  const [activeCategory, setActiveCategory] = useState<string>('');
  const [gender, setGender] = useState<ImageGender>('unisex');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ category: string; assetId: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Default the active tab to the first category once loaded.
  const active = activeCategory || categories[0]?.slug || '';
  // Shop photos (salon_shop_images) are gender-agnostic → single pool.
  const isShop = active === 'salon_shop_images';
  const catAssets = library[active];
  const assets = isShop
    ? catAssets?.normalAssets || []
    : gender === 'men'
      ? catAssets?.menAssets || []
      : gender === 'women'
        ? catAssets?.womenAssets || []
        // Unisex tab also surfaces legacy (un-bucketed) normalAssets so existing
        // images stay visible/manageable. Removes/defaults work by id (CF scans
        // every bucket), so mixing them here is safe.
        : [...(catAssets?.unisexAssets || []), ...(catAssets?.normalAssets || [])];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['imageLibrary'] });

  const removeMut = useMutation({
    mutationFn: ({ category, assetId }: { category: string; assetId: string }) => removeLibraryImage(category, assetId),
    onSuccess: () => { invalidate(); setConfirmDelete(null); },
  });
  const defaultMut = useMutation({
    mutationFn: ({ category, assetId }: { category: string; assetId: string }) => setLibraryDefault(category, assetId),
    onSuccess: invalidate,
  });

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB.'); return; }
    setUploading(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      await addLibraryImage(active, base64, file.type || 'image/png', isShop ? undefined : gender);
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Image Library</h1>
        <p className="text-sm text-gray-500">Centralised service imagery. Uploads are stored in Firebase Storage and served to the vendor &amp; customer apps.</p>
      </div>

      {error && <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{error}</div>}

      {/* Category tabs (from the live categories collection) */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 scrollbar-thin">
        {categories.length === 0 && <span className="text-sm text-gray-500">No categories yet — create some in Categories.</span>}
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setActiveCategory(cat.slug)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              active === cat.slug
                ? 'bg-black text-white text-black font-semibold border border-black'
                : 'text-gray-500 hover:bg-white hover:text-gray-900 border border-transparent'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Gender sub-tabs — pick the bucket to manage. Hidden for shop images. */}
      {active && !isShop && (
        <div className="flex gap-2">
          {(['men', 'women', 'unisex'] as ImageGender[]).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                gender === g
                  ? 'bg-black text-white text-gray-900'
                  : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {g === 'unisex' ? 'Unisex / All' : `${g}'s`}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                {isShop ? 'Shop Photos' : `${gender === 'unisex' ? 'Unisex / All' : gender + "'s"} Service Images`}
              </h3>
              <p className="text-xs text-gray-500">
                {isShop
                  ? 'Shown to vendors as the predefined shop-photo choices.'
                  : 'Shown to vendors for services in this category + gender.'}
              </p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 rounded-lg bg-black text-white hover:bg-gray-900 text-gray-900 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload Image'}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPickFile} />
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading…</div>
          ) : assets.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-gray-500">
              <ImageOff size={28} className="mb-2" />
              <p className="text-sm">No images yet. Upload one to make it available to vendors.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {assets.map((asset) => (
                <div key={asset.id} className="group relative rounded-xl border border-gray-200 bg-gray-50 p-2">
                  <div className="aspect-square w-full rounded-lg overflow-hidden bg-white">
                    <img src={asset.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                  </div>
                  {asset.isDefault && (
                    <span className="absolute top-4 left-4 rounded-full bg-black text-white p-1 text-gray-900 shadow-md">
                      <Star size={12} fill="white" />
                    </span>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => !asset.isDefault && defaultMut.mutate({ category: active, assetId: asset.id })}
                      disabled={asset.isDefault || defaultMut.isPending}
                      className={`flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded transition-colors ${
                        asset.isDefault ? 'bg-violet-950/40 text-black font-semibold border border-violet-900/30' : 'bg-slate-700 text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {asset.isDefault ? 'Default' : 'Set Default'}
                    </button>
                    {!asset.isDefault && (
                      <button
                        onClick={() => setConfirmDelete({ category: active, assetId: asset.id })}
                        className="rounded p-1 text-rose-500 hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
                        title="Delete Image"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">Remove this image?</h3>
              <p className="text-sm text-gray-500">Services using this image will fall back to the category default.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-100">Cancel</button>
              <button onClick={() => removeMut.mutate(confirmDelete)} disabled={removeMut.isPending} className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 py-2.5 text-sm font-semibold text-gray-900 disabled:opacity-50">
                {removeMut.isPending ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
