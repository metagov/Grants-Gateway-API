import { useState } from "react";
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Database,
  Server,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface AdapterHealthStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  responseTime?: number;
  lastChecked: string;
  endpoints?: Record<string, boolean>;
  error?: string;
}

interface SystemHealthStatus {
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  adapters: AdapterHealthStatus[];
  database: {
    status: "healthy" | "down";
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

  const {
    data: healthData,
    isLoading,
    refetch,
    error,
  } = useQuery<SystemHealthStatus>({
    queryKey: ["/api/v1/health"],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "down":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: "bg-green-100 text-green-800",
      degraded: "bg-yellow-100 text-yellow-800",
      down: "bg-red-100 text-red-800",
    };

    return (
      <Badge
        className={
          variants[status as keyof typeof variants] ||
          "bg-gray-100 text-gray-800"
        }
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatResponseTime = (time?: number) => {
    if (time === undefined || time === null) return "N/A";
    if (time === 0) return "< 1ms";
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <XCircle className="h-6 w-6 mr-2" />
              Health Check Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Unable to fetch system health status. The monitoring system may
              be down.
            </p>
            <Button onClick={() => refetch()} className="mr-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 md:space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">API Health Monitor</h1>
          <p className="text-sm md:text-base text-gray-600">
            Real-time status of grant system integrations and API components
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-end md:space-y-0">
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`${autoRefresh ? "bg-green-50 border-green-200" : ""} w-full sm:w-auto`}
              data-testid="button-auto-refresh"
            >
              <Activity className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Auto Refresh</span>
              <span className="sm:hidden">Auto</span>{" "}
              {autoRefresh ? "ON" : "OFF"}
            </Button>
            <Button
              onClick={() => refetch()}
              disabled={isLoading}
              size="sm"
              className="w-full sm:w-auto"
              data-testid="button-refresh"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
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
                  <span className="ml-2 mr-2">System Status</span>
                  {getStatusBadge(healthData.status)}
                </CardTitle>
                <CardDescription>
                  Last updated: {formatTimestamp(healthData.timestamp)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 md:p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-green-600">
                      {healthData.summary.healthyAdapters}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">
                      Healthy
                    </div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-yellow-600">
                      {healthData.summary.degradedAdapters}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">
                      Degraded
                    </div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-red-600">
                      {healthData.summary.downAdapters}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">
                      Down
                    </div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-gray-50 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-blue-600">
                      {healthData.summary.totalAdapters}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">
                      Total
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    Database Status
                  </div>
                  {getStatusBadge(healthData.database.status)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                  <div className="flex items-center">
                    {getStatusIcon(healthData.database.status)}
                    <span className="ml-2 text-sm md:text-base">
                      PostgreSQL Connection
                    </span>
                  </div>
                  <div className="text-xs md:text-sm text-gray-500">
                    Response time:{" "}
                    {formatResponseTime(healthData.database.responseTime)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adapter Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
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
                    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                      <div className="flex items-center">
                        {getStatusIcon(adapter.status)}
                        <span className="ml-2 text-sm md:text-base">
                          API Connectivity
                        </span>
                      </div>
                      <div className="text-xs md:text-sm text-gray-500">
                        {adapter.responseTime
                          ? formatResponseTime(adapter.responseTime)
                          : "N/A"}
                      </div>
                    </div>

                    {adapter.error && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <div className="text-xs md:text-sm text-red-600 font-medium">
                          Error:
                        </div>
                        <div className="text-xs md:text-sm text-red-500 break-words">
                          {adapter.error}
                        </div>
                      </div>
                    )}

                    {adapter.endpoints && (
                      <div>
                        <div className="text-xs md:text-sm font-medium mb-2">
                          Endpoint Status:
                        </div>
                        <div className="space-y-2">
                          {Object.entries(adapter.endpoints).map(
                            ([endpoint, status]) => (
                              <div
                                key={endpoint}
                                className="flex items-center justify-between text-xs md:text-sm"
                              >
                                <span className="capitalize truncate">
                                  {endpoint}
                                </span>
                                <div className="flex items-center ml-2">
                                  {status ? (
                                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                                  )}
                                  <span className="ml-1 text-xs md:text-sm">
                                    {status ? "OK" : "Failed"}
                                  </span>
                                </div>
                              </div>
                            ),
                          )}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-3">
                    <h3 className="text-sm md:text-base font-semibold">
                      Type 1: API Integrations
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">
                      These adapters fetch data from custom APIs and
                      transform it to DAOIP-5 format, providing unified
                      access through our API:
                    </p>
                    <ul className="text-xs md:text-sm space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Octant
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Giveth
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm md:text-base font-semibold">
                      Type 2: Data Integration
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">
                      Grants Systems who provide grant data files in
                      CSV/JSON which are then translated to DAOIP-5, this
                      data can be accessed via daoip5.daostar.org endpoint:
                    </p>
                    <ul className="text-xs md:text-sm space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Stellar Community Fund
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        CeloPG
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-sm md:text-base font-semibold">
                      Type 3: Endpoint Integrations
                    </h3>
                    <p className="text-xs md:text-sm text-gray-600">
                      These systems provide DAOIP-5 compliant endpoints. We
                      monitor their connectivity but don't integrate them
                      into our unified API:
                    </p>
                    <ul className="text-xs md:text-sm space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                        Questbook
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
                <p className="text-gray-600">
                  Loading health status...
                </p>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
