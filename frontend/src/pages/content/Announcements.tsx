import toast from 'react-hot-toast';
import React, { useState, useEffect } from 'react';
import { useAnnouncements } from '../../hooks/useCms';
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../services/cmsService';
import type { CMSAnnouncement } from '../../../../shared/src/types';
import { ImageUploader } from '../../components/content/ImageUploader';
import { Plus, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { useConfirm } from '../../shared/components/feedback/useConfirm';

export const Announcements: React.FC = () => {
  const { data: announcements, isLoading, refetch } = useAnnouncements();
  const [items, setItems] = useState<CMSAnnouncement[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editing, setEditing] = useState<Partial<CMSAnnouncement> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { confirm, ConfirmComponent } = useConfirm();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (announcements) setItems(announcements); }, [announcements]);

  const handleSave = async () => {
    if (!editing?.title) return toast.error('Title is required');
    try {
      setIsSaving(true);
      if (editing.id) {
        await updateAnnouncement(editing);
      } else {
        await createAnnouncement({ ...editing, zones: editing.zones || [], isActive: editing.isActive ?? true });
      }
      setIsEditing(false);
      setEditing(null);
      await refetch();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save announcement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: 'Delete Announcement',
      message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
      isDestructive: true,
      confirmText: 'Yes, Delete'
    });
    if (isConfirmed) {
      try {
        await deleteAnnouncement({ id });
        await refetch();
        toast.success('Announcement deleted');
      } catch {
        toast.error('Failed to delete announcement');
      }
    }
  };

  if (isLoading) return <div className="p-8 text-gray-500">Loading announcements...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm mt-1">Date-windowed notices shown at the top of the customer home. Live on save.</p>
        </div>
        <button
          onClick={() => { setEditing({ isActive: true, zones: [] }); setIsEditing(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-900 text-gray-900 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add Announcement
        </button>
      </div>

      {!isEditing ? (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl">
              {a.imageUrl && (
                <div className="w-20 h-20 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  {a.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle size={12} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-gray-500 border border-gray-300">
                      <XCircle size={12} /> Inactive
                    </span>
                  )}
                  {(a.startDate || a.endDate) && (
                    <span className="text-xs text-gray-500 bg-slate-700 px-2 py-0.5 rounded-full">
                      {a.startDate || '…'} → {a.endDate || '…'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(a); setIsEditing(true); }} className="p-2 text-gray-500 hover:text-black font-semibold bg-slate-700 rounded-lg transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(a.id)} className="p-2 text-gray-500 hover:text-rose-400 bg-slate-700 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-gray-500">No announcements yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">{editing?.id ? 'Edit Announcement' : 'Add Announcement'}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Title</label>
                <input
                  type="text"
                  value={editing?.title || ''}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editing?.description || ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editing?.startDate || ''}
                    onChange={(e) => setEditing({ ...editing, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1">End Date</label>
                  <input
                    type="date"
                    value={editing?.endDate || ''}
                    onChange={(e) => setEditing({ ...editing, endDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-gray-900"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="annActive"
                  checked={editing?.isActive ?? true}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-200 bg-gray-50 text-violet-600 focus:ring-violet-600"
                />
                <label htmlFor="annActive" className="text-sm font-medium text-gray-800">Announcement is Active</label>
              </div>
            </div>
            <div>
              <ImageUploader
                label="Optional Image"
                recommendedSize="1200 x 600px"
                folder="announcements"
                value={editing?.imageUrl || ''}
                onChange={(url) => setEditing({ ...editing, imageUrl: url })}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button onClick={() => { setIsEditing(false); setEditing(null); }} className="px-4 py-2 text-gray-800 hover:text-gray-900 font-medium transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-black text-white hover:bg-gray-900 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save Announcement'}
            </button>
          </div>
        </div>
      )}
      {ConfirmComponent}
    </div>
  );
};
