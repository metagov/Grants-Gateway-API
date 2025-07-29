import { useEffect, useState } from "react";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Layers,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

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

export default function SystemsLiveSidebar() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: healthData, isLoading, refetch } = useQuery<SystemHealthStatus>({
    queryKey: ['/api/v1/health'],
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-400';
      case 'degraded':
        return 'bg-yellow-400';
      case 'down':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  const formatResponseTime = (time?: number) => {
    if (time === undefined || time === null) return 'N/A';
    if (time === 0) return '< 1ms';
    return time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Systems Live
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {healthData && (
        <div className="space-y-3">
          {/* Overall System Status */}
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">System</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(healthData.status)}
                <span className="text-xs text-gray-500">
                  {formatTimestamp(healthData.timestamp)}
                </span>
              </div>
            </div>
          </Card>

          {/* Database Status */}
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(healthData.database.status)}`}></div>
                <span className="text-sm">Database</span>
              </div>
              <div className="flex items-center space-x-1">
                {getStatusIcon(healthData.database.status)}
                <span className="text-xs text-gray-500">
                  {formatResponseTime(healthData.database.responseTime)}
                </span>
              </div>
            </div>
          </Card>

          {/* API Integrations */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 mb-2">API Integrations</div>
            {healthData.adapters
              .filter(adapter => adapter.name === 'Octant' || adapter.name === 'Giveth')
              .map((adapter) => (
                <Card key={adapter.name} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(adapter.status)}`}></div>
                      <span className="text-sm">{adapter.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(adapter.status)}
                      <span className="text-xs text-gray-500">
                        {formatResponseTime(adapter.responseTime)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
          </div>

          {/* Health Monitoring Only */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 mb-2">Health Monitoring</div>
            {healthData.adapters
              .filter(adapter => adapter.name === 'Questbook')
              .map((adapter) => (
                <Card key={adapter.name} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(adapter.status)}`}></div>
                      <span className="text-sm">{adapter.name}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(adapter.status)}
                      <span className="text-xs text-gray-500">
                        {formatResponseTime(adapter.responseTime)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
          </div>

          {/* Summary Stats */}
          <Card className="p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">{healthData.summary.healthyAdapters}</div>
                <div className="text-xs text-gray-500">Healthy</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-600">{healthData.summary.degradedAdapters}</div>
                <div className="text-xs text-gray-500">Degraded</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">{healthData.summary.downAdapters}</div>
                <div className="text-xs text-gray-500">Down</div>
              </div>
            </div>
          </Card>

          {/* Auto Refresh Toggle */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Auto refresh: 30s</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`h-6 text-xs ${autoRefresh ? "text-green-600" : "text-gray-400"}`}
            >
              {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
        </div>
      )}

      {isLoading && !healthData && (
        <div className="flex items-center justify-center py-4">
          <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          <span className="ml-2 text-xs text-gray-500">Loading...</span>
        </div>
      )}
    </div>
  );
}