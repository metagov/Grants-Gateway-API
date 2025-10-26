import { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "../storage";
import crypto from "crypto";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    orgName: string;
    apiKeyId?: string;
    rateLimit?: number;
  } | {
    // Legacy user format for backward compatibility
    id: number;
    username: string;
    rateLimit: number;
  };
}

export const authenticateApiKey: RequestHandler = async (req, res, next) => {
  const aReq = req as AuthenticatedRequest;
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Allow anonymous access with lower rate limits
    aReq.user = undefined;
    return next();
  }

  const apiKey = authHeader.substring(7);
  
  try {
    // First try new OAuth-based API key system
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const newApiKey = await storage.getApiKeyByHash(keyHash);
    
    if (newApiKey) {
      // Check if key is expired or revoked
      if (new Date() > newApiKey.expiresAt || newApiKey.status !== 'active') {
        return res.status(401).json({ 
          error: "API key has expired or been revoked",
          message: "Please generate a new API key"
        });
      }

      // Get the user associated with this API key
      const apiUser = await storage.getApiUser(newApiKey.userId);
      
      if (!apiUser || apiUser.status !== 'active') {
        return res.status(401).json({ 
          error: "User account is suspended",
          message: "Contact support for assistance"
        });
      }

      // Update last used timestamp
      await storage.updateApiKeyLastUsed(newApiKey.id);

      aReq.user = {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.name,
        orgName: apiUser.orgName,
        apiKeyId: newApiKey.id,
      };
      
      return next();
    }

    // Fall back to legacy API key system
    const legacyUser = await storage.getUserByApiKey(apiKey);
    
    if (!legacyUser) {
      return res.status(401).json({ 
        error: "Invalid API key",
        message: "The provided API key is not valid"
      });
    }

    aReq.user = {
      id: legacyUser.id,
      username: legacyUser.username,
      rateLimit: legacyUser.rateLimit || 100
    };
    
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ 
      error: "Authentication error",
      message: "An error occurred during authentication"
    });
  }
}

// New middleware for OAuth API key authentication with rate limiting
export const authenticateNewApiKey: RequestHandler = async (req, res, next) => {
  const aReq = req as AuthenticatedRequest;
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: "Missing or invalid authorization header",
      message: "Use 'Bearer YOUR_API_KEY' format" 
    });
  }

  const apiKey = authHeader.substring(7);
  
  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const apiKeyRecord = await storage.getApiKeyByHash(keyHash);
    
    if (!apiKeyRecord) {
      return res.status(401).json({ 
        error: "Invalid API key",
        message: "The provided API key is not valid"
      });
    }

    // Check if key is expired
    if (new Date() > apiKeyRecord.expiresAt) {
      return res.status(401).json({ 
        error: "API key has expired",
        message: "Please generate a new API key"
      });
    }

    // Check if key is revoked
    if (apiKeyRecord.status !== 'active') {
      return res.status(401).json({ 
        error: "API key has been revoked",
        message: "Please generate a new API key"
      });
    }

    // Get the user associated with this API key
    const apiUser = await storage.getApiUser(apiKeyRecord.userId);
    
    if (!apiUser) {
      return res.status(401).json({ 
        error: "User associated with API key not found",
        message: "Contact support for assistance"
      });
    }

    if (apiUser.status !== 'active') {
      return res.status(401).json({ 
        error: "User account is suspended",
        message: "Contact support for assistance"
      });
    }

    // Update last used timestamp
    await storage.updateApiKeyLastUsed(apiKeyRecord.id);

    // Add user info to request
    aReq.user = {
      id: apiUser.id,
      email: apiUser.email,
      name: apiUser.name,
      orgName: apiUser.orgName,
      apiKeyId: apiKeyRecord.id,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ 
      error: "Internal authentication error",
      message: "An error occurred during authentication"
    });
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const aReq = req as AuthenticatedRequest;
  if (!aReq.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "This endpoint requires a valid API key"
    });
  }
  next();
}

// Admin route guard middleware - requires authentication and admin privileges
export const adminRouteGuard: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  try {
    // Check if user is authenticated via Replit OAuth
    if (!req.isAuthenticated() || !user?.expires_at || !user?.claims) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Authentication required. Please log in with your Google account."
      });
    }

    // Check if token is still valid (simplified check)
    const now = Math.floor(Date.now() / 1000);
    if (now > user.expires_at) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Your session has expired. Please log in again."
      });
    }
    
    const userId = user.claims.sub;
    if (!userId) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Invalid user information. Please log in again."
      });
    }
    
    // Import admin service dynamically to avoid circular dependencies
    const { adminService } = await import('../services/admin-service');
    
    // Check if user is admin - return 403 for non-admin users
    const isAdmin = await adminService.isAdmin(userId);
    if (!isAdmin) {
      return res.status(403).json({ 
        error: "Access denied",
        message: "You don't have permission to access this resource"
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin route guard error:', error as Error);
    res.status(500).json({ 
      error: "Internal server error",
      message: "An error occurred while processing your request"
    });
  }
};

// Comprehensive request logging middleware for all endpoints
export const requestLoggingMiddleware: RequestHandler = (req, res, next) => {
  const aReq = req as AuthenticatedRequest;
  const start = Date.now();
  
  // Use res.on('finish') event which is more reliable
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    
    // Log asynchronously without blocking
    setImmediate(async () => {
      try {
        // Extract user info if available
        let userId: string | null = null;
        let apiKeyId: string | null = null;
        
        if (aReq.user && typeof aReq.user.id === 'string') {
          userId = aReq.user.id;
          apiKeyId = (aReq.user as any).apiKeyId || null;
        }
        
        // Always log - comprehensive analytics for all traffic
        await storage.createRequestLog({
          apiKeyId,
          userId,
          endpoint: req.originalUrl || req.path,
          method: req.method,
          ipAddress: req.ip || null,
          userAgent: req.get('User-Agent') || null,
          responseStatus: res.statusCode,
          responseTimeMs: responseTime,
          rateLimitHit: false
        });
      } catch (error) {
        console.error('Request logging failed:', {
          error: error instanceof Error ? error.message : String(error),
          endpoint: req.originalUrl || req.path,
          method: req.method,
          status: res.statusCode
        });
      }
    });
  });
  
  next();
};
