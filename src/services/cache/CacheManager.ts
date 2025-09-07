import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { logger } from '@/utils/logger.js';

interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number;
  metadata?: Record<string, any>;
}

export class CacheManager {
  private cacheDir: string;
  private defaultTTL: number;
  private memoryCache: Map<string, CacheEntry>;

  constructor(cacheDir: string = '.insight-cache', defaultTTL: number = 86400) {
    this.cacheDir = path.resolve(process.cwd(), cacheDir);
    this.defaultTTL = defaultTTL * 1000; // Convert to milliseconds
    this.memoryCache = new Map();
    
    // Ensure cache directory exists
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      await fs.ensureDir(this.cacheDir);
      logger.debug(`Cache initialized at: ${this.cacheDir}`);
    } catch (error) {
      logger.error('Failed to initialize cache directory:', error);
    }
  }

  /**
   * Generate a cache key from content and context
   */
  generateKey(content: string, context?: Record<string, any>): string {
    const contextString = context ? JSON.stringify(context) : '';
    const combined = content + contextString;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get cached data if available and not expired
   */
  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      if (this.isValid(entry)) {
        logger.debug(`Cache hit (memory): ${key}`);
        return entry.data as T;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Check disk cache
    const cachePath = this.getCachePath(key);
    try {
      if (await fs.pathExists(cachePath)) {
        const entry: CacheEntry<T> = await fs.readJson(cachePath);
        if (this.isValid(entry)) {
          logger.debug(`Cache hit (disk): ${key}`);
          // Store in memory cache for faster access
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Remove expired cache
          await fs.remove(cachePath);
          logger.debug(`Cache expired: ${key}`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to read cache for ${key}:`, error);
    }

    logger.debug(`Cache miss: ${key}`);
    return null;
  }

  /**
   * Store data in cache
   */
  async set<T>(
    key: string,
    data: T,
    ttl?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl ? ttl * 1000 : this.defaultTTL,
      metadata,
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Store on disk
    const cachePath = this.getCachePath(key);
    try {
      await fs.ensureDir(path.dirname(cachePath));
      await fs.writeJson(cachePath, entry, { spaces: 2 });
      logger.debug(`Cache stored: ${key}`);
    } catch (error) {
      logger.error(`Failed to write cache for ${key}:`, error);
    }
  }

  /**
   * Check if a cache key exists and is valid
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Remove a specific cache entry
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    const cachePath = this.getCachePath(key);
    try {
      await fs.remove(cachePath);
      logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      logger.warn(`Failed to delete cache for ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      await fs.emptyDir(this.cacheDir);
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    memoryEntries: number;
    diskEntries: number;
    totalSize: number;
    oldestEntry: number | null;
  }> {
    const stats = {
      memoryEntries: this.memoryCache.size,
      diskEntries: 0,
      totalSize: 0,
      oldestEntry: null as number | null,
    };

    try {
      const files = await fs.readdir(this.cacheDir);
      stats.diskEntries = files.filter(f => f.endsWith('.json')).length;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        stats.totalSize += stat.size;

        if (!stats.oldestEntry || stat.mtime.getTime() < stats.oldestEntry) {
          stats.oldestEntry = stat.mtime.getTime();
        }
      }
    } catch (error) {
      logger.warn('Failed to get cache stats:', error);
    }

    return stats;
  }

  /**
   * Clean up expired cache entries
   */
  async cleanup(): Promise<number> {
    let cleaned = 0;

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // Clean disk cache
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.cacheDir, file);
          try {
            const entry: CacheEntry = await fs.readJson(filePath);
            if (!this.isValid(entry)) {
              await fs.remove(filePath);
              cleaned++;
            }
          } catch (error) {
            // Remove corrupted cache files
            await fs.remove(filePath);
            cleaned++;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup cache:', error);
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  /**
   * Cache a function result
   */
  async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check if cached
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  private getCachePath(key: string): string {
    // Use first 2 characters for subdirectory to avoid too many files in one directory
    const subdir = key.substring(0, 2);
    return path.join(this.cacheDir, subdir, `${key}.json`);
  }

  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age < entry.ttl;
  }
}

// Singleton instance
let cacheInstance: CacheManager | null = null;

export function getCacheManager(
  cacheDir?: string,
  ttl?: number
): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(
      cacheDir || process.env.INSIGHT_CACHE_DIR || '.insight-cache',
      ttl || 86400
    );
  }
  return cacheInstance;
}