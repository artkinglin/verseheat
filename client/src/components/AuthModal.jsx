import React, { useState } from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';

export function AuthModal({ open, onClose, onLogin, onSignup }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        await onSignup(form);
      } else {
        await onLogin({ email: form.email, password: form.password });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="app-card w-full max-w-md bg-gradient-to-br from-white to-amber-50 p-5 shadow-xl dark:from-slate-950 dark:to-indigo-950/70">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            {mode === 'signup' ? <UserPlus size={18} className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" /> : <LogIn size={18} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />}
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-600 transition hover:bg-amber-100 dark:text-slate-300 dark:hover:bg-indigo-950" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-lg border border-amber-200 bg-white/70 p-1 dark:border-indigo-400/30 dark:bg-slate-950/60">
          {['login', 'signup'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition ${mode === option ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm dark:from-amber-400 dark:to-emerald-500 dark:text-slate-950' : 'text-slate-600 hover:bg-amber-50 dark:text-slate-300 dark:hover:bg-indigo-950/60'}`}
            >
              {option === 'login' ? 'Login' : 'Signup'}
            </button>
          ))}
        </div>

        <form className="space-y-3" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Display name
              <input
                className="app-input mt-1 w-full px-3 py-2.5"
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              />
            </label>
          )}
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Email
            <input
              type="email"
              required
              className="app-input mt-1 w-full px-3 py-2.5"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Password
            <input
              type="password"
              required
              minLength={8}
              className="app-input mt-1 w-full px-3 py-2.5"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-400/30 dark:bg-red-950/50 dark:text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full"
          >
            {mode === 'signup' ? <UserPlus size={16} aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
            {busy ? 'Working...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
