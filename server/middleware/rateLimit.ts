import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthenticatedRequest } from "./auth";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory rate limit store (in production, use Redis)
const rateLimitStore: RateLimitStore = {};

export const rateLimitMiddleware: RequestHandler = (req, res, next) => {
  const aReq = req as AuthenticatedRequest;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  // Determine rate limit based on authentication
  let limit = 20; // Default anonymous limit
  let identifier = aReq.ip || 'anonymous';
  
  if (aReq.user) {
    limit = aReq.user.rateLimit || 100; // Default rate limit if undefined
    identifier = `user_${aReq.user.id}`;
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
