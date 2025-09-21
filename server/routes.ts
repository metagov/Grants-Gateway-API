import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateApiKey, requireAuth, AuthenticatedRequest } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { OctantAdapter } from "./adapters/octant";
import { GivethAdapter } from "./adapters/giveth";

import { BaseAdapter } from "./adapters/base";
import { createPaginationMeta, parsePaginationParams } from "./utils/pagination";
import { PaginatedResponse } from "../shared/schema";
import cors from "cors";

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL || 'https://your-domain.com'
      : true,
    credentials: true
  }));

  // Add API proxy endpoints to avoid CORS issues
  app.get('/api/proxy/opengrants/:endpoint', async (req, res) => {
    try {
      const { endpoint } = req.params;
      const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
      const url = `https://grants.daostar.org/api/v1/${endpoint}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OpenGrants API returned ${response.status}`);
      }

      const data = await response.json();
      if (!res.headersSent) {
        res.json(data);
      }
    } catch (error) {
      console.error('OpenGrants proxy error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to fetch from OpenGrants API' });
      }
    }
  });

  app.get('/api/proxy/daoip5/:system/:file', async (req, res) => {
    try {
      const { system, file } = req.params;
      const url = `https://daoip5.daostar.org/${system}/${file}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`DAOIP-5 API returned ${response.status}`);
      }

      const data = await response.json();
      if (!res.headersSent) {
        res.json(data);
      }
    } catch (error) {
      console.error('DAOIP-5 proxy error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to fetch from DAOIP-5 API' });
      }
    }
  });

  // Directory listing for DAOIP-5 systems
  app.get('/api/proxy/daoip5/:system', async (req, res) => {
    try {
      const { system } = req.params;
      const url = `https://daoip5.daostar.org/${system}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`DAOIP-5 API returned ${response.status}`);
      }

      const data = await response.json();
      if (!res.headersSent) {
        res.json(data);
      }
    } catch (error) {
      console.error('DAOIP-5 directory proxy error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to fetch directory from DAOIP-5 API' });
      }
    }
  });



  // Apply middleware to all API routes
  app.use('/api', authenticateApiKey as any);
  app.use('/api', rateLimitMiddleware as any);

  // Initialize adapters dynamically based on configuration
  let adapters: { [key: string]: BaseAdapter } = {};

  // Load adapters based on systems configuration
  const initializeAdapters = async () => {
    try {
      const { systemsConfigService } = await import('./services/systemsConfigService');
      const activeSystems = await systemsConfigService.getActiveSystems();
      
      console.log(`🔧 Initializing adapters for ${activeSystems.length} active systems`);
      
      for (const systemConfig of activeSystems) {
        if (systemConfig.source === 'opengrants') {
          // Initialize OpenGrants-based adapters
          if (systemConfig.id === 'octant') {
            adapters[systemConfig.id] = new OctantAdapter();
          } else if (systemConfig.id === 'giveth') {
            adapters[systemConfig.id] = new GivethAdapter();
          }
          console.log(`✅ Initialized ${systemConfig.id} adapter (${systemConfig.source})`);
        }
        // DAOIP-5 systems don't need adapters as they use static data fetching
      }

      console.log(`🎯 Active adapters: ${Object.keys(adapters).join(', ')}`);
    } catch (error) {
      console.error('❌ Error initializing adapters:', error);
      // Fallback to default adapters
      adapters = {
        octant: new OctantAdapter(),
        giveth: new GivethAdapter(),
      };
    }
  };

  // Initialize adapters on startup
  await initializeAdapters();

  // Helper function to get adapter
  function getAdapter(system?: string): BaseAdapter[] {
    if (system && adapters[system]) {
      return [adapters[system]];
    }
    return Object.values(adapters);
  }

  // API logging middleware
  app.use('/api', async (req: AuthenticatedRequest, res, next) => {
    const start = Date.now();
    
    res.on('finish', async () => {
      const responseTime = Date.now() - start;
      
      try {
        await storage.createApiLog({
          userId: req.user?.id || null,
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime,
          userAgent: req.get('User-Agent') || null,
          ipAddress: req.ip || null
        });
      } catch (error) {
        console.error('Failed to log API request:', error);
      }
    });
    
    next();
  });

  // Grant Systems endpoints
  app.get('/api/v1/grantSystems', async (req: AuthenticatedRequest, res) => {
    try {
      const { system } = req.query;
      const { limit, offset } = parsePaginationParams(req.query);
      const selectedAdapters = getAdapter(system as string);
      
      const allSystems = [];
      for (const adapter of selectedAdapters) {
        const adapterSystems = await adapter.getSystems();
        allSystems.push(...adapterSystems);
      }

      // Handle single system vs collection responses
      if (system && typeof system === 'string' && allSystems.length === 1) {
        // Single system query - return flattened object
        const systemData = allSystems[0];
        res.json(systemData);
      } else {
        // Collection query - return paginated data array
        const totalCount = allSystems.length;
        const paginatedSystems = allSystems.slice(offset, offset + limit);
        const paginationMeta = createPaginationMeta(totalCount, limit, offset);

        const response: PaginatedResponse<any> = {
          "@context": "http://www.daostar.org/schemas",
          data: paginatedSystems,
          pagination: paginationMeta
        };

        res.json(response);
      }
    } catch (error) {
      console.error('Error fetching systems:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch grant systems"
      });
    }
  });

  app.get('/api/v1/grantSystems/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { system } = req.query;
      const selectedAdapters = getAdapter(system as string);
      
      for (const adapter of selectedAdapters) {
        const systemData = await adapter.getSystem(id);
        if (systemData) {
          return res.json(systemData);
        }
      }

      res.status(404).json({
        error: "System not found",
        message: `Grant system with ID ${id} not found`
      });
    } catch (error) {
      console.error('Error fetching system:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch grant system"
      });
    }
  });

  // Grant Pools endpoints
  app.get('/api/v1/grantPools', async (req: AuthenticatedRequest, res) => {
    try {
      const { system, isOpen, mechanism } = req.query;
      const { limit, offset } = parsePaginationParams(req.query);

      const filters = {
        isOpen: isOpen ? isOpen === 'true' : undefined,
        mechanism: mechanism as string,
        limit,
        offset
      };

      const selectedAdapters = getAdapter(system as string);
      let allPools: any[] = [];
      let totalCount = 0;
      
      for (const adapter of selectedAdapters) {
        const result = await adapter.getPoolsPaginated(filters);
        allPools.push(...result.data);
        totalCount += result.totalCount;
      }

      // Get actual entity metadata for DAOIP-5 compliance
      let entityName = "Multi-System Grant Data";
      let entityType = "GrantDataAggregator";
      let extensions: Record<string, any> = {};

      if (selectedAdapters.length === 1) {
        // Single system - use actual entity metadata
        const systemData = await selectedAdapters[0].getSystems();
        if (systemData.length > 0) {
          entityName = systemData[0].name;
          entityType = systemData[0].type;
        }
      } else {
        // Multi-system aggregation - mark as extension
        extensions["io.opengrants.aggregated"] = {
          systems: ["Multi-System"],  // Simplified for now
          totalAdapters: selectedAdapters.length
        };
      }

      // Ensure all pools have required DAOIP-5 fields
      const validatedPools = allPools.map(pool => ({
        type: "GrantPool",
        id: pool.id || `unknown:pool:${pool.name?.toLowerCase().replace(/\s+/g, '-') || 'unnamed'}`,
        name: pool.name || "Unnamed Pool",
        description: pool.description || "No description available",
        grantFundingMechanism: pool.grantFundingMechanism || "Direct Grants",
        isOpen: pool.isOpen !== undefined ? pool.isOpen : false,
        // Optional fields
        ...(pool.closeDate && { closeDate: pool.closeDate }),
        ...(pool.applicationsURI && { applicationsURI: pool.applicationsURI }),
        ...(pool.governanceURI && { governanceURI: pool.governanceURI }),
        ...(pool.attestationIssuersURI && { attestationIssuersURI: pool.attestationIssuersURI }),
        ...(pool.requiredCredentials && { requiredCredentials: pool.requiredCredentials }),
        ...(pool.totalGrantPoolSize && { totalGrantPoolSize: pool.totalGrantPoolSize }),
        ...(pool.email && { email: pool.email }),
        ...(pool.image && { image: pool.image }),
        ...(pool.coverImage && { coverImage: pool.coverImage }),
        ...(pool.extensions && { extensions: pool.extensions })
      }));

      const paginationMeta = createPaginationMeta(totalCount, limit, offset);
      
      // Add pagination to extensions for API metadata
      extensions["io.opengrants.pagination"] = paginationMeta;
      
      // DAOIP-5 compliant response structure
      const response = {
        "@context": "http://www.daostar.org/schemas",
        name: entityName,
        type: entityType,
        grantPools: validatedPools,
        ...(Object.keys(extensions).length > 0 && { extensions })
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching pools:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch grant pools"
      });
    }
  });

  app.get('/api/v1/grantPools/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { system } = req.query;
      const selectedAdapters = getAdapter(system as string);
      
      for (const adapter of selectedAdapters) {
        const pool = await adapter.getPool(id);
        if (pool) {
          return res.json(pool);
        }
      }

      res.status(404).json({
        error: "Pool not found",
        message: `Grant pool with ID ${id} not found`
      });
    } catch (error) {
      console.error('Error fetching pool:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch grant pool"
      });
    }
  });



  // Health endpoints
  app.get('/api/v1/health', async (req: AuthenticatedRequest, res) => {
    try {
      const { healthService } = await import('./services/health');
      const forceRefresh = req.query.refresh === 'true';
      const health = await healthService.getSystemHealth(forceRefresh);
      
      // Set appropriate HTTP status based on health
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(health);
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(503).json({
        status: 'down',
        timestamp: new Date().toISOString(),
        error: 'Health check system failure'
      });
    }
  });

  app.get('/api/v1/health/:adapter', async (req: AuthenticatedRequest, res) => {
    try {
      const { healthService } = await import('./services/health');
      const { adapter } = req.params;
      const adapterHealth = await healthService.getAdapterHealth(adapter);
      
      if (!adapterHealth) {
        return res.status(404).json({
          error: "Adapter not found",
          message: `Health status for adapter '${adapter}' not available`
        });
      }

      const statusCode = adapterHealth.status === 'healthy' ? 200 :
                        adapterHealth.status === 'degraded' ? 200 : 503;
      
      res.status(statusCode).json(adapterHealth);
    } catch (error) {
      console.error(`Health check failed for adapter ${req.params.adapter}:`, error);
      res.status(503).json({
        status: 'down',
        timestamp: new Date().toISOString(),
        error: 'Adapter health check failure'
      });
    }
  });

  // Quick health check endpoint (no detailed checks, uses cache)
  app.get('/api/v1/health-quick', async (req: AuthenticatedRequest, res) => {
    try {
      const { healthService } = await import('./services/health');
      const quickHealth = healthService.getQuickHealth();
      res.json(quickHealth);
    } catch (error) {
      res.status(503).json({ status: 'down' });
    }
  });

  // Applications endpoints
  app.get('/api/v1/grantApplications', async (req: AuthenticatedRequest, res) => {
    try {
      const { system, poolId, projectId, status } = req.query;
      const { limit, offset } = parsePaginationParams(req.query);
      
      // DEBUG: Log the incoming query parameters
      console.log(`[QUERY DEBUG] /api/v1/grantApplications called with:`, { system, poolId, projectId, status, limit, offset });

      const selectedAdapters = getAdapter(system as string);
      let finalPoolId = poolId as string;
      
      // If no poolId is provided, fetch the latest closed pool
      if (!poolId) {
        const allPools = [];
        for (const adapter of selectedAdapters) {
          const pools = await adapter.getPools({ limit: 20 });
          allPools.push(...pools);
        }
        
        if (allPools.length > 0) {
          // Find the latest closed pool specifically (where isOpen is false)
          const closedPools = allPools.filter(pool => !pool.isOpen);
          
          const latestPool = closedPools.length > 0 
            ? closedPools.reduce((latest, pool) => {
                if (!latest) return pool;
                const latestDate = latest.closeDate
                  ? new Date(latest.closeDate)
                  : new Date(0);
                const poolDate = pool.closeDate
                  ? new Date(pool.closeDate)
                  : new Date(0);
                return poolDate > latestDate ? pool : latest;
              })
            : allPools.reduce((latest, pool) => {
                // Fallback to any pool if no closed pools found
                if (!latest) return pool;
                const latestDate = latest.closeDate
                  ? new Date(latest.closeDate)
                  : new Date(0);
                const poolDate = pool.closeDate
                  ? new Date(pool.closeDate)
                  : new Date(0);
                return poolDate > latestDate ? pool : latest;
              }, allPools[0]);

          finalPoolId = latestPool?.id;
        }
      }

      const filters = {
        poolId: finalPoolId,
        projectId: projectId as string,
        status: status as string,
        limit,
        offset
      };

      let allApplications: any[] = [];
      let totalCount = 0;
      
      for (const adapter of selectedAdapters) {
        const result = await adapter.getApplicationsPaginated(filters);
        allApplications.push(...result.data);
        totalCount += result.totalCount;
      }

      // Group applications by grant pools to match DAOIP-5 schema
      const poolsMap = new Map<string, {
        id: string;
        name: string;
        applications: any[];
      }>();

      // Group applications by their grant pool
      allApplications.forEach(app => {
        const poolKey = app.grantPoolId || 'unknown';
        if (!poolsMap.has(poolKey)) {
          poolsMap.set(poolKey, {
            id: poolKey,
            name: app.grantPoolName || 'Unknown Pool',
            applications: []
          });
        }
        poolsMap.get(poolKey)!.applications.push(app);
      });

      // Convert to DAOIP-5 compliant structure
      const grantPools = Array.from(poolsMap.values()).map(pool => ({
        type: "GrantPool",
        id: pool.id,
        name: pool.name,
        applications: pool.applications
      }));

      // Determine system name based on selected adapters
      const systemStr = typeof system === 'string' ? system : '';
      const systemName = systemStr ? `${systemStr.charAt(0).toUpperCase()}${systemStr.slice(1)} Grant System` : "Multi-System Grant Data";
      const systemType = selectedAdapters.length === 1 ? "GrantSystem" : "GrantDataAggregator";

      const paginationMeta = createPaginationMeta(totalCount, limit, offset);
      
      const response = {
        "@context": "http://www.daostar.org/schemas",
        name: systemName,
        type: systemType,
        grantPools: grantPools,
        pagination: paginationMeta
      };

      res.json(response);
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch applications"
      });
    }
  });

  app.get('/api/v1/grantApplications/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { system } = req.query;
      const selectedAdapters = getAdapter(system as string);
      
      for (const adapter of selectedAdapters) {
        const application = await adapter.getApplication(id);
        if (application) {
          return res.json(application);
        }
      }

      res.status(404).json({
        error: "Application not found",
        message: `Application with ID ${id} not found`
      });
    } catch (error) {
      console.error('Error fetching application:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch application"
      });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        adapters: Object.keys(adapters)
      }
    });
  });



  // Accurate Analytics Endpoints
  app.get('/api/v1/analytics/ecosystem-stats', async (req: AuthenticatedRequest, res) => {
    try {
      const { accurateDataService } = await import('./services/accurateDataService.js');
      const stats = await accurateDataService.getEcosystemStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching ecosystem stats:', error);
      res.status(500).json({
        error: "Failed to fetch ecosystem statistics",
        message: "Unable to compute accurate ecosystem metrics"
      });
    }
  });

  app.get('/api/v1/analytics/system/:systemName', async (req: AuthenticatedRequest, res) => {
    try {
      const { systemName } = req.params;
      const { source = 'opengrants' } = req.query;
      const { accurateDataService } = await import('./services/accurateDataService.js');

      const metrics = await accurateDataService.calculateSystemMetrics(
        systemName,
        source as 'opengrants' | 'daoip5'
      );

      res.json(metrics);
    } catch (error) {
      console.error(`Error fetching system metrics for ${req.params.systemName}:`, error);
      res.status(500).json({
        error: "Failed to fetch system metrics",
        message: `Unable to compute metrics for system ${req.params.systemName}`
      });
    }
  });

  app.get('/api/v1/analytics/funding-trends', async (req: AuthenticatedRequest, res) => {
    try {
      const { accurateDataService } = await import('./services/accurateDataService.js');

      // This would need to be implemented to calculate quarterly trends from real data
      // For now, return a placeholder structure
      const trends = [
        { quarter: '2024-Q1', funding: 0, applications: 0 },
        { quarter: '2024-Q2', funding: 0, applications: 0 },
        { quarter: '2024-Q3', funding: 0, applications: 0 },
        { quarter: '2024-Q4', funding: 0, applications: 0 }
      ];

      res.json(trends);
    } catch (error) {
      console.error('Error fetching funding trends:', error);
      res.status(500).json({
        error: "Failed to fetch funding trends",
        message: "Unable to compute funding trend data"
      });
    }
  });

  // Systems configuration endpoints - READ ONLY
  app.get('/api/v1/systems/config/active', async (req: AuthenticatedRequest, res) => {
    try {
      const { systemsConfigService } = await import('./services/systemsConfigService');
      const activeSystems = await systemsConfigService.getActiveSystems();
      
      // Only return essential info for active systems
      const publicSystemsInfo = activeSystems.map(system => ({
        id: system.id,
        name: system.name,
        displayName: system.displayName,
        source: system.source,
        type: system.type,
        priority: system.priority,
        metadata: {
          description: system.metadata.description,
          website: system.metadata.website,
          supportedNetworks: system.metadata.supportedNetworks,
          fundingMechanisms: system.metadata.fundingMechanisms,
          established: system.metadata.established,
          compatibility: system.metadata.compatibility
        }
      }));
      
      res.json({ activeSystems: publicSystemsInfo });
    } catch (error) {
      console.error('Error fetching active systems:', error);
      res.status(500).json({
        error: "Failed to load active systems",
        message: "Unable to retrieve active systems configuration"
      });
    }
  });

  // API documentation endpoint
  app.get('/api/v1/docs', (req, res) => {
    res.json({
      name: "OpenGrants Gateway API",
      version: "1.0.0",
      description: "Unified interface for grant data using DAOIP-5 standard",
      endpoints: {
        systems: "/api/v1/systems",
        pools: "/api/v1/pools",
        applications: "/api/v1/applications",
        config: {
          activeSystems: "/api/v1/systems/config/active"
        },
        analytics: {
          ecosystemStats: "/api/v1/analytics/ecosystem-stats",
          systemMetrics: "/api/v1/analytics/system/:systemName",
          fundingTrends: "/api/v1/analytics/funding-trends"
        }
      },
      supportedSystems: Object.keys(adapters),
      documentation: "https://docs.daostar.org/"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
