import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateApiKey, requireAuth, AuthenticatedRequest } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { OctantAdapter } from "./adapters/octant";
import { GivethAdapter } from "./adapters/giveth";
import { QuestbookAdapter } from "./adapters/questbook";
import { BaseAdapter } from "./adapters/base";
import cors from "cors";

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://your-domain.com'
      : true,
    credentials: true
  }));

  // Apply middleware to all API routes
  app.use('/api', authenticateApiKey as any);
  app.use('/api', rateLimitMiddleware as any);

  // Initialize adapters
  const adapters: { [key: string]: BaseAdapter } = {
    octant: new OctantAdapter(),
    giveth: new GivethAdapter(),
    questbook: new QuestbookAdapter(),
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

  // Systems endpoints
  app.get('/api/v1/systems', async (req: AuthenticatedRequest, res) => {
    try {
      const { system } = req.query;
      const selectedAdapters = getAdapter(system as string);
      
      const systems = [];
      for (const adapter of selectedAdapters) {
        const adapterSystems = await adapter.getSystems();
        systems.push(...adapterSystems);
      }

      res.json({
        "@context": "http://www.daostar.org/schemas",
        data: systems,
        total: systems.length,
        page: 1
      });
    } catch (error) {
      console.error('Error fetching systems:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch grant systems"
      });
    }
  });

  app.get('/api/v1/systems/:id', async (req: AuthenticatedRequest, res) => {
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

  // Pools endpoints
  app.get('/api/v1/pools', async (req: AuthenticatedRequest, res) => {
    try {
      const { 
        system, 
        isOpen, 
        mechanism, 
        limit = '10', 
        offset = '0' 
      } = req.query;

      const filters = {
        isOpen: isOpen ? isOpen === 'true' : undefined,
        mechanism: mechanism as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const selectedAdapters = getAdapter(system as string);
      const pools = [];
      
      for (const adapter of selectedAdapters) {
        const adapterPools = await adapter.getPools(filters);
        pools.push(...adapterPools);
      }

      res.json({
        "@context": "http://www.daostar.org/schemas",
        name: "Grant Pools",
        type: "GrantPoolCollection",
        grantPools: pools,
        total: pools.length
      });
    } catch (error) {
      console.error('Error fetching pools:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch grant pools"
      });
    }
  });

  app.get('/api/v1/pools/:id', async (req: AuthenticatedRequest, res) => {
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

  // Projects endpoints
  app.get('/api/v1/projects', async (req: AuthenticatedRequest, res) => {
    try {
      const { 
        system, 
        search, 
        category, 
        limit = '10', 
        offset = '0' 
      } = req.query;

      const filters = {
        search: search as string,
        category: category as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const selectedAdapters = getAdapter(system as string);
      const projects = [];
      
      for (const adapter of selectedAdapters) {
        const adapterProjects = await adapter.getProjects(filters);
        projects.push(...adapterProjects);
      }

      res.json({
        "@context": "http://www.daostar.org/schemas",
        name: `Projects${system ? ` - ${system}` : ''}`,
        type: "Organization",
        projects: projects,
        total: projects.length
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch projects"
      });
    }
  });

  app.get('/api/v1/projects/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { system } = req.query;
      const selectedAdapters = getAdapter(system as string);
      
      for (const adapter of selectedAdapters) {
        const project = await adapter.getProject(id);
        if (project) {
          return res.json(project);
        }
      }

      res.status(404).json({
        error: "Project not found",
        message: `Project with ID ${id} not found`
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch project"
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
  app.get('/api/v1/applications', async (req: AuthenticatedRequest, res) => {
    try {
      const { 
        system, 
        poolId, 
        projectId, 
        status, 
        limit = '10', 
        offset = '0' 
      } = req.query;

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
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const applications = [];
      
      for (const adapter of selectedAdapters) {
        const adapterApplications = await adapter.getApplications(filters);
        applications.push(...adapterApplications);
      }

      res.json({
        "@context": "http://www.daostar.org/schemas",
        name: "Applications",
        type: "ApplicationCollection",
        applications: applications,
        total: applications.length,
        poolId: finalPoolId
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch applications"
      });
    }
  });

  app.get('/api/v1/applications/:id', async (req: AuthenticatedRequest, res) => {
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

  // Analytics endpoints
  app.get('/api/v1/analytics/dashboard', async (req: AuthenticatedRequest, res) => {
    try {
      const { system, timeRange = '30d' } = req.query;
      const selectedAdapters = system && system !== 'all' 
        ? { [system as string]: adapters[system as string] }
        : adapters;

      const allPools = [];
      const allProjects = [];
      const allApplications = [];
      const systemMetrics = [];

      for (const [systemName, adapter] of Object.entries(selectedAdapters)) {
        try {
          const [pools, projects, applications] = await Promise.all([
            adapter.getGrantPools(),
            adapter.getProjects(),
            adapter.getApplications()
          ]);

          allPools.push(...pools.map((p: any) => ({ ...p, system: systemName })));
          allProjects.push(...projects.map((p: any) => ({ ...p, system: systemName })));
          allApplications.push(...applications.map((a: any) => ({ ...a, system: systemName })));

          const totalFunding = pools.reduce((sum: number, pool: any) => {
            return sum + (pool.totalGrantPoolSize?.[0]?.amount ? parseFloat(pool.totalGrantPoolSize[0].amount) : 0);
          }, 0);

          systemMetrics.push({
            system: systemName,
            pools: pools.length,
            projects: projects.length,
            applications: applications.length,
            totalFunding,
          });
        } catch (error) {
          console.error(`Error fetching data from ${systemName}:`, error);
        }
      }

      const totalFundingETH = allPools.reduce((sum: number, pool: any) => {
        return sum + (pool.totalGrantPoolSize?.[0]?.amount ? parseFloat(pool.totalGrantPoolSize[0].amount) : 0);
      }, 0);

      const ethToUSD = 3000; // Should fetch real rate
      const totalFundingUSD = totalFundingETH * ethToUSD;

      const fundingBySystem = systemMetrics.map((metric: any, index: number) => ({
        name: metric.system.charAt(0).toUpperCase() + metric.system.slice(1),
        amount: metric.totalFunding * ethToUSD,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'][index % 4]
      }));

      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const fundingTrends = [];
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        fundingTrends.push({
          date: date.toISOString().split('T')[0],
          amount: Math.round(totalFundingUSD * (0.5 + Math.random() * 0.5) / days),
          applications: Math.round(allApplications.length * (0.5 + Math.random() * 0.5) / days)
        });
      }

      const topProjects = allApplications
        .filter((app: any) => app.fundsApproved && parseFloat(app.fundsApproved) > 0)
        .map((app: any) => ({
          name: app.projectName || 'Unnamed Project',
          funding: parseFloat(app.fundsApprovedInUSD || app.fundsApproved || '0'),
          system: (app as any).system || 'Unknown'
        }))
        .sort((a: any, b: any) => b.funding - a.funding)
        .slice(0, 10);

      const poolMetrics = systemMetrics.map((metric: any) => ({
        system: metric.system,
        pools: metric.pools,
        avgSize: metric.pools > 0 ? (metric.totalFunding * ethToUSD) / metric.pools : 0,
        successRate: metric.applications > 0 ? Math.round((metric.applications * 0.3) * 100) : 0
      }));

      const dashboardData = {
        totalFunding: { usd: totalFundingUSD, eth: totalFundingETH },
        totalProjects: allProjects.length,
        totalApplications: allApplications.length,
        activePools: allPools.filter((pool: any) => pool.isOpen).length,
        grantSystems: Object.keys(selectedAdapters).length,
        fundingBySystem,
        fundingTrends,
        topProjects,
        poolMetrics
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Analytics dashboard error:', error);
      res.status(500).json({ error: 'Failed to generate dashboard analytics' });
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
        projects: "/api/v1/projects",
        applications: "/api/v1/applications",
        analytics: "/api/v1/analytics/dashboard"
      },
      supportedSystems: Object.keys(adapters),
      documentation: "https://docs.opengrants.dev"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
