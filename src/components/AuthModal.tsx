import React, { useState } from 'react';
import { X, ShieldCheck, LogIn, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from '../services/firebase/firebaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueDemo: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onContinueDemo }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed';
      setErrorMsg(
        `${msg}. You can also continue immediately in the interactive workspace below.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim());
        setInfoMsg('Password reset link sent! Check your inbox.');
      } else if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        onClose();
      } else {
        if (password.length < 6) {
          setErrorMsg('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
        onClose();
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Email/Password provider is not yet enabled in your Firebase Console (Authentication > Sign-in method). Please use Google Sign-In above or click "Continue in Demo Workspace" below.'
        );
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Authentication error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="auth-modal-title" className="text-2xl font-display font-bold text-[#1F2937] dark:text-white">
              {mode === 'login' ? 'Sign in to EventGenie AI' : mode === 'register' ? 'Create Your Planner Account' : 'Reset Password'}
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
              Sync your events securely with Firebase Cloud Firestore
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="p-2 rounded-lg text-[#6B7280] hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-[#DC2626] dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-[#047857] dark:text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Primary Google Sign-In (Configured via ProvisionFirebase) */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#047857] hover:bg-[#064E3B] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          <span>Continue with Google Sign-In</span>
        </button>

        <div className="relative flex py-1 items-center">
          <div className="grow border-t border-[#E5E7EB] dark:border-slate-800" />
          <span className="shrink mx-3 text-xs text-[#6B7280]">or email authentication</span>
          <div className="grow border-t border-[#E5E7EB] dark:border-slate-800" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-medium mb-1">
                Full Name
              </label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Arindam Sen"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium mb-1">
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="planner@example.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] dark:border-slate-700 bg-transparent"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[#E5E7EB] dark:border-slate-700 hover:bg-stone-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>
              {mode === 'login' ? 'Sign In with Email' : mode === 'register' ? 'Create Account' : 'Send Password Reset Email'}
            </span>
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-[#6B7280]">
          {mode === 'login' ? (
            <>
              <button type="button" onClick={() => setMode('register')} className="hover:underline cursor-pointer">
                Need an account? Register
              </button>
              <button type="button" onClick={() => setMode('reset')} className="hover:underline cursor-pointer">
                Forgot password?
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMode('login')} className="hover:underline cursor-pointer">
              Back to Sign In
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onContinueDemo();
              onClose();
            }}
            className="w-full py-2 px-3 rounded-lg bg-[#ECFDF5] text-[#064E3B] hover:bg-emerald-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            Explore Interactive Demo Workspace (No Sign-In Required)
          </button>
        </div>
      </div>
    </div>
  );
};
