import { CheckCircle2, Compass, Target } from 'lucide-react';
import React from 'react';

export function DailyMissionCard({ error, loading, mission, onAction, onAuthRequired, user }) {
  if (!user) {
    return (
      <section className="app-card grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <Target size={18} className="text-purple-700 dark:text-purple-300" aria-hidden="true" />
            Daily Mission
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Sign in to get a focused scripture goal each day.</p>
        </div>
        <button type="button" className="btn-primary" onClick={onAuthRequired}>Get Mission</button>
      </section>
    );
  }

  return (
    <section className="app-card overflow-hidden p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-extrabold uppercase text-purple-800 dark:border-purple-300/30 dark:bg-purple-950/40 dark:text-purple-100">
            <Target size={14} aria-hidden="true" />
            Daily Mission
          </div>
          <h3 className="text-2xl font-extrabold text-slate-950 dark:text-amber-50">
            {loading && !mission ? 'Loading mission...' : mission?.title || 'Mission unavailable'}
          </h3>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {mission?.description || 'Check back after signing in.'}
          </p>
          {mission?.complete && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-extrabold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
              <CheckCircle2 size={16} aria-hidden="true" />
              Complete for today
            </div>
          )}
          {error && <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>}
        </div>

        <div className="space-y-3 rounded-lg bg-purple-50/70 p-3 dark:bg-slate-950/40">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Progress</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-amber-50">
                {mission ? `${mission.current}/${mission.target}` : '--'}
              </div>
            </div>
            <div className="text-sm font-extrabold text-purple-800 dark:text-purple-100">
              {mission?.complete ? 'Done' : `${mission?.remaining ?? '--'} left`}
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-slate-900">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-700 to-emerald-500" style={{ width: `${mission?.progress || 0}%` }} />
          </div>
          <button
            type="button"
            className={mission?.complete ? 'btn-soft w-full' : 'btn-primary w-full'}
            disabled={!mission || loading}
            onClick={onAction}
          >
            <Compass size={15} aria-hidden="true" />
            {mission?.complete ? 'Keep Exploring' : mission?.actionLabel || 'Open heat map'}
          </button>
        </div>
      </div>
    </section>
  );
}
