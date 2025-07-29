/**
 * KARMA GAP Integration Service
 * Fetches project UIDs from KARMA API to enhance applications with additional metadata
 */

interface KarmaSearchResult {
  uid: string;
  name: string;
  [key: string]: any;
}

interface KarmaSearchResponse {
  results?: KarmaSearchResult[];
  data?: KarmaSearchResult[];
  [key: string]: any;
}

class KarmaService {
  private readonly baseUrl = 'https://gapapi.karmahq.xyz';
  private cache = new Map<string, string>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour cache
  private cacheTimestamps = new Map<string, number>();

  /**
   * Search for a project in KARMA and return its UID
   */
  async searchProjectUID(projectName: string): Promise<string | null> {
    if (!projectName || projectName.trim().length === 0) {
      return null;
    }

    const normalizedName = projectName.toLowerCase().trim();
    
    // Check cache first
    const cached = this.cache.get(normalizedName);
    const cacheTime = this.cacheTimestamps.get(normalizedName);
    
    if (cached && cacheTime && (Date.now() - cacheTime) < this.CACHE_TTL) {
      return cached;
    }

    try {
      // Search KARMA API for the project
      const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(projectName)}`;
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OpenGrants-Gateway-API/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        console.warn(`KARMA API returned ${response.status} for project: ${projectName}`);
        return null;
      }

      const data: KarmaSearchResponse = await response.json();
      
      // Try to find exact or close match
      const results = data.results || data.data || [];
      
      if (!Array.isArray(results) || results.length === 0) {
        // Cache negative result for short time to avoid repeated failed searches
        this.cache.set(normalizedName, '');
        this.cacheTimestamps.set(normalizedName, Date.now());
        return null;
      }

      // Look for exact match first, then fuzzy match
      let bestMatch = results.find(result => 
        result.name?.toLowerCase().trim() === normalizedName
      );

      if (!bestMatch) {
        // Look for partial match
        bestMatch = results.find(result => 
          result.name?.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(result.name?.toLowerCase() || '')
        );
      }

      if (!bestMatch) {
        // Use first result if no good match found
        bestMatch = results[0];
      }

      const uid = bestMatch?.uid || '';
      
      // Cache the result
      this.cache.set(normalizedName, uid);
      this.cacheTimestamps.set(normalizedName, Date.now());
      
      return uid || null;

    } catch (error) {
      console.error(`Error searching KARMA for project "${projectName}":`, error);
      return null;
    }
  }

  /**
   * Batch search for multiple project names
   */
  async batchSearchProjectUIDs(projectNames: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Process in parallel but with some rate limiting
    const batchSize = 5;
    for (let i = 0; i < projectNames.length; i += batchSize) {
      const batch = projectNames.slice(i, i + batchSize);
      
      const promises = batch.map(async (name) => {
        const uid = await this.searchProjectUID(name);
        return { name, uid };
      });

      const batchResults = await Promise.all(promises);
      
      for (const { name, uid } of batchResults) {
        if (uid) {
          results.set(name, uid);
        }
      }

      // Small delay between batches to be respectful to KARMA API
      if (i + batchSize < projectNames.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Clear the cache (useful for testing or force refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
    };
  }
}

export const karmaService = new KarmaService();