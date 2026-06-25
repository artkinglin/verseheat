import { CalendarDays, Search, UserCheck, UserPlus, UsersRound } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const userCache = new Map();
const cacheTtl = 3 * 60 * 1000;
const sortOptions = [
  { id: 'verses_rated', label: 'Most Verses Rated' },
  { id: 'followers', label: 'Most Followers' },
  { id: 'recent', label: 'Recently Joined' },
];

function cacheKey({ search, sort, page, limit }) {
  return JSON.stringify({ search: search.trim().toLowerCase(), sort, page, limit });
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function displayName(user) {
  return user.displayName || user.username || 'Verse Heat user';
}

function UserAvatar({ user }) {
  const name = displayName(user);

  if (user.profilePicture) {
    return <img src={user.profilePicture} alt="" className="h-12 w-12 rounded-lg object-cover" />;
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-emerald-600 text-lg font-extrabold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

export function DiscoverUsers({ user, onAuthRequired, onNavigate }) {
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('verses_rated');
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const pageSize = 20;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  const loadUsers = useCallback(async ({ nextPage = 1, append = false } = {}) => {
    const request = { search, sort, page: nextPage, limit: pageSize };
    const key = cacheKey(request);
    const cached = userCache.get(key);

    if (cached && Date.now() - cached.createdAt < cacheTtl) {
      setUsers((current) => (append ? [...current, ...cached.data.users] : cached.data.users));
      setTotal(cached.data.total || 0);
      setPage(nextPage);
      setStatus('');
      return;
    }

    setLoading(true);
    try {
      const params = new window.URLSearchParams({
        sort,
        page: String(nextPage),
        limit: String(pageSize),
      });
      if (search) params.set('search', search);

      const data = await api(`/api/users?${params.toString()}`);
      const nextUsers = Array.isArray(data.users) ? data.users : [];
      userCache.set(key, { createdAt: Date.now(), data: { users: nextUsers, total: data.total || 0 } });
      setUsers((current) => (append ? [...current, ...nextUsers] : nextUsers));
      setTotal(data.total || 0);
      setPage(nextPage);
      setStatus('');
    } catch (error) {
      setStatus(error.message);
      if (!append) setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, sort]);

  useEffect(() => {
    loadUsers({ nextPage: 1 });
  }, [loadUsers]);

  function submitSearch(event) {
    event.preventDefault();
    setSearch(searchText.trim());
  }

  function chooseSort(nextSort) {
    setSort(nextSort);
  }

  async function toggleFollow(targetUser) {
    if (!user) {
      onAuthRequired?.();
      return;
    }

    const method = targetUser.isFollowing ? 'DELETE' : 'POST';
    setUsers((current) => current.map((item) => (
      item.id === targetUser.id
        ? {
            ...item,
            isFollowing: !item.isFollowing,
            followerCount: Math.max(0, item.followerCount + (item.isFollowing ? -1 : 1)),
          }
        : item
    )));

    try {
      const data = await api(`/api/users/${targetUser.id}/follow`, { method });
      setUsers((current) => current.map((item) => (
        item.id === targetUser.id
          ? {
              ...item,
              isFollowing: Boolean(data.follow?.isFollowing),
              followerCount: data.follow?.followerCount ?? item.followerCount,
            }
          : item
      )));
      userCache.clear();
    } catch (error) {
      setStatus(error.message);
      setUsers((current) => current.map((item) => (
        item.id === targetUser.id
          ? {
              ...item,
              isFollowing: targetUser.isFollowing,
              followerCount: targetUser.followerCount,
            }
          : item
      )));
    }
  }

  return (
    <section className="space-y-4">
      <div className="app-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold uppercase text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-950/40 dark:text-emerald-100">
              <UsersRound size={14} aria-hidden="true" />
              Community
            </div>
            <h2 className="section-heading text-2xl font-extrabold sm:text-3xl">Discover Users</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Find active readers, visit profiles, and follow their Scripture activity.</p>
          </div>
          <form onSubmit={submitSearch} className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-md">
            <label className="relative flex-1">
              <span className="sr-only">Search username</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                className="app-input w-full py-2 pl-9 pr-3 text-sm"
                placeholder="Search username"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </label>
            <button type="submit" className="btn-primary">Search</button>
          </form>
        </div>
      </div>

      <div className="app-card flex flex-wrap gap-2 p-2" aria-label="Sort users">
        {sortOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => chooseSort(option.id)}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
              sort === option.id
                ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white dark:from-amber-400 dark:to-emerald-500 dark:text-slate-950'
                : 'text-slate-600 hover:bg-amber-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-amber-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {status && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">{status}</div>}

      {loading && users.length === 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="app-card h-44 animate-pulse bg-white/70 dark:bg-slate-950/60" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {users.length === 0 && (
            <div className="app-card p-5 text-sm font-semibold text-slate-600 dark:text-slate-300 md:col-span-2 xl:col-span-3">No users found.</div>
          )}
          {users.map((item) => (
            <article key={item.id} className="app-card flex flex-col gap-4 p-4 transition hover:-translate-y-px hover:shadow-md">
              <button type="button" onClick={() => onNavigate(`/profile/${item.id}`)} className="flex min-w-0 gap-3 text-left">
                <UserAvatar user={item} />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-extrabold text-slate-950 dark:text-amber-50">{displayName(item)}</h3>
                  <p className="truncate text-sm font-bold text-purple-700 dark:text-purple-200">@{item.username}</p>
                  <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <CalendarDays size={13} aria-hidden="true" />
                    Joined {formatDate(item.createdAt)}
                  </div>
                </div>
              </button>

              <p className="min-h-10 text-sm leading-5 text-slate-600 dark:text-slate-300">
                {item.bio || 'No bio yet.'}
              </p>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-indigo-950/40">
                  <div className="font-extrabold text-slate-950 dark:text-amber-50">{item.versesRated}</div>
                  <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Verses rated</div>
                </div>
                <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/30">
                  <div className="font-extrabold text-slate-950 dark:text-amber-50">{item.followerCount}</div>
                  <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Followers</div>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="button" className="btn-soft flex-1" onClick={() => onNavigate(`/profile/${item.id}`)}>View Profile</button>
                <button type="button" className={item.isFollowing ? 'btn-soft flex-1' : 'btn-primary flex-1'} onClick={() => toggleFollow(item)}>
                  {item.isFollowing ? <UserCheck size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
                  {item.isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {users.length > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <span>Showing {users.length} of {total}</span>
          <button type="button" className="btn-soft" disabled={loading || page >= totalPages} onClick={() => loadUsers({ nextPage: page + 1, append: true })}>
            {loading ? 'Loading...' : page >= totalPages ? 'All users loaded' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
}
