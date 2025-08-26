// Dashboard API services for fetching grant data
import { queryClient } from './queryClient';

export interface GrantSystem {
  name: string;
  type: string;
  source?: string;
  totalFunding?: number;
  totalApplications?: number;
  totalPools?: number;
  approvalRate?: number;
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
      const response = await fetch(`${this.baseUrl}/grantSystems`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch systems`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching systems:', error);
      return [];
    }
  },

  async getPools(system?: string): Promise<any[]> {
    try {
      const url = system 
        ? `${this.baseUrl}/grantPools?system=${system}&limit=100`
        : `${this.baseUrl}/grantPools?limit=100`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch pools`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching pools:', error);
      return [];
    }
  },

  async getApplications(system?: string, poolId?: string): Promise<any[]> {
    try {
      let url = `${this.baseUrl}/grantApplications?limit=1000`;
      if (system) url += `&system=${system}`;
      if (poolId) url += `&poolId=${poolId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch applications`);
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching applications:', error);
      return [];
    }
  }
};

// DAOIP5 Static API (for Stellar, Optimism, Arbitrum, etc.)
export const daoip5Api = {
  baseUrl: 'https://daoip5.daostar.org',

  async getSystems(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch DAOIP5 systems`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching DAOIP5 systems:', error);
      return [];
    }
  },

  async getSystemPools(system: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/${system}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch pools for ${system}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching pools for ${system}:`, error);
      return [];
    }
  },

  async getPoolData(system: string, filename: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${system}/${filename}.json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch pool data for ${system}/${filename}`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching pool data for ${system}/${filename}:`, error);
      return null;
    }
  },

  async searchApplications(projectName?: string): Promise<any> {
    const url = projectName 
      ? `${this.baseUrl}/search/${encodeURIComponent(projectName)}`
      : `${this.baseUrl}/search/`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search applications');
    return await response.json();
  }
};

// Combined data fetching with caching
export const dashboardApi = {
  // Get all grant systems from both APIs
  async getAllSystems(): Promise<GrantSystem[]> {
    const cacheKey = 'dashboard-all-systems';
    const cached = queryClient.getQueryData([cacheKey]);
    if (cached) return cached as GrantSystem[];

    try {
      const [openGrantsSystems, daoip5Systems] = await Promise.all([
        openGrantsApi.getSystems(),
        daoip5Api.getSystems()
      ]);

      const systems: GrantSystem[] = [
        ...openGrantsSystems.map(system => ({
          name: system.name,
          type: 'API Integration',
          source: 'opengrants'
        })),
        ...daoip5Systems.map(system => ({
          name: system,
          type: 'Data Integration', 
          source: 'daoip5'
        }))
      ];

      queryClient.setQueryData([cacheKey], systems);

      return systems;
    } catch (error) {
      console.error('Error fetching systems:', error);
      return [];
    }
  },

  // Get ecosystem-wide statistics
  async getEcosystemStats(): Promise<EcosystemStats> {
    const cacheKey = 'dashboard-ecosystem-stats';
    const cached = queryClient.getQueryData([cacheKey]);
    if (cached) return cached as EcosystemStats;

    try {
      const [openGrantsPools, openGrantsApps, daoip5Systems] = await Promise.all([
        openGrantsApi.getPools(),
        openGrantsApi.getApplications(),
        daoip5Api.getSystems()
      ]);

      // Calculate statistics
      const totalFunding = openGrantsApps.reduce((sum, app) => {
        const fundingUSD = parseFloat(app.fundsApprovedInUSD || '0');
        return sum + fundingUSD;
      }, 0);

      const approvedApps = openGrantsApps.filter(app => 
        app.status === 'funded' || app.status === 'approved'
      ).length;

      const stats: EcosystemStats = {
        totalFunding,
        totalGrantRounds: openGrantsPools.length,
        totalSystems: 2 + daoip5Systems.length, // OpenGrants + DAOIP5 systems
        totalProjects: new Set(openGrantsApps.map(app => app.projectId)).size,
        totalApplications: openGrantsApps.length,
        averageApprovalRate: openGrantsApps.length > 0 ? (approvedApps / openGrantsApps.length) * 100 : 0
      };

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
        const poolFiles = await daoip5Api.getSystemPools(systemName);
        const poolData = await Promise.all(
          poolFiles.map(async (file) => {
            const filename = file.replace('.json', '');
            return await daoip5Api.getPoolData(systemName, filename);
          })
        );
        
        pools = poolData.filter(data => data.type === 'GrantPool');
        applications = poolData.flatMap(data => 
          Array.isArray(data.data) ? data.data.filter((item: any) => item.type === 'GrantApplication') : []
        );
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