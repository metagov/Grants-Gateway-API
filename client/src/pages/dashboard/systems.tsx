import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Building2, 
  ExternalLink, 
  TrendingUp, 
  Users, 
  DollarSign,
  Calendar,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi, formatCurrency, getSystemColor } from "@/lib/dashboard-api";

function SystemCard({ system }: { system: any }) {
  const systemColor = getSystemColor(system.name);
  
  return (
    <Card className="hover:shadow-lg transition-all duration-200 group cursor-pointer">
      <Link href={`/dashboard/systems/${system.name.toLowerCase()}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="h-12 w-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: systemColor }}
              >
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg group-hover:text-[#800020] transition-colors">
                  {system.name}
                </CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ borderColor: systemColor, color: systemColor }}
                  >
                    {system.type}
                  </Badge>
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#800020] transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Total Funding</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Applications</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Approval Rate</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Grant Rounds</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {system.source === 'opengrants' ? 'Live API Integration' : 'Static Data Integration'}
              </span>
              <div className="flex items-center space-x-1 text-[#800020] text-sm font-medium group-hover:underline">
                <span>View Details</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

function SystemSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function GrantSystems() {
  const { data: systems, isLoading, error } = useQuery({
    queryKey: ['dashboard-all-systems'],
    queryFn: dashboardApi.getAllSystems,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const apiSystems = systems?.filter(s => s.source === 'opengrants') || [];
  const staticSystems = systems?.filter(s => s.source === 'daoip5') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Grant Systems</h1>
        <p className="text-gray-600">
          Explore individual grant systems and their funding data
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? <Skeleton className="h-8 w-12" /> : systems?.length || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">Integrated platforms</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Live Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? <Skeleton className="h-8 w-12" /> : apiSystems.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Real-time API access</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Data Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? <Skeleton className="h-8 w-12" /> : staticSystems.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Static data sources</p>
          </CardContent>
        </Card>
      </div>

      {/* API Integrated Systems */}
      {apiSystems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900">Live API Integrations</h2>
            <Badge variant="secondary" className="text-xs">Real-time data</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apiSystems.map((system) => (
              <SystemCard key={system.name} system={system} />
            ))}
          </div>
        </div>
      )}

      {/* Static Data Systems */}
      {staticSystems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900">Data Integrations</h2>
            <Badge variant="secondary" className="text-xs">Static data files</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staticSystems.map((system) => (
              <SystemCard key={system.name} system={system} />
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Loading Systems...</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SystemSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load systems</h3>
              <p className="text-gray-600 mb-4">
                There was an error fetching the grant systems data.
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Info */}
      <Card className="bg-gradient-to-r from-[#800020]/5 to-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 text-[#800020] mr-2" />
            Integration Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center">
                <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                Live API Integrations
              </h4>
              <p className="text-sm text-gray-600">
                Real-time access to grant data through direct API connections. 
                Data is fetched live and always up-to-date.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center">
                <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                Data Integrations
              </h4>
              <p className="text-sm text-gray-600">
                Curated static data files that follow the DAOIP-5 standard. 
                Updated periodically with the latest grant information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}