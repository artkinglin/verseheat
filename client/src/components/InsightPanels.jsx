import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, FolderPlus, Heart, Library, Share2, Trash2, TrendingUp, UserRoundCheck, X } from 'lucide-react';
import { api } from '../api.js';
import { referenceLabel } from '../lib/heat.js';

function RankingList({ icon: Icon, title, items, emptyLabel, onNavigate }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <section className="app-card p-4">
      <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
        {Icon && <Icon size={18} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />}
        {title}
      </h3>
      <div className="space-y-2">
        {safeItems.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>}
        {safeItems.map((item, index) => {
          const topUserName = item.topUserDisplayName || item.topUserUsername;
          return (
          <div key={`${title}-${item.bookId}-${item.chapter}-${item.verse || index}`} className="flex items-center justify-between gap-3 rounded-lg bg-gradient-to-r from-amber-50 to-white px-3 py-2 text-sm shadow-sm dark:from-indigo-950/50 dark:to-slate-950/40">
            <div>
              <div className="font-bold text-slate-900 dark:text-amber-50">{index + 1}. {referenceLabel(item)}</div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {item.ratingCount} ratings
              </div>
            </div>
            <div className="flex items-center gap-1">
              {item.topUserId && (
                <button
                  type="button"
                  onClick={() => onNavigate?.(`/profile/${item.topUserId}`)}
                  className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-purple-700 transition hover:-translate-y-px hover:bg-purple-100 dark:text-purple-200 dark:hover:bg-purple-950/50"
                  aria-label={`View profile for ${topUserName || 'top rater'}`}
                  title="View Profile"
                >
                  {item.topUserProfilePicture ? (
                    <img src={item.topUserProfilePicture} alt="" className="h-7 w-7 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-xs font-extrabold dark:bg-purple-950/60">
                      {(topUserName || '?').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden max-w-24 truncate text-xs font-bold sm:inline">{topUserName || 'Profile'}</span>
                </button>
              )}
              <div className="rounded-full bg-emerald-100 px-2 py-1 text-base font-extrabold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">{Number(item.averageRating).toFixed(1)}</div>
            </div>
          </div>
        );})}
      </div>
    </section>
  );
}

function UserRatingList({ emptyLabel, items, onClearRating, onShareFavorite, showShare }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-2">
      {safeItems.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>}
      {safeItems.map((rating) => (
        <div key={rating.id} className="flex items-center justify-between gap-3 rounded-lg bg-gradient-to-r from-purple-50 to-white px-3 py-2 text-sm shadow-sm dark:from-purple-950/40 dark:to-slate-950/40">
          <div>
            <div className="font-bold text-slate-900 dark:text-amber-50">{referenceLabel(rating)}</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{rating.score}/10</div>
          </div>
          <div className="flex items-center gap-1">
            {showShare && (
              <button type="button" onClick={() => onShareFavorite(rating)} className="rounded-lg p-2 text-amber-700 transition hover:-translate-y-px hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-950/50" aria-label="Share favorite" title="Share favorite">
                <Share2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onClearRating?.(rating)}
              className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white/80 px-2 py-1 text-xs font-bold text-purple-800 transition hover:-translate-y-px hover:bg-purple-100 dark:border-purple-300/30 dark:bg-purple-950/40 dark:text-purple-100 dark:hover:bg-purple-900/60"
              aria-label={`Clear rating for ${referenceLabel(rating)}`}
              title="Clear rating"
            >
              <X size={13} aria-hidden="true" />
              Clear
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CollectionManager({
  collections,
  onCreateCollection,
  onDeleteCollection,
  onRemoveFromCollection,
}) {
  const safeCollections = useMemo(() => (Array.isArray(collections) ? collections : []), [collections]);
  const [name, setName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (safeCollections.length === 0) {
      setSelectedCollectionId('');
      setDetail(null);
      return;
    }

    if (!selectedCollectionId || !safeCollections.some((collection) => collection.id === selectedCollectionId)) {
      setSelectedCollectionId(safeCollections[0].id);
    }
  }, [safeCollections, selectedCollectionId]);

  useEffect(() => {
    let ignore = false;

    async function loadDetail() {
      if (!selectedCollectionId) return;
      try {
        const data = await api(`/api/collections/${selectedCollectionId}`);
        if (!ignore) {
          setDetail(data.collection);
          setStatus('');
        }
      } catch (error) {
        if (!ignore) {
          setDetail(null);
          setStatus(error.message);
        }
      }
    }

    loadDetail();

    return () => {
      ignore = true;
    };
  }, [selectedCollectionId, collections]);

  async function submit(event) {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      const collection = await onCreateCollection(name.trim());
      setName('');
      setSelectedCollectionId(collection.id);
      setStatus('Collection created');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function deleteSelected() {
    if (!selectedCollectionId) return;

    try {
      await onDeleteCollection(selectedCollectionId);
      setStatus('Collection deleted');
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function removeVerse(verse) {
    if (!selectedCollectionId) return;

    try {
      await onRemoveFromCollection(selectedCollectionId, verse);
      const data = await api(`/api/collections/${selectedCollectionId}`);
      setDetail(data.collection);
      setStatus('Verse removed');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="app-card p-4 lg:col-span-2">
      <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
          <Library size={18} className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          Collections
        </h3>
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <input
            className="app-input px-3 py-2 text-sm"
            placeholder="Verses about faith"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className="btn-primary">
            <FolderPlus size={16} aria-hidden="true" />
            Create Collection
          </button>
        </form>
      </div>

      {status && <p className="mb-3 text-sm font-semibold text-emerald-800 dark:text-emerald-200">{status}</p>}

      {safeCollections.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Create themed lists for comfort, faith, prayer, or any study path.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            {safeCollections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => setSelectedCollectionId(collection.id)}
                className={`block w-full rounded-lg border px-3 py-2 text-left transition hover:-translate-y-px ${
                  selectedCollectionId === collection.id
                    ? 'border-purple-700 bg-purple-700 text-white dark:border-amber-300 dark:bg-amber-300 dark:text-slate-950'
                    : 'border-slate-200 bg-white/80 text-slate-700 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-indigo-950/60'
                }`}
              >
                <span className="block text-sm font-bold">{collection.name}</span>
                <span className="text-xs font-semibold opacity-80">{collection.verseCount} verses</span>
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-amber-100 bg-white/70 p-3 dark:border-indigo-400/20 dark:bg-slate-950/50">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-slate-950 dark:text-amber-50">{detail?.name || 'Collection details'}</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{detail?.verseCount || 0} saved verses</p>
              </div>
              <button type="button" onClick={deleteSelected} className="rounded-lg p-2 text-red-700 transition hover:-translate-y-px hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-950/50" aria-label="Delete collection" title="Delete collection">
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-2">
              {(!detail?.verses || detail.verses.length === 0) && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Add verses from the heat map.</p>
              )}
              {detail?.verses?.map((verse) => (
                <div key={verse.id} className="flex items-center justify-between gap-3 rounded-lg bg-gradient-to-r from-emerald-50 to-white px-3 py-2 text-sm shadow-sm dark:from-emerald-950/30 dark:to-slate-950/40">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-amber-50">{referenceLabel(verse)}</div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {verse.myScore ? `Your rating: ${verse.myScore}/10` : 'Not rated by you'}
                      {verse.averageRating ? ` - Community: ${Number(verse.averageRating).toFixed(1)} (${verse.ratingCount})` : ' - Community: unrated'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVerse(verse)}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-white/80 px-2 py-1 text-xs font-bold text-purple-800 transition hover:-translate-y-px hover:bg-purple-100 dark:border-purple-300/30 dark:bg-purple-950/40 dark:text-purple-100 dark:hover:bg-purple-900/60"
                    aria-label={`Remove ${referenceLabel(verse)} from collection`}
                    title="Remove verse"
                  >
                    <X size={13} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function InsightPanels({
  collections,
  leaderboard,
  trending,
  myRatings,
  onClearRating,
  onCreateCollection,
  onDeleteCollection,
  onNavigate,
  onRemoveFromCollection,
}) {
  const safeRatings = Array.isArray(myRatings) ? myRatings : [];
  const favorites = safeRatings.filter((rating) => rating.favorite);

  async function share(item) {
    const text = `Verse Heat favorite: ${referenceLabel(item)} rated ${item.score}/10`;
    if (navigator.share) {
      await navigator.share({ title: 'Verse Heat', text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <RankingList icon={BarChart3} title="Leaderboard" items={leaderboard} emptyLabel="No verse ratings yet." onNavigate={onNavigate} />
      <RankingList icon={TrendingUp} title="Trending this week" items={trending} emptyLabel="No recent ratings yet." onNavigate={onNavigate} />
      <section className="app-card p-4">
        <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
          <Heart size={18} className="text-purple-700 dark:text-purple-300" aria-hidden="true" />
          Favorites
        </h3>
        <UserRatingList
          emptyLabel="Favorite verses while rating to collect them here."
          items={favorites.slice(0, 8)}
          onClearRating={onClearRating}
          onShareFavorite={share}
          showShare
        />
      </section>
      <section className="app-card p-4">
        <h3 className="mb-3 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
          <UserRoundCheck size={18} className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          Your ratings
        </h3>
        <UserRatingList
          emptyLabel="Sign in and rate passages to build your profile."
          items={safeRatings.slice(0, 8)}
          onClearRating={onClearRating}
          onShareFavorite={share}
        />
      </section>
      <CollectionManager
        collections={collections}
        onCreateCollection={onCreateCollection}
        onDeleteCollection={onDeleteCollection}
        onRemoveFromCollection={onRemoveFromCollection}
      />
    </div>
  );
}
