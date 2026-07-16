import React, { useState } from 'react';
import { ThemeConfig } from '../types';
import { signInWithGoogle, signInWithEmail } from '../lib/supabase';
import { X, Mail, LogIn, Check, AlertCircle, Loader2, Cloud } from 'lucide-react';

interface AuthModalProps {
  themeConfig: ThemeConfig;
  onClose: () => void;
}

export default function AuthModal({ themeConfig, onClose }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`w-full max-w-sm rounded-2xl border p-6 ${themeConfig.cardBg} ${themeConfig.border} shadow-2xl`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold tracking-tight">Sync your library</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-xs opacity-70 mb-5">Sign in to keep your books, progress, and PDFs in sync across all your devices.</p>

        {sent ? (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-full"><Check className="w-6 h-6" /></div>
            <p className="text-sm font-semibold">Check your inbox</p>
            <p className="text-xs opacity-70">We sent a sign-in link to <span className="font-medium">{email}</span>. Open it on this device to finish signing in.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={() => signInWithGoogle()}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors ${themeConfig.border}`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider opacity-50">
              <div className={`flex-1 border-t ${themeConfig.border}`} /> or <div className={`flex-1 border-t ${themeConfig.border}`} />
            </div>

            <form onSubmit={handleMagicLink} className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
                <input
                  type="email" required placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${themeConfig.bg} ${themeConfig.border}`}
                />
              </div>
              <button
                type="submit" disabled={loading || !email.trim()}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white text-sm font-semibold cursor-pointer transition-all ${
                  loading || !email.trim() ? 'bg-zinc-400 opacity-55 cursor-not-allowed' : themeConfig.accent + ' ' + themeConfig.accentHover
                }`}
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><LogIn className="w-4 h-4" /> Email me a sign-in link</>}
              </button>
            </form>

            {error && (
              <div className="p-3 rounded-lg bg-red-100 text-red-800 border border-red-200/50 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
