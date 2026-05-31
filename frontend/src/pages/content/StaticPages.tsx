import React, { useState, useEffect } from 'react';
import { useStaticPages } from '../../hooks/useCms';
import { updateStaticPage } from '../../services/cmsService';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Save, CheckCircle } from 'lucide-react';

const predefinedPages = [
  { slug: 'about-us', title: 'About Us' },
  { slug: 'privacy-policy', title: 'Privacy Policy' },
  { slug: 'terms-and-conditions', title: 'Terms & Conditions' },
  { slug: 'refund-policy', title: 'Refund Policy' },
  { slug: 'cancellation-policy', title: 'Cancellation Policy' }
];

export const StaticPages: React.FC = () => {
  const { data: pages, isLoading, refetch } = useStaticPages();
  const [activeSlug, setActiveSlug] = useState('about-us');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const activePageData = pages?.find(p => p.slug === activeSlug);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-violet max-w-none min-h-[400px] outline-none p-4 text-slate-200'
      }
    }
  });

  useEffect(() => {
    if (editor && activePageData) {
      editor.commands.setContent(activePageData.content || '');
    } else if (editor) {
      editor.commands.setContent('');
    }
  }, [activeSlug, activePageData, editor]);

  const handleSave = async () => {
    if (!editor) return;
    try {
      setIsSaving(true);
      setSuccessMsg('');
      const title = predefinedPages.find(p => p.slug === activeSlug)?.title || activeSlug;
      await updateStaticPage({
        slug: activeSlug,
        title,
        content: editor.getHTML()
      });
      setSuccessMsg('Page updated successfully!');
      await refetch();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      alert('Failed to save page');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-slate-400">Loading pages...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto flex gap-8">
      {/* Sidebar for Pages */}
      <div className="w-64 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-100 mb-6">Static Pages</h1>
        <div className="space-y-1">
          {predefinedPages.map(page => (
            <button
              key={page.slug}
              onClick={() => setActiveSlug(page.slug)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeSlug === page.slug 
                  ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' 
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-transparent'
              }`}
            >
              {page.title}
            </button>
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-slate-800 border border-slate-600 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-600 flex items-center justify-between bg-[#0f172a]/50">
          <h2 className="text-lg font-bold text-slate-200">
            {predefinedPages.find(p => p.slug === activeSlug)?.title}
          </h2>
          
          <div className="flex items-center gap-4">
            {successMsg && (
              <span className="text-sm text-emerald-400 flex items-center gap-1">
                <CheckCircle size={16} /> {successMsg}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Page'}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-600 bg-slate-800">
          <button 
            onClick={() => editor?.chain().focus().toggleBold().run()} 
            className={`px-2 py-1 rounded text-sm ${editor?.isActive('bold') ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
          >
            Bold
          </button>
          <button 
            onClick={() => editor?.chain().focus().toggleItalic().run()} 
            className={`px-2 py-1 rounded text-sm ${editor?.isActive('italic') ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
          >
            Italic
          </button>
          <div className="w-px h-4 bg-slate-700 mx-2" />
          <button 
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} 
            className={`px-2 py-1 rounded text-sm ${editor?.isActive('heading', { level: 1 }) ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
          >
            H1
          </button>
          <button 
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} 
            className={`px-2 py-1 rounded text-sm ${editor?.isActive('heading', { level: 2 }) ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
          >
            H2
          </button>
          <div className="w-px h-4 bg-slate-700 mx-2" />
          <button 
            onClick={() => editor?.chain().focus().toggleBulletList().run()} 
            className={`px-2 py-1 rounded text-sm ${editor?.isActive('bulletList') ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
          >
            Bullet List
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#0f172a]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
