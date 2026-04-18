import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Bell, Compass, Download, Flame, Grid3X3, Search, Share2, UserPlus, UserRoundCheck, UsersRound } from 'lucide-react';
import { api, apiUrl } from './api.js';
import { AuthModal } from './components/AuthModal.jsx';
import { BibleBrowser } from './components/BibleBrowser.jsx';
import { CompletionDashboard } from './components/CompletionDashboard.jsx';
import { DailyMissionCard } from './components/DailyMissionCard.jsx';
import { DiscoverUsers } from './components/DiscoverUsers.jsx';
import { Header } from './components/Header.jsx';
import { InsightPanels } from './components/InsightPanels.jsx';
import { SearchPanel } from './components/SearchPanel.jsx';
import { StreakCard } from './components/StreakCard.jsx';
import { UserProfile } from './components/UserProfile.jsx';
import { VerseOfDay } from './components/VerseOfDay.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useCompletion } from './hooks/useCompletion.js';
import { useDailyMission } from './hooks/useDailyMission.js';
import { useStreak } from './hooks/useStreak.js';

const tabs = [
  { id: 'heat', label: 'My heat map', icon: UserRoundCheck },
  { id: 'global', label: 'Global ratings', icon: Grid3X3 },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'search', label: 'Search', icon: Search },
];

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function currentRoute() {
  const path = window.location.pathname;
  const profileMatch = path.match(/^\/profile\/([^/]+)/);
  const collectionMatch = path.match(/^\/collections\/([^/]+)/);
  if (path === '/discover' || path === '/users') return { name: 'discover' };
  if (path === '/following') return { name: 'following' };
  if (collectionMatch) return { name: 'collection', collectionId: collectionMatch[1] };
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

function FollowingFeed({ user, onAuthOpen, onNavigate, onOpenReference }) {
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
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <span>Rated {item.bookName} {item.chapter}:{item.verse} <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{item.score}/10</span>{item.favorite ? ' and marked it favorite' : ''}</span>
                    <button type="button" className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100" onClick={() => onOpenReference({
                      bookId: item.bookId,
                      bookName: item.bookName,
                      chapter: item.chapter,
                      verse: item.verse,
                    })}>
                      Open verse
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Created collection <button type="button" onClick={() => onNavigate(`/collections/${item.collectionId}`)} className="font-extrabold text-slate-950 underline decoration-amber-400 underline-offset-4 dark:text-amber-50">{item.collectionName}</button>
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

