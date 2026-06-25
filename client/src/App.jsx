import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Flame, Grid3X3, Search, UserPlus } from 'lucide-react';
import { api } from './api.js';
import { AuthModal } from './components/AuthModal.jsx';
import { BibleBrowser } from './components/BibleBrowser.jsx';
import { Header } from './components/Header.jsx';
import { InsightPanels } from './components/InsightPanels.jsx';
import { SearchPanel } from './components/SearchPanel.jsx';
import { UserProfile } from './components/UserProfile.jsx';
import { VerseOfDay } from './components/VerseOfDay.jsx';
import { useAuth } from './hooks/useAuth.js';

const tabs = [
  { id: 'heat', label: 'Heat map', icon: Grid3X3 },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'search', label: 'Search', icon: Search },
];

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function currentRoute() {
  const path = window.location.pathname;
  const profileMatch = path.match(/^\/profile\/([^/]+)/);
  if (path === '/following') return { name: 'following' };
  return profileMatch ? { name: 'profile', userId: profileMatch[1] } : { name: 'home' };
}

function FeedAvatar({ activity }) {
  const name = activity.userDisplayName || activity.username || 'User';

  if (activity.profilePicture) {
    return <img src={activity.profilePicture} alt="" className="h-10 w-10 rounded-lg object-cover" />;
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-emerald-600 text-sm font-extrabold text-white">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function FollowingFeed({ user, onAuthOpen, onNavigate }) {
  const [activity, setActivity] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const pageSize = 12;

  const loadFeed = useCallback(async (nextPage) => {
    if (!user) return;

    try {
      const data = await api(`/api/feed/following?page=${nextPage}&limit=${pageSize}`);
      setActivity(arrayOrEmpty(data.activity));
      setTotal(data.total || 0);
      setPage(nextPage);
      setStatus('');
    } catch (error) {
      setActivity([]);
      setStatus(error.message);
    }
  }, [user]);

  useEffect(() => {
    loadFeed(1);
  }, [loadFeed]);

  if (!user) {
    return (
      <section className="app-card p-6">
        <h2 className="section-heading text-2xl font-extrabold">Following Feed</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Sign in to follow users and see their activity.</p>
        <button type="button" className="btn-primary mt-4" onClick={onAuthOpen}>Sign in</button>
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-4">
      <div className="app-card p-5">
        <h2 className="section-heading text-2xl font-extrabold">Following Feed</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Recent ratings and collections from people you follow.</p>
      </div>
      {status && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">{status}</div>}
      <div className="space-y-3">
        {activity.length === 0 && !status && (
          <div className="app-card p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">Follow users from profiles to build your feed.</div>
        )}
        {activity.map((item) => {
          const name = item.userDisplayName || item.username || 'Verse Heat user';
          return (
            <article key={`${item.type}-${item.id}`} className="app-card flex gap-3 p-4">
              <button type="button" onClick={() => onNavigate(`/profile/${item.userId}`)} className="shrink-0" aria-label={`View ${name}'s profile`}>
                <FeedAvatar activity={item} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => onNavigate(`/profile/${item.userId}`)} className="text-left font-extrabold text-slate-950 hover:text-purple-700 dark:text-amber-50 dark:hover:text-amber-200">
                    {name}
                  </button>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                </div>
                {item.type === 'rating' ? (
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Rated {item.bookName} {item.chapter}:{item.verse} <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{item.score}/10</span>{item.favorite ? ' and marked it favorite' : ''}
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Created collection <span className="font-extrabold text-slate-950 dark:text-amber-50">{item.collectionName}</span>
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <button type="button" className="btn-soft" disabled={page <= 1} onClick={() => loadFeed(page - 1)}>Previous</button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" className="btn-soft" disabled={page >= totalPages} onClick={() => loadFeed(page + 1)}>See more</button>
      </div>
    </section>
  );
}

export default function App() {
  const { user, signup, login, logout, updateProfile } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('verseHeatDark') === 'true');
  const [activeTab, setActiveTab] = useState('heat');
  const [leaderboard, setLeaderboard] = useState([]);
  const [trending, setTrending] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [collections, setCollections] = useState([]);
  const [insightsError, setInsightsError] = useState('');
  const [route, setRoute] = useState(() => currentRoute());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('verseHeatDark', String(darkMode));
  }, [darkMode]);

  const refreshCollections = useCallback(async () => {
    if (!user) {
      setCollections([]);
      return [];
    }

    const data = await api('/api/collections');
    const nextCollections = arrayOrEmpty(data.collections);
    setCollections(nextCollections);
    return nextCollections;
  }, [user]);

  const refreshInsights = useCallback(async () => {
    try {
      const [leaderboardData, trendingData] = await Promise.all([
        api('/api/ratings/leaderboard'),
        api('/api/ratings/trending'),
      ]);
      setLeaderboard(arrayOrEmpty(leaderboardData.leaderboard));
      setTrending(arrayOrEmpty(trendingData.trending));
      setInsightsError('');

      if (user) {
        const [mine] = await Promise.all([
          api('/api/ratings/mine'),
          refreshCollections(),
        ]);
        setMyRatings(arrayOrEmpty(mine.ratings));
      } else {
        setMyRatings([]);
        setCollections([]);
      }
    } catch (error) {
      setLeaderboard([]);
      setTrending([]);
      setMyRatings([]);
      setCollections([]);
      setInsightsError(error.message);
    }
  }, [refreshCollections, user]);

  useEffect(() => {
    refreshCollections().catch(() => setCollections([]));
  }, [refreshCollections]);

  useEffect(() => {
    if (activeTab === 'insights') {
      refreshInsights();
    }
  }, [activeTab, refreshInsights]);

  useEffect(() => {
    const onPopState = () => setRoute(currentRoute());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(path) {
    window.history.pushState({}, '', path);
    setRoute(currentRoute());
  }

  async function clearRating(rating) {
    try {
      await api(`/api/ratings/verse/${rating.bookId}/${rating.chapter}/${rating.verse}`, {
        method: 'DELETE',
      });
      await refreshInsights();
    } catch (error) {
      setInsightsError(error.message);
    }
  }

  async function createCollection(name) {
    const data = await api('/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    await refreshCollections();
    return data.collection;
  }

  async function deleteCollection(collectionId) {
    await api(`/api/collections/${collectionId}`, { method: 'DELETE' });
    await refreshCollections();
  }

  async function addVerseToCollection(collectionId, verse) {
    await api(`/api/collections/${collectionId}/verses`, {
      method: 'POST',
      body: JSON.stringify({
        bookId: verse.bookId,
        chapter: verse.chapter,
        verse: verse.verse,
      }),
    });
    await refreshCollections();
  }

  async function removeVerseFromCollection(collectionId, verse) {
    await api(`/api/collections/${collectionId}/verses/${verse.bookId}/${verse.chapter}/${verse.verse}`, {
      method: 'DELETE',
    });
    await refreshCollections();
  }

  return (
    <div className="min-h-screen text-slate-950 dark:text-amber-50">
        <Header
          user={user}
          onAuthOpen={() => setAuthOpen(true)}
          onLogout={logout}
          onNavigate={navigate}
          darkMode={darkMode}
          onDarkModeToggle={() => setDarkMode((value) => !value)}
        />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <div className="app-card grid gap-4 overflow-hidden bg-gradient-to-r from-amber-50 via-white to-emerald-50 p-5 dark:from-indigo-950/80 dark:via-slate-950/80 dark:to-purple-950/70 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/70 px-3 py-1 text-xs font-bold uppercase text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200">
              <Flame size={14} aria-hidden="true" />
              Scripture heat map
            </div>
            <h2 className="section-heading text-3xl font-extrabold tracking-normal sm:text-4xl">Verse Heat</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              A community heat map for ESV verse ratings, with chapter and book heat calculated automatically.
            </p>
          </div>
          {!user && (
            <button type="button" onClick={() => setAuthOpen(true)} className="btn-primary">
              <UserPlus size={16} aria-hidden="true" />
              Create account
            </button>
          )}
        </div>

        {route.name === 'home' && <VerseOfDay user={user} onAuthRequired={() => setAuthOpen(true)} />}

        {route.name === 'home' && <nav className="app-card flex gap-2 overflow-x-auto p-1.5" aria-label="App sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-sm dark:from-amber-400 dark:to-emerald-500 dark:text-slate-950'
                    : 'text-slate-600 hover:bg-amber-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-amber-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
          {user && (
            <>
              <button
                type="button"
                onClick={() => navigate('/following')}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-amber-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-amber-50"
              >
                Following
              </button>
              <button
                type="button"
                onClick={() => navigate(`/profile/${user.id}`)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-amber-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-amber-50"
              >
                Your Profile
              </button>
            </>
          )}
        </nav>}

        {route.name === 'profile' && (
          <UserProfile
            currentUser={user}
            onBackHome={() => navigate('/')}
            onNavigate={navigate}
            onProfileUpdate={updateProfile}
            onAuthRequired={() => setAuthOpen(true)}
          />
        )}

        {route.name === 'following' && (
          <FollowingFeed user={user} onAuthOpen={() => setAuthOpen(true)} onNavigate={navigate} />
        )}

        {route.name === 'home' && activeTab === 'heat' && (
          <BibleBrowser
            user={user}
            collections={collections}
            onAddToCollection={addVerseToCollection}
            onAuthRequired={() => setAuthOpen(true)}
            onCreateCollection={createCollection}
            onRemoveFromCollection={removeVerseFromCollection}
          />
        )}
        {route.name === 'home' && activeTab === 'insights' && (
          <>
            {insightsError && (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                Insights are unavailable: {insightsError}
              </div>
            )}
            <InsightPanels
              collections={collections}
              leaderboard={leaderboard}
              onClearRating={clearRating}
              onCreateCollection={createCollection}
              onDeleteCollection={deleteCollection}
              onNavigate={navigate}
              onRemoveFromCollection={removeVerseFromCollection}
              myRatings={myRatings}
              trending={trending}
            />
          </>
        )}
        {route.name === 'home' && activeTab === 'search' && <SearchPanel onNavigate={navigate} user={user} />}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs font-medium text-slate-500 dark:text-slate-400 sm:px-6">
        ESV text is fetched from the ESV API and displayed with API-provided copyright text.
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLogin={login} onSignup={signup} />
    </div>
  );
}
