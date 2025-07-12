import { OctantAdapter } from "../adapters/octant";
import { GivethAdapter } from "../adapters/giveth";

export interface AdapterHealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastChecked: string;
  endpoints?: Record<string, boolean>;
  error?: string;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  adapters: AdapterHealthStatus[];
  database: {
    status: 'healthy' | 'down';
    responseTime?: number;
  };
  summary: {
    totalAdapters: number;
    healthyAdapters: number;
    degradedAdapters: number;
    downAdapters: number;
  };
}

class HealthService {
  private healthCache: SystemHealthStatus | null = null;
  private lastHealthCheck: number = 0;
  private readonly HEALTH_CACHE_TTL = 30 * 1000; // 30 seconds

  async checkAdapterHealth(adapter: any, adapterName: string): Promise<AdapterHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity by fetching systems
      await adapter.getSystems();
      const responseTime = Date.now() - startTime;

      // If adapter has health check method, use it
      if (typeof adapter.healthCheck === 'function') {
        const healthResult = await adapter.healthCheck();
        return {
          name: adapterName,
          status: healthResult.status === 'healthy' ? 'healthy' : 'degraded',
          responseTime,
          lastChecked: new Date().toISOString(),
          endpoints: healthResult.endpoints
        };
      }

      return {
        name: adapterName,
        status: responseTime < 5000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        name: adapterName,
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkDatabaseHealth(): Promise<{ status: 'healthy' | 'down'; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      // Simple database connectivity check
      const { db } = await import("../db");
      await db.execute('SELECT 1');
      
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        status: 'down'
      };
    }
  }

  async getSystemHealth(forceRefresh: boolean = false): Promise<SystemHealthStatus> {
    const now = Date.now();
    
    // Return cached result if available and not expired
    if (!forceRefresh && this.healthCache && (now - this.lastHealthCheck) < this.HEALTH_CACHE_TTL) {
      return this.healthCache;
    }

    const adapters = [
      { instance: new OctantAdapter(), name: 'Octant' },
      { instance: new GivethAdapter(), name: 'Giveth' }
    ];

    // Check all adapters and database in parallel
    const [adapterStatuses, databaseStatus] = await Promise.all([
      Promise.all(adapters.map(({ instance, name }) => 
        this.checkAdapterHealth(instance, name)
      )),
      this.checkDatabaseHealth()
    ]);

    // Calculate summary statistics
    const summary = {
      totalAdapters: adapterStatuses.length,
      healthyAdapters: adapterStatuses.filter(a => a.status === 'healthy').length,
      degradedAdapters: adapterStatuses.filter(a => a.status === 'degraded').length,
      downAdapters: adapterStatuses.filter(a => a.status === 'down').length
    };

    // Determine overall system status
    let systemStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    
    if (databaseStatus.status === 'down' || summary.downAdapters === summary.totalAdapters) {
      systemStatus = 'down';
    } else if (summary.downAdapters > 0 || summary.degradedAdapters > 0) {
      systemStatus = 'degraded';
    }

    const healthStatus: SystemHealthStatus = {
      status: systemStatus,
      timestamp: new Date().toISOString(),
      adapters: adapterStatuses,
      database: databaseStatus,
      summary
    };

    // Update cache
    this.healthCache = healthStatus;
    this.lastHealthCheck = now;

    return healthStatus;
  }

  async getAdapterHealth(adapterName: string): Promise<AdapterHealthStatus | null> {
    const systemHealth = await this.getSystemHealth();
    return systemHealth.adapters.find(a => 
      a.name.toLowerCase() === adapterName.toLowerCase()
    ) || null;
  }

  // Get quick health status without detailed checks
  getQuickHealth(): { status: string; lastChecked?: string } {
    if (this.healthCache) {
      return {
        status: this.healthCache.status,
        lastChecked: this.healthCache.timestamp
      };
    }
    return { status: 'unknown' };
  }
}

export const healthService = new HealthService();