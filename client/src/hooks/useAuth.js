import { useEffect, useState } from 'react';
import { api, clearSession, getSavedUser, getToken, saveSession } from '../api.js';

export function useAuth() {
  const [user, setUser] = useState(getSavedUser);
  const [authLoading, setAuthLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;

    api('/api/auth/me')
      .then(({ user: freshUser }) => {
        localStorage.setItem('verseHeatUser', JSON.stringify(freshUser));
        setUser(freshUser);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  async function signup(payload) {
    const session = await api('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    saveSession(session);
    setUser(session.user);
  }

  async function login(payload) {
    const session = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    saveSession(session);
    setUser(session.user);
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return { user, authLoading, signup, login, logout };
}
