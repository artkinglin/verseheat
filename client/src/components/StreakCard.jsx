import { CalendarCheck2, Flame, RotateCcw, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

function formatDateKey(dateKey) {
  if (!dateKey) return '';
  return new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

export function StreakCard({ error, loading, onAuthRequired, onRestore, streak, user }) {
  const [status, setStatus] = useState('');

  async function restore() {
    setStatus('');
    try {
      await onRestore?.();
      setStatus('Streak restored');
    } catch (restoreError) {
      setStatus(restoreError.message);
    }
  }

  if (!user) {
    return (
      <section className="app-card grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <Flame size={18} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />
            Daily Streak
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Sign in to build a daily rating streak.</p>
        </div>
        <button type="button" className="btn-primary" onClick={onAuthRequired}>Start Streak</button>
      </section>
    );
  }

  const nextMilestone = streak?.nextStreakMilestone;

  return (
    <section className="app-card overflow-hidden p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-extrabold uppercase text-amber-800 dark:border-amber-300/30 dark:bg-amber-950/40 dark:text-amber-100">
            <Flame size={14} aria-hidden="true" />
            Daily Streak
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="text-4xl font-extrabold text-slate-950 dark:text-amber-50">{loading && !streak ? '--' : streak?.streak || 0}</div>
            <div className="pb-1 text-sm font-bold text-slate-600 dark:text-slate-300">consecutive active days</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold">
            <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${
              streak?.activeToday
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300'
            }`}>
              <CalendarCheck2 size={13} aria-hidden="true" />
              {streak?.activeToday ? 'Today complete' : 'Rate today'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2 py-1 text-purple-800 dark:bg-purple-950/40 dark:text-purple-100">
              <ShieldCheck size={13} aria-hidden="true" />
              {streak?.restoresRemaining ?? 0} restore left this week
            </span>
          </div>
          {error && <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>}
          {status && <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-100">{status}</p>}
        </div>

        <div className="space-y-3 rounded-lg bg-amber-50/70 p-3 dark:bg-slate-950/40">
          <div>
            <div className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400">Next milestone</div>
            <div className="mt-1 text-lg font-extrabold text-slate-950 dark:text-amber-50">
              {nextMilestone ? `${nextMilestone.remaining} days to ${nextMilestone.target}` : 'All milestones complete'}
            </div>
            {nextMilestone && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-900">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${nextMilestone.progress}%` }} />
              </div>
            )}
          </div>
          <button
            type="button"
            className="btn-soft w-full"
            disabled={!streak?.canRestore || loading}
            onClick={restore}
            title={streak?.canRestore ? `Restore ${formatDateKey(streak.restoreDay)}` : 'No restore available'}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Restore Missed Day
          </button>
        </div>
      </div>
    </section>
  );
}
