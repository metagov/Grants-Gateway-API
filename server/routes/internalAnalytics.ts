import type { Express, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { apiLogs, requestLogs, apiUsers, apiKeys } from "@shared/schema";
import { sql, desc, eq, gte, and, count } from "drizzle-orm";

interface AnalyticsSession {
  authenticated: boolean;
  authenticatedAt: number;
}

const sessions = new Map<string, AnalyticsSession>();
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

interface AuditLogEntry {
  timestamp: string;
  action: string;
  ip: string;
  userAgent: string;
  success: boolean;
}

const auditLogs: AuditLogEntry[] = [];
const MAX_AUDIT_LOGS = 1000;

function logAuditEvent(action: string, req: Request, success: boolean) {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    action,
    ip: req.ip || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    success
  };
  
  auditLogs.unshift(entry);
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.pop();
  }
  
  console.log(`[ANALYTICS AUDIT] ${entry.action} - ${success ? 'SUCCESS' : 'FAILED'} - IP: ${entry.ip}`);
}

function getSessionId(req: Request): string {
  const cookies = req.headers.cookie?.split(';').reduce((acc, c) => {
    const [key, val] = c.trim().split('=');
    acc[key] = val;
    return acc;
  }, {} as Record<string, string>) || {};
  
  return cookies['__internal_session'] || '';
}

function setSessionCookie(res: Response, sessionId: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const secureFlag = isProduction ? '; Secure' : '';
  res.setHeader('Set-Cookie', `__internal_session=${sessionId}; HttpOnly; SameSite=Strict; Path=/__internal; Max-Age=1800${secureFlag}`);
}

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function isSessionValid(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  if (Date.now() - session.authenticatedAt > SESSION_DURATION) {
    sessions.delete(sessionId);
    return false;
  }
  
  return session.authenticated;
}

function requireAnalyticsAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = getSessionId(req);
  
  if (isSessionValid(sessionId)) {
    logAuditEvent('analytics_access', req, true);
    return next();
  }
  
  logAuditEvent('analytics_access_denied', req, false);
  res.status(401).json({ error: 'Access denied' });
}

