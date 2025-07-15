import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application, QueryFilters } from "./base";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class QuestbookAdapter extends BaseAdapter {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly ENDPOINTS = {
    pools: "https://api.questbook.app/daoip-5/grant_pools.json",
    applications: "https://api.questbook.app/daoip-5/applications"
  };

  constructor() {
    super("questbook", "https://api.questbook.app");
  }

  private isCacheValid<T>(cacheEntry: CacheEntry<T>): boolean {
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
  }

  private async fetchWithCache<T>(endpoint: string, cacheKey: string): Promise<T> {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OpenGrants-Gateway/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      });

      return data;
    } catch (error) {
      // Return cached data if available, even if expired (graceful degradation)
      if (cached) {
        console.warn(`Using stale cache for ${cacheKey}:`, error);
        return cached.data;
      }
      throw error;
    }
  }

  async getSystems(): Promise<DAOIP5System[]> {
    // Questbook doesn't have a systems endpoint, return default system
    return [{
      "@context": "http://www.daostar.org/schemas",
      "type": "DAO",
      "name": "Questbook",
      "description": "Decentralized grants orchestration platform for DAOs to distribute capital efficiently",
      "extensions": {
        "io.questbook.grantFundingMechanism": "Competitive Grants",
        "io.questbook.website": "https://questbook.app",
        "io.questbook.apiEndpoint": "https://api.questbook.app/daoip-5"
      }
    }];
  }

  async getSystem(id: string): Promise<DAOIP5System | null> {
    const systems = await this.getSystems();
    return systems.find(system => 
      system.name.toLowerCase().includes(id.toLowerCase())
    ) || null;
  }

  async getPools(filters?: QueryFilters): Promise<DAOIP5GrantPool[]> {
    try {
      // Build URL with pagination parameters
      const url = new URL(this.ENDPOINTS.pools);
      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;
      
      url.searchParams.set('first', limit.toString());
      url.searchParams.set('offset', offset.toString());

      const response = await this.fetchWithCache<{ 
        grants: DAOIP5GrantPool[],
        pagination?: { first: number; offset: number; returned: number }
      }>(
        url.toString(), 
        `pools_${limit}_${offset}`
      );
      
      let pools = response.grants || [];

      // Apply filters
      if (filters?.isOpen !== undefined) {
        pools = pools.filter(pool => pool.isOpen === filters.isOpen);
      }
      if (filters?.mechanism) {
        pools = pools.filter(pool => pool.grantFundingMechanism === filters.mechanism);
      }
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        pools = pools.filter(pool => 
          pool.name.toLowerCase().includes(searchLower) ||
          pool.description.toLowerCase().includes(searchLower)
        );
      }

      return pools;
    } catch (error) {
      console.error("Error fetching Questbook pools:", error);
      return [];
    }
  }

  async getPool(id: string): Promise<DAOIP5GrantPool | null> {
    const pools = await this.getPools();
    return pools.find(pool => pool.id === id) || null;
  }

  async getProjects(filters?: QueryFilters): Promise<DAOIP5Project[]> {
    // Questbook doesn't have a dedicated projects endpoint
    // Projects are embedded within applications, so return empty for now
    console.warn("Questbook adapter: Projects endpoint not available. Projects are embedded within applications.");
    return [];
  }

  async getProject(id: string): Promise<DAOIP5Project | null> {
    // Projects not available as standalone entities in Questbook API
    return null;
  }

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      // Applications endpoint requires grantId parameter
      if (!filters?.poolId) {
        console.warn("Questbook applications require grantId parameter");
        return [];
      }

      // Build URL with required grantId and optional pagination
      const url = new URL(this.ENDPOINTS.applications);
      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;
      
      url.searchParams.set('grantId', filters.poolId);
      url.searchParams.set('first', limit.toString());
      url.searchParams.set('offset', offset.toString());

      const response = await this.fetchWithCache<{ 
        applications: DAOIP5Application[],
        pagination?: { first: number; offset: number; returned: number }
      }>(
        url.toString(), 
        `applications_${filters.poolId}_${limit}_${offset}`
      );
      
      let applications = response.applications || [];

      // Apply additional filters
      if (filters?.projectId) {
        applications = applications.filter(app => app.projectId === filters.projectId);
      }
      if (filters?.status) {
        applications = applications.filter(app => app.status === filters.status);
      }

      return applications;
    } catch (error) {
      console.error("Error fetching Questbook applications:", error);
      return [];
    }
  }

  async getApplication(id: string): Promise<DAOIP5Application | null> {
    const applications = await this.getApplications();
    return applications.find(app => app.id === id) || null;
  }

  // Health check method for monitoring
  async healthCheck(): Promise<{ status: string; endpoints: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    
    // Test pools endpoint
    try {
      const response = await fetch(`${this.ENDPOINTS.pools}?first=1`, { 
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OpenGrants-Gateway/1.0'
        }
      });
      results.pools = response.ok;
    } catch {
      results.pools = false;
    }

    // Test applications endpoint with a basic call (may fail without grantId, but should return error not 404)
    try {
      const response = await fetch(this.ENDPOINTS.applications, { 
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OpenGrants-Gateway/1.0'
        }
      });
      // Applications endpoint should return 400 for missing grantId, not 404
      results.applications = response.status === 400 || response.ok;
    } catch {
      results.applications = false;
    }

    const allHealthy = Object.values(results).every(Boolean);
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      endpoints: results
    };
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats(): { totalEntries: number; validEntries: number } {
    const totalEntries = this.cache.size;
    let validEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (this.isCacheValid(entry)) {
        validEntries++;
      }
    }

    return { totalEntries, validEntries };
  }
}