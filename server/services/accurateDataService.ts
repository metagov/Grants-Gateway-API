// Accurate data fetching service that replaces fallback/mock data with real API calls
import { currencyService } from './currency.js';
import { SmartCache } from './cache.js';
import { dataValidationService } from './dataValidationService.js';
import { dataStorageService } from './dataStorageService.js';
import { historicalPriceService } from './historicalPriceService.js';

// Add fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

interface SystemMetrics {
  totalFunding: number;
  totalApplications: number;
  totalPools: number;
  approvalRate: number;
  lastUpdated: string;
}

interface PoolData {
  id: string;
  name: string;
  system: string;
  totalFunding: number;
  totalApplications: number;
  mechanism: string;
  isOpen: boolean;
  closeDate?: string;
}

interface ApplicationData {
  id: string;
  projectName: string;
  system: string;
  poolId: string;
  status: string;
  fundingUSD: number;
  createdAt: string;
}

class AccurateDataService {
  private metricsCache = new SmartCache<SystemMetrics>(15 * 60 * 1000); // 15 minutes
  private poolsCache = new SmartCache<PoolData[]>(30 * 60 * 1000); // 30 minutes
  private applicationsCache = new SmartCache<ApplicationData[]>(10 * 60 * 1000); // 10 minutes

  // Fetch real data from OpenGrants API via proxy
  async fetchOpenGrantsData(system: string): Promise<{ pools: PoolData[], applications: ApplicationData[] }> {
    const cacheKey = `opengrants-${system}`;
    const cached = this.poolsCache.get(cacheKey);
    if (cached) {
      return {
        pools: cached,
        applications: this.applicationsCache.get(`${cacheKey}-apps`) || []
      };
    }

    try {
      // Use direct API calls since we're on the server side
      const poolsResponse = await fetch(`https://grants.daostar.org/api/v1/grantPools?system=${system}`);
      if (!poolsResponse.ok) throw new Error(`Failed to fetch pools for ${system}`);
      const poolsData = await poolsResponse.json();

      // Fetch applications
      const appsResponse = await fetch(`https://grants.daostar.org/api/v1/grantApplications?system=${system}`);
      if (!appsResponse.ok) throw new Error(`Failed to fetch applications for ${system}`);
      const appsData = await appsResponse.json();

      // Transform to standardized format
      const pools: PoolData[] = (poolsData.grantPools || []).map((pool: any) => ({
        id: pool.id,
        name: pool.name,
        system,
        totalFunding: this.extractFundingAmount(pool.totalGrantPoolSize),
        totalApplications: 0, // Will be calculated from applications
        mechanism: pool.grantFundingMechanism || 'Unknown',
        isOpen: pool.isOpen,
        closeDate: pool.closeDate
      }));

      const applications: ApplicationData[] = (appsData.grantApplications || []).map((app: any) => ({
        id: app.id,
        projectName: app.projectName || 'Unknown Project',
        system,
        poolId: app.grantPoolId,
        status: app.status,
        fundingUSD: parseFloat(app.fundsApprovedInUSD || '0'),
        createdAt: app.createdAt || new Date().toISOString()
      }));

      // Update pool application counts
      const poolAppCounts = new Map<string, number>();
      applications.forEach(app => {
        poolAppCounts.set(app.poolId, (poolAppCounts.get(app.poolId) || 0) + 1);
      });
      
      pools.forEach(pool => {
        pool.totalApplications = poolAppCounts.get(pool.id) || 0;
      });

      // Cache the results
      this.poolsCache.set(cacheKey, pools);
      this.applicationsCache.set(`${cacheKey}-apps`, applications);

      return { pools, applications };
    } catch (error) {
      console.error(`Error fetching OpenGrants data for ${system}:`, error);
      throw error;
    }
  }

