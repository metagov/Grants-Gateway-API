// Optimized health endpoint with detailed performance metrics
import type { Request, Response } from 'express';
import { karmaCache, projectsCache, poolsCache, currencyCache } from '../services/cache.js';
import { getRefreshServiceStatus } from '../services/dataRefresh.js';
import { karmaBatcher } from '../services/requestBatching.js';

export async function getSystemHealth(req: Request, res: Response) {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    performance: {
      caching: {
        karma: karmaCache.getStats(),
        projects: projectsCache.getStats(), 
        pools: poolsCache.getStats(),
        currency: currencyCache.getStats()
      },
      backgroundServices: getRefreshServiceStatus(),
      requestBatching: {
        karma: karmaBatcher.getStats()
      }
    },
    recommendations: [] as string[]
  };
  
  // Add performance recommendations
  const karmaStats = karmaCache.getStats();
  if (karmaStats.staleEntries > karmaStats.freshEntries * 0.5) {
    healthData.recommendations.push('Consider increasing Karma cache refresh frequency');
  }
  
  const batchingStats = karmaBatcher.getStats();
  if (batchingStats.queuedRequests > 20) {
    healthData.recommendations.push('High request batching queue - consider scaling');
  }
  
  res.json(healthData);
}

export async function getCacheStatus(req: Request, res: Response) {
  const cacheData = {
    karma: {
      ...karmaCache.getStats(),
      description: 'KARMA GAP project UID cache with 4-hour TTL'
    },
    projects: {
      ...projectsCache.getStats(),
      description: 'Project data cache with 15-minute TTL'
    },
    pools: {
      ...poolsCache.getStats(),
      description: 'Grant pool cache with 30-minute TTL'
    },
    currency: {
      ...currencyCache.getStats(),
      description: 'Currency conversion cache with 5-minute TTL'
    }
  };
  
  res.json(cacheData);
}