import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Flame, Grid3X3, Search, UserPlus } from 'lucide-react';
import { api } from './api.js';
import { AuthModal } from './components/AuthModal.jsx';
import { BibleBrowser } from './components/BibleBrowser.jsx';
import { Header } from './components/Header.jsx';
import { InsightPanels } from './components/InsightPanels.jsx';
import { SearchPanel } from './components/SearchPanel.jsx';
import { useAuth } from './hooks/useAuth.js';

const tabs = [
  { id: 'heat', label: 'Heat map', icon: Grid3X3 },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'search', label: 'Search', icon: Search },
];

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

export default function App() {
  const { user, signup, login, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('verseHeatDark') === 'true');
  const [activeTab, setActiveTab] = useState('heat');
  const [leaderboard, setLeaderboard] = useState([]);
  const [trending, setTrending] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [collections, setCollections] = useState([]);
  const [insightsError, setInsightsError] = useState('');

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

        <nav className="app-card flex gap-2 overflow-x-auto p-1.5" aria-label="App sections">
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
        </nav>

        {activeTab === 'heat' && (
          <BibleBrowser
            user={user}
            collections={collections}
            onAddToCollection={addVerseToCollection}
            onAuthRequired={() => setAuthOpen(true)}
            onCreateCollection={createCollection}
            onRemoveFromCollection={removeVerseFromCollection}
          />
        )}
        {activeTab === 'insights' && (
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
              onRemoveFromCollection={removeVerseFromCollection}
              myRatings={myRatings}
              trending={trending}
            />
          </>
        )}
        {activeTab === 'search' && <SearchPanel />}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs font-medium text-slate-500 dark:text-slate-400 sm:px-6">
        ESV text is fetched from the ESV API and displayed with API-provided copyright text.
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLogin={login} onSignup={signup} />
    </div>
  );
}
