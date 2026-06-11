import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Lock, Mail, AlertTriangle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSeedAdmin = async () => {
    setLoading(true);
    try {
      // Create user
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      
      const cred = await createUserWithEmailAndPassword(auth, 'admin@jayple.in', 'Admin123!');
      
      // Create profile
      await setDoc(doc(db, 'adminUsers', cred.user.uid), {
        uid: cred.user.uid,
        name: "Super Admin",
        role: "superadmin",
        isActive: true,
        permissions: ["vendors", "content", "analytics", "settlements"],
        createdAt: new Date().toISOString()
      });
      
      setError('Superadmin seeded successfully! You can now log in.');
    } catch (err: unknown) {
      setError((err as Error).message || 'Error seeding admin');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthStateChanged in AuthContext will handle state reload and verification.
      // We navigate to 'from' page if successful.
      navigate(from, { replace: true });
    } catch (err: unknown) {
      console.error(err);
      const authErr = err as { code?: string; message?: string };
      if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
        setError('Invalid login credentials. Please try again.');
      } else {
        setError(authErr.message || 'An error occurred during authentication.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-[#0f172a] px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800 p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            Jayple Admin Console
          </h1>
          <p className="mt-2 text-sm text-slate-400">Sign in to manage operations</p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-rose-400 text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
                placeholder="admin@jayple.in"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full rounded-lg border border-slate-600 bg-[#0f172a] py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-violet-600 py-3 text-sm font-semibold text-white transition-all hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Authenticate'
            )}
          </button>
        </form>

        <button
          onClick={handleSeedAdmin}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center rounded-lg border border-slate-600 bg-slate-700 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-700 active:bg-slate-800 disabled:opacity-50"
        >
          [DEV] Seed Superadmin Account
        </button>
      </div>
    </div>
  );
};
