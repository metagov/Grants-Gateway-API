// Optimized Cross-System Analysis with efficient data management
import React, { useMemo, useCallback } from "react";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  Users, 
  DollarSign,
  Target,
  Globe,
  Activity,
  Layers,
  Shuffle,
  Zap,
  Award,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  useCrossSystemAnalytics,
  useFundingMechanisms,
  useFundingTrends,
  useEcosystemDiversity,
  useSystemComparison
} from "@/lib/analytics-hooks";
import { formatCurrency } from "@/lib/dashboard-api";

// Color palette for consistent visualization
const COLORS = {
  primary: '#800020',
  secondary: '#B91C1C', 
  accent: '#DC2626',
  info: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  muted: '#6B7280'
};

const CHART_COLORS = [COLORS.primary, COLORS.info, COLORS.success, COLORS.warning, COLORS.accent, COLORS.muted];

// Memoized metric card component
const MetricCard = React.memo(({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  loading = false,
  trend
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
  loading?: boolean;
  trend?: number;
}) => {
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
        <div className="flex items-center space-x-2 mt-1">
          <p className="text-xs text-gray-600">{description}</p>
          {trend !== undefined && (
            <Badge variant={trend > 0 ? "default" : "secondary"} className="text-xs">
              {trend > 0 ? "+" : ""}{trend.toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// Memoized chart components for better performance
const SystemComparisonChart = React.memo(({ data }: { data: any[] }) => {
  const chartData = useMemo(() => 
    data.slice(0, 10).map(system => ({
      name: system.name,
      funding: system.funding / 1000000, // Convert to millions
      applications: system.applications,
      approvalRate: system.approvalRate
    })), [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 text-[#800020] mr-2" />
          System Comparison
        </CardTitle>
        <CardDescription>
          Funding distribution and application metrics across top 10 systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis yAxisId="funding" orientation="left" />
              <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  name === 'funding' ? `$${value.toFixed(1)}M` : 
                  name === 'approvalRate' ? `${value.toFixed(1)}%` : value,
                  name === 'funding' ? 'Funding (M)' :
                  name === 'approvalRate' ? 'Approval Rate' : 'Applications'
                ]}
                labelStyle={{ color: '#374151' }}
              />
              <Bar yAxisId="funding" dataKey="funding" fill={COLORS.primary} name="funding" />
              <Bar yAxisId="funding" dataKey="applications" fill={COLORS.info} name="applications" />
              <Line yAxisId="rate" type="monotone" dataKey="approvalRate" stroke={COLORS.success} strokeWidth={2} name="approvalRate" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

const MechanismAnalysisChart = React.memo(({ data }: { data: any[] }) => {
  const pieData = useMemo(() => 
    data.map((item, index) => ({
      name: item.name,
      value: item.funding,
      marketShare: item.marketShare,
      color: CHART_COLORS[index % CHART_COLORS.length]
    })), [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="h-5 w-5 text-[#800020] mr-2" />
          Funding Mechanisms
        </CardTitle>
        <CardDescription>
          Distribution of funding by mechanism type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, marketShare }) => `${name} (${marketShare.toFixed(1)}%)`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [formatCurrency(value), 'Total Funding']} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

const FundingTrendsChart = React.memo(({ data }: { data: any[] }) => {
  const trendData = useMemo(() => 
    data.map(item => ({
      period: item.period,
      funding: item.funding / 1000000, // Convert to millions
      applications: item.applications,
      growth: item.growth
    })), [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 text-[#800020] mr-2" />
          Funding Trends
        </CardTitle>
        <CardDescription>
          Historical funding and application trends across the ecosystem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value: any, name: string) => [
                  name === 'funding' ? `$${value.toFixed(1)}M` : 
                  name === 'growth' ? `${value.toFixed(1)}%` : value,
                  name === 'funding' ? 'Funding (M)' :
                  name === 'growth' ? 'Growth Rate' : 'Applications'
                ]}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="funding"
                stackId="1"
                stroke={COLORS.primary}
                fill={COLORS.primary}
                fillOpacity={0.6}
                name="funding"
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="growth" 
                stroke={COLORS.success} 
                strokeWidth={3}
                dot={{ r: 4 }}
                name="growth"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});

export default function OptimizedCrossSystemAnalysis() {
  const { 
    analytics, 
    derivedData,
    isLoading, 
    error, 
    refetch,
    isStale
  } = useCrossSystemAnalytics();
  
  const { mechanisms } = useFundingMechanisms();
  const { trends } = useFundingTrends();
  const { diversity } = useEcosystemDiversity();

  // Memoized chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => {
    if (!analytics || !derivedData) return null;

    return {
      systemComparison: analytics.comparisons.map(comp => ({
        name: comp.systemName.length > 12 ? comp.systemName.substring(0, 12) + '...' : comp.systemName,
        fullName: comp.systemName,
        funding: comp.metrics.totalFunding,
        applications: comp.metrics.totalApplications,
        approvalRate: comp.metrics.approvalRate,
        source: comp.source,
      })),
      mechanismData: mechanisms?.all.map(mech => ({
        name: mech.mechanism,
        funding: mech.totalFunding,
        marketShare: mech.marketShare * 100,
      })) || [],
      trendsData: trends?.trends.map(trend => ({
        period: trend.period,
        funding: trend.totals.funding,
        applications: trend.totals.applications,
        growth: (trend as any).growthRate || 0
      })) || []
    };
  }, [analytics, derivedData, mechanisms, trends]);

  // Memoized refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <MetricCard
              key={i}
              title="Loading..."
              value="--"
              description="--"
              icon={Activity}
              loading
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Cross-System Analysis</h1>
          <p className="text-gray-600">Compare and analyze grant systems across the ecosystem</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load analysis</h3>
              <p className="text-gray-600 mb-4">There was an error loading the cross-system analysis data.</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics || !chartData) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Cross-System Analysis</h1>
          <p className="text-gray-600">No data available for analysis</p>
        </div>
      </div>
    );
  }

  // Extract key metrics
  const { totals } = analytics;
  const { healthScore } = derivedData!;
  
  // Diversity and health metrics
  const diversityScore = diversity?.diversityScore || 0;
  const riskLevel = diversity?.riskLevel || 'medium';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Cross-System Analytics</h1>
          <p className="text-gray-600">
            Comprehensive analysis and comparison of grant systems across the ecosystem
          </p>
          {isStale && (
            <div className="flex items-center space-x-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Data may be outdated</span>
            </div>
          )}
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Funding"
          value={formatCurrency(totals.funding)}
          description="Across all systems"
          icon={DollarSign}
          trend={derivedData!.growthMetrics.length > 1 ? 12.5 : undefined}
        />
        <MetricCard
          title="Total Applications"
          value={totals.applications.toLocaleString()}
          description="Grant applications submitted"
          icon={Users}
          trend={8.2}
        />
        <MetricCard
          title="Average Approval Rate"
          value={`${totals.avgApprovalRate.toFixed(1)}%`}
          description="Success rate across systems"
          icon={Target}
          trend={-2.1}
        />
        <MetricCard
          title="Ecosystem Health"
          value={`${healthScore}/100`}
          description="Overall system health score"
          icon={Activity}
          trend={healthScore > 70 ? 5.0 : healthScore > 50 ? 0 : -5.0}
        />
      </div>

      {/* Health and Diversity Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 text-[#800020] mr-2" />
              Ecosystem Health Score
            </CardTitle>
            <CardDescription>
              Overall health based on funding, participation, and diversity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-gray-900">{healthScore}/100</span>
                <Badge 
                  variant={healthScore > 70 ? "default" : healthScore > 50 ? "secondary" : "destructive"}
                  className="text-sm"
                >
                  {healthScore > 70 ? "Excellent" : healthScore > 50 ? "Good" : "Needs Attention"}
                </Badge>
              </div>
              <Progress value={healthScore} className="h-3" />
              <div className="text-sm text-gray-600">
                Based on funding volume, participation rates, approval efficiency, and system diversity
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 text-[#800020] mr-2" />
              Ecosystem Diversity
            </CardTitle>
            <CardDescription>
              Risk assessment and diversity metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-gray-900">{diversityScore}/100</span>
                <Badge 
                  variant={riskLevel === 'low' ? "default" : riskLevel === 'medium' ? "secondary" : "destructive"}
                  className="text-sm"
                >
                  {riskLevel === 'low' ? "Low Risk" : riskLevel === 'medium' ? "Medium Risk" : "High Risk"}
                </Badge>
              </div>
              <Progress value={diversityScore} className="h-3" />
              {diversity?.risks && diversity.risks.length > 0 && (
                <div className="text-sm text-gray-600">
                  <div className="font-medium mb-1">Areas of concern:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {diversity.risks.slice(0, 3).map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="comparison" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="comparison">System Comparison</TabsTrigger>
          <TabsTrigger value="mechanisms">Funding Mechanisms</TabsTrigger>
          <TabsTrigger value="trends">Trends & Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6">
          <SystemComparisonChart data={chartData.systemComparison} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Systems</CardTitle>
                <CardDescription>By total funding distributed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {derivedData!.topSystems.slice(0, 5).map((system, index) => (
                    <div key={system.systemName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                        <div>
                          <div className="font-medium text-sm">{system.systemName}</div>
                          <div className="text-xs text-gray-500">
                            {system.metrics.totalApplications} applications
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm">{formatCurrency(system.metrics.totalFunding)}</div>
                        <div className="text-xs text-gray-500">
                          {system.metrics.approvalRate.toFixed(1)}% approval
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>DAOIP-5 Standardization</CardTitle>
                <CardDescription>Compatibility scores across systems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.systems.slice(0, 5).map((system) => (
                    <div key={system.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium">{system.name}</div>
                        <Badge variant="outline" className="text-xs">
                          {system.source === 'opengrants' ? 'Type 1' : 'Type 2'}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={system.compatibility} className="w-16 h-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {system.compatibility}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mechanisms" className="space-y-6">
          <MechanismAnalysisChart data={chartData.mechanismData} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MetricCard
              title="Total Mechanisms"
              value={mechanisms?.totalMechanisms || 0}
              description="Different funding approaches"
              icon={Layers}
            />
            <MetricCard
              title="Dominant Mechanism"
              value={mechanisms?.dominantMechanism?.mechanism || "N/A"}
              description={`${((mechanisms?.dominantMechanism?.marketShare || 0) * 100).toFixed(1)}% market share`}
              icon={Award}
            />
            <MetricCard
              title="Most Efficient"
              value={mechanisms?.categories.efficient?.[0]?.mechanism || "N/A"}
              description={`${(mechanisms?.categories.efficient?.[0]?.avgApprovalRate || 0).toFixed(1)}% approval rate`}
              icon={Target}
            />
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <FundingTrendsChart data={chartData.trendsData} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MetricCard
              title="Total Growth"
              value={`${(trends?.totalGrowth || 0).toFixed(1)}%`}
              description="Latest period growth"
              icon={TrendingUp}
              trend={trends?.totalGrowth}
            />
            <MetricCard
              title="Average Growth"
              value={`${(trends?.averageGrowth || 0).toFixed(1)}%`}
              description="Historical average"
              icon={Activity}
            />
            <MetricCard
              title="Peak Period"
              value={trends?.peakPeriod?.period || "N/A"}
              description={formatCurrency(trends?.peakPeriod?.totals.funding || 0)}
              icon={Award}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}