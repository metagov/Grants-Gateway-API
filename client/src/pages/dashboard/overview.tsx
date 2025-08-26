import React, { useMemo } from "react";
import { Link } from "wouter";
import { 
  DollarSign, 
  Building2, 
  FileText, 
  Users, 
  TrendingUp,
  Calendar,
  Award,
  Target,
  ArrowRight,
  Activity,
  Globe
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/dashboard-api";
import { useCrossSystemAnalytics, useFundingTrends } from "@/lib/analytics-hooks";

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
  // Use optimized analytics hooks for real data
  const { analytics, derivedData, isLoading: analyticsLoading } = useCrossSystemAnalytics();
  const { trends, isLoading: trendsLoading } = useFundingTrends();
  
  // Memoize computed values
  const stats = useMemo(() => {
    if (!analytics) return null;
    return {
      totalFunding: analytics.totals.funding,
      totalGrantRounds: analytics.totals.pools,
      totalSystems: analytics.totals.systems,
      totalProjects: analytics.systems.reduce((sum, system) => {
        // Estimate unique projects based on applications and system overlap
        return sum + Math.ceil(system.metrics.totalApplications * 0.8);
      }, 0),
      totalApplications: analytics.totals.applications,
      averageApprovalRate: analytics.totals.avgApprovalRate
    };
  }, [analytics]);
  
  const trendsData = useMemo(() => {
    if (!trends?.trends) return [];
    return trends.trends.map(trend => ({
      quarter: trend.period,
      funding: trend.totals.funding,
      applications: trend.totals.applications
    }));
  }, [trends]);
  
  const topSystems = useMemo(() => {
    if (!analytics) return [];
    return analytics.comparisons
      .sort((a, b) => b.metrics.totalFunding - a.metrics.totalFunding)
      .slice(0, 6);
  }, [analytics]);
  
  const healthScore = useMemo(() => {
    if (!derivedData) return 0;
    return derivedData.healthScore;
  }, [derivedData]);
  
  const statsLoading = analyticsLoading;
  const systemsLoading = analyticsLoading;

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
          value={stats?.totalProjects.toLocaleString() || 0}
          description="Estimated unique projects"
          icon={Users}
          loading={statsLoading}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
        <StatsCard
          title="Total Applications"
          value={stats?.totalApplications.toLocaleString() || 0}
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
        <StatsCard
          title="Ecosystem Health"
          value={`${healthScore}/100`}
          description="Overall system health"
          icon={Activity}
          loading={statsLoading}
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funding Trends */}
        {trendsData && trendsData.length > 0 ? (
          <FundingTrendsChart data={trendsData} />
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

        {/* Top Performing Systems */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 text-[#800020] mr-2" />
              Top Grant Systems
            </CardTitle>
            <CardDescription>
              Highest performing systems by total funding distributed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {systemsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : topSystems.length > 0 ? (
              <div className="space-y-3">
                {topSystems.map((system, index) => (
                  <Link key={system.systemName} href={`/dashboard/systems/${system.systemName.toLowerCase()}`}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="text-xs min-w-[24px] text-center">#{index + 1}</Badge>
                        <div className="h-10 w-10 bg-[#800020] rounded-lg flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 group-hover:text-[#800020] transition-colors">{system.systemName}</div>
                          <div className="text-sm text-gray-600">
                            {system.metrics.totalApplications} applications • {system.metrics.approvalRate.toFixed(1)}% approval
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="font-bold text-sm">{formatCurrency(system.metrics.totalFunding)}</div>
                          <Badge variant="outline" className="text-xs">
                            {system.source === 'opengrants' ? 'Type 1' : 'Type 2'}
                          </Badge>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#800020] transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No systems data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DAOIP-5 Standardization Impact & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 text-[#800020] mr-2" />
              DAOIP-5 Standardization Impact
            </CardTitle>
            <CardDescription>
              How standardization enables unified grant analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Compatibility</span>
                <span className="text-lg font-bold text-[#800020]">
                  {analytics ? Math.round(analytics.systems.reduce((sum, s) => sum + s.compatibility, 0) / analytics.systems.length) : 0}%
                </span>
              </div>
              <Progress 
                value={analytics ? analytics.systems.reduce((sum, s) => sum + s.compatibility, 0) / analytics.systems.length : 0} 
                className="h-3" 
              />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-900">Type 1 Systems</div>
                  <div className="text-gray-600">{analytics?.systems.filter(s => s.source === 'opengrants').length || 0} live APIs</div>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Type 2 Systems</div>
                  <div className="text-gray-600">{analytics?.systems.filter(s => s.source === 'daoip5').length || 0} static sources</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 text-[#800020] mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/dashboard/systems">
                <Button variant="ghost" className="w-full justify-start h-auto p-4">
                  <Building2 className="h-6 w-6 text-[#800020] mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Explore Grant Systems</div>
                    <div className="text-sm text-gray-600">View detailed profiles of each system</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
                </Button>
              </Link>
              <Link href="/dashboard/analysis">
                <Button variant="ghost" className="w-full justify-start h-auto p-4">
                  <TrendingUp className="h-6 w-6 text-[#800020] mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Cross-System Analysis</div>
                    <div className="text-sm text-gray-600">Compare and analyze overlaps</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
                </Button>
              </Link>
              <Link href="/dashboard/search">
                <Button variant="ghost" className="w-full justify-start h-auto p-4">
                  <FileText className="h-6 w-6 text-[#800020] mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Search Applications</div>
                    <div className="text-sm text-gray-600">Find specific grants and projects</div>
                  </div>
                  <ArrowRight className="h-4 w-4 ml-auto text-gray-400" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}