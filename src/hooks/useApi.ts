/**
 * Custom hooks for API operations with loading states and error handling
 * Provides consistent patterns for data fetching across the application
 */

import { useState, useEffect, useCallback } from 'react';
import { ApiError } from '../services/api';
import { ApiResponse, PaginatedResponse, SearchFilters } from '../types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UsePaginatedApiState<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  setPage: (page: number) => void;
  setFilters: (filters: SearchFilters) => void;
}

/**
 * Hook for single API calls
 */
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = []
): UseApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      setData(response.data);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'An error occurred';
      setError(errorMessage);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for paginated API calls
 */
export function usePaginatedApi<T>(
  apiCall: (filters: SearchFilters) => Promise<PaginatedResponse<T>>,
  initialFilters: SearchFilters = {}
): UsePaginatedApiState<T> {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<SearchFilters>(initialFilters);

  const fetchData = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentFilters = { ...filters, page: pageNum, limit };
      const response = await apiCall(currentFilters);
      
      if (append) {
        setData(prev => [...prev, ...response.data]);
      } else {
        setData(response.data);
      }
      
      setTotal(response.total);
      setHasMore(response.hasMore);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'An error occurred';
      setError(errorMessage);
      if (!append) {
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  }, [apiCall, filters, limit]);

  useEffect(() => {
    fetchData(1, false);
  }, [fetchData]);

  const setPage = useCallback((pageNum: number) => {
    setPageState(pageNum);
    fetchData(pageNum, false);
  }, [fetchData]);

  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFiltersState(newFilters);
    setPageState(1);
  }, []);

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPageState(nextPage);
      await fetchData(nextPage, true);
    }
  }, [hasMore, loading, page, fetchData]);

  return {
    data,
    total,
    page,
    limit,
    hasMore,
    loading,
    error,
    refetch: () => fetchData(1, false),
    loadMore,
    setPage,
    setFilters,
  };
}

/**
 * Hook for form submissions with loading and error states
 */
export function useFormSubmission<T, R>(
  submitFn: (data: T) => Promise<R>,
  onSuccess?: (result: R) => void,
  onError?: (error: string) => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (data: T) => {
    try {
      setLoading(true);
      setError(null);
      const result = await submitFn(data);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Submission failed';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [submitFn, onSuccess, onError]);

  return {
    submit,
    loading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for real-time data updates
 */
export function useRealtimeSubscription<T>(
  table: string,
  filter?: Record<string, any>,
  onUpdate?: (payload: any) => void
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let subscription: any;

    const setupSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initial data fetch
        const { data: initialData, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .match(filter || {});

        if (fetchError) throw fetchError;
        setData(initialData || []);

        // Set up real-time subscription
        subscription = supabase
          .channel(`${table}_changes`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: table,
            filter: filter ? Object.entries(filter).map(([key, value]) => `${key}=eq.${value}`).join(',') : undefined,
          }, (payload) => {
            onUpdate?.(payload);
            
            // Update local state based on event type
            setData(prev => {
              switch (payload.eventType) {
                case 'INSERT':
                  return [...prev, payload.new as T];
                case 'UPDATE':
                  return prev.map(item => 
                    (item as any).id === payload.new.id ? payload.new as T : item
                  );
                case 'DELETE':
                  return prev.filter(item => (item as any).id !== payload.old.id);
                default:
                  return prev;
              }
            });
          })
          .subscribe();

        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Subscription failed';
        setError(errorMessage);
        setLoading(false);
      }
    };

    setupSubscription();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [table, JSON.stringify(filter), onUpdate]);

  return {
    data,
    loading,
    error,
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticUpdate<T>(
  updateFn: (id: string, data: Partial<T>) => Promise<T>,
  onSuccess?: (result: T) => void,
  onError?: (error: string) => void
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(async (id: string, data: Partial<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await updateFn(id, data);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Update failed';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateFn, onSuccess, onError]);

  return {
    update,
    loading,
    error,
    clearError: () => setError(null),
  };
}

// Import supabase for real-time subscriptions
import { supabase } from '@/lib/supabase';
