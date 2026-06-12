import React, { useState } from 'react';
import type { CustomerNote } from '../types/customer.types';
import { MessageSquare, Send } from 'lucide-react';

interface Props {
  notes: CustomerNote[];
  onAddNote: (content: string) => void;
}

export const CustomerNotesPanel: React.FC<Props> = ({ notes, onAddNote }) => {
  const [newNote, setNewNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl flex flex-col h-full overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Admin Notes
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No notes added yet.
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="bg-gray-50/50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                <span className="font-medium text-gray-500">{note.author}</span>
                <span>{new Date(note.createdAt).toLocaleString(undefined, { 
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50/30">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a new note..."
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-gray-500"
          />
          <button 
            type="submit"
            disabled={!newNote.trim()}
            className="p-2.5 bg-black text-white hover:bg-gray-900 text-gray-900 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
