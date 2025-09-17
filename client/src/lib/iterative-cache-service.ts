// We'll use fetch directly since daoip5-api might not be available everywhere
interface DAOIP5Api {
  getSystemPools: (systemId: string) => Promise<string[]>;
  getPoolData: (systemId: string, poolId: string) => Promise<any>;
}

// Create a simple DAOIP5 API client
const createDaoip5Api = (): DAOIP5Api => ({
  async getSystemPools(systemId: string): Promise<string[]> {
    const response = await fetch(`/api/public/daoip5/${systemId}/summary`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const summary = await response.json();
    return summary.pools || [];
  },

  async getPoolData(systemId: string, poolId: string): Promise<any> {
    const response = await fetch(`/api/public/daoip5/${systemId}/${poolId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const poolData = await response.json();
    return poolData.data;
  }
});

interface CachedSystemData {
  systemId: string;
  totalFunding: number;
  totalApplications: number;
  totalPools: number;
  approvalRate: number;
  lastUpdated: Date;
  applications: any[];
  pools: any[];
}

interface IterativeFetchStatus {
  systemId: string;
  isProcessing: boolean;
  progress: {
    current: number;
    total: number;
  };
  error?: string;
  lastAttempt: Date;
}

class IterativeCacheService {
  private cache = new Map<string, CachedSystemData>();
  private fetchStatus = new Map<string, IterativeFetchStatus>();
  private readonly RATE_LIMIT_DELAY = 500; // 500ms between API calls
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  /**
   * Get system data - returns cached if available, otherwise starts iterative fetch
   */
  async getSystemData(systemId: string): Promise<CachedSystemData | null> {
    // Check if we have valid cached data
    const cached = this.cache.get(systemId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Check if already processing
    const status = this.fetchStatus.get(systemId);
    if (status?.isProcessing) {
      console.log(`Iterative fetch already in progress for ${systemId}`);
      return cached || null; // Return whatever we have
    }

    // Start iterative fetch in background
    this.startIterativeFetch(systemId);
    
    return cached || null; // Return existing cache or null
  }

  /**
   * Start iterative data fetching for a system
   */
  private async startIterativeFetch(systemId: string): Promise<void> {
    console.log(`Starting iterative fetch for ${systemId}`);
    
    // Set processing status
    this.fetchStatus.set(systemId, {
      systemId,
      isProcessing: true,
      progress: { current: 0, total: 0 },
      lastAttempt: new Date()
    });

    try {
      // Step 1: Get list of pools
      let poolFiles: string[] = [];
      const daoip5Api = createDaoip5Api();
      
      try {
        poolFiles = await daoip5Api.getSystemPools(systemId);
        console.log(`Found ${poolFiles.length} pools for ${systemId}`);
      } catch (error) {
        console.error(`Failed to get pool list for ${systemId}:`, error);
        this.setFetchError(systemId, 'Failed to get pool list');
        return;
      }

      // Update progress
      this.updateProgress(systemId, 0, poolFiles.length);

      // Step 2: Fetch pools iteratively with delays
      const poolData: any[] = [];
      const applications: any[] = [];

      for (let i = 0; i < poolFiles.length; i++) {
        const file = poolFiles[i];
        const filename = file.replace('.json', '');
        
        try {
          console.log(`Fetching pool ${i + 1}/${poolFiles.length}: ${systemId}/${filename}`);
          
          const data = await daoip5Api.getPoolData(systemId, filename);
          
          if (data) {
            // Handle different data structures
            if (Array.isArray(data)) {
              // Array of applications
              applications.push(...data.filter(item => item.type === 'GrantApplication' || !item.type));
            } else if (data.grantPools && Array.isArray(data.grantPools)) {
              // DAOIP5 structure with grantPools array
              data.grantPools.forEach((pool: any) => {
                poolData.push(pool);
                if (pool.applications && Array.isArray(pool.applications)) {
                  applications.push(...pool.applications);
                }
              });
            } else if (data.type === 'GrantPool') {
              // Pool object
              poolData.push(data);
              if (data.applications) {
                applications.push(...data.applications);
              }
            } else if (data.data && Array.isArray(data.data)) {
              // Wrapped data
              applications.push(...data.data.filter((item: any) => item.type === 'GrantApplication' || !item.type));
            } else {
              // Single item
              if (data.type === 'GrantApplication' || !data.type) {
                applications.push(data);
              } else {
                poolData.push(data);
              }
            }
          }
          
          // Update progress
          this.updateProgress(systemId, i + 1, poolFiles.length);
          
          // Rate limiting delay
          if (i < poolFiles.length - 1) {
            await this.delay(this.RATE_LIMIT_DELAY);
          }
          
        } catch (error) {
          console.warn(`Failed to fetch ${systemId}/${filename}:`, error);
          // Continue with other pools
        }
      }

      // Step 3: Calculate aggregated stats
      const calculatedData = this.calculateStats(systemId, poolData, applications);
      
      // Step 4: Cache the results
      this.cache.set(systemId, calculatedData);
      
      console.log(`✅ Completed iterative fetch for ${systemId}:`, {
        pools: poolData.length,
        applications: applications.length,
        totalFunding: calculatedData.totalFunding
      });

    } catch (error) {
      console.error(`Error in iterative fetch for ${systemId}:`, error);
      this.setFetchError(systemId, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      // Clear processing status
      this.fetchStatus.delete(systemId);
    }
  }

  /**
   * Calculate aggregated statistics from fetched data
   */
  private calculateStats(systemId: string, pools: any[], applications: any[]): CachedSystemData {
    // Calculate total funding
    const totalFunding = applications.reduce((sum, app) => {
      const funding = parseFloat(
        app.fundsApprovedInUSD || 
        app.fundingUSD || 
        app.amountUSD || 
        app.amount || 
        '0'
      );
      return sum + funding;
    }, 0);

    // Calculate approval rate
    const approvedStatuses = ['funded', 'approved', 'completed', 'successful', 'accepted'];
    const approvedApps = applications.filter(app => 
      app.status && approvedStatuses.includes(app.status.toLowerCase())
    );
    const approvalRate = applications.length > 0 ? (approvedApps.length / applications.length) * 100 : 0;

    return {
      systemId,
      totalFunding,
      totalApplications: applications.length,
      totalPools: pools.length,
      approvalRate,
      lastUpdated: new Date(),
      applications,
      pools
    };
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cached: CachedSystemData): boolean {
    const now = new Date();
    const age = now.getTime() - cached.lastUpdated.getTime();
    return age < this.CACHE_DURATION;
  }

  /**
   * Update fetch progress
   */
  private updateProgress(systemId: string, current: number, total: number): void {
    const status = this.fetchStatus.get(systemId);
    if (status) {
      status.progress = { current, total };
      this.fetchStatus.set(systemId, status);
    }
  }

  /**
   * Set fetch error status
   */
  private setFetchError(systemId: string, error: string): void {
    const status = this.fetchStatus.get(systemId);
    if (status) {
      status.isProcessing = false;
      status.error = error;
      this.fetchStatus.set(systemId, status);
    }
  }

  /**
   * Get fetch status for a system
   */
  getFetchStatus(systemId: string): IterativeFetchStatus | null {
    return this.fetchStatus.get(systemId) || null;
  }

  /**
   * Clear cache for a system
   */
  clearCache(systemId: string): void {
    this.cache.delete(systemId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all cached system IDs
   */
  getCachedSystems(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Preload data for multiple systems
   */
  async preloadSystems(systemIds: string[]): Promise<void> {
    console.log(`Preloading data for ${systemIds.length} systems...`);
    
    // Start all fetches with delays between them
    for (let i = 0; i < systemIds.length; i++) {
      const systemId = systemIds[i];
      
      // Don't await - let them run in background
      this.getSystemData(systemId);
      
      // Stagger the starts to avoid overwhelming the API
      if (i < systemIds.length - 1) {
        await this.delay(1000); // 1 second between system starts
      }
    }
  }
}

export const iterativeCacheService = new IterativeCacheService();