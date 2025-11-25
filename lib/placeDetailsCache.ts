/**
 * Client-Side Place Details Cache
 *
 * ToS Compliant: Google Places data can be cached for maximum 30 days
 * This utility manages localStorage caching with automatic expiration
 */

export interface CachedPlaceDetails {
  data: any;
  fetchedAt: number;
  expiresAt: number;
}

// Maximum cache duration per Google ToS: 30 days
const MAX_CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Cache key prefix
const CACHE_PREFIX = "place_details_";

/**
 * Get cached place details if available and not expired
 */
export function getCachedPlaceDetails(googlePlaceId: string): any | null {
  if (typeof window === "undefined") {
    return null; // Server-side, no localStorage
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${googlePlaceId}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const parsed: CachedPlaceDetails = JSON.parse(cached);

    // Check if expired
    if (Date.now() > parsed.expiresAt) {
      // Remove expired cache
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error("Error reading place details cache:", error);
    return null;
  }
}

/**
 * Cache place details with 30-day expiration (ToS compliant)
 */
export function cachePlaceDetails(googlePlaceId: string, data: any): void {
  if (typeof window === "undefined") {
    return; // Server-side, no localStorage
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${googlePlaceId}`;
    const now = Date.now();

    const cacheData: CachedPlaceDetails = {
      data,
      fetchedAt: now,
      expiresAt: now + MAX_CACHE_DURATION_MS,
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    // Handle quota exceeded error gracefully
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn("localStorage quota exceeded, clearing old cache");
      clearOldCache();

      // Try again after clearing
      try {
        const cacheKey = `${CACHE_PREFIX}${googlePlaceId}`;
        const now = Date.now();
        const cacheData: CachedPlaceDetails = {
          data,
          fetchedAt: now,
          expiresAt: now + MAX_CACHE_DURATION_MS,
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (retryError) {
        console.error("Failed to cache after clearing:", retryError);
      }
    } else {
      console.error("Error caching place details:", error);
    }
  }
}

/**
 * Clear cache for a specific place
 */
export function clearPlaceCache(googlePlaceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cacheKey = `${CACHE_PREFIX}${googlePlaceId}`;
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error("Error clearing place cache:", error);
  }
}

/**
 * Clear all place details cache
 */
export function clearAllPlaceCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const keysToRemove: string[] = [];

    // Find all cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    // Remove all cache keys
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    console.log(`Cleared ${keysToRemove.length} place caches`);
  } catch (error) {
    console.error("Error clearing all place cache:", error);
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    // Find expired cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed: CachedPlaceDetails = JSON.parse(cached);
            if (now > parsed.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch (parseError) {
          // Invalid cache entry, remove it
          keysToRemove.push(key);
        }
      }
    }

    // Remove expired entries
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      console.log(`Cleared ${keysToRemove.length} expired place caches`);
    }
  } catch (error) {
    console.error("Error clearing expired cache:", error);
  }
}

/**
 * Clear oldest cache entries (used when quota exceeded)
 */
export function clearOldCache(keepCount: number = 20): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cacheEntries: Array<{ key: string; fetchedAt: number }> = [];

    // Collect all cache entries with timestamps
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed: CachedPlaceDetails = JSON.parse(cached);
            cacheEntries.push({ key, fetchedAt: parsed.fetchedAt });
          }
        } catch (parseError) {
          // Invalid entry, will be removed
          cacheEntries.push({ key, fetchedAt: 0 });
        }
      }
    }

    // Sort by age (oldest first)
    cacheEntries.sort((a, b) => a.fetchedAt - b.fetchedAt);

    // Remove oldest entries, keep only the newest ones
    const toRemove = cacheEntries.slice(0, Math.max(0, cacheEntries.length - keepCount));
    toRemove.forEach(({ key }) => localStorage.removeItem(key));

    console.log(`Cleared ${toRemove.length} old place caches`);
  } catch (error) {
    console.error("Error clearing old cache:", error);
  }
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getCacheStats(): {
  totalCached: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  expiredCount: number;
} {
  if (typeof window === "undefined") {
    return {
      totalCached: 0,
      totalSize: 0,
      oldestEntry: null,
      newestEntry: null,
      expiredCount: 0,
    };
  }

  try {
    const now = Date.now();
    let totalCached = 0;
    let totalSize = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    let expiredCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            totalCached++;
            totalSize += cached.length;

            const parsed: CachedPlaceDetails = JSON.parse(cached);

            // Track oldest and newest
            if (oldestEntry === null || parsed.fetchedAt < oldestEntry) {
              oldestEntry = parsed.fetchedAt;
            }
            if (newestEntry === null || parsed.fetchedAt > newestEntry) {
              newestEntry = parsed.fetchedAt;
            }

            // Count expired
            if (now > parsed.expiresAt) {
              expiredCount++;
            }
          }
        } catch (parseError) {
          totalCached++;
        }
      }
    }

    return {
      totalCached,
      totalSize,
      oldestEntry,
      newestEntry,
      expiredCount,
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return {
      totalCached: 0,
      totalSize: 0,
      oldestEntry: null,
      newestEntry: null,
      expiredCount: 0,
    };
  }
}

/**
 * Initialize cache management (call on app startup)
 * Clears expired entries automatically
 */
export function initializePlaceDetailsCache(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Clear expired cache on startup
  clearExpiredCache();

  // Set up periodic cleanup (every hour)
  setInterval(
    () => {
      clearExpiredCache();
    },
    60 * 60 * 1000
  ); // 1 hour
}

/**
 * Get cache hit rate (for monitoring cost effectiveness)
 */
export function getCacheHitRate(): {
  hits: number;
  misses: number;
  hitRate: number;
} {
  if (typeof window === "undefined") {
    return { hits: 0, misses: 0, hitRate: 0 };
  }

  try {
    const hits = parseInt(localStorage.getItem("place_cache_hits") || "0", 10);
    const misses = parseInt(localStorage.getItem("place_cache_misses") || "0", 10);
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total) * 100 : 0;

    return { hits, misses, hitRate };
  } catch (error) {
    return { hits: 0, misses: 0, hitRate: 0 };
  }
}

/**
 * Record a cache hit (for monitoring)
 */
export function recordCacheHit(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const hits = parseInt(localStorage.getItem("place_cache_hits") || "0", 10);
    localStorage.setItem("place_cache_hits", (hits + 1).toString());
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Record a cache miss (for monitoring)
 */
export function recordCacheMiss(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const misses = parseInt(localStorage.getItem("place_cache_misses") || "0", 10);
    localStorage.setItem("place_cache_misses", (misses + 1).toString());
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem("place_cache_hits");
    localStorage.removeItem("place_cache_misses");
  } catch (error) {
    // Ignore errors
  }
}
