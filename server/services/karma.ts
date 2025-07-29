interface KarmaSearchResponse {
  uid?: string;
  name?: string;
}

interface KarmaSearchResult {
  uid: string | null;
  error?: string;
}

// Simple in-memory cache with 1-hour TTL
const karmaCache = new Map<string, { uid: string | null; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function searchKarmaProject(projectName: string): Promise<KarmaSearchResult> {
  const cacheKey = projectName.toLowerCase().trim();
  
  // Check cache first
  const cached = karmaCache.get(cacheKey);
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
      karmaCache.set(cacheKey, { uid: null, timestamp: Date.now() });
      return { uid: null, error };
    }

    const data: KarmaSearchResponse[] = await response.json();
    
    // Look for exact or close match
    let uid: string | null = null;
    if (Array.isArray(data) && data.length > 0) {
      // Try to find exact match first
      const exactMatch = data.find(item => 
        item.name?.toLowerCase().trim() === cacheKey
      );
      
      if (exactMatch?.uid) {
        uid = exactMatch.uid;
      } else if (data[0]?.uid) {
        // Use first result if no exact match
        uid = data[0].uid;
      }
    }

    // Cache the result
    karmaCache.set(cacheKey, { uid, timestamp: Date.now() });
    
    return { uid };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`Karma search failed for "${projectName}": ${errorMsg}`);
    
    // Cache null result to avoid repeated failures
    karmaCache.set(cacheKey, { uid: null, timestamp: Date.now() });
    
    return { uid: null, error: errorMsg };
  }
}

// Batch search with rate limiting
export async function searchKarmaProjectsBatch(projectNames: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  
  // Process in batches of 5 with 200ms delay between requests
  const batchSize = 5;
  const delay = 200;
  
  for (let i = 0; i < projectNames.length; i += batchSize) {
    const batch = projectNames.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (projectName) => {
      const result = await searchKarmaProject(projectName);
      return { projectName, uid: result.uid };
    });
    
    const batchResults = await Promise.all(batchPromises);
    
    batchResults.forEach(({ projectName, uid }) => {
      results.set(projectName, uid);
    });
    
    // Add delay between batches (except for last batch)
    if (i + batchSize < projectNames.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

// Clear cache (useful for testing)
export function clearKarmaCache(): void {
  karmaCache.clear();
}