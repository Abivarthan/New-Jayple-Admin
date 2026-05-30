import React, { useState } from 'react';
import { Star, Upload, Trash2, AlertTriangle } from 'lucide-react';

const CATEGORIES = [
  'Haircut', 'Facial', 'Waxing', 'Mehendi', 'Makeup', 'Beard', 'Threading',
  'Manicure', 'Pedicure', 'Hair Coloring', 'Keratin', 'Bridal', 'Massage', 'Spa', 'Nail Art'
];

interface Asset {
  id: string;
  url: string;
  isDefault: boolean;
}

interface CategoryAssets {
  genderTarget: 'UNISEX' | 'MEN' | 'WOMEN';
  premiumAssets: Asset[];
  normalAssets: Asset[];
}

// Prepopulate mock assets for Haircut and others
const generateMockAssets = (category: string, tier: 'premium' | 'normal', count: number): Asset[] => {
  return Array.from({ length: count }).map((_, i) => ({
    id: `asset_${category.toLowerCase()}_${tier}_${i}`,
    url: `https://images.unsplash.com/photo-${1560000000000 + i * 100000}?auto=format&fit=crop&w=400&q=80`, // realistic stock photo urls
    isDefault: i === 0
  }));
};

const initialLibraryData: Record<string, CategoryAssets> = CATEGORIES.reduce((acc, cat) => {
  acc[cat] = {
    genderTarget: cat === 'Beard' ? 'MEN' : cat === 'Threading' || cat === 'Nail Art' ? 'WOMEN' : 'UNISEX',
    premiumAssets: generateMockAssets(cat, 'premium', 4),
    normalAssets: generateMockAssets(cat, 'normal', 3)
  };
  return acc;
}, {} as Record<string, CategoryAssets>);