export function registerInternalAnalyticsRoutes(app: Express): void {
  app.post('/__internal/auth', (req, res) => {
    const { password } = req.body;
    const correctPassword = process.env.INTERNAL_ANALYTICS_PASSWORD;
    
    if (!correctPassword) {
      logAuditEvent('auth_attempt_no_secret', req, false);
      return res.status(500).json({ error: 'Access denied' });
    }
    
    if (password !== correctPassword) {
      logAuditEvent('auth_attempt_wrong_password', req, false);
      return res.status(401).json({ error: 'Access denied' });
    }
    
    const sessionId = generateSessionId();
    sessions.set(sessionId, {
      authenticated: true,
      authenticatedAt: Date.now()
    });
    
    setSessionCookie(res, sessionId);
    logAuditEvent('auth_success', req, true);
    res.json({ success: true });
  });

  app.post('/__internal/logout', (req, res) => {
    const sessionId = getSessionId(req);
    if (sessionId) {
      sessions.delete(sessionId);
    }
    res.setHeader('Set-Cookie', '__internal_session=; HttpOnly; SameSite=Strict; Path=/__internal; Max-Age=0');
    logAuditEvent('logout', req, true);
    res.json({ success: true });
  });

  app.get('/__internal/usage', requireAnalyticsAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
      const days = Math.min(parseInt(req.query.days as string) || 30, 90);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [
        requestsPerDay,
        requestsPerEndpoint,
        requestsPerUser,
        errorRates,
        totalRequests,
        uniqueUsers,
        avgResponseTime
      ] = await Promise.all([
        db.select({
          date: sql<string>`DATE(${apiLogs.createdAt})`.as('date'),
          count: count()
        })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, startDate))
        .groupBy(sql`DATE(${apiLogs.createdAt})`)
        .orderBy(desc(sql`DATE(${apiLogs.createdAt})`))
        .limit(limit),

        db.select({
          endpoint: apiLogs.endpoint,
          count: count()
        })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, startDate))
        .groupBy(apiLogs.endpoint)
        .orderBy(desc(count()))
        .limit(20),

        db.select({
          userId: apiLogs.userId,
          count: count()
        })
        .from(apiLogs)
        .where(and(
          gte(apiLogs.createdAt, startDate),
          sql`${apiLogs.userId} IS NOT NULL`
        ))
        .groupBy(apiLogs.userId)
        .orderBy(desc(count()))
        .limit(20),

        db.select({
          statusCategory: sql<string>`
            CASE 
              WHEN ${apiLogs.statusCode} >= 500 THEN '5xx'
              WHEN ${apiLogs.statusCode} >= 400 THEN '4xx'
              WHEN ${apiLogs.statusCode} >= 300 THEN '3xx'
              WHEN ${apiLogs.statusCode} >= 200 THEN '2xx'
              ELSE 'other'
            END
          `.as('status_category'),
          count: count()
        })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, startDate))
        .groupBy(sql`
          CASE 
            WHEN ${apiLogs.statusCode} >= 500 THEN '5xx'
            WHEN ${apiLogs.statusCode} >= 400 THEN '4xx'
            WHEN ${apiLogs.statusCode} >= 300 THEN '3xx'
            WHEN ${apiLogs.statusCode} >= 200 THEN '2xx'
            ELSE 'other'
          END
        `),

        db.select({ count: count() })
          .from(apiLogs)
          .where(gte(apiLogs.createdAt, startDate)),

        db.select({ count: sql<number>`COUNT(DISTINCT ${apiLogs.userId})` })
          .from(apiLogs)
          .where(and(
            gte(apiLogs.createdAt, startDate),
            sql`${apiLogs.userId} IS NOT NULL`
          )),

        db.select({ 
          avg: sql<number>`COALESCE(AVG(${apiLogs.responseTime}), 0)` 
        })
        .from(apiLogs)
        .where(gte(apiLogs.createdAt, startDate))
      ]);

      const errorRatesMap: Record<string, number> = {};
      errorRates.forEach(row => {
        errorRatesMap[row.statusCategory] = Number(row.count);
      });

      res.json({
        period: {
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
          days
        },
        summary: {
          totalRequests: totalRequests[0]?.count || 0,
          uniqueUsers: uniqueUsers[0]?.count || 0,
          avgResponseTimeMs: Math.round(Number(avgResponseTime[0]?.avg) || 0)
        },
        requestsPerDay: requestsPerDay.map(row => ({
          date: row.date,
          count: Number(row.count)
        })),
        requestsPerEndpoint: requestsPerEndpoint.map(row => ({
          endpoint: row.endpoint,
          count: Number(row.count)
        })),
        requestsPerUser: requestsPerUser.map(row => ({
          userId: row.userId,
          count: Number(row.count)
        })),
        errorRates: errorRatesMap
      });
    } catch (error) {
      console.error('Analytics query error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  app.get('/__internal/audit', requireAnalyticsAuth, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    res.json({
      logs: auditLogs.slice(0, limit),
      total: auditLogs.length
    });
  });

  app.get('/__internal/api-keys-stats', requireAnalyticsAuth, async (req, res) => {
    try {
      const [totalKeys, activeKeys, totalUsers] = await Promise.all([
        db.select({ count: count() }).from(apiKeys),
        db.select({ count: count() }).from(apiKeys).where(eq(apiKeys.status, 'active')),
        db.select({ count: count() }).from(apiUsers)
      ]);

      res.json({
        totalApiKeys: totalKeys[0]?.count || 0,
        activeApiKeys: activeKeys[0]?.count || 0,
        totalApiUsers: totalUsers[0]?.count || 0
      });
    } catch (error) {
      console.error('API keys stats error:', error);
      res.status(500).json({ error: 'Failed to fetch API keys stats' });
    }
  });
}
