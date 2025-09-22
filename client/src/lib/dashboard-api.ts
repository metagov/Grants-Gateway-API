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
  totalPools?: number;
  totalSystems: number;
  totalProjects: number;
  totalApplications: number;
  averageApprovalRate: number;
}

// Accurate API client that uses server proxy to avoid CORS
export const accurateApi = {
  baseUrl: '/api/v1',

  async getEcosystemStats(): Promise<EcosystemStats> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/ecosystem-stats`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching accurate ecosystem stats:', error);
      throw error;
    }
  },

  async getSystemMetrics(systemName: string, source: 'opengrants' | 'daoip5' = 'opengrants'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/system/${systemName}?source=${source}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching metrics for ${systemName}:`, error);
      throw error;
    }
  },

  async getFundingTrends(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/funding-trends`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching funding trends:', error);
      throw error;
    }
  }
};

// Legacy OpenGrants API (for backward compatibility)
export const openGrantsApi = {
  baseUrl: 'https://grants.daostar.org/api/v1',

  async getSystems(): Promise<any[]> {
    // Use server proxy to avoid CORS errors
    try {
      const response = await fetch('/api/proxy/opengrants/grantSystems');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const responseData = await response.json();
      // OpenGrants API returns data in 'data' field
      const systems = responseData.data || responseData.grantSystems || responseData.systems || [];
      console.log(`Fetched ${systems.length} systems from OpenGrants API`);
      return systems;
    } catch (error) {
      console.error('Error fetching systems via proxy:', error);
      // Never return fallback data - return empty array on error
      return [];
    }
  },

  async getPools(system?: string): Promise<any[]> {
    try {
      const url = system ? `/api/proxy/opengrants/grantPools?system=${system}` : '/api/proxy/opengrants/grantPools';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const responseData = await response.json();
      // OpenGrants API returns data in 'data' field, not 'grantPools'
      const pools = responseData.data || responseData.grantPools || [];
      console.log(`Fetched ${pools.length} pools for ${system || 'all systems'}`);
      return pools;
    } catch (error) {
      console.error('Error fetching pools via proxy:', error);
      // Never return sample data - return empty array on error
      return [];
    }
  },
  
  getSamplePools(system?: string): any[] {
    // No sample data - always return empty if real data fails
    return [];
  },

  async getApplications(system?: string, poolId?: string): Promise<any[]> {
    try {
      let url = '/api/proxy/opengrants/grantApplications';
      const params = new URLSearchParams();
      if (system) params.append('system', system);
      if (poolId) params.append('poolId', poolId);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const responseData = await response.json();
      // OpenGrants API returns data in 'data' field, not 'grantApplications'
      const applications = responseData.data || responseData.grantApplications || [];
      console.log(`Fetched ${applications.length} applications for ${system || 'all systems'}`);
      return applications;
    } catch (error) {
      console.error(`Error fetching applications for ${system} via proxy:`, error);
      // Never return sample data - return empty array on error
      return [];
    }
  },
  
  getSampleApplications(system?: string): any[] {
    // No sample data - always return empty if real data fails
    return [];
  }
};

// DAOIP5 Static API (for Stellar, Optimism, Arbitrum, etc.)
export const daoip5Api = {
  baseUrl: 'https://daoip5.daostar.org',
  cache: new Map<string, any>(),
  
  // Clear all cached data
  clearCache() {
    console.log('🗑️ Clearing DAOIP-5 cache');
    this.cache.clear();
  },

  // Retry failed file fetch with exponential backoff
  async retryFailedFile(system: string, fileName: string, maxRetries: number, baseDelay: number): Promise<any[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for ${fileName}`);
        const response = await fetch(`/api/proxy/daoip5/${system}/${fileName}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Retry successful for ${fileName} on attempt ${attempt}`);
          
          // Parse the applications from this file
          const applications: any[] = [];
          const grantPools = data.grantPools || [];
          
          for (const pool of grantPools) {
            const poolApplications = (pool.applications || []).map((app: any) => {
              // Apply same funding calculation logic
              let fundsInUSD = 0;
              if (app.fundsApprovedInUSD) {
                fundsInUSD = parseFloat(app.fundsApprovedInUSD) || 0;
              } else if (app.fundsApproved && Array.isArray(app.fundsApproved)) {
                for (const fund of app.fundsApproved) {
                  if (fund.amount) {
                    if (fund.denomination === 'USD' || fund.denomination?.toLowerCase() === 'usd') {
                      fundsInUSD += parseFloat(fund.amount) || 0;
                    } else if (fund.denomination === 'XLM' || fund.denomination?.toLowerCase() === 'xlm') {
                      const xlmToUsd = 0.13;
                      fundsInUSD += (parseFloat(fund.amount) || 0) * xlmToUsd;
                    } else if (fund.denomination === 'CELO' || fund.denomination?.toLowerCase() === 'celo') {
                      const celoToUsd = 0.65; // Approximate CELO to USD rate
                      fundsInUSD += (parseFloat(fund.amount) || 0) * celoToUsd;
                    } else if (fund.denomination === 'cUSD' || fund.denomination?.toLowerCase() === 'cusd') {
                      // cUSD is pegged to USD
                      fundsInUSD += parseFloat(fund.amount) || 0;
                    } else {
                      fundsInUSD += parseFloat(fund.amount) || 0;
                    }
                  }
                }
              }
              
              return {
                id: app.id,
                projectName: app.projectName || 'Unknown Project',
                projectDescription: app.description,
                system,
                grantPoolId: app.grantPoolId,
                status: system === 'stellar' ? 'awarded' : (app.status || 'unknown'),
                fundsApprovedInUSD: fundsInUSD,
                createdAt: app.createdAt || new Date().toISOString(),
                category: app.extensions?.['org.stellar.communityfund.category'] || '',
                awardType: app.extensions?.['org.stellar.communityfund.awardType'] || '',
                extensions: app.extensions || {}
              };
            });
            
            applications.push(...poolApplications);
          }
          
          return applications;
        }
        
        // If still failing, wait before next retry
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry ${attempt + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (retryError) {
        console.warn(`❌ Retry attempt ${attempt} failed for ${fileName}:`, retryError);
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`💥 All retry attempts failed for ${fileName}`);
    return []; // Return empty array if all retries fail
  },

  async getSystems(): Promise<string[]> {
    return ['stellar', 'optimism', 'arbitrumfoundation', 'celopg', 'clrfund', 'dao-drops-dorgtech'];
  },

  async fetchDaoip5Data(system: string): Promise<{ pools: any[], applications: any[] }> {
    const cacheKey = `daoip5-${system}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Step 1: Get list of files in the system directory
      const systemFilesResponse = await fetch(`/api/proxy/daoip5/${system}`);
      if (!systemFilesResponse.ok) {
        throw new Error(`Failed to fetch system files for ${system}`);
      }
      const systemFiles = await systemFilesResponse.json();

      // Step 2: Fetch grants_pool.json for pool metadata
      const poolsResponse = await fetch(`/api/proxy/daoip5/${system}/grants_pool.json`);
      if (!poolsResponse.ok) {
        throw new Error(`Failed to fetch grants_pool.json for ${system}`);
      }
      const poolsData = await poolsResponse.json();

      const pools = (poolsData.grantPools || []).map((pool: any) => ({
        id: pool.id,
        name: pool.name || pool.id.split(':').pop(), // Extract name from ID if not provided
        system,
        totalGrantPoolSizeUSD: this.extractFundingAmount(pool.totalGrantPoolSize),
        totalApplications: 0, // Will be calculated from applications
        grantFundingMechanism: pool.grantFundingMechanism || 'Direct Grant',
        isOpen: pool.isOpen !== undefined ? pool.isOpen : false,
        closeDate: pool.closeDate,
        description: pool.description
      }));

      const applications: any[] = [];

      // Step 3: Fetch application files (broader pattern matching for Celo compatibility)
      const applicationFiles = systemFiles.filter((file: string) => {
        return (
          (file.includes('applications_uri') && file.endsWith('.json')) ||
          (file === 'applications.json') ||
          (file.includes('_applications.json') && file.endsWith('.json'))
        );
      });

      for (const appFile of applicationFiles) {
        try {
          const appsResponse = await fetch(`/api/proxy/daoip5/${system}/${appFile}`);
          if (appsResponse.ok) {
            const appsData = await appsResponse.json();
            // Handle nested structure where applications are inside grantPools array
            const grantPools = appsData.grantPools || [];
            
            for (const pool of grantPools) {
              const poolApplications = (pool.applications || []).map((app: any) => {
                // Calculate USD value from fundsApproved field
                let fundsInUSD = 0;
                
                // First check if fundsApprovedInUSD is directly provided
                if (app.fundsApprovedInUSD) {
                  fundsInUSD = parseFloat(app.fundsApprovedInUSD) || 0;
                }
                // Otherwise calculate from fundsApproved array
                else if (app.fundsApproved && Array.isArray(app.fundsApproved)) {
                  for (const fund of app.fundsApproved) {
                    if (fund.amount) {
                      if (fund.denomination === 'USD' || fund.denomination?.toLowerCase() === 'usd') {
                        fundsInUSD += parseFloat(fund.amount) || 0;
                      } else if (fund.denomination === 'XLM' || fund.denomination?.toLowerCase() === 'xlm') {
                        const xlmToUsd = 0.13;
                        fundsInUSD += (parseFloat(fund.amount) || 0) * xlmToUsd;
                      } else if (fund.denomination === 'ETH' || fund.denomination?.toLowerCase() === 'eth') {
                        const ethToUsd = 2500;
                        fundsInUSD += (parseFloat(fund.amount) || 0) * ethToUsd;
                      } else if (fund.denomination === 'CELO' || fund.denomination?.toLowerCase() === 'celo') {
                        const celoToUsd = 0.65; // Approximate CELO to USD rate
                        fundsInUSD += (parseFloat(fund.amount) || 0) * celoToUsd;
                      } else if (fund.denomination === 'cUSD' || fund.denomination?.toLowerCase() === 'cusd') {
                        // cUSD is pegged to USD
                        fundsInUSD += parseFloat(fund.amount) || 0;
                      } else {
                        fundsInUSD += parseFloat(fund.amount) || 0;
                      }
                    }
                  }
                }
                
                // For Stellar, all applications are "Awarded" since we only get awarded ones
                const status = system === 'stellar' ? 'awarded' : (app.status || 'unknown');
                
                // Extract additional metadata from extensions
                const extensions = app.extensions || {};
                const category = extensions['org.stellar.communityfund.category'] || '';
                const awardType = extensions['org.stellar.communityfund.awardType'] || '';
                const teamMembers = extensions['stellar.teamMembers'] || '';
                const website = extensions['stellar.urls']?.website || '';
                const successCriteria = extensions['stellar.successCriteria'] || '';
                
                return {
                  id: app.id,
                  projectName: app.projectName || 'Unknown Project',
                  projectDescription: app.description,
                  system,
                  grantPoolId: app.grantPoolId,
                  status,
                  fundsApprovedInUSD: fundsInUSD,
                  createdAt: app.createdAt || new Date().toISOString(),
                  // Additional metadata from extensions
                  category,
                  awardType,
                  teamMembers,
                  website,
                  successCriteria,
                  extensions // Keep all extensions for detailed view
                };
              });
              
              applications.push(...poolApplications);
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch applications from ${appFile}:`, error);
          // For 500 errors, try retry logic with exponential backoff
          if (error instanceof Error && error.message.includes('500')) {
            console.log(`🔄 Attempting retry for ${appFile} due to 500 error`);
            const retryApplications = await this.retryFailedFile(system, appFile, 2, 1000); // 2 retries, starting with 1s delay
            if (retryApplications.length > 0) {
              console.log(`✅ Successfully recovered ${retryApplications.length} applications from ${appFile} via retry`);
              applications.push(...retryApplications);
            } else {
              console.error(`❌ Could not recover data from ${appFile} after retries - missing ${appFile.includes('35') ? 'SCF Round 35' : appFile} applications`);
            }
          }
        }
      }

      // Update pool application counts
      const poolAppCounts = new Map<string, number>();
      applications.forEach(app => {
        poolAppCounts.set(app.grantPoolId, (poolAppCounts.get(app.grantPoolId) || 0) + 1);
      });
      
      pools.forEach((pool: any) => {
        pool.totalApplications = poolAppCounts.get(pool.id) || 0;
      });

      const result = { pools, applications };
      // Cache the results for 5 minutes
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);

      return result;
    } catch (error) {
      console.error(`Error fetching DAOIP-5 data for ${system}:`, error instanceof Error ? error.message : String(error));
      // Log full error for debugging
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
      }
      // Fallback to empty data instead of throwing
      return { pools: [], applications: [] };
    }
  },

  extractFundingAmount(totalGrantPoolSize: any): string {
    if (!totalGrantPoolSize) return '0';
    
    // Handle array of funding objects (DAOIP-5 format)
    if (Array.isArray(totalGrantPoolSize) && totalGrantPoolSize.length > 0) {
      let totalUSD = 0;
      for (const fund of totalGrantPoolSize) {
        if (fund.amount) {
          // For USD, use directly
          if (fund.denomination === 'USD' || fund.denomination?.toLowerCase() === 'usd') {
            totalUSD += parseFloat(fund.amount) || 0;
          }
          // For XLM (Stellar), use conversion rate
          else if (fund.denomination === 'XLM' || fund.denomination?.toLowerCase() === 'xlm') {
            const xlmToUsd = 0.13; // Approximate XLM to USD rate
            totalUSD += (parseFloat(fund.amount) || 0) * xlmToUsd;
          }
          // For ETH, use conversion rate
          else if (fund.denomination === 'ETH' || fund.denomination?.toLowerCase() === 'eth') {
            const ethToUsd = 2500; // Approximate ETH to USD rate
            totalUSD += (parseFloat(fund.amount) || 0) * ethToUsd;
          }
          // For CELO, use conversion rate
          else if (fund.denomination === 'CELO' || fund.denomination?.toLowerCase() === 'celo') {
            const celoToUsd = 0.65; // Approximate CELO to USD rate
            totalUSD += (parseFloat(fund.amount) || 0) * celoToUsd;
          }
          // For cUSD (Celo USD), use 1:1 rate
          else if (fund.denomination === 'cUSD' || fund.denomination?.toLowerCase() === 'cusd') {
            totalUSD += parseFloat(fund.amount) || 0;
          }
          // For other denominations, try to use amount as-is
          else {
            totalUSD += parseFloat(fund.amount) || 0;
          }
        }
      }
      return String(totalUSD);
    }
    
    // Handle single funding object
    if (typeof totalGrantPoolSize === 'object' && totalGrantPoolSize.amount) {
      if (totalGrantPoolSize.denomination === 'USD' || totalGrantPoolSize.denomination?.toLowerCase() === 'usd') {
        return String(totalGrantPoolSize.amount || 0);
      }
      if (totalGrantPoolSize.denomination === 'XLM' || totalGrantPoolSize.denomination?.toLowerCase() === 'xlm') {
        const xlmToUsd = 0.13;
        return String((parseFloat(totalGrantPoolSize.amount) || 0) * xlmToUsd);
      }
      if (totalGrantPoolSize.denomination === 'ETH' || totalGrantPoolSize.denomination?.toLowerCase() === 'eth') {
        const ethToUsd = 2500;
        return String((parseFloat(totalGrantPoolSize.amount) || 0) * ethToUsd);
      }
      if (totalGrantPoolSize.denomination === 'CELO' || totalGrantPoolSize.denomination?.toLowerCase() === 'celo') {
        const celoToUsd = 0.65;
        return String((parseFloat(totalGrantPoolSize.amount) || 0) * celoToUsd);
      }
      if (totalGrantPoolSize.denomination === 'cUSD' || totalGrantPoolSize.denomination?.toLowerCase() === 'cusd') {
        return String(parseFloat(totalGrantPoolSize.amount) || 0);
      }
      return String(totalGrantPoolSize.amount || 0);
    }
    
    return String(totalGrantPoolSize || 0);
  },

  async getSystemPools(system: string): Promise<any[]> {
    try {
      const { pools } = await this.fetchDaoip5Data(system);
      return pools;
    } catch (error) {
      console.error(`Error fetching pools for ${system}:`, error);
      return [];
    }
  },

  async getSystemApplications(system: string): Promise<any[]> {
    try {
      const { applications } = await this.fetchDaoip5Data(system);
      return applications;
    } catch (error) {
      console.error(`Error fetching applications for ${system}:`, error);
      return [];
    }
  },

  async searchApplications(projectName?: string): Promise<any> {
    // For now, return empty results as this would require searching across all systems
    return { results: [] };
  }
};

