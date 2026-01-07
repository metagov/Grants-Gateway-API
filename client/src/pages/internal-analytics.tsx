import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Lock, BarChart3, Users, Clock, AlertTriangle, Activity, Key, Shield } from "lucide-react";

interface AnalyticsData {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  summary: {
    totalRequests: number;
    uniqueUsers: number;
    avgResponseTimeMs: number;
  };
  requestsPerDay: Array<{ date: string; count: number }>;
  requestsPerEndpoint: Array<{ endpoint: string; count: number }>;
  requestsPerUser: Array<{ userId: number | null; count: number }>;
  errorRates: Record<string, number>;
}

interface AuditData {
  logs: Array<{
    timestamp: string;
    action: string;
    ip: string;
    userAgent: string;
    success: boolean;
  }>;
  total: number;
}

interface ApiKeysStats {
  totalApiKeys: number;
  activeApiKeys: number;
  totalApiUsers: number;
}

export default function InternalAnalytics() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [keysStats, setKeysStats] = useState<ApiKeysStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'users' | 'audit'>('overview');
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/__internal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include'
      });

      if (response.ok) {
        setIsAuthenticated(true);
        setPassword("");
        fetchAnalytics();
      } else {
        toast({
          title: "Access denied",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "Connection error",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [analyticsRes, auditRes, keysRes] = await Promise.all([
        fetch('/__internal/usage?days=30', { credentials: 'include' }),
        fetch('/__internal/audit?limit=50', { credentials: 'include' }),
        fetch('/__internal/api-keys-stats', { credentials: 'include' })
      ]);

      if (analyticsRes.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (auditRes.ok) setAuditData(await auditRes.json());
      if (keysRes.ok) setKeysStats(await keysRes.json());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/__internal/logout', { method: 'POST', credentials: 'include' });
    setIsAuthenticated(false);
    setAnalytics(null);
    setAuditData(null);
    setKeysStats(null);
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-gray-600" />
            </div>
            <CardTitle>Internal Analytics</CardTitle>
            <CardDescription>Enter password to access usage analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-analytics-password"
              />
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-analytics-login">
                {isLoading ? "Verifying..." : "Access Analytics"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalErrors = (analytics?.errorRates['4xx'] || 0) + (analytics?.errorRates['5xx'] || 0);
  const totalSuccess = analytics?.errorRates['2xx'] || 0;
  const errorRate = analytics?.summary.totalRequests 
    ? ((totalErrors / analytics.summary.totalRequests) * 100).toFixed(1) 
    : '0';

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
            <p className="text-sm text-gray-500">
              {analytics?.period.days} day period ending {new Date(analytics?.period.endDate || '').toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAnalytics} data-testid="button-refresh">
              Refresh
            </Button>
            <Button variant="ghost" onClick={handleLogout} data-testid="button-logout">
              Logout
            </Button>
          </div>
        </div>

        <div className="flex gap-2 border-b pb-2">
          {(['overview', 'endpoints', 'users', 'audit'] as const).map(tab => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              data-testid={`tab-${tab}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        {activeTab === 'overview' && analytics && (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.summary.totalRequests.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Total Requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.summary.uniqueUsers}</p>
                      <p className="text-sm text-gray-500">Unique Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">{analytics.summary.avgResponseTimeMs}ms</p>
                      <p className="text-sm text-gray-500">Avg Response Time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">{errorRate}%</p>
                      <p className="text-sm text-gray-500">Error Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {keysStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    API Keys Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold">{keysStats.totalApiUsers}</p>
                      <p className="text-sm text-gray-500">Registered Users</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold">{keysStats.activeApiKeys}</p>
                      <p className="text-sm text-gray-500">Active Keys</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold">{keysStats.totalApiKeys}</p>
                      <p className="text-sm text-gray-500">Total Keys</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Status Code Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  {Object.entries(analytics.errorRates).map(([status, count]) => (
                    <div key={status} className="flex items-center gap-2">
                      <Badge variant={status === '2xx' ? 'default' : status.startsWith('4') ? 'secondary' : 'destructive'}>
                        {status}
                      </Badge>
                      <span className="font-mono">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Requests Per Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analytics.requestsPerDay.map(row => (
                    <div key={row.date} className="flex justify-between items-center py-1 border-b last:border-0">
                      <span className="text-sm">{new Date(row.date).toLocaleDateString()}</span>
                      <span className="font-mono text-sm">{row.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'endpoints' && analytics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requests Per Endpoint</CardTitle>
              <CardDescription>Top 20 most accessed endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.requestsPerEndpoint.map((row, i) => {
                  const maxCount = analytics.requestsPerEndpoint[0]?.count || 1;
                  const percentage = (row.count / maxCount) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{row.endpoint}</code>
                        <span className="font-mono">{row.count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && analytics && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requests Per User</CardTitle>
              <CardDescription>Top 20 most active users (by user ID)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.requestsPerUser.map((row, i) => {
                  const maxCount = analytics.requestsPerUser[0]?.count || 1;
                  const percentage = (row.count / maxCount) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>User #{row.userId || 'Anonymous'}</span>
                        <span className="font-mono">{row.count.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'audit' && auditData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Analytics Access Audit Log
              </CardTitle>
              <CardDescription>Recent access attempts to this analytics page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditData.logs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant={log.success ? 'default' : 'destructive'} className="text-xs">
                        {log.success ? 'OK' : 'FAIL'}
                      </Badge>
                      <span className="font-medium">{log.action}</span>
                    </div>
                    <div className="flex items-center gap-4 text-gray-500 text-xs">
                      <span>{log.ip}</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
