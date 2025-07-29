import { BaseAdapter, type DAOIP5System, type DAOIP5GrantPool, type DAOIP5Application, type QueryFilters, type PaginatedResult } from "./base";

export class QuestbookAdapter extends BaseAdapter {
  private cache: any = {};
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super("Questbook", process.env.QUESTBOOK_API_URL || "https://api.questbook.app");
  }

  async getSystems(): Promise<DAOIP5System[]> {
    return [{
      "@context": "http://www.daostar.org/schemas",
      name: "Questbook",
      type: "DAO",
      grantPoolsURI: "/api/v1/pools?system=questbook",
      extensions: {
        "app.questbook.systemMetadata": {
          platform: "questbook",
          description: "Decentralized grants management for Web3 ecosystems",
          website: "https://questbook.app",
          apiEndpoint: this.baseUrl,
          supportedNetworks: ["polygon", "ethereum", "arbitrum"],
          fundingMechanisms: ["milestone_based", "direct_grants"],
          established: "2021",
          integrationType: "Direct DAOIP-5"
        }
      }
    }];
  }

  async getSystem(id: string): Promise<DAOIP5System | null> {
    const systems = await this.getSystems();
    return systems[0] || null;
  }

  async getPools(filters?: QueryFilters): Promise<DAOIP5GrantPool[]> {
    // For health check, just verify the DAOIP-5 endpoint is accessible
    const response = await fetch(`${this.baseUrl}/daoip-5`);
    if (!response.ok) {
      throw new Error(`Questbook API returned ${response.status}`);
    }
    
    // Return empty array for now since we're primarily using this for health monitoring
    return [];
  }

  async getPool(id: string): Promise<DAOIP5GrantPool | null> {
    return null;
  }

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    return [];
  }

  async getPoolsPaginated(filters?: QueryFilters): Promise<PaginatedResult<DAOIP5GrantPool>> {
    const pools = await this.getPools(filters);
    return {
      data: pools,
      totalCount: pools.length
    };
  }

  async getApplicationsPaginated(filters?: QueryFilters): Promise<PaginatedResult<DAOIP5Application>> {
    const applications = await this.getApplications(filters);
    return {
      data: applications,
      totalCount: applications.length
    };
  }

  async getApplication(id: string): Promise<DAOIP5Application | null> {
    return null;
  }

  // Health check method for external API monitoring
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'down'; endpoints: Record<string, boolean> }> {
    const endpoints: Record<string, boolean> = {};
    
    try {
      // Test DAOIP-5 endpoint
      const daoipResponse = await fetch(`${this.baseUrl}/daoip-5`, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      endpoints['daoip-5'] = daoipResponse.ok;
      
      const allHealthy = Object.values(endpoints).every(status => status);
      
      return {
        status: allHealthy ? 'healthy' : 'degraded',
        endpoints
      };
    } catch (error) {
      console.error('Questbook health check failed:', error);
      return {
        status: 'down',
        endpoints: { 'daoip-5': false }
      };
    }
  }
}