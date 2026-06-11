import React from 'react';
import { Tag } from 'lucide-react';

const SubCategories: React.FC = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Sub Categories</h1>
      <p className="text-sm text-slate-400 mt-1">Manage service sub-categories within each parent category.</p>
    </div>
    <div className="p-8 bg-slate-800/60 rounded-2xl border border-slate-700 flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-slate-700 flex items-center justify-center">
        <Tag className="h-8 w-8 text-slate-400" />
      </div>
      <div className="text-center">
        <p className="text-slate-300 font-semibold">Sub Categories</p>
        <p className="text-slate-500 text-sm mt-2">Nested category management with drag-and-drop ordering. Implementation in progress.</p>
      </div>
    </div>
  </div>
);

export default SubCategories;