function RecommendationQueue({ user, onAuthRequired, onOpenReference }) {
  const [recommendations, setRecommendations] = useState([]);
  const [status, setStatus] = useState('');

  const loadRecommendations = useCallback(async () => {
    if (!user) {
      setRecommendations([]);
      return;
    }

    try {
      const data = await api('/api/ratings/recommendations');
      setRecommendations(arrayOrEmpty(data.recommendations));
      setStatus('');
    } catch (error) {
      setRecommendations([]);
      setStatus(error.message);
    }
  }, [user]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  if (!user) {
    return (
      <section className="app-card p-4">
        <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50"><Compass size={18} aria-hidden="true" /> Rate Next</h3>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">Sign in to get a personalized queue.</p>
        <button type="button" className="btn-primary mt-3" onClick={onAuthRequired}>Sign in</button>
      </section>
    );
  }

  return (
    <section className="app-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50"><Compass size={18} aria-hidden="true" /> Rate Next</h3>
        <button type="button" className="btn-soft px-2 py-1 text-xs" onClick={loadRecommendations}>Refresh</button>
      </div>
      {status && <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-200">{status}</p>}
      <div className="grid gap-2 md:grid-cols-3">
        {recommendations.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Rate a few verses to unlock suggestions.</p>}
        {recommendations.slice(0, 6).map((item) => (
          <button
            key={`${item.bookId}-${item.chapter}-${item.verse}`}
            type="button"
            className="rounded-lg border border-amber-100 bg-white/80 px-3 py-2 text-left text-sm transition hover:-translate-y-px hover:bg-amber-50 dark:border-indigo-400/20 dark:bg-slate-950/50 dark:hover:bg-indigo-950/50"
            onClick={() => onOpenReference(item)}
          >
            <span className="block font-extrabold text-slate-950 dark:text-amber-50">{item.bookName} {item.chapter}:{item.verse}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.reason === 'focus' ? 'Based on your focus' : 'Community favorite'}{item.averageRating ? ` - ${Number(item.averageRating).toFixed(1)}/10` : ''}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ReminderCard({ user, onAuthRequired }) {
  const [reminder, setReminder] = useState({ enabled: false, time: '08:00', timezone: 'local' });
  const [status, setStatus] = useState('');

  useEffect(() => {
    let ignore = false;
    if (!user) return;
    api('/api/users/me/reminders')
      .then((data) => {
        if (!ignore) setReminder(data.reminder);
      })
      .catch((error) => {
        if (!ignore) setStatus(error.message);
      });
    return () => {
      ignore = true;
    };
  }, [user]);

  async function save(nextReminder) {
    if (!user) {
      onAuthRequired();
      return;
    }

    setReminder(nextReminder);
    try {
      const data = await api('/api/users/me/reminders', {
        method: 'PATCH',
        body: JSON.stringify(nextReminder),
      });
      setReminder(data.reminder);
      setStatus('Reminder saved');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <section className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="inline-flex items-center gap-2 text-lg font-extrabold text-slate-950 dark:text-amber-50"><Bell size={18} aria-hidden="true" /> Daily Reminder</h3>
        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{user ? (reminder.enabled ? `On at ${reminder.time}` : 'Off') : 'Sign in to set a daily prompt.'}</p>
        {status && <p className="mt-1 text-xs font-bold text-emerald-700 dark:text-emerald-200">{status}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="time"
          className="app-input px-3 py-2 text-sm"
          value={reminder.time}
          disabled={!user}
          onChange={(event) => save({ ...reminder, time: event.target.value })}
        />
        <button type="button" className={reminder.enabled ? 'btn-soft' : 'btn-primary'} onClick={() => save({ ...reminder, enabled: !reminder.enabled })}>
          {reminder.enabled ? 'Turn off' : 'Turn on'}
        </button>
      </div>
    </section>
  );
}

function PublicCollectionPage({ collectionId, onNavigate }) {
  const [collection, setCollection] = useState(null);
  const [status, setStatus] = useState('Loading collection...');

  useEffect(() => {
    let ignore = false;
    api(`/api/collections/public/${collectionId}`)
      .then((data) => {
        if (!ignore) {
          setCollection(data.collection);
          setStatus('');
        }
      })
      .catch((error) => {
        if (!ignore) {
          setCollection(null);
          setStatus(error.message);
        }
      });
    return () => {
      ignore = true;
    };
  }, [collectionId]);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: collection?.name || 'Verse Heat collection', url });
    } else {
      await navigator.clipboard.writeText(url);
      setStatus('Share link copied');
    }
  }

  return (
    <section className="space-y-4">
      <button type="button" className="btn-soft" onClick={() => onNavigate('/')}>Home</button>
      {status && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 dark:border-amber-300/30 dark:bg-amber-950/40 dark:text-amber-100">{status}</p>}
      {collection && (
        <div className="app-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="section-heading text-3xl font-extrabold">{collection.name}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{collection.verseCount} verses by @{collection.owner?.username}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-soft" onClick={share}><Share2 size={16} aria-hidden="true" /> Share</button>
              {['txt', 'md', 'csv'].map((format) => (
                <a key={format} className="btn-soft" href={apiUrl(`/api/collections/public/${collection.id}/export?format=${format}`)} download>
                  <Download size={16} aria-hidden="true" />
                  {format.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {collection.verses.map((verse) => (
              <article key={verse.id} className="rounded-lg border border-emerald-100 bg-white/85 p-3 text-sm shadow-sm dark:border-emerald-400/20 dark:bg-slate-950/60">
                <h3 className="font-extrabold text-slate-950 dark:text-amber-50">{verse.bookName} {verse.chapter}:{verse.verse}</h3>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{verse.averageRating ? `Community ${Number(verse.averageRating).toFixed(1)}/10 from ${verse.ratingCount}` : 'Community unrated'}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const { user, signup, login, logout, updateProfile } = useAuth();
  const { streak, streakLoading, streakError, refreshStreak, restoreStreak } = useStreak(user);
  const { mission, missionLoading, missionError, refreshMission } = useDailyMission(user);
  const { completion, completionLoading, completionError, refreshCompletion } = useCompletion(user);
  const [authOpen, setAuthOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('verseHeatDark') === 'true');
  const [activeTab, setActiveTab] = useState('heat');
  const [leaderboard, setLeaderboard] = useState([]);
  const [trending, setTrending] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [collections, setCollections] = useState([]);
  const [insightsError, setInsightsError] = useState('');
  const [missionFocusTheme, setMissionFocusTheme] = useState('');
  const [route, setRoute] = useState(() => currentRoute());
  const [jumpTarget, setJumpTarget] = useState(null);

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

  const refreshDailyProgress = useCallback(async () => {
    await Promise.all([
      refreshStreak(),
      refreshMission(),
      refreshCompletion(),
    ]);
  }, [refreshCompletion, refreshMission, refreshStreak]);

  function openMissionTarget() {
    setMissionFocusTheme(mission?.theme || '');
    navigate('/');
    setActiveTab('global');
  }

  function openReferenceTarget(reference) {
    setJumpTarget({ ...reference, requestedAt: Date.now() });
    setMissionFocusTheme('');
    navigate('/');
    setActiveTab('global');
  }

  async function clearRating(rating) {
    try {
      await api(`/api/ratings/verse/${rating.bookId}/${rating.chapter}/${rating.verse}`, {
        method: 'DELETE',
      });
      await Promise.all([
        refreshInsights(),
        refreshCompletion(),
      ]);
    } catch (error) {
      setInsightsError(error.message);
    }
  }

  async function createCollection(name, isPublic = true) {
    const data = await api('/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name, isPublic }),
    });
    await refreshCollections();
    return data.collection;
  }

  async function updateCollection(collectionId, updates) {
    const data = await api(`/api/collections/${collectionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
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
    await refreshMission();
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

        {route.name === 'home' && (
          <StreakCard
            error={streakError}
            loading={streakLoading}
            onAuthRequired={() => setAuthOpen(true)}
            onRestore={restoreStreak}
            streak={streak}
            user={user}
          />
        )}

        {route.name === 'home' && (
          <DailyMissionCard
            error={missionError}
            loading={missionLoading}
            mission={mission}
            onAction={openMissionTarget}
            onAuthRequired={() => setAuthOpen(true)}
            user={user}
          />
        )}

        {route.name === 'home' && (
          <CompletionDashboard
            completion={completion}
            error={completionError}
            loading={completionLoading}
            onAuthRequired={() => setAuthOpen(true)}
            user={user}
          />
        )}

        {route.name === 'home' && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <RecommendationQueue user={user} onAuthRequired={() => setAuthOpen(true)} onOpenReference={openReferenceTarget} />
            <ReminderCard user={user} onAuthRequired={() => setAuthOpen(true)} />
          </div>
        )}

        {route.name === 'home' && <VerseOfDay user={user} onAuthRequired={() => setAuthOpen(true)} onRatingSaved={refreshDailyProgress} />}

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
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-amber-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-indigo-950/60 dark:hover:text-amber-50"
          >
            <UsersRound size={16} aria-hidden="true" />
            Discover
          </button>
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
          <FollowingFeed user={user} onAuthOpen={() => setAuthOpen(true)} onNavigate={navigate} onOpenReference={openReferenceTarget} />
        )}

        {route.name === 'discover' && (
          <DiscoverUsers user={user} onAuthRequired={() => setAuthOpen(true)} onNavigate={navigate} />
        )}

        {route.name === 'collection' && (
          <PublicCollectionPage collectionId={route.collectionId} onNavigate={navigate} />
        )}

        {route.name === 'home' && activeTab === 'heat' && (
          <BibleBrowser
            user={user}
            collections={collections}
            focusStruggle={missionFocusTheme}
            heatmapMode="personal"
            jumpTarget={jumpTarget}
            onAddToCollection={addVerseToCollection}
            onAuthRequired={() => setAuthOpen(true)}
            onCreateCollection={createCollection}
            onRatingSaved={refreshDailyProgress}
            onRemoveFromCollection={removeVerseFromCollection}
          />
        )}
        {route.name === 'home' && activeTab === 'global' && (
          <BibleBrowser
            user={user}
            collections={collections}
            focusStruggle={missionFocusTheme}
            heatmapMode="global"
            jumpTarget={jumpTarget}
            onAddToCollection={addVerseToCollection}
            onAuthRequired={() => setAuthOpen(true)}
            onCreateCollection={createCollection}
            onRatingSaved={refreshDailyProgress}
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
              onUpdateCollection={updateCollection}
              myRatings={myRatings}
              trending={trending}
            />
          </>
        )}
        {route.name === 'home' && activeTab === 'search' && <SearchPanel onNavigate={navigate} onOpenReference={openReferenceTarget} user={user} />}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs font-medium text-slate-500 dark:text-slate-400 sm:px-6">
        ESV text is fetched from the ESV API and displayed with API-provided copyright text.
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLogin={login} onSignup={signup} />
    </div>
  );
}
