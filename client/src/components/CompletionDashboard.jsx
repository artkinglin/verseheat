import { BookOpenCheck, Layers3, Map, Trophy } from 'lucide-react';
import React from 'react';

function ProgressRow({ book }) {
  return (
    <div className="rounded-lg bg-white/75 px-3 py-2 shadow-sm dark:bg-slate-950/45">
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="font-extrabold text-slate-900 dark:text-amber-50">{book.bookName}</span>
        <span className="text-xs font-extrabold text-purple-800 dark:text-purple-100">{book.completionPercent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
        <div className="h-full rounded-full bg-gradient-to-r from-purple-700 to-emerald-500" style={{ width: `${book.completionPercent}%` }} />
      </div>
      <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{book.ratedVerses}/{book.totalVerses} verses</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-white/75 p-3 shadow-sm dark:bg-slate-950/45">
      <Icon size={17} className="mb-2 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
      <div className="text-xl font-extrabold text-slate-950 dark:text-amber-50">{value}</div>
      <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

export function CompletionDashboard({ completion, error, loading, onAuthRequired, user }) {
  if (!user) {
    return (
      <section className="app-card grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <Map size={18} className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            Completion Map
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Sign in to track Bible, book, and chapter completion.</p>
        </div>
        <button type="button" className="btn-primary" onClick={onAuthRequired}>Track Progress</button>
      </section>
    );
  }

  const books = Array.isArray(completion?.books) ? completion.books : [];
  const activeBooks = books
    .filter((book) => book.ratedVerses > 0 && !book.complete)
    .sort((a, b) => b.completionPercent - a.completionPercent || b.ratedVerses - a.ratedVerses)
    .slice(0, 4);

  return (
    <section className="app-card overflow-hidden bg-gradient-to-r from-emerald-50 via-white to-purple-50 p-4 dark:from-emerald-950/40 dark:via-slate-950/70 dark:to-purple-950/40">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold uppercase text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-950/40 dark:text-emerald-100">
            <Map size={14} aria-hidden="true" />
            Completion Map
          </div>
          <h3 className="text-2xl font-extrabold text-slate-950 dark:text-amber-50">{loading && !completion ? 'Loading progress...' : `${completion?.completionPercent || 0}% Bible rated`}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{completion?.ratedVerses || 0}/{completion?.totalVerses || 0} verses rated across the full map.</p>
        </div>
        {error && <p className="text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>}
      </div>

      <div className="mb-4 h-3 overflow-hidden rounded-full bg-white dark:bg-slate-900">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-500 to-purple-700" style={{ width: `${completion?.completionPercent || 0}%` }} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={BookOpenCheck} label="Books complete" value={`${completion?.booksCompleted || 0}/${completion?.totalBooks || 66}`} />
        <Stat icon={Layers3} label="Chapters complete" value={`${completion?.chaptersCompleted || 0}/${completion?.totalChapters || 0}`} />
        <Stat icon={Trophy} label="Verses left" value={completion ? completion.totalVerses - completion.ratedVerses : '--'} />
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {activeBooks.length > 0 ? activeBooks.map((book) => <ProgressRow key={book.bookId} book={book} />) : (
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Rate verses to reveal your closest books.</p>
        )}
      </div>
    </section>
  );
}