export const ImageLibrary: React.FC = () => {
  const [library, setLibrary] = useState<Record<string, CategoryAssets>>(initialLibraryData);
  const [activeCategory, setActiveCategory] = useState('Haircut');
  const [uploadingTier, setUploadingTier] = useState<'premium' | 'normal' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState<{ tier: 'premium' | 'normal'; assetId: string } | null>(null);

  const activeCategoryData = library[activeCategory];

  const handleGenderChange = (val: 'UNISEX' | 'MEN' | 'WOMEN') => {
    setLibrary({
      ...library,
      [activeCategory]: {
        ...activeCategoryData,
        genderTarget: val
      }
    });
  };

  const handleSetDefault = (tier: 'premium' | 'normal', assetId: string) => {
    const assetsKey = tier === 'premium' ? 'premiumAssets' : 'normalAssets';
    const updatedAssets = activeCategoryData[assetsKey].map((asset) => ({
      ...asset,
      isDefault: asset.id === assetId
    }));
    
    // In our system, index 0 is always default, so we shift the marked default asset to index 0
    const defaultIndex = updatedAssets.findIndex(a => a.isDefault);
    if (defaultIndex > -1) {
      const [defaultAsset] = updatedAssets.splice(defaultIndex, 1);
      updatedAssets.unshift(defaultAsset);
    }

    setLibrary({
      ...library,
      [activeCategory]: {
        ...activeCategoryData,
        [assetsKey]: updatedAssets
      }
    });
  };

  const handleTriggerUpload = (tier: 'premium' | 'normal') => {
    setUploadingTier(tier);
    setUploadProgress(0);
    
    // Simulate Cloudinary widget upload flow
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Append mock upload
          const newAsset: Asset = {
            id: `asset_${activeCategory.toLowerCase()}_${tier}_${Date.now()}`,
            url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
            isDefault: false
          };
          
          const assetsKey = tier === 'premium' ? 'premiumAssets' : 'normalAssets';
          setLibrary(prevLib => ({
            ...prevLib,
            [activeCategory]: {
              ...prevLib[activeCategory],
              [assetsKey]: [...prevLib[activeCategory][assetsKey], newAsset]
            }
          }));
          
          setUploadingTier(null);
          return 0;
        }
        return prev + 25;
      });
    }, 300);
  };

  const triggerDeleteConfirm = (tier: 'premium' | 'normal', assetId: string) => {
    const assetsKey = tier === 'premium' ? 'premiumAssets' : 'normalAssets';
    const asset = activeCategoryData[assetsKey].find(a => a.id === assetId);
    
    // Cannot delete if it is the only asset
    if (activeCategoryData[assetsKey].length <= 1) {
      alert("A minimum of 1 image asset is required per tier. You cannot delete the only asset.");
      return;
    }

    if (asset?.isDefault) {
      alert("You cannot delete the default asset directly. Please mark another image as default first.");
      return;
    }

    setConfirmDeleteAsset({ tier, assetId });
  };

  const executeDeleteAsset = () => {
    if (confirmDeleteAsset) {
      const { tier, assetId } = confirmDeleteAsset;
      const assetsKey = tier === 'premium' ? 'premiumAssets' : 'normalAssets';
      
      setLibrary({
        ...library,
        [activeCategory]: {
          ...activeCategoryData,
          [assetsKey]: activeCategoryData[assetsKey].filter(a => a.id !== assetId)
        }
      });
      setConfirmDeleteAsset(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Image Library</h1>
        <p className="text-sm text-slate-400">Manage centralized default imagery served across the platform's service categories.</p>
      </div>

      {/* Category Tabs Scrollbar */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-600 scrollbar-thin">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeCategory === cat
                ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* active tab controls */}
      <div className="rounded-xl border border-slate-600 bg-slate-800 p-6 space-y-8">
        {/* Category Settings row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-600 pb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-200 capitalize">{activeCategory} Category</h2>
            <p className="text-xs text-slate-400 mt-0.5">Control image allocations and default parameters.</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Gender Target:</span>
            <select
              value={activeCategoryData.genderTarget}
              onChange={(e) => handleGenderChange(e.target.value as any)}
              className="rounded-lg border border-slate-600 bg-[#0f172a] py-1.5 px-3 text-sm text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="UNISEX">Unisex</option>
              <option value="MEN">Men</option>
              <option value="WOMEN">Women</option>
            </select>
          </div>
        </div>

        {/* Premium Assets Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Premium Assets</h3>
              <p className="text-xs text-slate-500">Served on vendor service listings assigned to the Premium Tier.</p>
            </div>
            
            <button
              onClick={() => handleTriggerUpload('premium')}
              disabled={uploadingTier !== null}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-750 text-slate-200 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Upload size={14} />
              {uploadingTier === 'premium' ? `Uploading ${uploadProgress}%` : 'Upload Asset'}
            </button>
          </div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {activeCategoryData.premiumAssets.map((asset) => (
              <div key={asset.id} className="group relative rounded-xl border border-slate-600 bg-[#0f172a] p-2 overflow-hidden shadow-sm hover:border-slate-600 transition-colors">
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-800">
                  <img src={asset.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                </div>
                
                {/* Default Star Indicator */}
                {asset.isDefault && (
                  <span className="absolute top-4 left-4 rounded-full bg-violet-600 p-1 text-white shadow-md">
                    <Star size={12} fill="white" />
                  </span>
                )}

                {/* Operations bar */}
                <div className="mt-2 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleSetDefault('premium', asset.id)}
                    disabled={asset.isDefault}
                    className={`flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded transition-colors ${
                      asset.isDefault
                        ? 'bg-violet-950/40 text-violet-400 border border-violet-900/30'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {asset.isDefault ? 'Default' : 'Set Default'}
                  </button>
                  
                  {!asset.isDefault && (
                    <button
                      onClick={() => triggerDeleteConfirm('premium', asset.id)}
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
        </div>

        {/* Normal Assets Section */}
        <div className="space-y-4 pt-6 border-t border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Normal Assets</h3>
              <p className="text-xs text-slate-500">Served on vendor service listings assigned to the Normal Tier.</p>
            </div>
            
            <button
              onClick={() => handleTriggerUpload('normal')}
              disabled={uploadingTier !== null}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 hover:bg-slate-750 text-slate-200 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Upload size={14} />
              {uploadingTier === 'normal' ? `Uploading ${uploadProgress}%` : 'Upload Asset'}
            </button>
          </div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {activeCategoryData.normalAssets.map((asset) => (
              <div key={asset.id} className="group relative rounded-xl border border-slate-600 bg-[#0f172a] p-2 overflow-hidden shadow-sm hover:border-slate-600 transition-colors">
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-800">
                  <img src={asset.url} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                </div>
                
                {/* Default Star Indicator */}
                {asset.isDefault && (
                  <span className="absolute top-4 left-4 rounded-full bg-violet-600 p-1 text-white shadow-md">
                    <Star size={12} fill="white" />
                  </span>
                )}

                {/* Operations bar */}
                <div className="mt-2 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleSetDefault('normal', asset.id)}
                    disabled={asset.isDefault}
                    className={`flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase px-2 py-1 rounded transition-colors ${
                      asset.isDefault
                        ? 'bg-violet-950/40 text-violet-400 border border-violet-900/30'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {asset.isDefault ? 'Default' : 'Set Default'}
                  </button>
                  
                  {!asset.isDefault && (
                    <button
                      onClick={() => triggerDeleteConfirm('normal', asset.id)}
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl text-center space-y-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle size={24} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-100">Confirm Asset Removal</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Deleting this image will cause active vendor service profiles mapped to this asset index to automatically default to 
                <span className="text-slate-200 font-semibold"> Image 0 (Default)</span>. 
                Are you sure you want to proceed?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteAsset(null)}
                className="flex-1 rounded-lg border border-slate-600 bg-[#0f172a]/20 text-slate-400 hover:bg-slate-700 hover:text-slate-200 text-sm font-semibold py-2.5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeDeleteAsset}
                className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-sm font-semibold text-white py-2.5 transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
