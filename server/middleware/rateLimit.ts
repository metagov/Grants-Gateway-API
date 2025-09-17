import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthenticatedRequest } from "./auth";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface AuthRateLimitEntry {
  count: number;
  resetTime: number;
  lastAttempt?: number;
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

// Strict rate limiting for authentication endpoints
// Prevents mass API key generation and brute force attacks
export const authEndpointRateLimit: RequestHandler = (req, res, next) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minute window for auth endpoints
  const ipWindowMs = 60 * 1000; // 1 minute window for IP-based limiting
  
  // Get identifiers
  const clientIp = req.ip || 'unknown';
  const email = req.body?.email;
  
  // Very strict limits for auth endpoints
  const IP_LIMIT_PER_MINUTE = 5; // Only 5 requests per IP per minute
  const EMAIL_LIMIT_PER_15MIN = 3; // Only 3 key generations per email per 15 minutes
  
  // Clean up expired entries
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
  
  // Check IP-based rate limit (per minute)
  const ipIdentifier = `auth_ip_${clientIp}`;
  if (!rateLimitStore[ipIdentifier] || rateLimitStore[ipIdentifier].resetTime < now) {
    rateLimitStore[ipIdentifier] = {
      count: 0,
      resetTime: now + ipWindowMs
    };
  }
  
  const ipLimit = rateLimitStore[ipIdentifier];
  ipLimit.count++;
  
  if (ipLimit.count > IP_LIMIT_PER_MINUTE) {
    return res.status(429).json({
      error: "Too many authentication requests",
      message: `Rate limit exceeded. Only ${IP_LIMIT_PER_MINUTE} auth requests allowed per minute from your IP.`,
      retryAfter: Math.ceil((ipLimit.resetTime - now) / 1000)
    });
  }
  
  // Check email-based rate limit for key generation (per 15 minutes)
  if (email && req.path.includes('generate-key')) {
    const emailIdentifier = `auth_email_${email.toLowerCase()}`;
    if (!rateLimitStore[emailIdentifier] || rateLimitStore[emailIdentifier].resetTime < now) {
      rateLimitStore[emailIdentifier] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    const emailLimit = rateLimitStore[emailIdentifier];
    emailLimit.count++;
    
    if (emailLimit.count > EMAIL_LIMIT_PER_15MIN) {
      return res.status(429).json({
        error: "Too many API key generation requests",
        message: `Rate limit exceeded. Only ${EMAIL_LIMIT_PER_15MIN} API key generations allowed per 15 minutes per email.`,
        retryAfter: Math.ceil((emailLimit.resetTime - now) / 1000)
      });
    }
  }
  
  // Set comprehensive rate limit headers
  res.set({
    'X-Auth-RateLimit-IP-Limit': IP_LIMIT_PER_MINUTE.toString(),
    'X-Auth-RateLimit-IP-Remaining': Math.max(0, IP_LIMIT_PER_MINUTE - ipLimit.count).toString(),
    'X-Auth-RateLimit-IP-Reset': new Date(ipLimit.resetTime).toISOString(),
  });
  
  if (email && req.path.includes('generate-key')) {
    const emailLimit = rateLimitStore[`auth_email_${email.toLowerCase()}`];
    if (emailLimit) {
      res.set({
        'X-Auth-RateLimit-Email-Limit': EMAIL_LIMIT_PER_15MIN.toString(),
        'X-Auth-RateLimit-Email-Remaining': Math.max(0, EMAIL_LIMIT_PER_15MIN - emailLimit.count).toString(),
        'X-Auth-RateLimit-Email-Reset': new Date(emailLimit.resetTime).toISOString(),
      });
    }
  }
  
  next();
}