// Systematic fetching function that fetches pools first, then applications per pool
async function fetchSystemDataSystematically(systemId: string, source: string): Promise<{
  pools: any[];
  applications: any[];
  totalFunding: number;
}> {
  console.log(`Starting systematic fetch for ${systemId} (${source})`);
  
  const poolsById = new Map<string, any>();
  const appsByPoolId = new Map<string, any[]>();
  let totalFunding = 0;
  
  try {
    // Step 1: Fetch all pools first
    if (source === 'opengrants') {
      const [pools, applications] = await Promise.all([
        openGrantsApi.getPools(systemId),
        openGrantsApi.getApplications(systemId)
      ]);
      
      console.log(`Fetched ${pools.length} pools and ${applications.length} applications for ${systemId}`);
      
      // Build pool map
      pools.forEach(pool => {
        poolsById.set(pool.id, {
          ...pool,
          totalApplications: 0,
          totalFunding: 0
        });
      });
      
      // Group applications by pool
      applications.forEach((app: any) => {
        const poolId = app.grantPoolId || app.poolId || 'unknown';
        
        if (!appsByPoolId.has(poolId)) {
          appsByPoolId.set(poolId, []);
        }
        
        const normalizedApp = {
          ...app,
          grantPoolId: poolId,
          fundsApprovedInUSD: typeof app.fundsApprovedInUSD === 'number' 
            ? app.fundsApprovedInUSD 
            : parseFloat(app.fundsApprovedInUSD || '0')
        };
        
        appsByPoolId.get(poolId)!.push(normalizedApp);
        
        // Update pool stats
        const pool = poolsById.get(poolId);
        if (pool) {
          pool.totalApplications = (pool.totalApplications || 0) + 1;
          pool.totalFunding = (pool.totalFunding || 0) + normalizedApp.fundsApprovedInUSD;
        }
      });
    } else if (source === 'daoip5') {
      // For DAOIP-5: fetch pools and applications together
      const { pools, applications } = await daoip5Api.fetchDaoip5Data(systemId);
      console.log(`DAOIP-5 fetch for ${systemId}: ${pools.length} pools, ${applications.length} applications`);
      
      // Build maps
      pools.forEach(pool => {
        poolsById.set(pool.id, {
          ...pool,
          totalApplications: 0,
          totalFunding: 0
        });
      });
      
      // Group applications by pool
      applications.forEach(app => {
        const poolId = app.grantPoolId || 'unknown';
        if (!appsByPoolId.has(poolId)) {
          appsByPoolId.set(poolId, []);
        }
        appsByPoolId.get(poolId)!.push(app);
        
        // Update pool stats
        const pool = poolsById.get(poolId);
        if (pool) {
          pool.totalApplications = (pool.totalApplications || 0) + 1;
          pool.totalFunding = (pool.totalFunding || 0) + (app.fundsApprovedInUSD || 0);
        }
      });
    }
    
    // Calculate total funding
    const allApplications = Array.from(appsByPoolId.values()).flat();
    totalFunding = allApplications.reduce((sum, app) => 
      sum + (typeof app.fundsApprovedInUSD === 'number' ? 
        app.fundsApprovedInUSD : parseFloat(app.fundsApprovedInUSD || '0')), 0);
    
    console.log(`System ${systemId} totals: ${poolsById.size} pools, ${allApplications.length} applications, $${totalFunding.toFixed(2)} funding`);
    
    return {
      pools: Array.from(poolsById.values()),
      applications: allApplications,
      totalFunding
    };
  } catch (error) {
    console.error(`Error in systematic fetch for ${systemId}:`, error);
    return { pools: [], applications: [], totalFunding: 0 };
  }
}

