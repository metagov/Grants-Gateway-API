import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateApiKey, requireAuth, AuthenticatedRequest, requestLoggingMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { OctantAdapter } from "./adapters/octant";
import { GivethAdapter } from "./adapters/giveth";
import { setupAuth, isAuthenticated } from "./replitAuth";

import { BaseAdapter } from "./adapters/base";
import { createPaginationMeta, parsePaginationParams } from "./utils/pagination";
import { PaginatedResponse, registrationSchema } from "../shared/schema";
import cors from "cors";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://your-domain.com'
      : true,
    credentials: true
  }));

  // Apply comprehensive request logging to ALL routes
  app.use(requestLoggingMiddleware);

  // Auth middleware setup
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getOAuthUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // API user registration endpoint
  app.post('/api/auth/register', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userClaims = req.user.claims;

      // Validate request body
      const validationResult = registrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.issues
        });
      }

      const { orgName, intentOfUse } = validationResult.data;

      // Check if user already has API access
      const existingApiUser = await storage.getApiUserByReplitId(userId);
      if (existingApiUser) {
        return res.status(409).json({
          error: "User already registered",
          message: "You already have API access. Contact support if you need a new API key."
        });
      }

      // Create API user
      const apiUser = await storage.createApiUser({
        replitUserId: userId,
        email: userClaims.email || '',
        name: `${userClaims.first_name || ''} ${userClaims.last_name || ''}`.trim() || 'Unknown',
        orgName,
        intentOfUse,
        status: 'active'
      });

      // Generate API key
      const rawApiKey = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
      const keyPreview = rawApiKey.slice(-4);

      // Set expiration to 3 months from now
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3);

      // Save API key
      await storage.createApiKey({
        userId: apiUser.id,
        keyHash,
        keyPreview,
        name: 'Default API Key',
        expiresAt,
        status: 'active'
      });

      res.json({
        message: "Registration successful",
        apiKey: rawApiKey,
        expiresAt: expiresAt.toISOString(),
        user: {
          id: apiUser.id,
          email: apiUser.email,
          name: apiUser.name,
          orgName: apiUser.orgName
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Registration failed",
        message: "An error occurred during registration"
      });
    }
  });

  // Admin routes - only accessible to admin users
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { adminService } = await import('./services/admin-service');
      
      // Check if user is admin
      const isAdmin = await adminService.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          error: "Access denied",
          message: "Admin access required"
        });
      }

      const stats = await adminService.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to fetch admin statistics"
      });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { adminService } = await import('./services/admin-service');
      
      // Check if user is admin
      const isAdmin = await adminService.isAdmin(userId);
      if (!isAdmin) {
        return res.status(403).json({ 
          error: "Access denied",
          message: "Admin access required"
        });
      }

      const users = await adminService.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to fetch users"
      });
    }
  });

  app.get('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const { userId } = req.params;
      const { adminService } = await import('./services/admin-service');
      
      // Check if user is admin
      const isAdmin = await adminService.isAdmin(currentUserId);
      if (!isAdmin) {
        return res.status(403).json({ 
          error: "Access denied",
          message: "Admin access required"
        });
      }

      const userDetail = await adminService.getUserDetail(userId);
      if (!userDetail) {
        return res.status(404).json({ 
          error: "User not found",
          message: `User with ID ${userId} not found`
        });
      }

      res.json(userDetail);
    } catch (error) {
      console.error('Error fetching user detail:', error);
      res.status(500).json({ 
        error: "Internal server error",
        message: "Failed to fetch user details"
      });
    }
  });

  // Apply middleware only to legacy API routes - REQUIRE API tokens
  app.use('/api/v1', authenticateApiKey, requireAuth);
  app.use('/api/v1', rateLimitMiddleware);

  // Initialize adapters for API functionality (only systems with full DAOIP-5 support)
  const adapters: { [key: string]: BaseAdapter } = {
    octant: new OctantAdapter(),
    giveth: new GivethAdapter(),
  };

  // Helper function to get adapter
  function getAdapter(system?: string): BaseAdapter[] {
    if (system && adapters[system]) {
      return [adapters[system]];
    }
    return Object.values(adapters);
  }

  // API logging middleware - only for legacy routes
  app.use('/api/v1', async (req, res, next) => {
    const aReq = req as AuthenticatedRequest;
    const start = Date.now();
    
    res.on('finish', async () => {
      const responseTime = Date.now() - start;
      
      try {
        // Legacy API logging for backward compatibility
        const userId = typeof aReq.user?.id === 'number' ? aReq.user.id : null;
        await storage.createApiLog({
          userId,
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
  app.get('/api/v1/grantSystems', async (req, res) => {
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

  app.get('/api/v1/grantSystems/:id', async (req, res) => {
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
  app.get('/api/v1/grantPools', async (req, res) => {
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

  app.get('/api/v1/grantPools/:id', async (req, res) => {
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
  app.get('/api/v1/health', async (req, res) => {
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

  // Public endpoints for frontend (cached data, no auth required)
  app.get('/api/public/daoip5/systems', async (req, res) => {
    try {
      const { daoip5Service } = await import('./services/daoip5-service');
      const summaries = await daoip5Service.getAllSystemSummaries();
      res.json(summaries);
    } catch (error) {
      console.error('Failed to fetch DAOIP5 systems:', error);
      res.status(500).json({ error: 'Failed to fetch DAOIP5 systems' });
    }
  });

  app.get('/api/public/daoip5/:system/summary', async (req, res) => {
    try {
      const { system } = req.params;
      const { daoip5Service } = await import('./services/daoip5-service');
      const summary = await daoip5Service.getSystemSummary(system);
      res.json(summary);
    } catch (error) {
      console.error(`Failed to fetch DAOIP5 summary for ${req.params.system}:`, error);
      res.status(500).json({ error: `Failed to fetch summary for ${req.params.system}` });
    }
  });

  app.get('/api/public/daoip5/:system/:pool', async (req, res) => {
    try {
      const { system, pool } = req.params;
      const { daoip5Service } = await import('./services/daoip5-service');
      const poolData = await daoip5Service.getPoolData(system, pool);
      res.json(poolData);
    } catch (error) {
      console.error(`Failed to fetch DAOIP5 pool data for ${req.params.system}/${req.params.pool}:`, error);
      res.status(500).json({ error: `Failed to fetch pool data for ${req.params.system}` });
    }
  });

  // Apply authentication middleware to all proxy endpoints - REQUIRE API tokens
  app.use('/api/proxy', authenticateApiKey, requireAuth);
  app.use('/api/proxy', rateLimitMiddleware);

  // DAOIP5 API Proxy endpoints to handle CORS
  app.get('/api/proxy/daoip5', async (req, res) => {
    try {
      const response = await fetch('https://daoip5.daostar.org/', {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Failed to fetch DAOIP5 systems:', error);
      res.status(500).json({ error: 'Failed to fetch DAOIP5 systems' });
    }
  });

  app.get('/api/proxy/daoip5/:system', async (req, res) => {
    try {
      const { system } = req.params;
      const response = await fetch(`https://daoip5.daostar.org/${system}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Failed to fetch DAOIP5 pools for ${req.params.system}:`, error);
      res.status(500).json({ error: `Failed to fetch pools for ${req.params.system}` });
    }
  });

  app.get('/api/proxy/daoip5/:system/:filename', async (req, res) => {
    try {
      const { system, filename } = req.params;
      const response = await fetch(`https://daoip5.daostar.org/${system}/${filename}.json`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error(`Failed to fetch DAOIP5 pool data for ${req.params.system}/${req.params.filename}:`, error);
      res.status(500).json({ error: `Failed to fetch pool data for ${req.params.system}` });
    }
  });

  app.get('/api/v1/health/:adapter', async (req, res) => {
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
  app.get('/api/v1/health-quick', async (req, res) => {
    try {
      const { healthService } = await import('./services/health');
      const quickHealth = healthService.getQuickHealth();
      res.json(quickHealth);
    } catch (error) {
      res.status(503).json({ status: 'down' });
    }
  });

  // Applications endpoints
  app.get('/api/v1/grantApplications', async (req, res) => {
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

  app.get('/api/v1/grantApplications/:id', async (req, res) => {
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
        applications: "/api/v1/applications"
      },
      supportedSystems: Object.keys(adapters),
      documentation: "https://docs.daostar.org/"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
