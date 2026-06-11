import React, { useState, useEffect } from 'react';
import { useHeroBanners } from '../../hooks/useCms';
import { createHeroBanner, updateHeroBanner, deleteHeroBanner, reorderHeroBanners } from '../../services/cmsService';
import type { CMSHeroBanner } from '../../../../shared/src/types';
import { ImageUploader } from '../../components/content/ImageUploader';
import { Plus, GripVertical, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableBannerItem = ({ item, onEdit, onDelete }: { item: CMSHeroBanner, onEdit: (i: CMSHeroBanner) => void, onDelete: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-4 p-4 mb-3 bg-slate-800 border border-slate-600 rounded-xl shadow-sm hover:border-slate-600 transition-colors group">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-slate-500 hover:text-slate-300">
        <GripVertical size={20} />
      </div>
      
      <div className="w-32 h-20 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-200 truncate">{item.title}</h3>
        <p className="text-sm text-slate-400 truncate">{item.subtitle}</p>
        <div className="flex items-center gap-2 mt-2">
          {item.isActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle size={12} /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
              <XCircle size={12} /> Inactive
            </span>
          )}
          <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">Target: {item.genderTarget.toUpperCase()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 px-2">
        <button onClick={() => onEdit(item)} className="p-2 text-slate-400 hover:text-violet-400 bg-slate-700 hover:bg-slate-700 rounded-lg transition-colors">
          <Edit2 size={16} />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-400 bg-slate-700 hover:bg-slate-700 rounded-lg transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

export const HeroBanners: React.FC = () => {
  const { data: banners, isLoading, refetch } = useHeroBanners();
  const [items, setItems] = useState<CMSHeroBanner[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<CMSHeroBanner> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

  useEffect(() => {
    if (banners) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(banners);
      setHasUnsavedOrder(false);
    }
  }, [banners]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      setHasUnsavedOrder(true);
    }
  };

  const saveOrder = async () => {
    try {
      setIsSaving(true);
      const orders = items.map((item, index) => ({ id: item.id, sortOrder: index * 10 }));
      await reorderHeroBanners({ orders });
      await refetch();
      setHasUnsavedOrder(false);
    } catch (e) {
      console.error(e);
      alert('Failed to save order');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBanner = async () => {
    if (!editingBanner?.title || !editingBanner?.imageUrl) return alert('Title and Image are required');
    try {
      setIsSaving(true);
      if (editingBanner.id) {
        await updateHeroBanner(editingBanner);
      } else {
        await createHeroBanner({
          ...editingBanner,
          zones: editingBanner.zones || [],
          genderTarget: editingBanner.genderTarget || 'all',
          isActive: editingBanner.isActive ?? true
        });
      }
      setIsEditing(false);
      setEditingBanner(null);
      await refetch();
    } catch (e) {
      console.error(e);
      alert('Failed to save banner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        await deleteHeroBanner({ id });
        await refetch();
      } catch {
        alert('Failed to delete banner');
      }
    }
  };

  if (isLoading) return <div className="p-8 text-slate-400">Loading banners...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Hero Banners</h1>
          <p className="text-slate-400 text-sm mt-1">Manage the top scrolling banners on the app homepage.</p>
        </div>
        <div className="flex gap-3">
          {hasUnsavedOrder && (
            <button 
              onClick={saveOrder}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save New Order
            </button>
          )}
          <button 
            onClick={() => { setEditingBanner({ isActive: true, genderTarget: 'all', zones: [] }); setIsEditing(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Add Banner
          </button>
        </div>
      </div>

      {!isEditing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((item) => (
              <SortableBannerItem 
                key={item.id} 
                item={item} 
                onEdit={(b) => { setEditingBanner(b); setIsEditing(true); }} 
                onDelete={handleDelete} 
              />
            ))}
          </SortableContext>
          {items.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-600 rounded-xl">
              <p className="text-slate-500">No hero banners found. Create your first one!</p>
            </div>
          )}
        </DndContext>
      ) : (
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-6">{editingBanner?.id ? 'Edit Banner' : 'Create New Banner'}</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Banner Title</label>
                <input 
                  type="text" 
                  value={editingBanner?.title || ''} 
                  onChange={e => setEditingBanner({...editingBanner, title: e.target.value})}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Subtitle / Description</label>
                <input 
                  type="text" 
                  value={editingBanner?.subtitle || ''} 
                  onChange={e => setEditingBanner({...editingBanner, subtitle: e.target.value})}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-slate-200"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">CTA Text</label>
                  <input 
                    type="text" 
                    value={editingBanner?.ctaText || ''} 
                    onChange={e => setEditingBanner({...editingBanner, ctaText: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-slate-200"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1">CTA Action Route</label>
                  <input 
                    type="text" 
                    value={editingBanner?.ctaAction || ''} 
                    onChange={e => setEditingBanner({...editingBanner, ctaAction: e.target.value})}
                    placeholder="e.g. /category/salon"
                    className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Target Gender</label>
                <select 
                  value={editingBanner?.genderTarget || 'all'} 
                  onChange={e => setEditingBanner({...editingBanner, genderTarget: e.target.value as 'all' | 'men' | 'women'})}
                  className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-slate-200"
                >
                  <option value="all">All Genders</option>
                  <option value="men">Men Only</option>
                  <option value="women">Women Only</option>
                </select>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={editingBanner?.isActive ?? true}
                  onChange={e => setEditingBanner({...editingBanner, isActive: e.target.checked})}
                  className="w-5 h-5 rounded border-slate-600 bg-[#0f172a] text-violet-600 focus:ring-violet-600 focus:ring-offset-slate-900"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-300">Banner is Active</label>
              </div>
            </div>

            <div className="space-y-6">
              <ImageUploader 
                label="Primary Background Image"
                recommendedSize="1200 x 600px (2:1 Ratio)"
                value={editingBanner?.imageUrl || ''}
                onChange={url => setEditingBanner({...editingBanner, imageUrl: url})}
              />
              <ImageUploader 
                label="Optional GIF Overlay"
                recommendedSize="Transparent WEBP/GIF"
                value={editingBanner?.gifUrl || ''}
                onChange={url => setEditingBanner({...editingBanner, gifUrl: url})}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-600">
            <button 
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveBanner}
              disabled={isSaving}
              className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Banner'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
