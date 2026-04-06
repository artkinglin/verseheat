import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export function useStreak(user) {
  const [streak, setStreak] = useState(null);
  const [streakLoading, setStreakLoading] = useState(false);
  const [streakError, setStreakError] = useState('');

  const refreshStreak = useCallback(async () => {
    if (!user) {
      setStreak(null);
      setStreakError('');
      setStreakLoading(false);
      return null;
    }

    setStreakLoading(true);
    try {
      const data = await api('/api/streak/me');
      setStreak(data.streak);
      setStreakError('');
      return data.streak;
    } catch (error) {
      setStreak(null);
      setStreakError(error.message);
      return null;
    } finally {
      setStreakLoading(false);
    }
  }, [user]);

  const restoreStreak = useCallback(async () => {
    if (!user) return null;

    setStreakLoading(true);
    try {
      const data = await api('/api/streak/restore', { method: 'POST' });
      setStreak(data.streak);
      setStreakError('');
      return data.streak;
    } catch (error) {
      setStreakError(error.message);
      throw error;
    } finally {
      setStreakLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshStreak();
  }, [refreshStreak]);

  return {
    streak,
    streakLoading,
    streakError,
    refreshStreak,
    restoreStreak,
  };
}
