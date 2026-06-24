import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Grid3X3, Search } from 'lucide-react';
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

export default function App() {
  const { user, signup, login, logout } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('verseHeatDark') === 'true');
  const [activeTab, setActiveTab] = useState('heat');
  const [leaderboard, setLeaderboard] = useState([]);
  const [trending, setTrending] = useState([]);
  const [myRatings, setMyRatings] = useState([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('verseHeatDark', String(darkMode));
  }, [darkMode]);

  const refreshInsights = useCallback(async () => {
    const [leaderboardData, trendingData] = await Promise.all([
      api('/api/ratings/leaderboard'),
      api('/api/ratings/trending'),
    ]);
    setLeaderboard(leaderboardData.leaderboard);
    setTrending(trendingData.trending);

    if (user) {
      const mine = await api('/api/ratings/mine');
      setMyRatings(mine.ratings);
    } else {
      setMyRatings([]);
    }
  }, [user]);

  useEffect(() => {
    refreshInsights();
  }, [refreshInsights]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <Header
        user={user}
        onAuthOpen={() => setAuthOpen(true)}
        onLogout={logout}
        darkMode={darkMode}
        onDarkModeToggle={() => setDarkMode((value) => !value)}
      />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6">
        <div className="grid gap-4 rounded border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">Verse Heat</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              A community heat map for ESV chapter and verse ratings, with duplicate ratings limited to one per user per reference.
            </p>
          </div>
          {!user && (
            <button type="button" onClick={() => setAuthOpen(true)} className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
              Create account
            </button>
          )}
        </div>

        <nav className="flex gap-2 overflow-x-auto rounded border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900" aria-label="App sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded px-3 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === 'heat' && <BibleBrowser user={user} onAuthRequired={() => setAuthOpen(true)} />}
        {activeTab === 'insights' && <InsightPanels leaderboard={leaderboard} trending={trending} myRatings={myRatings} />}
        {activeTab === 'search' && <SearchPanel />}
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs text-slate-500 dark:text-slate-400 sm:px-6">
        ESV text is fetched from the ESV API and displayed with API-provided copyright text.
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onLogin={login} onSignup={signup} />
    </div>
  );
}
