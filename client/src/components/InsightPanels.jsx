import { Share2 } from 'lucide-react';
import { referenceLabel } from '../lib/heat.js';

function RankingList({ title, items, emptyLabel }) {
  return (
    <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>}
        {items.map((item, index) => (
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

export function InsightPanels({ leaderboard, trending, myRatings }) {
  const favorites = myRatings.filter((rating) => rating.favorite);

  async function share(item) {
    const text = `Verse Heat favorite: ${referenceLabel(item)} rated ${item.score}/10`;
    if (navigator.share) {
      await navigator.share({ title: 'Verse Heat', text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <RankingList title="Leaderboard" items={leaderboard} emptyLabel="No verse ratings yet." />
      <RankingList title="Trending this week" items={trending} emptyLabel="No recent ratings yet." />
      <section className="rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-lg font-semibold">Your ratings</h3>
        <div className="space-y-2">
          {myRatings.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Sign in and rate passages to build your profile.</p>}
          {myRatings.slice(0, 8).map((rating) => (
            <div key={rating.id} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950">
              <div>
                <div className="font-medium">{referenceLabel(rating)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{rating.score}/10</div>
              </div>
              {favorites.some((favorite) => favorite.id === rating.id) && (
                <button type="button" onClick={() => share(rating)} className="rounded p-2 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Share favorite">
                  <Share2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
