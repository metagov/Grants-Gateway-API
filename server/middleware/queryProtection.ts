import { Request, Response, NextFunction, RequestHandler } from "express";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface QueryLog {
  userId: string;
  endpoint: string;
  executionTimeMs: number;
  complexity: number;
  timestamp: Date;
}

const userRateLimitStore: Map<string, RateLimitEntry> = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 1000;

const MAX_LIMIT = 100;
const MAX_OFFSET = 10000;
const REQUIRED_PAGINATION = true;

function cleanupExpiredEntries(): void {
  const now = Date.now();
  const keys = Array.from(userRateLimitStore.keys());
  keys.forEach(key => {
    const entry = userRateLimitStore.get(key);
    if (entry && entry.resetTime < now) {
      userRateLimitStore.delete(key);
    }
  });
}

export interface AuthenticatedApiRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
    };
    access_token?: string;
    expires_at?: number;
  };
  queryMetrics?: {
    startTime: number;
    userId: string;
    complexity: number;
  };
}

export const requireReplitAuth: RequestHandler = (req, res, next) => {
  const authReq = req as AuthenticatedApiRequest;
  
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required to access this endpoint"
    });
  }
  
  if (!authReq.user?.claims?.sub) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Valid user session required"
    });
  }
  
  next();
};

export const perUserRateLimiter: RequestHandler = (req, res, next) => {
  const authReq = req as AuthenticatedApiRequest;
  const userId = authReq.user?.claims?.sub;
  
  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "User identification required for rate limiting"
    });
  }
  
  const now = Date.now();
  cleanupExpiredEntries();
  
  let entry = userRateLimitStore.get(userId);
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + WINDOW_MS };
    userRateLimitStore.set(userId, entry);
  }
  
  entry.count++;
  
  res.set({
    "X-RateLimit-Limit": RATE_LIMIT.toString(),
    "X-RateLimit-Remaining": Math.max(0, RATE_LIMIT - entry.count).toString(),
    "X-RateLimit-Reset": new Date(entry.resetTime).toISOString()
  });
  
  if (entry.count > RATE_LIMIT) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return res.status(429).json({
      error: "Rate limit exceeded",
      message: `Maximum ${RATE_LIMIT} requests per minute. Please wait ${retryAfter} seconds.`,
      retryAfter
    });
  }
  
  next();
};

export const validateQueryParams: RequestHandler = (req, res, next) => {
  const { limit, offset, page } = req.query;
  
  const parsedLimit = limit ? parseInt(limit as string, 10) : undefined;
  const parsedOffset = offset ? parseInt(offset as string, 10) : undefined;
  const parsedPage = page ? parseInt(page as string, 10) : undefined;
  
  if (parsedLimit !== undefined) {
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({
        error: "Invalid parameter",
        message: "limit must be a positive integer"
      });
    }
    if (parsedLimit > MAX_LIMIT) {
      return res.status(400).json({
        error: "Query limit exceeded",
        message: `Maximum allowed limit is ${MAX_LIMIT} rows per request`
      });
    }
  }
  
  if (parsedOffset !== undefined) {
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        error: "Invalid parameter",
        message: "offset must be a non-negative integer"
      });
    }
    if (parsedOffset > MAX_OFFSET) {
      return res.status(400).json({
        error: "Offset limit exceeded",
        message: `Maximum allowed offset is ${MAX_OFFSET}. Use filters to narrow your query.`
      });
    }
  }
  
  if (parsedPage !== undefined && (isNaN(parsedPage) || parsedPage < 1)) {
    return res.status(400).json({
      error: "Invalid parameter",
      message: "page must be a positive integer"
    });
  }
  
  next();
};

export const queryMetricsStart: RequestHandler = (req, res, next) => {
  const authReq = req as AuthenticatedApiRequest;
  const userId = authReq.user?.claims?.sub || "anonymous";
  
  authReq.queryMetrics = {
    startTime: Date.now(),
    userId,
    complexity: calculateQueryComplexity(req)
  };
  
  next();
};

function calculateQueryComplexity(req: Request): number {
  let complexity = 1;
  
  const { limit, system } = req.query;
  const parsedLimit = limit ? parseInt(limit as string, 10) : 10;
  
  complexity += Math.floor(parsedLimit / 20);
  
  if (!system) {
    complexity += 2;
  }
  
  const filterCount = Object.keys(req.query).filter(k => 
    !["limit", "offset", "page"].includes(k)
  ).length;
  complexity += Math.floor(filterCount / 2);
  
  return Math.min(complexity, 10);
}

export const queryMetricsEnd: RequestHandler = (req, res, next) => {
  const authReq = req as AuthenticatedApiRequest;
  
  res.on("finish", () => {
    if (authReq.queryMetrics) {
      const executionTimeMs = Date.now() - authReq.queryMetrics.startTime;
      const { userId, complexity } = authReq.queryMetrics;
      
      console.log(JSON.stringify({
        type: "query_execution",
        userId,
        endpoint: req.path,
        method: req.method,
        executionTimeMs,
        complexity,
        statusCode: res.statusCode,
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  next();
};

export const queryProtectionMiddleware = [
  requireReplitAuth,
  perUserRateLimiter,
  validateQueryParams,
  queryMetricsStart,
  queryMetricsEnd
];