// Global cache invalidation function
export const invalidateAllCaches = async () => {
  console.log('🔄 Invalidating all caches and forcing data refresh');
  
  // Clear DAOIP-5 cache
  daoip5Api.clearCache();
  
  // Clear analytics data service cache
  const { analyticsDataService } = await import('./analytics-data-service');
  analyticsDataService.clearCache();
  
  // Clear React Query cache
  queryClient.clear();
  
  console.log('✅ All caches cleared successfully');
};

// Combined data fetching with caching
export const dashboardApi = {
  // Get all grant systems using centralized configuration
  async getAllSystems(): Promise<GrantSystem[]> {
    const cacheKey = 'dashboard-all-systems';
    const cached = queryClient.getQueryData([cacheKey]);
    if (cached) return cached as GrantSystem[];

    try {
      // Fetch systems configuration from server
      const configResponse = await fetch('/api/v1/systems/config');
      if (!configResponse.ok) {
        throw new Error('Failed to fetch systems configuration');
      }
      
      const systemsConfig = await configResponse.json();
      const activeSystems = (systemsConfig.activeSystems || []).filter((system: any) => system.enabled);

      console.log(`📊 Loading ${activeSystems.length} configured active systems`);

      // Get comprehensive stats for each configured system
      const systemsWithStats = await Promise.allSettled(
        activeSystems.map(async (systemConfig: any) => {
          try {
            // Use the systematic fetching approach with config data
            const { pools, applications, totalFunding } = await fetchSystemDataSystematically(
              systemConfig.id, 
              systemConfig.source
            );
            
            return {
              name: systemConfig.displayName || systemConfig.name,
              type: systemConfig.type,
              source: systemConfig.source,
              totalFunding,
              totalApplications: applications.length,
              totalPools: pools.length,
              approvalRate: undefined, // Coming soon
              compatibility: systemConfig.metadata.compatibility,
              fundingMechanisms: systemConfig.metadata.fundingMechanisms,
              description: systemConfig.metadata.description,
              addedDate: systemConfig.metadata.established
            };
          } catch (error) {
            console.error(`Error fetching data for ${systemConfig.name}:`, error);
            return {
              name: systemConfig.displayName || systemConfig.name,
              type: systemConfig.type,
              source: systemConfig.source,
              totalFunding: 0,
              totalApplications: 0,
              totalPools: 0,
              approvalRate: undefined,
              compatibility: systemConfig.metadata.compatibility,
              fundingMechanisms: systemConfig.metadata.fundingMechanisms,
              description: systemConfig.metadata.description,
              addedDate: systemConfig.metadata.established
            };
          }
        })
      );

      const validSystems = systemsWithStats
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      console.log(`✅ Successfully loaded ${validSystems.length} systems from configuration`);

      queryClient.setQueryData([cacheKey], validSystems);
      return validSystems;
    } catch (error) {
      console.error('Error fetching configured systems:', error);
      
      // Fallback to existing logic if configuration service fails
      console.warn('⚠️ Falling back to legacy system discovery');
      return this.getAllSystemsLegacy();
    }
  },

  // Legacy method as fallback
  async getAllSystemsLegacy(): Promise<GrantSystem[]> {
    // Auto-discover new sources dynamically
    await dataSourceRegistry.autoDiscover();

    try {
      // Get all registered data sources from the registry
      const allSources = dataSourceRegistry.getActiveSources();
      
      // Focus on only the 3 requested systems: Giveth, Octant, and Stellar
      const requestedSources = allSources.filter(s => 
        s.id === 'octant' || s.id === 'giveth' || s.id === 'stellar'
      );

      // Get comprehensive stats for each registered system dynamically
      const systemsWithStats = await Promise.allSettled([
        ...requestedSources.map(async (source) => {
          try {
            // Use the new systematic fetching approach
            const { pools, applications, totalFunding } = await fetchSystemDataSystematically(source.id, source.source);
            
            return {
              name: source.name,
              type: source.type,
              source: source.source,
              totalFunding,
              totalApplications: applications.length,
              totalPools: pools.length,
              approvalRate: undefined, // Coming soon
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
              approvalRate: undefined, // Coming soon
              compatibility: source.standardization.compatibility,
              fundingMechanisms: source.features.fundingMechanism,
              description: source.description,
              addedDate: source.metadata.addedDate
            };
          }
        })
      ]);

      const validSystems = systemsWithStats
        .filter(result => result.status === 'fulfilled')
        .map(result => (result as PromiseFulfilledResult<any>).value);

      return validSystems;
    } catch (error) {
      console.error('Error fetching systems:', error);
      return [];
    }
  },

  // Get comprehensive ecosystem-wide statistics using accurate data
  async getEcosystemStats(): Promise<EcosystemStats> {
    const cacheKey = 'dashboard-ecosystem-stats-accurate';
    const cached = queryClient.getQueryData([cacheKey]);
    if (cached) return cached as EcosystemStats;

    try {
      // Use the new accurate API endpoint
      const stats = await accurateApi.getEcosystemStats();

      // Transform to match expected interface
      const ecosystemStats: EcosystemStats = {
        totalFunding: stats.totalFunding,
        totalGrantRounds: stats.totalGrantRounds || stats.totalPools || 0,
        totalSystems: stats.totalSystems,
        totalProjects: stats.totalApplications, // Each application represents a project
        totalApplications: stats.totalApplications,
        averageApprovalRate: stats.averageApprovalRate
      };

      queryClient.setQueryData([cacheKey], ecosystemStats);
      return ecosystemStats;
    } catch (error) {
      console.error('Error fetching accurate ecosystem stats:', error);

      // Fallback to legacy method only if accurate API fails
      try {
        const systems = await this.getAllSystems();

        const fallbackStats: EcosystemStats = {
          totalFunding: systems.reduce((sum, system) => sum + (system.totalFunding || 0), 0),
          totalGrantRounds: systems.reduce((sum, system) => sum + (system.totalPools || 0), 0),
          totalSystems: systems.length,
          totalProjects: systems.reduce((sum, system) => sum + (system.totalApplications || 0), 0),
          totalApplications: systems.reduce((sum, system) => sum + (system.totalApplications || 0), 0),
          averageApprovalRate: systems.length > 0 ?
            systems.reduce((sum, system) => sum + (system.approvalRate || 0), 0) / systems.length : 0
        };

        return fallbackStats;
      } catch (fallbackError) {
        console.error('Fallback ecosystem stats also failed:', fallbackError);
        return {
          totalFunding: 0,
          totalGrantRounds: 0,
          totalSystems: 0,
          totalProjects: 0,
          totalApplications: 0,
          averageApprovalRate: 0
        };
      }
    }
  },

  // Get detailed data for a specific system
  async getSystemDetails(systemName: string): Promise<{
    pools: GrantPool[];
    applications: GrantApplication[];
    stats: {
      totalApplications: number;
      approvalRate?: number;
      totalFunding: number;
    };
  }> {
    const cacheKey = `dashboard-system-${systemName}`;
    const cached = queryClient.getQueryData([cacheKey]);
    if (cached) return cached as any;

    try {
      // Use the systematic fetching approach for all systems
      const systemSource = ['octant', 'giveth'].includes(systemName.toLowerCase()) ? 'opengrants' : 'daoip5';
      const { pools, applications, totalFunding } = await fetchSystemDataSystematically(systemName, systemSource);
      
      console.log(`System details for ${systemName}: ${pools.length} pools, ${applications.length} applications, $${totalFunding} funding`);

      const result = {
        pools,
        applications,
        stats: {
          totalApplications: applications.length,
          approvalRate: undefined, // Coming soon - don't calculate
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
          approvalRate: undefined, // Coming soon
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

// Utility function to format currency with 3 decimal places accuracy
export const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(3)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(3)}K`;
  } else {
    return `$${amount.toFixed(3)}`;
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
    'celo-org': '#F59E0B', // amber (mapped to celo-org system ID)
    'celopg': '#F59E0B', // amber (mapped to celopg system ID)
    default: '#800020' // maroon
  };
  
  return colors[systemName.toLowerCase()] || colors.default;
};