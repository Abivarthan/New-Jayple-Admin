import React, { useState, useEffect } from 'react';
import { useFaqs } from '../../hooks/useCms';
import { createFaq, updateFaq, deleteFaq } from '../../services/cmsService';
import type { CMSFaq } from '../../../../shared/src/types';
import { Plus, Trash2, Edit2, CheckCircle, XCircle } from 'lucide-react';

export const Faqs: React.FC = () => {
  const { data: faqs, isLoading, refetch } = useFaqs();
  const [items, setItems] = useState<CMSFaq[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editing, setEditing] = useState<Partial<CMSFaq> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { if (faqs) setItems(faqs); }, [faqs]);

  const handleSave = async () => {
    if (!editing?.question || !editing?.answer) return alert('Question and answer are required');
    try {
      setIsSaving(true);
      if (editing.id) {
        await updateFaq(editing);
      } else {
        await createFaq({ ...editing, isActive: editing.isActive ?? true });
      }
      setIsEditing(false);
      setEditing(null);
      await refetch();
    } catch (e) {
      console.error(e);
      alert('Failed to save FAQ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this FAQ?')) {
      try {
        await deleteFaq({ id });
        await refetch();
      } catch {
        alert('Failed to delete FAQ');
      }
    }
  };

  if (isLoading) return <div className="p-8 text-slate-400">Loading FAQs...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">FAQs</h1>
          <p className="text-slate-400 text-sm mt-1">Frequently asked questions shown in the customer app. Live on save.</p>
        </div>
        <button
          onClick={() => { setEditing({ isActive: true }); setIsEditing(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Add FAQ
        </button>
      </div>

      {!isEditing ? (
        <div className="space-y-3">
          {items.map((f) => (
            <div key={f.id} className="flex items-start gap-4 p-4 bg-slate-800 border border-slate-600 rounded-xl">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-200">{f.question}</h3>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{f.answer}</p>
                <div className="mt-2">
                  {f.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle size={12} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
                      <XCircle size={12} /> Inactive
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditing(f); setIsEditing(true); }} className="p-2 text-slate-400 hover:text-violet-400 bg-slate-700 rounded-lg transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(f.id)} className="p-2 text-slate-400 hover:text-rose-400 bg-slate-700 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-600 rounded-xl">
              <p className="text-slate-500">No FAQs yet. Add your first one!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-slate-100">{editing?.id ? 'Edit FAQ' : 'Add FAQ'}</h2>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Question</label>
            <input
              type="text"
              value={editing?.question || ''}
              onChange={(e) => setEditing({ ...editing, question: e.target.value })}
              className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Answer</label>
            <textarea
              rows={5}
              value={editing?.answer || ''}
              onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
              className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-2 text-slate-200"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="faqActive"
              checked={editing?.isActive ?? true}
              onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
              className="w-5 h-5 rounded border-slate-600 bg-[#0f172a] text-violet-600 focus:ring-violet-600"
            />
            <label htmlFor="faqActive" className="text-sm font-medium text-slate-300">FAQ is Active</label>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-600">
            <button onClick={() => { setIsEditing(false); setEditing(null); }} className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={isSaving} className="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50">
              {isSaving ? 'Saving...' : 'Save FAQ'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