  // Fetch real data from DAOIP-5 static files via directory API
  async fetchDaoip5Data(system: string): Promise<{ pools: PoolData[], applications: ApplicationData[] }> {
    const cacheKey = `daoip5-${system}`;
    const cached = this.poolsCache.get(cacheKey);
    if (cached) {
      return {
        pools: cached,
        applications: this.applicationsCache.get(`${cacheKey}-apps`) || []
      };
    }

    try {
      // Step 1: Get list of files in the system directory
      const systemFilesResponse = await fetch(`https://daoip5.daostar.org/${system}`);
      if (!systemFilesResponse.ok) throw new Error(`Failed to fetch system files for ${system}`);
      const systemFiles = await systemFilesResponse.json();

      // Step 2: Fetch grants_pool.json for pool metadata
      const poolsResponse = await fetch(`https://daoip5.daostar.org/${system}/grants_pool.json`);
      if (!poolsResponse.ok) throw new Error(`Failed to fetch grants_pool.json for ${system}`);
      const poolsData = await poolsResponse.json();

      const pools: PoolData[] = (poolsData.grantPools || []).map((pool: any) => ({
        id: pool.id,
        name: pool.name,
        system,
        totalFunding: this.extractFundingAmount(pool.totalGrantPoolSize),
        totalApplications: 0, // Will be calculated from applications
        mechanism: pool.grantFundingMechanism || 'Unknown',
        isOpen: pool.isOpen,
        closeDate: pool.closeDate
      }));

      const applications: ApplicationData[] = [];

      // Step 3: Fetch application files (look for *_applications_uri.json files)
      const applicationFiles = systemFiles.filter((file: string) => 
        file.includes('applications_uri') && file.endsWith('.json')
      );

      for (const appFile of applicationFiles) {
        try {
          const appsResponse = await fetch(`https://daoip5.daostar.org/${system}/${appFile}`);
          if (appsResponse.ok) {
            const appsData = await appsResponse.json();
            const fileApplications = (appsData.applications || []).map((app: any) => ({
              id: app.id,
              projectName: app.projectName || 'Unknown Project',
              system,
              poolId: app.grantPoolId,
              status: app.status || 'unknown',
              fundingUSD: parseFloat(app.fundsApprovedInUSD || '0'),
              createdAt: app.createdAt || new Date().toISOString()
            }));
            
            applications.push(...fileApplications);
          }
        } catch (error) {
          console.warn(`Failed to fetch applications from ${appFile}:`, error);
        }
      }

      // Update pool application counts
      const poolAppCounts = new Map<string, number>();
      applications.forEach(app => {
        poolAppCounts.set(app.poolId, (poolAppCounts.get(app.poolId) || 0) + 1);
      });
      
      pools.forEach(pool => {
        pool.totalApplications = poolAppCounts.get(pool.id) || 0;
      });

      // Cache the results
      this.poolsCache.set(cacheKey, pools);
      this.applicationsCache.set(`${cacheKey}-apps`, applications);

      return { pools, applications };
    } catch (error) {
      console.error(`Error fetching DAOIP-5 data for ${system}:`, error);
      throw error;
    }
  }

