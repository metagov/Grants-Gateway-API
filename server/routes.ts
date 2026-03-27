import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateApiKey, AuthenticatedRequest, adminRouteGuard, requestLoggingMiddleware } from "./middleware/auth";
import { verifyPrivyToken, PrivyAuthenticatedRequest } from "./middleware/privyAuth";
import { rateLimitMiddleware } from "./middleware/rateLimit";
import { OctantAdapter } from "./adapters/octant";
import { GivethAdapter } from "./adapters/giveth";
import { SCFAdapter } from "./adapters/scf";
import { adminService } from "./services/admin-service";

import { BaseAdapter } from "./adapters/base";
import { createPaginationMeta, parsePaginationParams } from "./utils/pagination";
import { PaginatedResponse, registrationSchema } from "../shared/schema";
import cors from "cors";
import crypto from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://grants.daostar.org'
      : true,
    credentials: true
  }));

  // Apply comprehensive request logging to ALL routes
  app.use(requestLoggingMiddleware);

  // --- Auth routes (Privy JWT) ---

  app.get('/api/auth/user', verifyPrivyToken, async (req, res) => {
    const privyUser = (req as PrivyAuthenticatedRequest).privyUser!;
    try {
      const oauthUser = await storage.getOAuthUser(privyUser.userId);
      if (!oauthUser) {
        return res.json({ user: null, registered: false });
      }

      const apiUser = await storage.getApiUserByOAuthId(oauthUser.id);
      if (!apiUser) {
        return res.json({ user: { id: oauthUser.id, email: oauthUser.email }, registered: false });
      }

      const keys = await storage.getApiKeysByUserId(apiUser.id);
      const activeKey = keys.find(k => k.status === 'active' && new Date(k.expiresAt) > new Date());

      res.json({
        user: {
          id: apiUser.id,
          email: apiUser.email,
          name: apiUser.name,
          orgName: apiUser.orgName,
          status: apiUser.status,
          createdAt: apiUser.createdAt,
        },
        registered: true,
        apiKey: activeKey ? {
          preview: activeKey.keyPreview,
          expiresAt: activeKey.expiresAt,
          status: activeKey.status,
          createdAt: activeKey.createdAt,
        } : null,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post('/api/auth/register', verifyPrivyToken, async (req, res) => {
    const privyUser = (req as PrivyAuthenticatedRequest).privyUser!;
    try {
      // Validate body
      const parsed = registrationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Validation error", details: parsed.error.flatten().fieldErrors });
      }
      const { orgName, intentOfUse } = parsed.data;

      // Upsert oauthUsers record using Privy DID as the id
      const oauthUser = await storage.upsertOAuthUser({
        id: privyUser.userId,
        email: privyUser.email || null,
      });

      // Check if already registered
      const existing = await storage.getApiUserByOAuthId(oauthUser.id);
      if (existing) {
        return res.status(409).json({ error: "Already registered", message: "This account already has an API key." });
      }

      // Create apiUser
      const apiUser = await storage.createApiUser({
        oauthUserId: oauthUser.id,
        email: privyUser.email || oauthUser.email || 'unknown',
        name: privyUser.email?.split('@')[0] || 'User',
        orgName,
        intentOfUse,
        status: 'active',
      });

      // Generate API key
      const rawKey = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const keyPreview = rawKey.slice(-4);
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3);

      await storage.createApiKey({
        userId: apiUser.id,
        keyHash,
        keyPreview,
        expiresAt,
        status: 'active',
      });

      res.status(201).json({
        apiKey: rawKey,
        keyPreview,
        expiresAt: expiresAt.toISOString(),
        message: "Save your API key now.",
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all API keys for the logged-in user
  app.get('/api/auth/keys', verifyPrivyToken, async (req, res) => {
    const privyUser = (req as PrivyAuthenticatedRequest).privyUser!;
    try {
      const oauthUser = await storage.getOAuthUser(privyUser.userId);
      if (!oauthUser) {
        return res.json({ keys: [] });
      }

      const apiUser = await storage.getApiUserByOAuthId(oauthUser.id);
      if (!apiUser) {
        return res.json({ keys: [] });
      }

      const keys = await storage.getApiKeysByUserId(apiUser.id);
      
      // Return keys with preview (not the full key)
      const keysWithoutSecret = keys.map(k => ({
        id: k.id,
        keyPreview: k.keyPreview,
        status: k.status,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt,
        lastUsedAt: k.lastUsedAt,
      }));

      res.json({ keys: keysWithoutSecret });
    } catch (error) {
      console.error('Error fetching keys:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create a new API key (max 3 per user)
  app.post('/api/auth/keys', verifyPrivyToken, async (req, res) => {
    const privyUser = (req as PrivyAuthenticatedRequest).privyUser!;
    try {
      const oauthUser = await storage.getOAuthUser(privyUser.userId);
      if (!oauthUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const apiUser = await storage.getApiUserByOAuthId(oauthUser.id);
      if (!apiUser) {
        return res.status(401).json({ error: "Not registered" });
      }

      const existingKeys = await storage.getApiKeysByUserId(apiUser.id);
      const activeKeys = existingKeys.filter(k => k.status === 'active' && new Date(k.expiresAt) > new Date());
      if (activeKeys.length >= 3) {
        return res.status(400).json({ error: "Maximum of 3 active API keys allowed" });
      }

      const rawKey = crypto.randomBytes(32).toString('hex');
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const keyPreview = rawKey.slice(-4);
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 3);

      const newKey = await storage.createApiKey({
        userId: apiUser.id,
        keyHash,
        keyPreview,
        expiresAt,
        status: 'active',
      });

      res.status(201).json({
        id: newKey.id,
        apiKey: rawKey,
        keyPreview,
        expiresAt: expiresAt.toISOString(),
        message: "Save your API key now — it won't be shown again.",
      });
    } catch (error) {
      console.error('Error creating key:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // --- Admin routes (Privy JWT + admin check) ---

  app.get('/api/admin/stats', ...adminRouteGuard, async (_req, res) => {
    try {
      const stats = await adminService.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', ...adminRouteGuard, async (_req, res) => {
    try {
      const users = await adminService.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Admin users error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/users/:userId', ...adminRouteGuard, async (req, res) => {
    try {
      const detail = await adminService.getUserDetail(req.params.userId);
      if (!detail) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(detail);
    } catch (error) {
      console.error('Admin user detail error:', error);
      res.status(500).json({ error: "Failed to fetch user detail" });
    }
  });

  // API v1 routes - API key optional (anonymous gets 20 req/min, authenticated gets 100 req/min)
  app.use('/api/v1', authenticateApiKey);
  app.use('/api/v1', rateLimitMiddleware);

  // Initialize adapters for API functionality (only systems with full DAOIP-5 support)
  const adapters: { [key: string]: BaseAdapter } = {
    octant: new OctantAdapter(),
    giveth: new GivethAdapter(),
    scf: new SCFAdapter(),
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
      if (res.headersSent) return;
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
      if (res.headersSent) return;
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
      const { system, isOpen, mechanism, phase, sortBy, sortOrder } = req.query;
      const { limit, offset } = parsePaginationParams(req.query);

      const filters = {
        isOpen: isOpen ? isOpen === 'true' : undefined,
        mechanism: mechanism as string,
        phase: phase as string,
        limit,
        offset,
        sortBy: sortBy as 'id' | 'name' | 'closeDate' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
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
      if (res.headersSent) return;
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
      if (res.headersSent) return;
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
  app.get('/api/public/daoip5/systems', async (_req, res) => {
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
  app.use('/api/proxy', authenticateApiKey);
  app.use('/api/proxy', (req, res, next) => {
    const aReq = req as AuthenticatedRequest;
    if (!aReq.user) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Proxy endpoints require a valid API key. Use 'Authorization: Bearer YOUR_API_KEY' header."
      });
    }
    next();
  });
  app.use('/api/proxy', rateLimitMiddleware);

  // DAOIP5 API Proxy endpoints to handle CORS
  app.get('/api/proxy/daoip5', async (_req, res) => {
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
  app.get('/api/v1/health-quick', async (_req, res) => {
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
      const { system, poolId, projectId, status, sortBy, sortOrder } = req.query;
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
        offset,
        sortBy: sortBy as 'id' | 'name' | 'closeDate' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
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
      if (res.headersSent) return;
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
      if (res.headersSent) return;
      console.error('Error fetching application:', error);
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch application"
      });
    }
  });

  // --- Projects endpoints ---

  app.get('/api/v1/projects', async (req, res) => {
    try {
      const { system, sortBy, sortOrder } = req.query;
      const { limit, offset } = parsePaginationParams(req.query);
      const filters = {
        limit,
        offset,
        sortBy: sortBy as 'id' | 'name' | 'closeDate' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      };

      const selectedAdapters = getAdapter(system as string);
      let allProjects: any[] = [];
      let totalCount = 0;

      for (const adapter of selectedAdapters) {
        const result = await adapter.getProjectsPaginated(filters);
        allProjects.push(...result.data);
        totalCount += result.totalCount;
      }

      res.json({
        "@context": "http://www.daostar.org/schemas",
        data: allProjects,
        pagination: createPaginationMeta(totalCount, limit, offset),
      });
    } catch (error) {
      if (res.headersSent) return;
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: "Internal server error", message: "Failed to fetch projects" });
    }
  });

  app.get('/api/v1/projects/:id', async (req, res) => {
    try {
      const { system } = req.query;
      const selectedAdapters = getAdapter(system as string);

      for (const adapter of selectedAdapters) {
        const project = await adapter.getProject(req.params.id);
        if (project) return res.json(project);
      }

      res.status(404).json({ error: "Project not found", message: `Project with ID ${req.params.id} not found` });
    } catch (error) {
      if (res.headersSent) return;
      console.error('Error fetching project:', error);
      res.status(500).json({ error: "Internal server error", message: "Failed to fetch project" });
    }
  });

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    try {
      const { healthService } = await import('./services/health.js');
      const health = await healthService.getSystemHealth(true);
      res.json(health);
    } catch (error) {
      res.json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        adapters: [],
        database: { status: 'healthy' },
        summary: { totalAdapters: 0, healthyAdapters: 0, degradedAdapters: 0, downAdapters: 0 }
      });
    }
  });



  // API documentation endpoint
  app.get('/api/v1/docs', (_req, res) => {
    res.json({
      name: "OpenGrants Gateway API",
      version: "1.0.0",
      description: "Unified interface for grant data using DAOIP-5 standard",
      endpoints: {
        systems: "/api/v1/grantSystems",
        pools: "/api/v1/grantPools",
        applications: "/api/v1/grantApplications",
        projects: "/api/v1/projects"
      },
      supportedSystems: Object.keys(adapters),
      documentation: "https://docs.daostar.org/"
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
