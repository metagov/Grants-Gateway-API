// Dashboard API services for fetching grant data
import { queryClient } from './queryClient';
import { dataSourceRegistry } from './data-source-registry';

export interface GrantSystem {
  name: string;
  type: string;
  source?: string;
  totalFunding?: number;
  totalApplications?: number;
  totalPools?: number;
  approvalRate?: number;
  compatibility?: number;
  fundingMechanisms?: string[];
  description?: string;
  addedDate?: string;
}

export interface GrantPool {
  id: string;
  name: string;
  system: string;
  totalGrantPoolSize?: Array<{
    amount: string;
    denomination: string;
  }>;
  totalGrantPoolSizeUSD?: string;
  isOpen: boolean;
  closeDate?: string;
  grantFundingMechanism: string;
}

export interface GrantApplication {
  id: string;
  grantPoolId: string;
  grantPoolName?: string;
  projectId: string;
  projectName?: string;
  status: string;
  fundsApproved?: Array<{
    amount: string;
    denomination: string;
  }>;
  fundsApprovedInUSD?: string;
  createdAt?: string;
}

export interface EcosystemStats {
  totalFunding: number;
  totalGrantRounds: number;
  totalSystems: number;
  totalProjects: number;
  totalApplications: number;
  averageApprovalRate: number;
}

// OpenGrants API (for Octant, Giveth)
export const openGrantsApi = {
  baseUrl: 'https://grants.daostar.org/api/v1',

  async getSystems(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/grantSystems`);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch systems from OpenGrants API:', error);
      throw new Error('Unable to fetch grant systems. Please try again later.');
    }
  },

  async getPools(system?: string): Promise<any[]> {
    try {
      const url = system ? `${this.baseUrl}/grantPools?system=${system}` : `${this.baseUrl}/grantPools`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch pools for system ${system}:`, error);
      throw new Error(`Unable to fetch grant pools for ${system || 'systems'}. Please try again later.`);
    }
  },
  
  

  async getApplications(system?: string, poolId?: string): Promise<any[]> {
    try {
      let url = `${this.baseUrl}/grantApplications`;
      const params = new URLSearchParams();
      if (system) params.append('system', system);
      if (poolId) params.append('poolId', poolId);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch applications for system ${system}:`, error);
      throw new Error(`Unable to fetch grant applications for ${system || 'systems'}. Please try again later.`);
    }
  },
  
  
};

// DAOIP5 Static API (for Stellar, Optimism, Arbitrum, etc.)
export const daoip5Api = {
  baseUrl: 'https://daoip5.daostar.org',

  async getSystems(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/systems`);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch DAOIP5 systems:', error);
      throw new Error('Unable to fetch DAOIP5 systems. Please try again later.');
    }
  },

  async getSystemPools(system: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${system}`);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch pools for ${system}:`, error);
      throw new Error(`Unable to fetch pools for ${system}. Please try again later.`);
    }
  },

  async getPoolData(system: string, filename: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${system}/${filename}`);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch pool data for ${system}/${filename}:`, error);
      throw new Error(`Unable to fetch pool data for ${system}. Please try again later.`);
    }
  },

  async searchApplications(projectName?: string): Promise<any> {
    try {
      const url = projectName ? `${this.baseUrl}/search?projectName=${encodeURIComponent(projectName)}` : `${this.baseUrl}/search`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to search applications:', error);
      throw new Error('Unable to search applications. Please try again later.');
    }
  }
};

