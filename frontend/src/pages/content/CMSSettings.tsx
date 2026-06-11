import React, { useState } from 'react';
import { useCmsSettings } from '../../hooks/useCms';
import { publishCms } from '../../services/cmsService';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';

export const CMSSettings: React.FC = () => {
  const { data: settings, isLoading, refetch } = useCmsSettings();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const handlePublish = async () => {
    if (window.confirm('Are you sure you want to push all CMS changes to the live mobile app? This will force an app-wide content refresh for all users.')) {
      try {
        setIsPublishing(true);
        setPublishSuccess(false);
        await publishCms();
        await refetch();
        setPublishSuccess(true);
        setTimeout(() => setPublishSuccess(false), 5000);
      } catch {
        alert('Failed to publish CMS updates.');
      } finally {
        setIsPublishing(false);
      }
    }
  };

  if (isLoading) return <div className="p-8 text-slate-400">Loading settings...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">CMS Settings & Publishing</h1>
        <p className="text-slate-400 text-sm mt-1">Control how and when content changes go live on customer devices.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Publish Card */}
        <div className="bg-slate-800 border border-slate-600 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <UploadCloud className="text-violet-400" /> Push to Live
              </h2>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                Changes made in the CMS are saved as drafts by default. To make them visible on the customer mobile app, you must increment the global CMS version by clicking Publish.
              </p>
              
              <div className="mt-6 flex items-center gap-6 bg-[#0f172a] p-4 rounded-lg border border-slate-600 inline-flex">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Current Live Version</p>
                  <p className="text-2xl font-bold text-slate-200">v{settings?.version || 0}</p>
                </div>
                <div className="w-px h-10 bg-slate-700"></div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Last Published</p>
                  <p className="text-sm font-medium text-slate-300">
                    {settings?.lastPublishedAt ? new Date(settings.lastPublishedAt).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold shadow-lg transition-all disabled:opacity-50 disabled:hover:bg-violet-600 flex items-center gap-2"
              >
                {isPublishing ? 'Publishing...' : 'Publish All Changes'}
              </button>
              {publishSuccess && (
                <p className="text-emerald-400 text-sm font-medium mt-3 flex items-center justify-end gap-1">
                  <CheckCircle size={16} /> Successfully published!
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-amber-400/90 leading-relaxed">
              <strong>Warning:</strong> Publishing will increment the version from <span className="font-mono bg-amber-500/20 px-1 rounded">{settings?.version || 0}</span> to <span className="font-mono bg-amber-500/20 px-1 rounded">{(settings?.version || 0) + 1}</span>. 
              All active mobile app clients will detect this version change on their next poll and immediately download the fresh content bundle. Ensure your banners and static pages are thoroughly reviewed before publishing.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
