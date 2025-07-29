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
  Wifi,
  Building,
  Target,
  Code,
  Heart,
  Layers,
  X,
  Menu
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: Building },
    { id: "endpoints", label: "API Endpoints", icon: Target },
    { id: "query-builder", label: "Query Builder", icon: Code },
    { id: "health", label: "API Health", icon: Activity, active: true },
    { id: "supporters", label: "Contributors", icon: Heart },
  ];

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
    if (time === undefined || time === null) return 'N/A';
    if (time === 0) return '< 1ms';
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
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 shadow-lg border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold">OpenGrants</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              
              return (
                <Button
                  key={item.id}
                  variant={item.active ? "secondary" : "ghost"}
                  className={`w-full justify-start ${item.active ? 'bg-primary/10 text-primary' : ''}`}
                  onClick={() => {
                    if (item.id === 'health') {
                      // Already on health page
                      return;
                    } else if (item.id === 'overview') {
                      window.location.href = '/';
                    } else {
                      window.location.href = `/#${item.id}`;
                    }
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Grant Systems
            </div>
            <div className="space-y-1">
              <div className="flex items-center px-4 py-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300">Octant</span>
              </div>
              <div className="flex items-center px-4 py-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300">Giveth</span>
              </div>

              <div className="flex items-center px-4 py-2 text-sm">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300">Questbook (Health Monitor Only)</span>
              </div>
              <div className="flex items-center px-4 py-2 text-sm">
                <div className="w-2 h-2 bg-pink-400 rounded-full mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300">Stellar (Type 1 Integration)</span>
              </div>
              <div className="flex items-center px-4 py-2 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300">OSO (Coming Soon)</span>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-2"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">API Health Monitor</h1>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="container mx-auto px-4 py-4 md:py-8">
          <div className="max-w-6xl mx-auto space-y-4 md:space-y-8">
            {/* Controls */}
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
              <div>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
                  Real-time status of grant system integrations and API components
                </p>
              </div>
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`${autoRefresh ? "bg-green-50 border-green-200" : ""} w-full sm:w-auto`}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Auto Refresh</span>
                  <span className="sm:hidden">Auto</span> {autoRefresh ? 'ON' : 'OFF'}
                </Button>
                <Button 
                  onClick={() => refetch()} 
                  disabled={isLoading}
                  size="sm"
                  className="w-full sm:w-auto"
                >
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
                  <span className="ml-2 mr-2">System Status</span>
                  {getStatusBadge(healthData.status)}
                </CardTitle>
                <CardDescription>
                  Last updated: {formatTimestamp(healthData.timestamp)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 md:p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-green-600">{healthData.summary.healthyAdapters}</div>
                    <div className="text-xs md:text-sm text-gray-500">Healthy</div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-yellow-600">{healthData.summary.degradedAdapters}</div>
                    <div className="text-xs md:text-sm text-gray-500">Degraded</div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-red-600">{healthData.summary.downAdapters}</div>
                    <div className="text-xs md:text-sm text-gray-500">Down</div>
                  </div>
                  <div className="text-center p-3 md:p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="text-xl md:text-2xl font-bold text-blue-600">{healthData.summary.totalAdapters}</div>
                    <div className="text-xs md:text-sm text-gray-500">Total</div>
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
                    <span className="ml-2 text-sm md:text-base">PostgreSQL Connection</span>
                  </div>
                  <div className="text-xs md:text-sm text-gray-500">
                    Response time: {formatResponseTime(healthData.database.responseTime)}
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
                        <span className="ml-2 text-sm md:text-base">API Connectivity</span>
                      </div>
                      <div className="text-xs md:text-sm text-gray-500">
                        {adapter.responseTime ? formatResponseTime(adapter.responseTime) : 'N/A'}
                      </div>
                    </div>

                    {adapter.error && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-xs md:text-sm text-red-600 dark:text-red-400 font-medium">Error:</div>
                        <div className="text-xs md:text-sm text-red-500 dark:text-red-300 break-words">{adapter.error}</div>
                      </div>
                    )}

                    {adapter.endpoints && (
                      <div>
                        <div className="text-xs md:text-sm font-medium mb-2">Endpoint Status:</div>
                        <div className="space-y-2">
                          {Object.entries(adapter.endpoints).map(([endpoint, status]) => (
                            <div key={endpoint} className="flex items-center justify-between text-xs md:text-sm">
                              <span className="capitalize truncate">{endpoint}</span>
                              <div className="flex items-center ml-2">
                                {status ? (
                                  <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                                )}
                                <span className="ml-1 text-xs md:text-sm">{status ? 'OK' : 'Failed'}</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-3">
                    <h3 className="text-sm md:text-base font-semibold">Type 1: Full API Integrations</h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                      These adapters fetch data from custom APIs and transform it to DAOIP-5 format, providing unified access through our API:
                    </p>
                    <ul className="text-xs md:text-sm space-y-1">
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
                      <h3 className="text-sm md:text-base font-semibold">Type 2: Static File Integration</h3>
                      <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                        Grants Systems who provide grant data files in CSV/JSON which are then translated to DAOIP-5, this data can be accesed via daoip5.daostar.org endpoint:
                      </p>
                      <ul className="text-xs md:text-sm space-y-1">
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          Stellar Community Fund
                        </li>
                        <li className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          Celo Public Goods
                        </li>
                      </ul>
                    </div>
                  <div className="space-y-3">
                    <h3 className="text-sm md:text-base font-semibold">Type 3: Endpoint Integrations</h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                      These systems already provide DAOIP-5 compliant endpoints. We monitor their connectivity but don't integrate them into our unified API:
                    </p>
                    <ul className="text-xs md:text-sm space-y-1">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-purple-500 mr-2" />
                        Questbook - Direct DAOIP-5 implementation
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
      </div>
    </div>
  );
}