import { BookOpenText, Search, UserRound } from 'lucide-react';
import React, { useState } from 'react';
import { api } from '../api.js';

export function SearchPanel({ onNavigate, user }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setStatus('Searching...');
    try {
      const data = await api(`/api/esv/search?q=${encodeURIComponent(query.trim())}`);
      setResults(Array.isArray(data.results) ? data.results : []);
      setStatus(`${data.total_results || 0} results`);
    } catch (error) {
      setResults([]);
      setStatus(error.message);
    }
  }

  return (
    <section className="app-card bg-gradient-to-br from-white to-emerald-50/70 p-5 dark:from-slate-950/80 dark:to-emerald-950/30">
      <div className="mb-4">
        <h2 className="inline-flex items-center gap-2 text-xl font-extrabold text-slate-950 dark:text-amber-50">
          <BookOpenText size={20} className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          Search Scripture
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Find ESV passages by word, phrase, or reference.</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700 dark:text-emerald-300" size={17} />
          <input
            className="app-input w-full py-2.5 pl-9 pr-3 text-sm"
            placeholder="Search ESV text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button type="submit" className="btn-primary">
          <Search size={16} aria-hidden="true" />
          Search
        </button>
      </form>
      {status && <p className="mt-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">{status}</p>}
      {results.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {results.map((result) => (
            <article key={result.reference} className="rounded-lg border border-emerald-100 bg-white/85 p-3 text-sm shadow-sm dark:border-emerald-400/20 dark:bg-slate-950/60">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-bold text-slate-950 dark:text-amber-50">{result.reference}</h4>
                {user && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.(`/profile/${user.id}`)}
                    className="rounded-lg p-2 text-emerald-700 transition hover:-translate-y-px hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
                    aria-label="View Profile"
                    title="View Profile"
                  >
                    <UserRound size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="mt-1 leading-6 text-slate-600 dark:text-slate-300">{result.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
