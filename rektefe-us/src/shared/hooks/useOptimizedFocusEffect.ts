/**
 * Optimized useFocusEffect hook with timestamp-based throttling
 * Prevents unnecessary API calls when screen is focused repeatedly
 */

import { useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

interface UseOptimizedFocusEffectOptions {
  /**
   * Minimum time in milliseconds between API calls
   * Default: 30000 (30 seconds)
   */
  throttleMs?: number;
  
  /**
   * Whether to fetch on initial focus
   * Default: true
   */
  fetchOnMount?: boolean;
}

/**
 * Optimized version of useFocusEffect that prevents duplicate API calls
 * within a specified time window
 */
export function useOptimizedFocusEffect(
  callback: () => void | Promise<void>,
  options: UseOptimizedFocusEffectOptions = {}
) {
  const { throttleMs = 30000, fetchOnMount = true } = options;
  const lastFetchTimeRef = useRef<number>(0);
  const isMountedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;

      // First mount - fetch if fetchOnMount is true
      if (!isMountedRef.current) {
        isMountedRef.current = true;
        if (fetchOnMount) {
          lastFetchTimeRef.current = now;
          callback();
        }
        return;
      }

      // Skip if called within throttle window
      if (timeSinceLastFetch < throttleMs) {
        return;
      }

      // Update timestamp and call callback
      lastFetchTimeRef.current = now;
      callback();
    }, [callback, throttleMs, fetchOnMount])
  );
}

