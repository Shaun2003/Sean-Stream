/**
 * Performance optimization utilities
 */

// Request idle callback polyfill for older browsers
export const requestIdleCallbackPolyfill = (cb: IdleRequestCallback, options?: IdleRequestOptions) => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(cb, options);
  }
  // Fallback for browsers without requestIdleCallback
  const start = Date.now();
  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    } as IdleDeadline);
  }, 1);
};

// Debounce with request idle callback for expensive operations
export const debounceWithIdle = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number = 300
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let idleCallbackId: number | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (idleCallbackId) {
      cancelIdleCallback(idleCallbackId);
    }

    timeoutId = setTimeout(() => {
      idleCallbackId = requestIdleCallbackPolyfill(() => {
        fn(...args);
      }) as unknown as number;
    }, delay);
  };
};

// Throttle function for performance-critical operations
export const throttle = <T extends (...args: any[]) => void>(
  fn: T,
  limit: number = 300
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

// Image optimization helper
export const optimizeImageUrl = (url: string | undefined, width: number = 200): string => {
  if (!url) return '';
  
  // For YouTube thumbnails, return the highest quality available
  if (url.includes('ytimg.com')) {
    return url.replace(/hqdefault|mqdefault|default/, 'sddefault');
  }
  
  return url;
};

// Lazy load content with intersection observer
export const createLazyLoader = (callback: (entry: IntersectionObserverEntry) => void) => {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, {
    rootMargin: '50px',
  });
};

// Memory leak prevention - cleanup helper
export const createCleanupManager = () => {
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const intervals: ReturnType<typeof setInterval>[] = [];
  const listeners: Array<{ target: EventTarget; event: string; listener: EventListener }> = [];

  return {
    setTimeout: (fn: () => void, delay?: number) => {
      const timeout = setTimeout(fn, delay);
      timeouts.push(timeout);
      return timeout;
    },
    setInterval: (fn: () => void, delay?: number) => {
      const interval = setInterval(fn, delay);
      intervals.push(interval);
      return interval;
    },
    addEventListener: (target: EventTarget, event: string, listener: EventListener) => {
      target.addEventListener(event, listener);
      listeners.push({ target, event, listener });
    },
    cleanup: () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
      listeners.forEach(({ target, event, listener }) => {
        target.removeEventListener(event, listener);
      });
      timeouts.length = 0;
      intervals.length = 0;
      listeners.length = 0;
    },
  };
};

// Request animation frame helper for smooth updates
export const createAnimationFrameScheduler = () => {
  const frameIds: number[] = [];

  return {
    scheduleFrame: (cb: FrameRequestCallback) => {
      const id = requestAnimationFrame(cb);
      frameIds.push(id);
      return id;
    },
    cancelAll: () => {
      frameIds.forEach(cancelAnimationFrame);
      frameIds.length = 0;
    },
  };
};
