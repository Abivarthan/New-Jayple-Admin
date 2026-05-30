import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon } from 'lucide-react';

export const TopBar: React.FC = () => {
  const { adminProfile } = useAuth();

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-slate-600 bg-slate-800 px-6 text-slate-100">
      {/* Search/Breadcrumb Placeholder */}
      <div className="flex items-center">
        <span className="text-sm font-medium text-slate-400">Operations Console</span>
      </div>

      {/* User profile actions */}
      <div className="flex items-center gap-4">
        {adminProfile && (
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="text-sm font-medium">{adminProfile.name}</span>
              <span className="text-xs text-slate-400 capitalize">{adminProfile.role}</span>
            </div>
            
            {/* Avatar block */}
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600/30 text-violet-400 border border-violet-500/30">
              <UserIcon className="h-5 w-5" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
