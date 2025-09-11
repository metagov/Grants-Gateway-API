import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Key, Activity, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface AdminStats {
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

interface AdminUser {
  id: string;
  email: string;
  name: string;
  orgName: string;
  status: string;
  createdAt: string;
  apiKeyCount: number;
  lastActivity: string;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: !authLoading && !!user,
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ['/api/admin/users'],
    enabled: !authLoading && !!user,
  });

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show not found if not admin (404 response to hide admin functionality)
  if (statsError && ((statsError as any)?.status === 404 || (statsError as any)?.status === 403)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <CardTitle>Page Not Found</CardTitle>
            <CardDescription>
              The page you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
      case 'expired': case 'revoked': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950';
      case 'POST': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
      case 'PUT': case 'PATCH': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950';
      case 'DELETE': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950';
    }
  };

  const getStatusIcon = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (statusCode >= 400) return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <Badge variant="outline" className="text-sm">
            Admin Access
          </Badge>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.total}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats.users.registrationsThisMonth} this month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-api-keys">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Keys</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.apiKeys.total}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.apiKeys.active} active, {stats.apiKeys.expired} expired
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-requests">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Requests</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.requests.totalRequests}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.requests.todayRequests} today
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-performance">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.requests.avgResponseTime}ms</div>
                <p className="text-xs text-muted-foreground">
                  {stats.requests.errorRate}% error rate
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Detailed Data */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="endpoints" data-testid="tab-endpoints">Top Endpoints</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">Recent Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  All registered users and their API key usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : users && users.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>API Keys</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead>Registered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{user.orgName}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(user.status)}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.apiKeyCount}</TableCell>
                          <TableCell>
                            {user.lastActivity !== 'Never' 
                              ? formatDistanceToNow(new Date(user.lastActivity), { addSuffix: true })
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>
                            {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top API Endpoints</CardTitle>
                <CardDescription>
                  Most frequently accessed endpoints by request count
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.topEndpoints && stats.topEndpoints.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Requests</TableHead>
                        <TableHead>Avg Response Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.topEndpoints.map((endpoint, index) => (
                        <TableRow key={index} data-testid={`endpoint-row-${index}`}>
                          <TableCell className="font-mono text-sm">{endpoint.endpoint}</TableCell>
                          <TableCell>{endpoint.requestCount}</TableCell>
                          <TableCell>{Math.round(endpoint.avgResponseTime)}ms</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No endpoint data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent API Logs</CardTitle>
                <CardDescription>
                  Latest API requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recentLogs && stats.recentLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>User</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentLogs.slice(0, 20).map((log) => (
                        <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                          <TableCell className="text-sm">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </TableCell>
                          <TableCell>
                            <Badge className={getMethodColor(log.method)}>
                              {log.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.endpoint}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(log.statusCode)}
                              <span className="text-sm">{log.statusCode}</span>
                            </div>
                          </TableCell>
                          <TableCell>{log.responseTime}ms</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.userId === 'anonymous' ? 'Anonymous' : `User ${log.userId}`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No recent logs available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}