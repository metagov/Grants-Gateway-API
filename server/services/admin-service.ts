import { storage } from "../storage";

export interface AdminStats {
  apiKeys: {
    total: number;
    active: number;
    expired: number;
    createdThisMonth: number;
  };
  users: {
    total: number;
    activeUsers: number;
    registrationsThisMonth: number;
  };
  requests: {
    totalRequests: number;
    todayRequests: number;
    avgResponseTime: number;
    errorRate: number;
  };
  topEndpoints: Array<{
    endpoint: string;
    requestCount: number;
    avgResponseTime: number;
  }>;
  recentLogs: Array<{
    id: string;
    userId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    createdAt: string;
    userAgent: string;
  }>;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string;
  orgName: string;
  status: string;
  replitUserId: string;
  createdAt: string;
  apiKeys: Array<{
    id: string;
    name: string;
    keyPreview: string;
    status: string;
    expiresAt: string;
    lastUsedAt: string;
    createdAt: string;
  }>;
  requestStats: {
    totalRequests: number;
    lastRequestAt: string;
    avgResponseTime: number;
  };
}

class AdminService {
  
  async getAdminStats(): Promise<AdminStats> {
    try {
      // Get API key statistics
      const allApiKeys = await storage.getAllApiKeys();
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const activeApiKeys = allApiKeys.filter(key => 
        key.status === 'active' && new Date(key.expiresAt) > now
      );
      const expiredApiKeys = allApiKeys.filter(key => 
        key.status === 'expired' || new Date(key.expiresAt) <= now
      );
      const keysThisMonth = allApiKeys.filter(key => 
        new Date(key.createdAt) >= thisMonth
      );

      // Get user statistics
      const allUsers = await storage.getAllApiUsers();
      const activeUsers = allUsers.filter(user => user.status === 'active');
      const usersThisMonth = allUsers.filter(user => 
        new Date(user.createdAt) >= thisMonth
      );

      // Get request statistics from comprehensive request logs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const recentLogs = await storage.getAllRequestLogs({
        limit: 1000,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      });
      
      const todayLogs = recentLogs.filter(log => 
        new Date(log.timestamp) >= today
      );

      // Calculate avg response time
      const avgResponseTime = recentLogs.length > 0 
        ? recentLogs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / recentLogs.length
        : 0;

      // Calculate error rate
      const errorLogs = recentLogs.filter(log => (log.responseStatus || 0) >= 400);
      const errorRate = recentLogs.length > 0 
        ? (errorLogs.length / recentLogs.length) * 100 
        : 0;

      // Calculate top endpoints
      const endpointCounts = recentLogs.reduce((acc, log) => {
        const key = log.endpoint;
        if (!acc[key]) {
          acc[key] = { count: 0, totalTime: 0 };
        }
        acc[key].count++;
        acc[key].totalTime += log.responseTimeMs || 0;
        return acc;
      }, {} as Record<string, { count: number; totalTime: number }>);

      const topEndpoints = Object.entries(endpointCounts)
        .map(([endpoint, stats]) => ({
          endpoint,
          requestCount: stats.count,
          avgResponseTime: stats.count > 0 ? stats.totalTime / stats.count : 0
        }))
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10);

      // Get recent logs for display
      const recentLogsForDisplay = recentLogs
        .slice(0, 50)
        .map(log => ({
          id: log.id,
          userId: log.userId || 'anonymous',
          endpoint: log.endpoint,
          method: log.method,
          statusCode: log.responseStatus || 0,
          responseTime: log.responseTimeMs || 0,
          createdAt: log.timestamp.toISOString(),
          userAgent: log.userAgent || 'Unknown'
        }));

      return {
        apiKeys: {
          total: allApiKeys.length,
          active: activeApiKeys.length,
          expired: expiredApiKeys.length,
          createdThisMonth: keysThisMonth.length
        },
        users: {
          total: allUsers.length,
          activeUsers: activeUsers.length,
          registrationsThisMonth: usersThisMonth.length
        },
        requests: {
          totalRequests: recentLogs.length,
          todayRequests: todayLogs.length,
          avgResponseTime: Math.round(avgResponseTime),
          errorRate: Math.round(errorRate * 100) / 100
        },
        topEndpoints,
        recentLogs: recentLogsForDisplay
      };
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      throw error;
    }
  }

  async getUserDetail(userId: string): Promise<AdminUserDetail | null> {
    try {
      const user = await storage.getApiUser(userId);
      if (!user) return null;

      const userApiKeys = await storage.getApiKeysByUserId(userId);
      const userLogs = await storage.getRequestLogsByUserId(userId, { limit: 100 });

      const requestStats = userLogs.length > 0 ? {
        totalRequests: userLogs.length,
        lastRequestAt: userLogs[0].timestamp.toISOString(),
        avgResponseTime: userLogs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / userLogs.length
      } : {
        totalRequests: 0,
        lastRequestAt: 'Never',
        avgResponseTime: 0
      };

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        orgName: user.orgName,
        status: user.status,
        replitUserId: user.replitUserId,
        createdAt: user.createdAt.toISOString(),
        apiKeys: userApiKeys.map(key => ({
          id: key.id,
          name: key.name || 'Unnamed Key',
          keyPreview: key.keyPreview,
          status: key.status,
          expiresAt: key.expiresAt.toISOString(),
          lastUsedAt: key.lastUsedAt?.toISOString() || 'Never',
          createdAt: key.createdAt.toISOString()
        })),
        requestStats
      };
    } catch (error) {
      console.error('Error fetching user detail:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<Array<{
    id: string;
    email: string;
    name: string;
    orgName: string;
    status: string;
    createdAt: string;
    apiKeyCount: number;
    lastActivity: string;
  }>> {
    try {
      const users = await storage.getAllApiUsers();
      
      const usersWithStats = await Promise.all(users.map(async (user) => {
        const apiKeys = await storage.getApiKeysByUserId(user.id);
        const recentLogs = await storage.getRequestLogsByUserId(user.id, { limit: 1 });
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgName: user.orgName,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          apiKeyCount: apiKeys.length,
          lastActivity: recentLogs.length > 0 ? recentLogs[0].timestamp.toISOString() : 'Never'
        };
      }));

      return usersWithStats.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }

  // Check if user is admin - RESTRICTED TO OWNER ONLY
  async isAdmin(replitUserId: string): Promise<boolean> {
    // Only the project owner can access admin functionality
    // This is hardcoded for security - admin access is completely private
    const OWNER_USER_ID = '2104566';
    return replitUserId === OWNER_USER_ID;
  }
}

export const adminService = new AdminService();