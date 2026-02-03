/**
 * Simple in-memory API response cache with TTL
 * Caches YouTube API responses to reduce redundant calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache entry with optional TTL
   */
  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries older than specified age
   */
  clearOldEntries(maxAge = this.DEFAULT_TTL): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const apiCache = new APICache();

/**
 * Fetch with automatic caching
 * Usage: const data = await cachedFetch('/api/search?q=...', YouTubeVideo[])
 */
export async function cachedFetch<T>(
  url: string,
  defaultValue?: T,
  ttl?: number
): Promise<T> {
  // Check cache first
  const cached = apiCache.get<T>(url);
  if (cached) {
    console.log(`[Cache] Hit: ${url}`);
    return cached;
  }

  // Fetch from server
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the response
    apiCache.set(url, data, ttl);
    console.log(`[Cache] Set: ${url}`);
    
    return data as T;
  } catch (error) {
    console.error(`[Cache] Error fetching ${url}:`, error);
    return defaultValue as T;
  }
}

/**
 * Generate cache key from search parameters
 */
export function getCacheKey(endpoint: string, params: Record<string, any>): string {
  const query = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return `${endpoint}?${query}`;
}
