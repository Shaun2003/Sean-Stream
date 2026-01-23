"use client";

import { useMemo, useCallback, useRef, useEffect } from "react";

/**
 * Custom hook to memoize expensive calculations and prevent unnecessary re-renders
 * Useful for components that receive complex objects as props
 */
export function useMemorizedValue<T>(value: T, compareFn?: (a: T, b: T) => boolean) {
  const prevRef = useRef<T>(value);
  const memoRef = useRef<T>(value);

  const isSame = compareFn
    ? compareFn(prevRef.current, value)
    : JSON.stringify(prevRef.current) === JSON.stringify(value);

  if (!isSame) {
    prevRef.current = value;
    memoRef.current = value;
  }

  return memoRef.current;
}

/**
 * Custom hook to debounce callback functions and prevent excessive updates
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;
}

/**
 * Custom hook to track if component is mounted
 * Prevents "Can't perform a React state update on an unmounted component" warnings
 */
export function useIsMounted() {
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return isMountedRef;
}

/**
 * Custom hook to optimize list rendering with virtualization-like approach
 * Only renders visible items to improve performance
 */
export function useVisibleItems<T>(items: T[], visibleCount: number = 20) {
  const [scrollIndex, setScrollIndex] = useMemo(() => [0, 0], []);

  return useMemo(() => {
    return items.slice(scrollIndex, scrollIndex + visibleCount);
  }, [items, scrollIndex, visibleCount]);
}
