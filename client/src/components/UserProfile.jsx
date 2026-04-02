import { ArrowLeft, BookOpen, CalendarDays, Heart, Layers3, Library, Star, UserRound } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { referenceLabel } from '../lib/heat.js';

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function displayName(user) {
  return user?.displayName || user?.email || 'Verse Heat user';
}

function StatCard({ icon, label, value }) {
  const StatIcon = icon;

  return (
    <div className="app-card bg-white/80 p-4 dark:bg-slate-950/60">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200">
        <StatIcon size={18} aria-hidden="true" />
      </div>
      <div className="text-2xl font-extrabold text-slate-950 dark:text-amber-50">{value}</div>
      <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function VerseList({ emptyLabel, verses }) {
  const safeVerses = Array.isArray(verses) ? verses : [];

  return (
    <div className="space-y-2">
      {safeVerses.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>}
      {safeVerses.map((verse) => (
        <div key={verse.id || `${verse.bookId}:${verse.chapter}:${verse.verse}`} className="flex items-center justify-between gap-3 rounded-lg bg-gradient-to-r from-amber-50 to-white px-3 py-2 text-sm shadow-sm dark:from-indigo-950/40 dark:to-slate-950/40">
          <div>
            <div className="font-bold text-slate-900 dark:text-amber-50">{referenceLabel(verse)}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Rated {verse.score}/10{verse.favorite ? ' - Favorite' : ''}
            </div>
          </div>
          <div className="rounded-full bg-emerald-100 px-2 py-1 text-sm font-extrabold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            {verse.score}
          </div>
        </div>
      ))}
    </div>
  );
}

function CollectionGrid({ collections, onCollectionSelect }) {
  const safeCollections = Array.isArray(collections) ? collections : [];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {safeCollections.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No public collections yet.</p>}
      {safeCollections.map((collection) => (
        <article key={collection.id} className="rounded-lg border border-emerald-100 bg-white/85 p-3 shadow-sm dark:border-emerald-400/20 dark:bg-slate-950/60">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-slate-950 dark:text-amber-50">{collection.name}</h4>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{collection.verseCount} verses</p>
            </div>
            <button
              type="button"
              onClick={() => onCollectionSelect(collection.id)}
              className="btn-soft px-2 py-1 text-xs"
            >
              Go to Collection
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {collection.versePreviews?.length > 0 ? collection.versePreviews.map((verse) => (
              <span key={`${collection.id}-${verse.bookId}-${verse.chapter}-${verse.verse}`} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
                {referenceLabel(verse)}
              </span>
            )) : (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">No verses added.</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function UserProfile({ currentUser, onBackHome, onNavigate }) {
  const userId = window.location.pathname.split('/').filter(Boolean)[1];
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsTotal, setRatingsTotal] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState(() => new window.URLSearchParams(window.location.search).get('collection') || '');
  const [status, setStatus] = useState('');
  const pageSize = 12;

  const loadProfile = useCallback(async () => {
    try {
      const data = await api(`/api/users/${userId}`);
      setProfile(data);
      setStatus('');
    } catch (error) {
      setProfile(null);
      setStatus(error.message);
    }
  }, [userId]);

  const loadRatings = useCallback(async (page) => {
    try {
      const data = await api(`/api/users/${userId}/ratings?page=${page}&limit=${pageSize}`);
      setRatings(Array.isArray(data.ratings) ? data.ratings : []);
      setRatingsTotal(data.total || 0);
      setRatingsPage(page);
    } catch (error) {
      setRatings([]);
      setStatus(error.message);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
    loadRatings(1);
  }, [loadProfile, loadRatings]);

  const selectedCollection = useMemo(() => (
    profile?.collections?.find((collection) => collection.id === selectedCollectionId)
  ), [profile?.collections, selectedCollectionId]);

  function selectCollection(collectionId) {
    setSelectedCollectionId(collectionId);
    onNavigate(`/profile/${userId}?collection=${collectionId}`);
  }

  if (status && !profile) {
    return (
      <section className="app-card p-6">
        <button type="button" className="btn-soft mb-4" onClick={onBackHome}>
          <ArrowLeft size={16} aria-hidden="true" />
          Home
        </button>
        <p className="text-sm font-semibold text-red-700 dark:text-red-200">Profile unavailable: {status}</p>
      </section>
    );
  }

  const stats = profile?.stats || {};
  const isCurrentUser = currentUser?.id === profile?.user?.id;
  const ratedSummary = `Rated ${stats.totalVersesRated || 0} verses across ${stats.bookCount || 0} books`;
  const totalPages = Math.max(1, Math.ceil((ratingsTotal || 0) / pageSize));

  return (
    <section className="space-y-4">
      <button type="button" className="btn-soft" onClick={onBackHome}>
        <ArrowLeft size={16} aria-hidden="true" />
        Home
      </button>

      <div className="app-card overflow-hidden bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-5 dark:from-indigo-950/80 dark:via-slate-950/80 dark:to-emerald-950/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-extrabold uppercase text-purple-800 dark:border-purple-300/30 dark:bg-purple-950/40 dark:text-purple-100">
              <UserRound size={14} aria-hidden="true" />
              {isCurrentUser ? 'Your public profile' : 'Public profile'}
            </div>
            <h2 className="section-heading text-3xl font-extrabold tracking-normal">{displayName(profile?.user)}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{ratedSummary}</p>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
            <CalendarDays size={16} aria-hidden="true" />
            Joined {formatDate(profile?.user?.createdAt)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Verses rated" value={stats.totalVersesRated || 0} />
        <StatCard icon={Layers3} label="Books covered" value={stats.bookCount || 0} />
        <StatCard icon={Star} label="Avg rating" value={stats.averageRatingGiven ? Number(stats.averageRatingGiven).toFixed(1) : '--'} />
        <StatCard icon={Heart} label="Favorites" value={stats.favoriteCount || 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="app-card p-4">
          <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <Star size={18} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />
            Top Rated Verses
          </h3>
          <VerseList emptyLabel="No 9-10 ratings yet." verses={profile?.topRatedVerses} />
        </section>

        <section className="app-card p-4">
          <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <Heart size={18} className="text-purple-700 dark:text-purple-300" aria-hidden="true" />
            Favorite Interests
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile?.favoriteStruggles?.length > 0 ? profile.favoriteStruggles.map((item) => (
              <span key={item.struggle} className="rounded-lg border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-bold text-purple-800 dark:border-purple-300/30 dark:bg-purple-950/40 dark:text-purple-100">
                {item.struggle}
              </span>
            )) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No clear interests yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="app-card p-4">
        <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
          <Library size={18} className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          Collections
        </h3>
        {selectedCollection && (
          <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 dark:border-emerald-400/20 dark:bg-emerald-950/30">
            <div className="font-extrabold text-slate-950 dark:text-amber-50">{selectedCollection.name}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedCollection.versePreviews.map((verse) => (
                <span key={`${selectedCollection.id}-${verse.bookId}-${verse.chapter}-${verse.verse}`} className="rounded-lg bg-white/80 px-2 py-1 text-xs font-bold text-emerald-800 dark:bg-slate-950/50 dark:text-emerald-100">
                  {referenceLabel(verse)}
                </span>
              ))}
            </div>
          </div>
        )}
        <CollectionGrid collections={profile?.collections} onCollectionSelect={selectCollection} />
      </section>

      <section className="app-card p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <BookOpen size={18} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />
            Rating History
          </h3>
          <button type="button" className="btn-soft" onClick={() => setShowHistory((value) => !value)}>
            {showHistory ? 'Hide history' : 'View full rating history'}
          </button>
        </div>
        {showHistory && (
          <>
            <VerseList emptyLabel="No ratings yet." verses={ratings} />
            <div className="mt-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <button type="button" className="btn-soft" disabled={ratingsPage <= 1} onClick={() => loadRatings(ratingsPage - 1)}>Previous</button>
              <span>Page {ratingsPage} of {totalPages}</span>
              <button type="button" className="btn-soft" disabled={ratingsPage >= totalPages} onClick={() => loadRatings(ratingsPage + 1)}>Next</button>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
