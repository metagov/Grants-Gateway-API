interface KarmaSearchResponse {
  uid?: string;
  name?: string;
  details?: {
    data?: {
      title?: string;
    };
  };
}

interface KarmaApiResponse {
  projects: KarmaSearchResponse[];
  communities: any[];
}

interface KarmaSearchResult {
  uid: string | null;
  error?: string;
}

import { karmaCache } from './cache.js';

// Fallback for individual requests (batch processing uses smart cache)
const simpleKarmaCache = new Map<string, { uid: string | null; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function searchKarmaProject(projectName: string): Promise<KarmaSearchResult> {
  const cacheKey = projectName.toLowerCase().trim();
  
  // Check cache first
  const cached = simpleKarmaCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { uid: cached.uid };
  }

  try {
    const searchQuery = encodeURIComponent(cacheKey);
    const response = await fetch(`https://gapapi.karmahq.xyz/search?q=${searchQuery}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OpenGrants-Gateway-API/1.0'
      },
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      const error = `Karma API responded with ${response.status}`;
      console.warn(`Karma search failed for "${projectName}": ${error}`);
      // Cache null result to avoid repeated failures
      simpleKarmaCache.set(cacheKey, { uid: null, timestamp: Date.now() });
      return { uid: null, error };
    }

    const data: KarmaApiResponse = await response.json();
    
    // Look for exact or close match in projects array
    let uid: string | null = null;
    if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
      // Try to find exact match first by checking both the title in details and any name field
      const exactMatch = data.projects.find(item => {
        const projectTitle = item.details?.data?.title?.toLowerCase().trim();
        const projectName = item.name?.toLowerCase().trim();
        return projectTitle === cacheKey || projectName === cacheKey;
      });
      
      if (exactMatch?.uid) {
        uid = exactMatch.uid;
      } else if (data.projects[0]?.uid) {
        // Use first result if no exact match
        uid = data.projects[0].uid;
      }
    }

    // Cache the result
    simpleKarmaCache.set(cacheKey, { uid, timestamp: Date.now() });
    
    return { uid };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Karma search failed for "${projectName}": ${errorMsg}`);
    
    // Cache null result to avoid repeated failures
    simpleKarmaCache.set(cacheKey, { uid: null, timestamp: Date.now() });
    
    return { uid: null, error: errorMsg };
  }
}

// Enhanced batch search with smart caching and circuit breaker
export async function searchKarmaProjectsBatch(projectNames: string[]): Promise<Map<string, string | null>> {
  const cacheKey = `batch:${projectNames.sort().join('|')}`;
  
  // Try to get cached results first
  const cachedResults = karmaCache.getWithRefresh(
    cacheKey,
    () => performKarmaBatchSearch(projectNames),
    2 * 60 * 60 * 1000 // Allow 2 hours of stale data
  );
  
  if (cachedResults) {
    return cachedResults;
  }
  
  // Perform fresh search
  const freshResults = await performKarmaBatchSearch(projectNames);
  karmaCache.set(cacheKey, freshResults, 4 * 60 * 60 * 1000); // Cache for 4 hours
  
  return freshResults;
}

// Circuit breaker state
let circuitBreakerState = {
  failureCount: 0,
  lastFailure: 0,
  isOpen: false
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

async function performKarmaBatchSearch(projectNames: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  
  // Check circuit breaker
  const now = Date.now();
  if (circuitBreakerState.isOpen) {
    if (now - circuitBreakerState.lastFailure < CIRCUIT_BREAKER_TIMEOUT) {
      console.warn('KARMA API circuit breaker is open, skipping batch search');
      // Return empty results to fail gracefully
      projectNames.forEach(name => results.set(name, null));
      return results;
    } else {
      // Reset circuit breaker
      circuitBreakerState.isOpen = false;
      circuitBreakerState.failureCount = 0;
    }
  }
  
  try {
    // Smaller batches with shorter delays for better performance
    const batchSize = 3;
    const delay = 100;
    
    for (let i = 0; i < projectNames.length; i += batchSize) {
      const batch = projectNames.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (projectName) => {
        try {
          const result = await searchKarmaProject(projectName);
          return { projectName, uid: result.uid, error: result.error };
        } catch (error) {
          return { projectName, uid: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(({ projectName, uid, error }) => {
        results.set(projectName, uid);
        if (error) {
          circuitBreakerState.failureCount++;
        }
      });
      
      // Add delay between batches (except for last batch)
      if (i + batchSize < projectNames.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Reset failure count on successful batch
    if (circuitBreakerState.failureCount === 0) {
      circuitBreakerState.lastFailure = 0;
    }
    
    return results;
    
  } catch (error) {
    circuitBreakerState.failureCount++;
    circuitBreakerState.lastFailure = now;
    
    if (circuitBreakerState.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreakerState.isOpen = true;
      console.warn('KARMA API circuit breaker opened due to repeated failures');
    }
    
    console.warn('KARMA batch search failed:', error);
    
    // Return empty results to fail gracefully
    projectNames.forEach(name => results.set(name, null));
    return results;
  }
}

// Clear cache (useful for testing)
export function clearKarmaCache(): void {
  karmaCache.clear();
}