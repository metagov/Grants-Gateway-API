import { useState, useEffect } from "react";
import { 
  Activity,
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  RefreshCw,
  Database,
  Server,
  Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface AdapterHealthStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  lastChecked: string;
  endpoints?: Record<string, boolean>;
  error?: string;
}

interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  adapters: AdapterHealthStatus[];
  database: {
    status: 'healthy' | 'down';
    responseTime?: number;
  };
  summary: {
    totalAdapters: number;
    healthyAdapters: number;
    degradedAdapters: number;
    downAdapters: number;
  };
}

export default function HealthPage() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: healthData, isLoading, refetch, error } = useQuery<SystemHealthStatus>({
    queryKey: ['/api/v1/health'],
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if enabled
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      degraded: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      down: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatResponseTime = (time?: number) => {
    if (!time) return 'N/A';
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <XCircle className="h-6 w-6 mr-2" />
                Health Check Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Unable to fetch system health status. The monitoring system may be down.
              </p>
              <Button onClick={() => refetch()} className="mr-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">API Health Monitor</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Real-time status of grant system integrations and API components
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-50 border-green-200" : ""}
            >
              <Activity className="h-4 w-4 mr-2" />
              Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Overview */}
        {healthData && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {getStatusIcon(healthData.status)}
                  <span className="ml-2">System Status</span>
                  {getStatusBadge(healthData.status)}
                </CardTitle>
                <CardDescription>
                  Last updated: {formatTimestamp(healthData.timestamp)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{healthData.summary.healthyAdapters}</div>
                    <div className="text-sm text-gray-500">Healthy</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{healthData.summary.degradedAdapters}</div>
                    <div className="text-sm text-gray-500">Degraded</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{healthData.summary.downAdapters}</div>
                    <div className="text-sm text-gray-500">Down</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{healthData.summary.totalAdapters}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Database Status
                  {getStatusBadge(healthData.database.status)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getStatusIcon(healthData.database.status)}
                    <span className="ml-2">PostgreSQL Connection</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Response time: {formatResponseTime(healthData.database.responseTime)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adapter Status */}
            <div className="grid md:grid-cols-2 gap-6">
              {healthData.adapters.map((adapter) => (
                <Card key={adapter.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Server className="h-5 w-5 mr-2" />
                        {adapter.name} Adapter
                      </div>
                      {getStatusBadge(adapter.status)}
                    </CardTitle>
                    <CardDescription>
                      Last checked: {formatTimestamp(adapter.lastChecked)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getStatusIcon(adapter.status)}
                        <span className="ml-2">API Connectivity</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {adapter.responseTime ? formatResponseTime(adapter.responseTime) : 'N/A'}
                      </div>
                    </div>

                    {adapter.error && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-sm text-red-600 dark:text-red-400 font-medium">Error:</div>
                        <div className="text-sm text-red-500 dark:text-red-300">{adapter.error}</div>
                      </div>
                    )}

                    {adapter.endpoints && (
                      <div>
                        <div className="text-sm font-medium mb-2">Endpoint Status:</div>
                        <div className="space-y-2">
                          {Object.entries(adapter.endpoints).map(([endpoint, status]) => (
                            <div key={endpoint} className="flex items-center justify-between text-sm">
                              <span className="capitalize">{endpoint}</span>
                              <div className="flex items-center">
                                {status ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className="ml-1">{status ? 'OK' : 'Failed'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Integration Types Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wifi className="h-5 w-5 mr-2" />
                  Integration Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Source API Integrations</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      These adapters fetch data from custom APIs and transform it to DAOIP-5 format:
                    </p>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Octant - Ethereum public goods funding
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Giveth - Donation platform for public goods
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Direct DAOIP-5 Integrations</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      These systems provide DAOIP-5 compliant endpoints that are cached for performance:
                    </p>
                    <ul className="text-sm space-y-1">
                      <li className="flex items-center">
                        <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                        Questbook - Coming soon (DAOIP-5 native)
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {isLoading && !healthData && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-gray-600 dark:text-gray-300">Loading health status...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}