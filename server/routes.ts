import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateApiKey, requireAuth, AuthenticatedRequest } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { OctantAdapter } from "./adapters/octant";
import { GivethAdapter } from "./adapters/giveth";
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
    giveth: new GivethAdapter()
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
        applications: "/api/v1/applications"
      },
      supportedSystems: Object.keys(adapters),
      documentation: "https://docs.opengrants.dev"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
