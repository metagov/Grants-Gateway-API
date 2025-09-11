import { storage } from "../storage";

export interface DAOIP5SystemSummary {
  systemId: string;
  pools: string[];
  totalPools: number;
  lastUpdated: string;
}

export interface DAOIP5PoolData {
  systemId: string;
  poolId: string;
  data: any;
  lastUpdated: string;
}

class DAOIP5Service {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  async getSystemSummary(systemId: string): Promise<DAOIP5SystemSummary> {
    const cacheKey = `summary_${systemId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Fetch system pools from DAOIP5
      const response = await fetch(`https://daoip5.daostar.org/${systemId}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const pools = await response.json();
      
      const summary: DAOIP5SystemSummary = {
        systemId,
        pools: Array.isArray(pools) ? pools : [],
        totalPools: Array.isArray(pools) ? pools.length : 0,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, { data: summary, timestamp: Date.now() });
      
      return summary;
    } catch (error) {
      console.error(`Failed to fetch DAOIP5 summary for ${systemId}:`, error);
      throw error;
    }
  }

  async getPoolData(systemId: string, poolId: string): Promise<DAOIP5PoolData> {
    const cacheKey = `pool_${systemId}_${poolId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Fetch pool data from DAOIP5
      const response = await fetch(`https://daoip5.daostar.org/${systemId}/${poolId}.json`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      const poolData: DAOIP5PoolData = {
        systemId,
        poolId,
        data,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, { data: poolData, timestamp: Date.now() });
      
      return poolData;
    } catch (error) {
      console.error(`Failed to fetch DAOIP5 pool data for ${systemId}/${poolId}:`, error);
      throw error;
    }
  }

  async getAllSystemSummaries(): Promise<DAOIP5SystemSummary[]> {
    const cacheKey = 'all_systems';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Fetch available systems from DAOIP5
      const response = await fetch('https://daoip5.daostar.org/', {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const systems = await response.json();
      const systemIds = Array.isArray(systems) ? systems : [];
      
      // Fetch summaries for each system
      const summaries = await Promise.all(
        systemIds.map(systemId => this.getSystemSummary(systemId))
      );

      // Cache the result
      this.cache.set(cacheKey, { data: summaries, timestamp: Date.now() });
      
      return summaries;
    } catch (error) {
      console.error('Failed to fetch all DAOIP5 systems:', error);
      throw error;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const daoip5Service = new DAOIP5Service();