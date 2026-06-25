import { Clock3, Flame, RefreshCw, Sparkles } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { RatingControl } from './RatingControl.jsx';

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function VerseOfDay({ user, onAuthRequired }) {
  const [verse, setVerse] = useState(null);
  const [selectedScore, setSelectedScore] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [countdownMs, setCountdownMs] = useState(0);

  const loadVerse = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/verse-of-the-day');
      setVerse(data.verse);
      setSelectedScore(null);
      setStatus('');
    } catch (error) {
      setVerse(null);
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerse();
  }, [loadVerse]);

  useEffect(() => {
    if (!verse?.nextRotationAt) return undefined;

    const updateCountdown = () => {
      const nextMs = new Date(verse.nextRotationAt).getTime() - Date.now();
      setCountdownMs(nextMs);

      if (nextMs <= 0) {
        loadVerse();
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [loadVerse, verse?.nextRotationAt]);

  const rotationTimeout = useMemo(() => {
    if (!verse?.nextRotationAt) return null;
    return new Date(verse.nextRotationAt).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [verse?.nextRotationAt]);

  async function rate(score) {
    if (!user) {
      onAuthRequired();
      return;
    }

    setSelectedScore(score);
    setStatus('');
    try {
      await api('/api/ratings', {
        method: 'POST',
        body: JSON.stringify({
          scope: 'verse',
          bookId: verse.bookId,
          chapter: verse.chapter,
          verse: verse.verse,
          score,
        }),
      });
      setStatus('Rating saved');
      await loadVerse();
      setSelectedScore(score);
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="verse-day-card overflow-hidden rounded-lg border border-amber-300/70 p-5 text-slate-950 shadow-lg shadow-amber-950/10 dark:border-amber-300/30 dark:text-amber-50">
      <div className="relative z-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/45 px-3 py-1 text-xs font-extrabold uppercase text-purple-900 backdrop-blur dark:border-amber-200/20 dark:bg-slate-950/25 dark:text-amber-100">
            <Sparkles size={14} aria-hidden="true" />
            Verse of the Day
          </div>

          {loading && (
            <div className="rounded-lg border border-white/50 bg-white/50 p-4 text-sm font-semibold dark:border-amber-200/20 dark:bg-slate-950/30">
              Loading today's featured verse...
            </div>
          )}

          {!loading && !verse && (
            <div className="rounded-lg border border-white/50 bg-white/50 p-4 text-sm font-semibold dark:border-amber-200/20 dark:bg-slate-950/30">
              Verse of the Day is unavailable: {status}
            </div>
          )}

          {verse && (
            <article key={`${verse.date}-${verse.reference}`} className="verse-day-copy space-y-3">
              <h2 className="text-2xl font-extrabold tracking-normal sm:text-3xl">{verse.reference}</h2>
              <p className="max-w-3xl text-xl font-semibold leading-8 text-slate-900 dark:text-amber-50 sm:text-2xl">
                {verse.text}
              </p>
              <p className="text-xs font-semibold text-slate-700 dark:text-amber-100/80">{verse.copyright}</p>
            </article>
          )}
        </div>

        <div className="rounded-lg border border-white/60 bg-white/55 p-4 shadow-sm backdrop-blur dark:border-amber-200/20 dark:bg-slate-950/35">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/70 p-3 dark:bg-slate-950/45">
              <div className="inline-flex items-center gap-1 text-xs font-extrabold uppercase text-emerald-800 dark:text-emerald-200">
                <Flame size={13} aria-hidden="true" />
                Rating
              </div>
              <div className="mt-1 text-2xl font-extrabold">{verse?.averageRating ? Number(verse.averageRating).toFixed(1) : '--'}</div>
            </div>
            <div className="rounded-lg bg-white/70 p-3 dark:bg-slate-950/45">
              <div className="text-xs font-extrabold uppercase text-purple-800 dark:text-purple-200">Ratings</div>
              <div className="mt-1 text-2xl font-extrabold">{verse?.ratingCount ?? '--'}</div>
            </div>
          </div>

          <div className="mb-4 rounded-lg bg-white/70 p-3 dark:bg-slate-950/45">
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase text-slate-700 dark:text-amber-100">
              <Clock3 size={14} aria-hidden="true" />
              Next verse
            </div>
            <div className="mt-1 font-mono text-2xl font-extrabold">{formatCountdown(countdownMs)}</div>
            {rotationTimeout && <div className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Rotates at {rotationTimeout}</div>}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-extrabold uppercase text-slate-700 dark:text-amber-100">Rate today's verse</div>
            <RatingControl
              disabled={!verse}
              selectedScore={selectedScore}
              onRate={rate}
            />
            {status && verse && <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{status}</p>}
            {!user && verse && (
              <button type="button" className="btn-soft mt-1 w-full" onClick={onAuthRequired}>
                <RefreshCw size={15} aria-hidden="true" />
                Sign in to rate
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
