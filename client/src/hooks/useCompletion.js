import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export function useCompletion(user) {
  const [completion, setCompletion] = useState(null);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [completionError, setCompletionError] = useState('');

  const refreshCompletion = useCallback(async () => {
    if (!user) {
      setCompletion(null);
      setCompletionError('');
      setCompletionLoading(false);
      return null;
    }

    setCompletionLoading(true);
    try {
      const data = await api('/api/completion/me');
      setCompletion(data.completion);
      setCompletionError('');
      return data.completion;
    } catch (error) {
      setCompletion(null);
      setCompletionError(error.message);
      return null;
    } finally {
      setCompletionLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCompletion();
  }, [refreshCompletion]);

  return {
    completion,
    completionError,
    completionLoading,
    refreshCompletion,
  };
}
