import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export interface AuthenticatedRequest extends Request {
  user?: {
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
    const user = await storage.getUserByApiKey(apiKey);
    
    if (!user) {
      return res.status(401).json({ 
        error: "Invalid API key",
        message: "The provided API key is not valid"
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      rateLimit: user.rateLimit || 100
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

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: "Authentication required",
      message: "This endpoint requires a valid API key"
    });
  }
  next();
}
