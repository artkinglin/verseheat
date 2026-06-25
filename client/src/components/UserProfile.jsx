import { ArrowLeft, Award, BarChart3, BookOpen, CalendarDays, Edit3, Flame, Heart, Layers3, Library, PieChart, Star, Target, UserCheck, UserPlus, UserRound } from 'lucide-react';
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
  return user?.displayName || user?.username || 'Verse Heat user';
}

function Avatar({ user, size = 'lg' }) {
  const name = displayName(user);
  const classes = size === 'sm' ? 'h-9 w-9 text-sm' : 'h-16 w-16 text-2xl';

  if (user?.profilePicture) {
    return <img src={user.profilePicture} alt="" className={`${classes} rounded-lg object-cover shadow-sm`} />;
  }

  return (
    <div className={`${classes} flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-emerald-600 font-extrabold text-white shadow-sm`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
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

function percent(value, total) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function activeDayGrid(activeDays) {
  const activeSet = new Set(activeDays || []);
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (13 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString([], { weekday: 'short' }),
      active: activeSet.has(key),
    };
  });
}

function bookPieBackground(books) {
  const safeBooks = Array.isArray(books) ? books.slice(0, 8) : [];
  const total = safeBooks.reduce((sum, book) => sum + book.verseCount, 0);
  const colors = ['#059669', '#f59e0b', '#7c3aed', '#dc2626', '#2563eb', '#0891b2', '#ca8a04', '#be185d'];

  if (!total) return '#e5e7eb';

  let cursor = 0;
  const slices = safeBooks.map((book, index) => {
    const start = cursor;
    cursor += (book.verseCount / total) * 100;
    return `${colors[index % colors.length]} ${start}% ${cursor}%`;
  });

  return `conic-gradient(${slices.join(', ')})`;
}

function MilestoneBar({ milestone }) {
  if (!milestone) {
    return (
      <div className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
        Every rating milestone is complete. Keep going.
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white/70 p-3 dark:bg-slate-950/40">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-slate-700 dark:text-slate-200">
        <span>Next goal: {milestone.target} verses rated</span>
        <span>{milestone.remaining} to go</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${milestone.progress}%` }} />
      </div>
    </div>
  );
}

function StatisticsDashboard({ isCurrentUser, statistics }) {
  const stats = statistics || {};
  const distribution = Array.isArray(stats.ratingDistribution) ? stats.ratingDistribution : [];
  const books = Array.isArray(stats.versesRatedPerBook) ? stats.versesRatedPerBook : [];
  const maxDistribution = Math.max(1, ...distribution.map((item) => item.count));
  const activeDays = activeDayGrid(stats.activeDays);

  return (
    <section className="space-y-4">
      <div className="app-card overflow-hidden bg-gradient-to-r from-emerald-50 via-white to-purple-50 p-4 dark:from-emerald-950/50 dark:via-slate-950/80 dark:to-purple-950/50">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="inline-flex items-center gap-2 text-xl font-extrabold text-slate-950 dark:text-amber-50">
              <BarChart3 size={20} className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              {isCurrentUser ? 'Your Statistics' : 'Statistics'}
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
              {stats.totalVersesRated ? 'Great job. Keep building your Scripture heat map.' : 'Start rating verses to unlock statistics and achievements.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-extrabold text-emerald-800 dark:bg-slate-950/50 dark:text-emerald-100">
            <Target size={16} aria-hidden="true" />
            {stats.nextMilestone ? `${stats.nextMilestone.remaining} ratings to ${stats.nextMilestone.target}` : 'Milestones complete'}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BookOpen} label="Verses rated" value={stats.totalVersesRated || 0} />
          <StatCard icon={Star} label="Average rating" value={stats.averageRatingGiven ? `${Number(stats.averageRatingGiven).toFixed(1)}/10` : '--'} />
          <StatCard icon={Layers3} label="Books touched" value={stats.totalBooksTouched || 0} />
          <StatCard icon={Flame} label="Day streak" value={stats.streak || 0} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="app-card p-4">
          <h4 className="mb-4 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <BarChart3 size={18} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />
            Rating Distribution
          </h4>
          <div className="flex h-56 items-end gap-2">
            {distribution.map((item) => (
              <div key={item.score} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-44 w-full items-end rounded-lg bg-slate-100 dark:bg-slate-900">
                  <div
                    className="w-full rounded-lg bg-gradient-to-t from-purple-700 to-amber-400 transition-all"
                    style={{ height: `${Math.max(6, percent(item.count, maxDistribution))}%` }}
                    title={`${item.count} ratings of ${item.score}`}
                  />
                </div>
                <div className="text-xs font-extrabold text-slate-600 dark:text-slate-300">{item.score}</div>
                <div className="text-xs font-bold text-slate-400">{item.count}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="app-card p-4">
          <h4 className="mb-4 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <PieChart size={18} className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
            Books Rated
          </h4>
          <div className="mx-auto h-40 w-40 rounded-full border-8 border-white shadow-inner dark:border-slate-900" style={{ background: bookPieBackground(books) }} />
          <div className="mt-4 space-y-2">
            {books.slice(0, 5).map((book) => (
              <div key={book.bookId} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-slate-700 dark:text-slate-200">{book.bookName}</span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">{book.verseCount}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="app-card p-4">
          <h4 className="mb-3 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <CalendarDays size={18} className="text-purple-700 dark:text-purple-300" aria-hidden="true" />
            Active Days
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {activeDays.map((day) => (
              <div key={day.key} className={`h-10 rounded-lg border text-center text-[10px] font-bold leading-10 ${
                day.active
                  ? 'border-emerald-300 bg-emerald-500 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900'
              }`}>
                {day.label.slice(0, 1)}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {stats.streak || 0} consecutive active days.
          </p>
        </section>

        <section className="app-card p-4">
          <h4 className="mb-3 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <Award size={18} className="text-amber-600 dark:text-amber-300" aria-hidden="true" />
            Achievements
          </h4>
          <div className="flex flex-wrap gap-2">
            {stats.achievements?.length > 0 ? stats.achievements.map((badge) => (
              <span key={badge.id} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-800 dark:border-amber-300/30 dark:bg-amber-950/40 dark:text-amber-100" title={badge.description}>
                {badge.label}
              </span>
            )) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Rate 10 verses to unlock the first badge.</p>
            )}
          </div>
          <div className="mt-3">
            <MilestoneBar milestone={stats.nextMilestone} />
          </div>
        </section>

        <section className="app-card p-4">
          <h4 className="mb-3 inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50">
            <Heart size={18} className="text-red-600 dark:text-red-300" aria-hidden="true" />
            Focus
          </h4>
          <div className="space-y-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <p>Favorite Book: <span className="font-extrabold text-slate-950 dark:text-amber-50">{stats.favoriteBook?.bookName || '--'}</span>{stats.favoriteBook ? ` (${stats.favoriteBook.verseCount})` : ''}</p>
            <p>Most Common Struggle: <span className="font-extrabold text-slate-950 dark:text-amber-50">{stats.mostRatedStruggleCategory?.category || '--'}</span></p>
            <p>{stats.nextStreakMilestone ? `${stats.nextStreakMilestone.remaining} active days to a ${stats.nextStreakMilestone.target} day streak.` : 'Every streak milestone is complete.'}</p>
          </div>
        </section>
      </div>
    </section>
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

export function UserProfile({ currentUser, onBackHome, onNavigate, onProfileUpdate, onAuthRequired }) {
  const userId = window.location.pathname.split('/').filter(Boolean)[1];
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [ratingsPage, setRatingsPage] = useState(1);
  const [ratingsTotal, setRatingsTotal] = useState(0);
  const [statistics, setStatistics] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', displayName: '', bio: '', profilePicture: '' });
  const [selectedCollectionId, setSelectedCollectionId] = useState(() => new window.URLSearchParams(window.location.search).get('collection') || '');
  const [status, setStatus] = useState('');
  const pageSize = 12;

  const loadProfile = useCallback(async () => {
    try {
      const data = await api(`/api/users/${userId}`);
      setProfile(data);
      setEditForm({
        username: data.user?.username || '',
        displayName: data.user?.displayName || '',
        bio: data.user?.bio || '',
        profilePicture: data.user?.profilePicture || '',
      });
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

  const loadStatistics = useCallback(async () => {
    try {
      const data = await api(`/api/users/${userId}/statistics`);
      setStatistics(data.statistics);
    } catch (error) {
      setStatistics(null);
      setStatus(error.message);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
    loadRatings(1);
    loadStatistics();
  }, [loadProfile, loadRatings, loadStatistics]);

  const selectedCollection = useMemo(() => (
    profile?.collections?.find((collection) => collection.id === selectedCollectionId)
  ), [profile?.collections, selectedCollectionId]);

  function selectCollection(collectionId) {
    setSelectedCollectionId(collectionId);
    onNavigate(`/profile/${userId}?collection=${collectionId}`);
  }

  async function toggleFollow() {
    if (!currentUser) {
      onAuthRequired?.();
      return;
    }

    const method = profile?.follow?.isFollowing ? 'DELETE' : 'POST';
    try {
      const data = await api(`/api/users/${userId}/follow`, { method });
      setProfile((value) => value ? { ...value, follow: data.follow } : value);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function submitProfile(event) {
    event.preventDefault();

    try {
      const user = await onProfileUpdate({
        username: editForm.username,
        displayName: editForm.displayName || null,
        bio: editForm.bio || null,
        profilePicture: editForm.profilePicture || null,
      });
      setProfile((value) => value ? { ...value, user } : value);
      setEditing(false);
      setStatus('Profile updated');
    } catch (error) {
      setStatus(error.message);
    }
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
  const follow = profile?.follow || {};

  return (
    <section className="space-y-4">
      <button type="button" className="btn-soft" onClick={onBackHome}>
        <ArrowLeft size={16} aria-hidden="true" />
        Home
      </button>

      <div className="app-card overflow-hidden bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-5 dark:from-indigo-950/80 dark:via-slate-950/80 dark:to-emerald-950/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-4">
            <Avatar user={profile?.user} />
            <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-extrabold uppercase text-purple-800 dark:border-purple-300/30 dark:bg-purple-950/40 dark:text-purple-100">
              <UserRound size={14} aria-hidden="true" />
              {isCurrentUser ? 'Your public profile' : 'Public profile'}
            </div>
            <h2 className="section-heading text-3xl font-extrabold tracking-normal">{displayName(profile?.user)}</h2>
            {profile?.user?.username && <p className="text-sm font-bold text-purple-700 dark:text-purple-200">@{profile.user.username}</p>}
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{ratedSummary}</p>
            {profile?.user?.bio && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.user.bio}</p>}
            </div>
          </div>
          <div className="space-y-2 md:text-right">
            <div className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
              <CalendarDays size={16} aria-hidden="true" />
              Joined {formatDate(profile?.user?.createdAt)}
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className="rounded-lg bg-white/80 px-3 py-2 text-sm font-extrabold text-slate-700 dark:bg-slate-950/50 dark:text-amber-50">{follow.followerCount || 0} followers</span>
              <span className="rounded-lg bg-white/80 px-3 py-2 text-sm font-extrabold text-slate-700 dark:bg-slate-950/50 dark:text-amber-50">{follow.followingCount || 0} following</span>
            </div>
            {isCurrentUser ? (
              <button type="button" className="btn-soft" onClick={() => setEditing((value) => !value)}>
                <Edit3 size={16} aria-hidden="true" />
                Edit Profile
              </button>
            ) : (
              <button type="button" className={follow.isFollowing ? 'btn-soft' : 'btn-primary'} onClick={toggleFollow}>
                {follow.isFollowing ? <UserCheck size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
                {follow.isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>
      </div>

      {status && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-950/40 dark:text-emerald-100">{status}</p>}

      {isCurrentUser && editing && (
        <form onSubmit={submitProfile} className="app-card grid gap-3 p-4 md:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Username
            <input className="app-input mt-1 w-full px-3 py-2" pattern="[A-Za-z0-9_-]{3,32}" value={editForm.username} onChange={(event) => setEditForm({ ...editForm, username: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Display name
            <input className="app-input mt-1 w-full px-3 py-2" value={editForm.displayName} onChange={(event) => setEditForm({ ...editForm, displayName: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
            Bio
            <textarea className="app-input mt-1 min-h-24 w-full px-3 py-2" maxLength={180} value={editForm.bio} onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })} />
          </label>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 md:col-span-2">
            Profile picture URL
            <input className="app-input mt-1 w-full px-3 py-2" type="url" value={editForm.profilePicture} onChange={(event) => setEditForm({ ...editForm, profilePicture: event.target.value })} />
          </label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="btn-primary">Save Profile</button>
            <button type="button" className="btn-soft" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Verses rated" value={stats.totalVersesRated || 0} />
        <StatCard icon={Layers3} label="Books covered" value={stats.bookCount || 0} />
        <StatCard icon={Star} label="Avg rating" value={stats.averageRatingGiven ? Number(stats.averageRatingGiven).toFixed(1) : '--'} />
        <StatCard icon={Heart} label="Favorite book" value={stats.favoriteBook?.bookName || '--'} />
      </div>

      <StatisticsDashboard isCurrentUser={isCurrentUser} statistics={statistics} />

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