  // Calculate system metrics with accurate data, validation, and storage
  async calculateSystemMetrics(system: string, source: 'opengrants' | 'daoip5'): Promise<SystemMetrics> {
    const cacheKey = `metrics-${system}`;
    const cached = this.metricsCache.get(cacheKey);
    if (cached) return cached;

    try {
      console.log(`🔄 Calculating accurate metrics for ${system} (${source})`);

      // Fetch raw data
      const { pools, applications } = source === 'opengrants'
        ? await this.fetchOpenGrantsData(system)
        : await this.fetchDaoip5Data(system);

      console.log(`📊 Fetched ${pools.length} pools and ${applications.length} applications for ${system}`);

      // Store and validate data
      const poolStorage = await dataStorageService.storeGrantPools(system, pools);
      const appStorage = await dataStorageService.storeGrantApplications(system, applications);

      console.log(`✅ Stored ${poolStorage.stored}/${pools.length} pools and ${appStorage.stored}/${applications.length} applications for ${system}`);

      if (poolStorage.errors.length > 0 || appStorage.errors.length > 0) {
        console.warn(`⚠️ Data quality issues for ${system}:`, {
          poolErrors: poolStorage.errors,
          appErrors: appStorage.errors
        });
      }

      // Compute accurate metrics from stored data
      const storedMetrics = await dataStorageService.computeSystemMetrics(system);

      // Generate data quality report
      const qualityReport = await dataValidationService.generateQualityReport(system, pools, applications);
      console.log(`📈 Data quality score for ${system}: ${qualityReport.qualityScore}%`);

      const metrics: SystemMetrics = {
        totalFunding: storedMetrics.total_funding,
        totalApplications: storedMetrics.total_applications,
        totalPools: storedMetrics.total_pools,
        approvalRate: storedMetrics.approval_rate,
        lastUpdated: storedMetrics.last_updated
      };

      this.metricsCache.set(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error(`❌ Error calculating metrics for ${system}:`, error);
      throw error;
    }
  }

  // Extract funding amount from various formats
  private extractFundingAmount(totalGrantPoolSize: any): number {
    if (!totalGrantPoolSize) return 0;
    
    if (Array.isArray(totalGrantPoolSize)) {
      // Handle array format: [{ amount: "123", denomination: "ETH" }]
      const ethEntry = totalGrantPoolSize.find(entry => entry.denomination === 'ETH');
      const usdEntry = totalGrantPoolSize.find(entry => entry.denomination === 'USD');
      
      if (usdEntry) {
        return parseFloat(usdEntry.amount) || 0;
      } else if (ethEntry) {
        // Convert ETH to USD (this should be done with historical rates)
        const ethAmount = parseFloat(ethEntry.amount) || 0;
        // For now, use current rate - in production, use historical rate for the pool date
        return ethAmount * 3000; // Placeholder - should use currencyService
      }
    } else if (typeof totalGrantPoolSize === 'string') {
      return parseFloat(totalGrantPoolSize) || 0;
    }
    
    return 0;
  }

  // Get comprehensive ecosystem statistics with accurate computation
  async getEcosystemStats(): Promise<{
    totalFunding: number;
    totalApplications: number;
    totalSystems: number;
    totalPools: number;
    averageApprovalRate: number;
    averageDataQuality: number;
    lastUpdated: string;
  }> {
    console.log('🌍 Computing accurate ecosystem statistics...');

    const systems = [
      { name: 'octant', source: 'opengrants' as const },
      { name: 'giveth', source: 'opengrants' as const },
      { name: 'stellar', source: 'daoip5' as const },
      { name: 'optimism', source: 'daoip5' as const },
      { name: 'arbitrumfoundation', source: 'daoip5' as const },
      { name: 'celo-org', source: 'daoip5' as const }
    ];

    // Process systems in parallel for efficiency
    const systemMetrics = await Promise.allSettled(
      systems.map(({ name, source }) => this.calculateSystemMetrics(name, source))
    );

    const failedSystems = systemMetrics
      .filter(result => result.status === 'rejected')
      .map((result, index) => ({
        system: systems[index].name,
        error: (result as PromiseRejectedResult).reason
      }));

    if (failedSystems.length > 0) {
      console.warn('⚠️ Some systems failed to process:', failedSystems);
    }

    // Get accurate ecosystem stats from storage service
    const ecosystemStats = await dataStorageService.getEcosystemStats();

    console.log(`✅ Ecosystem stats computed: ${ecosystemStats.totalSystems} systems, $${ecosystemStats.totalFunding.toLocaleString()} total funding`);

    return {
      totalFunding: ecosystemStats.totalFunding,
      totalApplications: ecosystemStats.totalApplications,
      totalSystems: ecosystemStats.totalSystems,
      totalPools: ecosystemStats.totalPools,
      averageApprovalRate: ecosystemStats.averageApprovalRate,
      averageDataQuality: ecosystemStats.averageDataQuality,
      lastUpdated: ecosystemStats.lastUpdated
    };
  }
}

export const accurateDataService = new AccurateDataService();
