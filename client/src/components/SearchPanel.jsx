import { Search } from 'lucide-react';
import React, { useState } from 'react';
import { api } from '../api.js';

export function SearchPanel() {
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
    <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            placeholder="Search ESV text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
          Search
        </button>
      </form>
      {status && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{status}</p>}
      {results.length > 0 && (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {results.map((result) => (
            <article key={result.reference} className="rounded bg-slate-50 p-3 text-sm dark:bg-slate-950">
              <h4 className="font-semibold">{result.reference}</h4>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{result.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
