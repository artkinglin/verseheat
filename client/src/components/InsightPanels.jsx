import React from 'react';
import { Share2, X } from 'lucide-react';
import { referenceLabel } from '../lib/heat.js';

function RankingList({ title, items, emptyLabel }) {
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <div className="space-y-2">
        {safeItems.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>}
        {safeItems.map((item, index) => (
          <div key={`${title}-${item.bookId}-${item.chapter}-${item.verse || index}`} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
            <div>
              <div className="font-medium">{index + 1}. {referenceLabel(item)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{item.ratingCount} ratings</div>
            </div>
            <div className="text-base font-semibold">{Number(item.averageRating).toFixed(1)}</div>
          </div>
        ))}
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
        <div key={rating.id} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
          <div>
            <div className="font-medium">{referenceLabel(rating)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{rating.score}/10</div>
          </div>
          <div className="flex items-center gap-1">
            {showShare && (
              <button type="button" onClick={() => onShareFavorite(rating)} className="rounded p-2 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Share favorite" title="Share favorite">
                <Share2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => onClearRating?.(rating)}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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

export function InsightPanels({ leaderboard, trending, myRatings, onClearRating }) {
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
      <RankingList title="Leaderboard" items={leaderboard} emptyLabel="No verse ratings yet." />
      <RankingList title="Trending this week" items={trending} emptyLabel="No recent ratings yet." />
      <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">Favorites</h3>
        <UserRatingList
          emptyLabel="Favorite verses while rating to collect them here."
          items={favorites.slice(0, 8)}
          onClearRating={onClearRating}
          onShareFavorite={share}
          showShare
        />
      </section>
      <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">Your ratings</h3>
        <UserRatingList
          emptyLabel="Sign in and rate passages to build your profile."
          items={safeRatings.slice(0, 8)}
          onClearRating={onClearRating}
          onShareFavorite={share}
        />
      </section>
    </div>
  );
}
