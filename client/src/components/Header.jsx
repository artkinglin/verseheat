import React from 'react';
import { Flame, LogOut, Moon, Sun, User } from 'lucide-react';

export function Header({ user, onAuthOpen, onLogout, darkMode, onDarkModeToggle }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-ink text-white dark:bg-white dark:text-ink">
            <Flame size={22} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Verse Heat</h1>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">Rate Scripture. See the heat.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDarkModeToggle}
            className="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {user ? (
            <>
              <div className="hidden items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 sm:flex">
                <User size={16} aria-hidden="true" />
                <span>{user.displayName || user.email}</span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex h-10 w-10 items-center justify-center rounded bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
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
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
