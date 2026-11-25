/**
 * useFetch Hook
 * Generic hook for executing async API calls with loading, error, refetch, and optimistic setData capabilities.
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export function useFetch(fetchFn, deps = [], options = {}) {
  const { initialData = null, lazy = false, onSuccess, onError } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!lazy);
  const [error, setError] = useState(null);

  // Maintain reference to prevent state update on unmounted component
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFn(...args);
        if (isMountedRef.current) {
          setData(result);
          if (onSuccess) onSuccess(result);
        }
        return result;
      } catch (err) {
        if (isMountedRef.current) {
          setError(err);
          if (onError) onError(err);
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps
  );

  useEffect(() => {
    if (!lazy) {
      execute().catch(() => {
        // Error already captured in state
      });
    }
  }, [execute, lazy]);

  return {
    data,
    setData,
    loading,
    error,
    refetch: execute,
  };
}

export default useFetch;

