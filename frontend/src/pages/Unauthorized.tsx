import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#0f172a] px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-6">
          <ShieldAlert size={32} />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-200">
          Access Restriction
        </h1>
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">
          Your account does not possess the administrative privileges required to view this module. 
          Please contact your administrator for permission adjustments.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 hover:bg-slate-700 active:bg-slate-800 border border-slate-600 text-sm font-semibold py-2.5 transition-all text-slate-200"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          
          <button
            onClick={logout}
            className="rounded-lg border border-rose-900/30 text-rose-400 hover:bg-rose-950/20 active:bg-rose-950/40 text-sm font-semibold py-2.5 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
