/**
 * Robust Caching Service
 * Multi-layer caching with AsyncStorage and in-memory cache for maximum performance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry?: number; // Optional expiry in milliseconds
}

interface CacheConfig {
  defaultTTL?: number; // Default time-to-live in milliseconds
  maxSize?: number; // Maximum number of entries
}

class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private readonly CACHE_PREFIX = '@cashbook_cache_';
  private readonly CACHE_META_KEY = '@cashbook_cache_meta';

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100, // Max 100 entries
      ...config,
    };
  }

  /**
   * Get data from cache (checks memory first, then AsyncStorage)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Check memory cache first (fastest)
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        if (this.isExpired(memoryEntry)) {
          this.memoryCache.delete(key);
          return null;
        }
        return memoryEntry.data as T;
      }

      // Check AsyncStorage (slower but persistent)
      const storageKey = `${this.CACHE_PREFIX}${key}`;
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (this.isExpired(entry)) {
          await AsyncStorage.removeItem(storageKey);
          return null;
        }
        // Store in memory cache for faster future access
        this.memoryCache.set(key, entry);
        return entry.data;
      }

      return null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache (stores in both memory and AsyncStorage)
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const expiry = ttl || this.config.defaultTTL;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiry,
      };

      // Store in memory cache (fast access)
      this.memoryCache.set(key, entry);

      // Enforce max size
      if (this.memoryCache.size > (this.config.maxSize || 100)) {
        const firstKey = this.memoryCache.keys().next().value;
        this.memoryCache.delete(firstKey);
      }

      // Store in AsyncStorage (persistent)
      const storageKey = `${this.CACHE_PREFIX}${key}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));

      // Update cache metadata
      await this.updateCacheMeta(key);
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * Remove data from cache
   */
  async remove(key: string): Promise<void> {
    try {
      this.memoryCache.delete(key);
      const storageKey = `${this.CACHE_PREFIX}${key}`;
      await AsyncStorage.removeItem(storageKey);
      await this.updateCacheMeta(key, true);
    } catch (error) {
      console.error(`Cache remove error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      await AsyncStorage.removeItem(this.CACHE_META_KEY);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<void> {
    try {
      // Clear expired from memory
      for (const [key, entry] of this.memoryCache.entries()) {
        if (this.isExpired(entry)) {
          this.memoryCache.delete(key);
        }
      }

      // Clear expired from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      for (const key of cacheKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const entry: CacheEntry<any> = JSON.parse(stored);
          if (this.isExpired(entry)) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Cache clearExpired error:', error);
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<any>): boolean {
    if (!entry.expiry) return false;
    return Date.now() - entry.timestamp > entry.expiry;
  }

  /**
   * Update cache metadata
   */
  private async updateCacheMeta(key: string, remove: boolean = false): Promise<void> {
    try {
      const metaStr = await AsyncStorage.getItem(this.CACHE_META_KEY);
      const meta = metaStr ? JSON.parse(metaStr) : { keys: [], lastCleanup: Date.now() };
      
      if (remove) {
        meta.keys = meta.keys.filter((k: string) => k !== key);
      } else if (!meta.keys.includes(key)) {
        meta.keys.push(key);
      }

      await AsyncStorage.setItem(this.CACHE_META_KEY, JSON.stringify(meta));

      // Periodic cleanup (every hour)
      if (Date.now() - meta.lastCleanup > 60 * 60 * 1000) {
        await this.clearExpired();
        meta.lastCleanup = Date.now();
        await AsyncStorage.setItem(this.CACHE_META_KEY, JSON.stringify(meta));
      }
    } catch (error) {
      // Non-critical, ignore
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ memorySize: number; storageSize: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      return {
        memorySize: this.memoryCache.size,
        storageSize: cacheKeys.length,
      };
    } catch (error) {
      return { memorySize: this.memoryCache.size, storageSize: 0 };
    }
  }
}

// Singleton instance
export const cacheService = new CacheService({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
});

// Cache keys
export const CACHE_KEYS = {
  TRANSACTIONS: (accountId: string) => `transactions_${accountId}`,
  SUMMARY: (accountId: string) => `summary_${accountId}`,
  ACCOUNTS: 'accounts',
  MEMBERS: (accountId: string) => `members_${accountId}`,
  NOTIFICATIONS: 'notifications',
  USER: 'current_user',
} as const;

// Helper functions for common cache operations
export const cacheHelpers = {
  /**
   * Cache transactions with account-specific key
   */
  async cacheTransactions(accountId: string | null, transactions: any[], ttl?: number) {
    const key = CACHE_KEYS.TRANSACTIONS(accountId || 'personal');
    await cacheService.set(key, transactions, ttl);
  },

  /**
   * Get cached transactions
   */
  async getCachedTransactions(accountId: string | null): Promise<any[] | null> {
    const key = CACHE_KEYS.TRANSACTIONS(accountId || 'personal');
    return await cacheService.get<any[]>(key);
  },

  /**
   * Cache summary with account-specific key
   */
  async cacheSummary(accountId: string | null, summary: any, ttl?: number) {
    const key = CACHE_KEYS.SUMMARY(accountId || 'personal');
    await cacheService.set(key, summary, ttl);
  },

  /**
   * Get cached summary
   */
  async getCachedSummary(accountId: string | null): Promise<any | null> {
    const key = CACHE_KEYS.SUMMARY(accountId || 'personal');
    return await cacheService.get<any>(key);
  },

  /**
   * Cache accounts list
   */
  async cacheAccounts(accounts: any[], ttl?: number) {
    await cacheService.set(CACHE_KEYS.ACCOUNTS, accounts, ttl);
  },

  /**
   * Get cached accounts
   */
  async getCachedAccounts(): Promise<any[] | null> {
    return await cacheService.get<any[]>(CACHE_KEYS.ACCOUNTS);
  },

  /**
   * Cache user info
   */
  async cacheUser(user: any, ttl?: number) {
    await cacheService.set(CACHE_KEYS.USER, user, ttl || 24 * 60 * 60 * 1000); // 24 hours
  },

  /**
   * Get cached user
   */
  async getCachedUser(): Promise<any | null> {
    return await cacheService.get<any>(CACHE_KEYS.USER);
  },

  /**
   * Invalidate account-related cache
   */
  async invalidateAccountCache(accountId: string | null) {
    await cacheService.remove(CACHE_KEYS.TRANSACTIONS(accountId || 'personal'));
    await cacheService.remove(CACHE_KEYS.SUMMARY(accountId || 'personal'));
    await cacheService.remove(CACHE_KEYS.MEMBERS(accountId || 'personal'));
  },
};

