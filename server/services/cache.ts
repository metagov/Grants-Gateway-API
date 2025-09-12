// Advanced caching service with smart invalidation and background refresh
import { searchKarmaProjectsBatch } from './karma.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  refreshing?: boolean;
}

export class SmartCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private refreshTasks = new Map<string, Promise<void>>();

  constructor(private defaultTTL: number = 60 * 60 * 1000) {} // 1 hour default

  set(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      refreshing: false
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // If expired, return null
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  // Get with stale-while-revalidate pattern
  getWithRefresh(key: string, refreshFn: () => Promise<T>, staleTTL: number = 30 * 60 * 1000): T | null {
    const entry = this.cache.get(key);
    const now = Date.now();
    
    if (!entry) return null;
    
    // If still fresh, return immediately
    if (now < entry.expiresAt) {
      return entry.data;
    }
    
    // If stale but within stale period, return stale data and refresh in background
    if (now < entry.expiresAt + staleTTL && !entry.refreshing) {
      entry.refreshing = true;
      
      // Background refresh
      refreshFn().then(newData => {
        this.set(key, newData);
        entry.refreshing = false;
      }).catch(error => {
        console.warn(`Background refresh failed for ${key}:`, error);
        entry.refreshing = false;
      });
      
      return entry.data; // Return stale data
    }
    
    // Too stale or expired
    this.cache.delete(key);
    return null;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.refreshTasks.clear();
  }

  // Get cache stats for monitoring
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    return {
      totalEntries: entries.length,
      freshEntries: entries.filter(e => now < e.expiresAt).length,
      staleEntries: entries.filter(e => now >= e.expiresAt).length,
      refreshingEntries: entries.filter(e => e.refreshing).length
    };
  }
}

// Specialized caches for different data types
export const karmaCache = new SmartCache<Map<string, string | null>>(4 * 60 * 60 * 1000); // 4 hours for Karma data
export const projectsCache = new SmartCache<any[]>(15 * 60 * 1000); // 15 minutes for project lists
export const poolsCache = new SmartCache<any[]>(30 * 60 * 1000); // 30 minutes for pools
export const currencyCache = new SmartCache<number>(5 * 60 * 1000); // 5 minutes for currency rates

// Background job to refresh stale Karma data
export async function refreshStaleKarmaData(): Promise<void> {
  // This could be called periodically to refresh popular project UIDs
  const popularProjects = [
    'Protocol Guild', 'Giveth', 'Octant', 'Rotki', 'EthStaker', 
    'Hypercerts', 'MetaGame', 'BrightID', 'Kernel', 'Gitcoin'
  ];
  
  try {
    const results = await searchKarmaProjectsBatch(popularProjects);
    karmaCache.set('popular_projects', results, 24 * 60 * 60 * 1000); // Cache for 24 hours
  } catch (error) {
    console.warn('Failed to refresh popular Karma projects:', error);
  }
}