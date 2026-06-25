import React from 'react';
import { Flame, LogOut, Moon, Sun, User } from 'lucide-react';

export function Header({ user, onAuthOpen, onLogout, darkMode, onDarkModeToggle }) {
  return (
    <header className="sticky top-0 z-20 border-b border-amber-200/70 bg-white/85 shadow-sm shadow-amber-950/5 backdrop-blur dark:border-indigo-400/20 dark:bg-slate-950/85 dark:shadow-black/20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 via-orange-500 to-purple-700 text-white shadow-md shadow-amber-900/25">
            <Flame size={22} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-slate-950 dark:text-amber-50">Verse Heat</h1>
            <p className="hidden text-xs font-medium text-emerald-700 dark:text-emerald-300 sm:block">Rate Scripture. See the heat.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDarkModeToggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-slate-700 transition hover:-translate-y-px hover:bg-amber-100 dark:border-indigo-400/30 dark:bg-indigo-950/40 dark:text-amber-50 dark:hover:bg-indigo-900/60"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm font-medium text-slate-700 dark:border-emerald-400/20 dark:bg-emerald-950/30 dark:text-emerald-100 sm:flex">
                <User size={16} aria-hidden="true" />
                <span>{user.displayName || user.email}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm transition hover:-translate-y-px hover:from-purple-600 hover:to-indigo-600"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onAuthOpen}
              className="btn-primary"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
