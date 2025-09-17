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

// Secure authentication middleware for Gateway API
// Allows ONLY legitimate same-origin AJAX requests, requires bearer tokens for all other access
export const requireAuthForExternalAccess: RequestHandler = (req, res, next) => {
  const aReq = req as AuthenticatedRequest;
  const origin = req.get('Origin');  // SECURITY FIX: Only use Origin header, not Referer
  const host = req.get('Host');
  const requestedWith = req.get('X-Requested-With');
  
  // Default to external (secure by default)
  let isInternalRequest = false;
  
  try {
    // SECURITY FIX: Require proper Origin header AND AJAX-style request
    // This prevents direct browser navigation from being treated as internal
    if (origin && host) {
      // Parse origins safely
      const originUrl = new URL(origin);
      const hostParts = host.split(':')[0]; // Remove port for comparison
      
      // Check if this is a same-origin request
      const isSameOrigin = (
        originUrl.hostname === hostParts ||                    // Exact hostname match
        (originUrl.hostname === 'localhost' && host.includes('localhost')) ||  // Local development
        (originUrl.hostname === '127.0.0.1' && host.includes('127.0.0.1'))    // Local IP
      );
      
      // Additional protocol security check
      const isSecureOrigin = originUrl.protocol === 'https:';
      const isSecureHost = req.secure || req.get('X-Forwarded-Proto') === 'https';
      
      // In production, enforce HTTPS matching
      const protocolMatches = process.env.NODE_ENV !== 'production' || (isSecureOrigin === isSecureHost);
      
      // SECURITY: Require BOTH same-origin AND proper AJAX request characteristics
      // This prevents direct browser navigation from bypassing authentication
      const isAjaxRequest = (
        requestedWith === 'XMLHttpRequest' ||  // Standard AJAX header
        (req.get('Content-Type')?.includes('application/json') || false) ||  // JSON content type
        (req.get('Accept')?.includes('application/json') || false)  // Accepts JSON response
      );
      
      // Only allow as internal if ALL conditions are met
      isInternalRequest = isSameOrigin && protocolMatches && isAjaxRequest;
    }
    
    // SECURITY: Missing Origin header is ALWAYS external (no Referer fallback)
    // Direct browser navigation typically lacks proper Origin header for API requests
    
  } catch (error) {
    // If URL parsing fails, treat as external (secure by default)
    isInternalRequest = false;
  }
  
  // Security audit logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔐 Secure Auth Check: ${req.method} ${req.path}`, { 
      origin, 
      host, 
      isInternal: isInternalRequest, 
      hasAuth: !!aReq.user,
      userAgent: req.get('User-Agent')?.substring(0, 50) + '...' 
    });
  }
  
  // Allow internal requests (same-origin query builder) without authentication
  if (isInternalRequest) {
    return next();
  }
  
  // For external requests, require authentication
  if (!aReq.user) {
    return res.status(401).json({
      error: "Bearer token required",
      message: "External API access requires a valid bearer token. Use format: 'Bearer YOUR_API_KEY'"
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
          error: (error as Error).message,
          endpoint: req.originalUrl || req.path,
          method: req.method,
          status: res.statusCode
        });
      }
    });
  });
  
  next();
};
