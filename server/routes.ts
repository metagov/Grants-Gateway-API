import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateApiKey, requireAuth, AuthenticatedRequest } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
// Octant and Giveth adapters removed - require specialized API integration

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

  // Initialize adapters for API functionality (only systems with full DAOIP-5 support)
  // Note: Octant and Giveth adapters removed as they require specialized integration
  const adapters: { [key: string]: BaseAdapter } = {
    // No adapters currently active - Octant and Giveth moved to specialized integration
  };

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

      // Apply pagination to systems
      const totalCount = allSystems.length;
      const paginatedSystems = allSystems.slice(offset, offset + limit);
      const paginationMeta = createPaginationMeta(totalCount, limit, offset);

      const response: PaginatedResponse<any> = {
        "@context": "http://www.daostar.org/schemas",
        data: paginatedSystems,
        pagination: paginationMeta
      };

      res.json(response);
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

      const paginationMeta = createPaginationMeta(totalCount, limit, offset);
      
      const response: PaginatedResponse<any> = {
        "@context": "http://www.daostar.org/schemas",
        data: allPools,
        pagination: paginationMeta
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

      const selectedAdapters = getAdapter(system as string);
      let finalPoolId = poolId as string;
      
      // If no poolId is provided, fetch the latest grant pool
      if (!poolId) {
        const latestPools = [];
        for (const adapter of selectedAdapters) {
          const pools = await adapter.getPools({ limit: 1, offset: 0 });
          if (pools.length > 0) {
            latestPools.push(pools[0]);
          }
        }
        
        // Use the first available pool as the latest
        if (latestPools.length > 0) {
          finalPoolId = latestPools[0].id;
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

      const paginationMeta = createPaginationMeta(totalCount, limit, offset);
      
      const response: PaginatedResponse<any> = {
        "@context": "http://www.daostar.org/schemas",
        data: allApplications,
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