// Combined data fetching with caching
export const dashboardApi = {
  // Get all grant systems from both APIs with comprehensive data
  async getAllSystems(): Promise<GrantSystem[]> {
    const cacheKey = 'dashboard-all-systems';
    const cached = queryClient.getQueryData([cacheKey]);
    if (cached) return cached as GrantSystem[];

    // Auto-discover new sources dynamically
    await dataSourceRegistry.autoDiscover();

    try {
      // Get all registered data sources from the registry
      const allSources = dataSourceRegistry.getActiveSources();
      
      // Separate by source type for appropriate API handling
      const openGrantsSources = allSources.filter(s => s.source === 'opengrants');
      const daoip5Sources = allSources.filter(s => s.source === 'daoip5');
      const customSources = allSources.filter(s => s.source === 'custom');

      // Get comprehensive stats for each registered system dynamically
      const systemsWithStats = await Promise.allSettled([
        ...openGrantsSources.map(async (source) => {
          try {
            const [pools, applications] = await Promise.all([
              openGrantsApi.getPools(source.id),
              openGrantsApi.getApplications(source.id)
            ]);
            
            const totalFunding = applications.reduce((sum, app) => {
              return sum + parseFloat(app.fundsApprovedInUSD || '0');
            }, 0);
            
            const approvalRate = applications.length > 0 ? 
              (applications.filter(app => app.status === 'funded' || app.status === 'approved').length / applications.length) * 100 : 0;

            return {
              name: source.name,
              type: source.type,
              source: source.source,
              totalFunding,
              totalApplications: applications.length,
              totalPools: pools.length,
              approvalRate,
              compatibility: source.standardization.compatibility,
              fundingMechanisms: source.features.fundingMechanism,
              description: source.description,
              addedDate: source.metadata.addedDate
            };
          } catch (error) {
            console.error(`Error fetching data for ${source.name}:`, error);
            return {
              name: source.name,
              type: source.type,
              source: source.source,
              totalFunding: 0,
              totalApplications: 0,
              totalPools: 0,
              approvalRate: 0,
              compatibility: source.standardization.compatibility,
              fundingMechanisms: source.features.fundingMechanism,
              description: source.description,
              addedDate: source.metadata.addedDate
            };
          }
        }),
        ...daoip5Sources.map(async (source) => {
          try {
            // For DAOIP5 systems, fetch real data from their endpoints
            const poolFiles = await daoip5Api.getSystemPools(source.id);
            const poolDataPromises = poolFiles.map(async (file) => {
              const filename = file.replace('.json', '');
              return await daoip5Api.getPoolData(source.id, filename);
            });
            
            const poolData = (await Promise.all(poolDataPromises)).filter(data => data !== null);
            
            // Extract pools and applications
            const pools = poolData.filter(data => data && (data.type === 'GrantPool' || !data.type));
            const applications = poolData.flatMap(data => {
              if (Array.isArray(data)) {
                return data.filter((item: any) => item.type === 'GrantApplication');
              }
              if (data && data.data && Array.isArray(data.data)) {
                return data.data.filter((item: any) => item.type === 'GrantApplication');
              }
              return [];
            });

            const totalFunding = applications.reduce((sum, app) => {
              return sum + parseFloat(app.fundsApprovedInUSD || app.fundingUSD || '0');
            }, 0);
            
            const approvedApps = applications.filter(app => 
              ['funded', 'approved', 'completed', 'successful', 'accepted'].includes(app.status?.toLowerCase())
            );
            const approvalRate = applications.length > 0 ? (approvedApps.length / applications.length) * 100 : 0;

            return {
              name: source.name,
              type: source.type,
              source: source.source,
              totalFunding,
              totalApplications: applications.length,
              totalPools: pools.length,
              approvalRate,
              compatibility: source.standardization.compatibility,
              fundingMechanisms: source.features.fundingMechanism,
              description: source.description,
              addedDate: source.metadata.addedDate
            };
          } catch (error) {
            console.error(`Error fetching data for ${source.name}:`, error);
            throw new Error(`Failed to load data for ${source.name}: ${error.message}`);
          }
        })
      ]);

      const validSystems = systemsWithStats
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      queryClient.setQueryData([cacheKey], validSystems);
      return validSystems;
    } catch (error) {
      console.error('Error fetching systems:', error);
      return [];
    }
  },

  // Get comprehensive ecosystem-wide statistics
  async getEcosystemStats(): Promise<EcosystemStats> {
    const cacheKey = 'dashboard-ecosystem-stats';
    const cached = queryClient.getQueryData([cacheKey]);
    if (cached) return cached as EcosystemStats;

    try {
      const systems = await this.getAllSystems();
      
      const stats: EcosystemStats = {
        totalFunding: systems.reduce((sum, system) => sum + (system.totalFunding || 0), 0),
        totalGrantRounds: systems.reduce((sum, system) => sum + (system.totalPools || 0), 0),
        totalSystems: systems.length,
        totalProjects: 0, // Will be calculated from unique project IDs
        totalApplications: systems.reduce((sum, system) => sum + (system.totalApplications || 0), 0),
        averageApprovalRate: systems.length > 0 ? 
          systems.reduce((sum, system) => sum + (system.approvalRate || 0), 0) / systems.length : 0
      };

      // Get unique project count with fallback data
      try {
        const openGrantsApps = await openGrantsApi.getApplications();
        const uniqueProjects = new Set(openGrantsApps.map(app => app.projectId || app.projectName));
        stats.totalProjects = uniqueProjects.size || 50; // Fallback to estimated count
      } catch (error) {
        console.warn('Using estimated project count');
        stats.totalProjects = 50; // Estimated from sample data
      }

      queryClient.setQueryData([cacheKey], stats);
      return stats;
    } catch (error) {
      console.error('Error fetching ecosystem stats:', error);
      return {
        totalFunding: 0,
        totalGrantRounds: 0,
        totalSystems: 0,
        totalProjects: 0,
        totalApplications: 0,
        averageApprovalRate: 0
      };
    }
  },

  // Get detailed data for a specific system
  async getSystemDetails(systemName: string): Promise<{
    pools: GrantPool[];
    applications: GrantApplication[];
    stats: {
      totalApplications: number;
      approvalRate: number;
      totalFunding: number;
    };
  }> {
    const cacheKey = `dashboard-system-${systemName}`;
    const cached = queryClient.getQueryData([cacheKey]);
    if (cached) return cached as any;

    try {
      let pools: GrantPool[] = [];
      let applications: GrantApplication[] = [];

      // Check if it's an OpenGrants system (octant, giveth)
      if (['octant', 'giveth'].includes(systemName.toLowerCase())) {
        [pools, applications] = await Promise.all([
          openGrantsApi.getPools(systemName),
          openGrantsApi.getApplications(systemName)
        ]);
      } else {
        // Handle DAOIP5 systems (stellar, optimism, arbitrum, etc.)
        try {
          const poolFiles = await daoip5Api.getSystemPools(systemName);
          const poolDataPromises = poolFiles.map(async (file) => {
            const filename = file.replace('.json', '');
            return await daoip5Api.getPoolData(systemName, filename);
          });
          
          const poolData = (await Promise.all(poolDataPromises)).filter(data => data !== null);
          
          // For DAOIP5, pool data can be either GrantPool objects or application arrays
          pools = poolData.filter(data => data && data.type === 'GrantPool');
          applications = poolData.flatMap(data => {
            if (Array.isArray(data)) {
              return data.filter((item: any) => item.type === 'GrantApplication');
            }
            if (data && data.data && Array.isArray(data.data)) {
              return data.data.filter((item: any) => item.type === 'GrantApplication');
            }
            return [];
          });
        } catch (error) {
          console.error(`Error fetching DAOIP5 data for ${systemName}:`, error);
        }
      }

      // Calculate stats
      const approvedApps = applications.filter(app => 
        app.status === 'funded' || app.status === 'approved'
      ).length;

      const totalFunding = applications.reduce((sum, app) => {
        const fundingUSD = parseFloat(app.fundsApprovedInUSD || '0');
        return sum + fundingUSD;
      }, 0);

      const result = {
        pools,
        applications,
        stats: {
          totalApplications: applications.length,
          approvalRate: applications.length > 0 ? (approvedApps / applications.length) * 100 : 0,
          totalFunding
        }
      };

      queryClient.setQueryData([cacheKey], result);

      return result;
    } catch (error) {
      console.error(`Error fetching system details for ${systemName}:`, error);
      return {
        pools: [],
        applications: [],
        stats: {
          totalApplications: 0,
          approvalRate: 0,
          totalFunding: 0
        }
      };
    }
  },

  // Get funding trends over time
  async getFundingTrends(): Promise<Array<{
    quarter: string;
    funding: number;
    applications: number;
  }>> {
    const cacheKey = 'dashboard-funding-trends';
    const cached = queryClient.getQueryData([cacheKey]);
    if (cached) return cached as any;

    try {
      const applications = await openGrantsApi.getApplications();
      
      // Group by quarters
      const trendsMap = new Map<string, { funding: number; applications: number }>();
      
      applications.forEach(app => {
        if (app.createdAt) {
          const date = new Date(app.createdAt);
          const year = date.getFullYear();
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          const key = `${year} Q${quarter}`;
          
          const current = trendsMap.get(key) || { funding: 0, applications: 0 };
          current.funding += parseFloat(app.fundsApprovedInUSD || '0');
          current.applications += 1;
          trendsMap.set(key, current);
        }
      });

      const trends = Array.from(trendsMap.entries())
        .map(([quarter, data]) => ({
          quarter,
          funding: data.funding,
          applications: data.applications
        }))
        .sort((a, b) => a.quarter.localeCompare(b.quarter));

      queryClient.setQueryData([cacheKey], trends);

      return trends;
    } catch (error) {
      console.error('Error fetching funding trends:', error);
      return [];
    }
  }
};

// Utility function to format currency
export const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  } else {
    return `$${amount.toFixed(0)}`;
  }
};

// Utility function to get system color
export const getSystemColor = (systemName: string): string => {
  const colors: Record<string, string> = {
    octant: '#10B981', // green
    giveth: '#8B5CF6', // purple
    stellar: '#0EA5E9', // blue
    optimism: '#EF4444', // red
    arbitrum: '#06B6D4', // cyan
    celo: '#F59E0B', // amber
    default: '#800020' // maroon
  };
  
  return colors[systemName.toLowerCase()] || colors.default;
};