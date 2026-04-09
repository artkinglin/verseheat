import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export function useDailyMission(user) {
  const [mission, setMission] = useState(null);
  const [missionLoading, setMissionLoading] = useState(false);
  const [missionError, setMissionError] = useState('');

  const refreshMission = useCallback(async () => {
    if (!user) {
      setMission(null);
      setMissionError('');
      setMissionLoading(false);
      return null;
    }

    setMissionLoading(true);
    try {
      const data = await api('/api/missions/today');
      setMission(data.mission);
      setMissionError('');
      return data.mission;
    } catch (error) {
      setMission(null);
      setMissionError(error.message);
      return null;
    } finally {
      setMissionLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshMission();
  }, [refreshMission]);

  return {
    mission,
    missionLoading,
    missionError,
    refreshMission,
  };
}
