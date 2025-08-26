import { useQuery } from "@tanstack/react-query";
import { 
  DollarSign, 
  Building2, 
  FileText, 
  Users, 
  TrendingUp,
  Calendar,
  Award,
  Target
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { dashboardApi, formatCurrency } from "@/lib/dashboard-api";

// Stats card component
function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  change,
  loading = false 
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
  change?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-[#800020]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <p className="text-xs text-gray-600 flex items-center mt-1">
          {description}
          {change && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {change}
            </Badge>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

// Simple funding trends visualization
function FundingTrendsChart({ data }: { data: Array<{ quarter: string; funding: number; applications: number }> }) {
  const maxFunding = Math.max(...data.map(d => d.funding));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 text-[#800020] mr-2" />
          Funding Trends by Quarter
        </CardTitle>
        <CardDescription>
          Total funding distributed and applications processed over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={item.quarter} className="flex items-center space-x-4">
              <div className="w-16 text-sm font-medium text-gray-600">
                {item.quarter}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">
                    {formatCurrency(item.funding)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {item.applications} applications
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#800020] h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${maxFunding > 0 ? (item.funding / maxFunding) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Recent systems section
function RecentSystems({ systems }: { systems: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="h-5 w-5 text-[#800020] mr-2" />
          Integrated Grant Systems
        </CardTitle>
        <CardDescription>
          Currently integrated systems providing grant data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {systems.slice(0, 6).map((system, index) => (
            <div key={system.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-[#800020] rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{system.name}</div>
                  <div className="text-sm text-gray-600">{system.type}</div>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {system.source === 'opengrants' ? 'Live API' : 'Static Data'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardOverview() {
  // Fetch ecosystem statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-ecosystem-stats'],
    queryFn: dashboardApi.getEcosystemStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch funding trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard-funding-trends'],
    queryFn: dashboardApi.getFundingTrends,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  // Fetch systems
  const { data: systems, isLoading: systemsLoading } = useQuery({
    queryKey: ['dashboard-all-systems'],
    queryFn: dashboardApi.getAllSystems,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Ecosystem Overview</h1>
        <p className="text-gray-600">
          Comprehensive analytics across all integrated grant systems
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Funding"
          value={stats ? formatCurrency(stats.totalFunding) : "Loading..."}
          description="Distributed across all systems"
          icon={DollarSign}
          loading={statsLoading}
        />
        <StatsCard
          title="Grant Rounds"
          value={stats?.totalGrantRounds || 0}
          description="Active and completed rounds"
          icon={Calendar}
          loading={statsLoading}
        />
        <StatsCard
          title="Grant Systems"
          value={stats?.totalSystems || 0}
          description="Integrated platforms"
          icon={Building2}
          loading={statsLoading}
        />
        <StatsCard
          title="Projects Funded"
          value={stats?.totalProjects || 0}
          description="Unique projects receiving grants"
          icon={Users}
          loading={statsLoading}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <StatsCard
          title="Total Applications"
          value={stats?.totalApplications || 0}
          description="Applications processed"
          icon={FileText}
          loading={statsLoading}
        />
        <StatsCard
          title="Approval Rate"
          value={stats ? `${stats.averageApprovalRate.toFixed(1)}%` : "Loading..."}
          description="Average across all systems"
          icon={Award}
          loading={statsLoading}
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funding Trends */}
        {trends && trends.length > 0 ? (
          <FundingTrendsChart data={trends} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Funding Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <p className="text-gray-600">No trend data available</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recent Systems */}
        {systems && systems.length > 0 ? (
          <RecentSystems systems={systems} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Grant Systems</CardTitle>
            </CardHeader>
            <CardContent>
              {systemsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <p className="text-gray-600">No systems data available</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 text-[#800020] mr-2" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <Building2 className="h-8 w-8 text-[#800020] mb-2" />
              <h3 className="font-medium text-gray-900">Explore Grant Systems</h3>
              <p className="text-sm text-gray-600">View detailed profiles of each system</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <TrendingUp className="h-8 w-8 text-[#800020] mb-2" />
              <h3 className="font-medium text-gray-900">Cross-System Analysis</h3>
              <p className="text-sm text-gray-600">Compare and analyze overlaps</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <FileText className="h-8 w-8 text-[#800020] mb-2" />
              <h3 className="font-medium text-gray-900">Search Applications</h3>
              <p className="text-sm text-gray-600">Find specific grants and projects</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}