import { Request, Response, NextFunction } from "express";
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

export async function authenticateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Allow anonymous access with lower rate limits
    req.user = undefined;
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

      req.user = {
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

    req.user = {
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
export async function authenticateNewApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
    req.user = {
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

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "This endpoint requires a valid API key"
    });
  }
  next();
}
