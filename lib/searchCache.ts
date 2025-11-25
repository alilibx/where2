/**
 * Client-Side Search Response Cache
 *
 * Caches full search responses in memory for instant repeat queries.
 * Short TTL (5 minutes) since search results may change.
 */

export interface CachedSearchResult {
  result: any;
  timestamp: number;
  queryHash: string;
}

// In-memory cache for search results
const searchCache = new Map<string, CachedSearchResult>();

// Cache TTL: 5 minutes (search results can change)
const SEARCH_CACHE_TTL = 5 * 60 * 1000;

// Maximum cache entries to prevent memory bloat
const MAX_CACHE_ENTRIES = 50;

/**
 * Generate a stable hash for the search query and filters
 */
function generateQueryHash(query: string, filters: any = {}): string {
  const normalized = JSON.stringify({
    q: query.toLowerCase().trim(),
    f: filters,
  });
  // Simple hash function for string
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `search_${hash}`;
}

/**
 * Get cached search result if available and not expired
 */
export function getCachedSearchResult(query: string, filters?: any): any | null {
  const queryHash = generateQueryHash(query, filters);
  const cached = searchCache.get(queryHash);

  if (!cached) {
    return null;
  }

  // Check if expired
  if (Date.now() - cached.timestamp > SEARCH_CACHE_TTL) {
    searchCache.delete(queryHash);
    return null;
  }

  return cached.result;
}

/**
 * Cache a search result
 */
export function cacheSearchResult(query: string, filters: any, result: any): void {
  const queryHash = generateQueryHash(query, filters);

  // Enforce max cache size (LRU-style: remove oldest entries)
  if (searchCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) {
      searchCache.delete(oldestKey);
    }
  }

  searchCache.set(queryHash, {
    result,
    timestamp: Date.now(),
    queryHash,
  });
}

/**
 * Clear all search cache
 */
export function clearSearchCache(): void {
  searchCache.clear();
}

/**
 * Clear expired entries from search cache
 */
export function cleanExpiredSearchCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];

  searchCache.forEach((value, key) => {
    if (now - value.timestamp > SEARCH_CACHE_TTL) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => searchCache.delete(key));
}

/**
 * Get search cache statistics
 */
export function getSearchCacheStats(): {
  size: number;
  maxSize: number;
  hitRate: number;
} {
  return {
    size: searchCache.size,
    maxSize: MAX_CACHE_ENTRIES,
    hitRate: 0, // Would need to track hits/misses separately
  };
}

/**
 * Hook for cached search - returns cached result or null
 * Use this before making API calls
 */
export function useCachedSearch(query: string, filters?: any): {
  cached: any | null;
  cacheResult: (result: any) => void;
} {
  return {
    cached: getCachedSearchResult(query, filters),
    cacheResult: (result: any) => cacheSearchResult(query, filters, result),
  };
}
