// Response optimization middleware for better API performance
import { Request, Response, NextFunction } from 'express';
import { projectsCache, poolsCache, currencyCache } from '../services/cache.js';

// Response compression and caching headers
export function optimizeResponse(req: Request, res: Response, next: NextFunction) {
  // Set appropriate cache headers for different endpoints
  const path = req.path;
  
  if (path.includes('/api/v1/systems')) {
    // Systems data changes rarely
    res.set('Cache-Control', 'public, max-age=1800'); // 30 minutes
  } else if (path.includes('/api/v1/pools')) {
    // Pool data changes moderately
    res.set('Cache-Control', 'public, max-age=900'); // 15 minutes
  } else if (path.includes('/api/v1/applications')) {
    // Application data should be fresher
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  } else if (path.includes('/api/v1/health')) {
    // Health data should be very fresh
    res.set('Cache-Control', 'public, max-age=60'); // 1 minute
  }
  
  // Add ETag support for better caching
  res.set('ETag', `"${req.method}-${path}-${Date.now()}"`);
  
  next();
}

// Request timeout protection
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'The request took too long to process. This may be due to external API delays.'
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
}

// Performance monitoring
export function performanceMonitoring(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    // Log slow requests
    if (duration > 5000) { // More than 5 seconds
      console.warn(`Slow request detected: ${req.method} ${req.path} took ${duration.toFixed(2)}ms`);
    }
    
    // Could send to monitoring service here
  });
  
  next();
}