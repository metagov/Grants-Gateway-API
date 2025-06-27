import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory rate limit store (in production, use Redis)
const rateLimitStore: RateLimitStore = {};

export function rateLimitMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  // Determine rate limit based on authentication
  let limit = 20; // Default anonymous limit
  let identifier = req.ip || 'anonymous';
  
  if (req.user) {
    limit = req.user.rateLimit;
    identifier = `user_${req.user.id}`;
  }

  // Clean up expired entries
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });

  // Initialize or get current rate limit data
  if (!rateLimitStore[identifier] || rateLimitStore[identifier].resetTime < now) {
    rateLimitStore[identifier] = {
      count: 0,
      resetTime: now + windowMs
    };
  }

  const current = rateLimitStore[identifier];
  current.count++;

  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, limit - current.count).toString(),
    'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
  });

  if (current.count > limit) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      message: `Too many requests. Limit: ${limit} requests per minute.`,
      retryAfter: Math.ceil((current.resetTime - now) / 1000)
    });
  }

  next();
}
