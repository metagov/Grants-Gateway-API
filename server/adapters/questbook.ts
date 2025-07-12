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
    systems: "https://api.questbook.app/daoip-5/systems.json",
    pools: "https://api.questbook.app/daoip-5/grant_pools.json",
    projects: "https://api.questbook.app/daoip-5/projects.json",
    applications: "https://api.questbook.app/daoip-5/applications.json"
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
    try {
      const response = await this.fetchWithCache<{ systems: DAOIP5System[] }>(
        this.ENDPOINTS.systems, 
        'systems'
      );
      return response.systems || [];
    } catch (error) {
      console.error("Error fetching Questbook systems:", error);
      return [];
    }
  }

  async getSystem(id: string): Promise<DAOIP5System | null> {
    const systems = await this.getSystems();
    return systems.find(system => 
      system.name.toLowerCase().includes(id.toLowerCase())
    ) || null;
  }

  async getPools(filters?: QueryFilters): Promise<DAOIP5GrantPool[]> {
    try {
      const response = await this.fetchWithCache<{ grantPools: DAOIP5GrantPool[] }>(
        this.ENDPOINTS.pools, 
        'pools'
      );
      let pools = response.grantPools || [];

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

      return pools.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
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
    try {
      const response = await this.fetchWithCache<{ projects: DAOIP5Project[] }>(
        this.ENDPOINTS.projects, 
        'projects'
      );
      let projects = response.projects || [];

      // Apply filters
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        projects = projects.filter(project => 
          project.name.toLowerCase().includes(searchLower) ||
          project.description.toLowerCase().includes(searchLower)
        );
      }

      return projects.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
    } catch (error) {
      console.error("Error fetching Questbook projects:", error);
      return [];
    }
  }

  async getProject(id: string): Promise<DAOIP5Project | null> {
    const projects = await this.getProjects();
    return projects.find(project => project.id === id) || null;
  }

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      const response = await this.fetchWithCache<{ applications: DAOIP5Application[] }>(
        this.ENDPOINTS.applications, 
        'applications'
      );
      let applications = response.applications || [];

      // Apply filters
      if (filters?.poolId) {
        applications = applications.filter(app => app.grantPoolId === filters.poolId);
      }
      if (filters?.projectId) {
        applications = applications.filter(app => app.projectId === filters.projectId);
      }
      if (filters?.status) {
        applications = applications.filter(app => app.status === filters.status);
      }

      return applications.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
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
    
    for (const [key, endpoint] of Object.entries(this.ENDPOINTS)) {
      try {
        const response = await fetch(endpoint, { 
          method: 'HEAD',
          headers: {
            'User-Agent': 'OpenGrants-Gateway/1.0'
          }
        });
        results[key] = response.ok;
      } catch {
        results[key] = false;
      }
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