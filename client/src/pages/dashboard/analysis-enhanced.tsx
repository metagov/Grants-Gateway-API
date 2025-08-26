import { useQuery } from "@tanstack/react-query";
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
  Shuffle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  getCrossSystemComparison, 
  getFundingMechanismAnalysis,
  getFundingTrendsComparison,
  getEcosystemDiversity,
  type SystemComparisonData,
  type FundingMechanismAnalysis,
  type FundingTrend
} from "@/lib/cross-system-analysis";
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

function MetricCard({ 
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
}

function SystemComparisonChart({ data }: { data: SystemComparisonData[] }) {
  const chartData = data.map(system => ({
    name: system.systemName,
    funding: system.totalFunding,
    applications: system.totalApplications,
    approvalRate: system.approvalRate,
    avgFunding: system.averageFundingPerProject
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 text-[#800020] mr-2" />
          System Funding Comparison
        </CardTitle>
        <CardDescription>
          Total funding and application metrics across grant systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis 
                yAxisId="funding"
                orientation="left"
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={12}
              />
              <YAxis 
                yAxisId="applications"
                orientation="right"
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [
                  name.includes('funding') || name.includes('Funding') ? formatCurrency(value) : value,
                  name === 'funding' ? 'Total Funding' : 
                  name === 'applications' ? 'Applications' : 
                  name === 'approvalRate' ? 'Approval Rate (%)' : 'Avg Funding'
                ]}
                labelStyle={{ color: '#374151' }}
              />
              <Bar yAxisId="funding" dataKey="funding" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="applications" dataKey="applications" fill={COLORS.info} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function FundingMechanismChart({ data }: { data: FundingMechanismAnalysis[] }) {
  const chartData = data.map(mechanism => ({
    name: mechanism.mechanism,
    funding: mechanism.totalFunding,
    applications: mechanism.totalApplications,
    systems: mechanism.systems.length,
    approvalRate: mechanism.averageApprovalRate
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="h-5 w-5 text-[#800020] mr-2" />
          Funding Mechanisms Analysis
        </CardTitle>
        <CardDescription>
          Distribution of funding across different grant mechanisms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-8">
          <div className="h-64 w-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="funding"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CHART_COLORS[index % CHART_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Total Funding']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {chartData.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center justify-between space-x-4 min-w-[300px]">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{formatCurrency(item.funding)}</div>
                  <div className="text-xs text-gray-500">{item.systems} systems, {item.applications} apps</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FundingTrendsChart({ data }: { data: FundingTrend[] }) {
  // Group data by period
  const periodData = data.reduce((acc, item) => {
    if (!acc[item.period]) {
      acc[item.period] = { period: item.period };
    }
    acc[item.period][item.systemName] = item.funding;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(periodData);
  const systems = Array.from(new Set(data.map(d => d.systemName)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 text-[#800020] mr-2" />
          Cross-System Funding Trends
        </CardTitle>
        <CardDescription>
          Funding evolution across systems over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" fontSize={12} />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [formatCurrency(value), name]}
                labelStyle={{ color: '#374151' }}
              />
              {systems.map((system, index) => (
                <Line 
                  key={system}
                  type="monotone" 
                  dataKey={system} 
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], strokeWidth: 2, r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function EfficiencyScatterChart({ data }: { data: SystemComparisonData[] }) {
  const chartData = data.map(system => ({
    name: system.systemName,
    x: system.averageFundingPerProject,
    y: system.approvalRate,
    totalFunding: system.totalFunding,
    applications: system.totalApplications
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 text-[#800020] mr-2" />
          System Efficiency Analysis
        </CardTitle>
        <CardDescription>
          Approval rate vs average funding per project
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Avg Funding per Project"
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={12}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Approval Rate"
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
                fontSize={12}
              />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: any, name: any) => [
                  name === 'Avg Funding per Project' ? formatCurrency(value) : `${value}%`,
                  name
                ]}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.name;
                  }
                  return label;
                }}
              />
              <Scatter data={chartData} fill={COLORS.primary}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CrossSystemAnalysisEnhanced() {
  const { data: systemComparison, isLoading: systemLoading } = useQuery({
    queryKey: ['cross-system-comparison'],
    queryFn: getCrossSystemComparison,
    staleTime: 5 * 60 * 1000,
  });

  const { data: mechanismAnalysis, isLoading: mechanismLoading } = useQuery({
    queryKey: ['funding-mechanism-analysis'],
    queryFn: getFundingMechanismAnalysis,
    staleTime: 5 * 60 * 1000,
  });

  const { data: fundingTrends, isLoading: trendsLoading } = useQuery({
    queryKey: ['funding-trends-comparison'],
    queryFn: getFundingTrendsComparison,
    staleTime: 5 * 60 * 1000,
  });

  const { data: diversity, isLoading: diversityLoading } = useQuery({
    queryKey: ['ecosystem-diversity'],
    queryFn: getEcosystemDiversity,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate overview metrics
  const totalFunding = systemComparison?.reduce((sum, system) => sum + system.totalFunding, 0) || 0;
  const totalApplications = systemComparison?.reduce((sum, system) => sum + system.totalApplications, 0) || 0;
  const averageApproval = (systemComparison && systemComparison.length > 0) ? 
    systemComparison.reduce((sum, system) => sum + system.approvalRate, 0) / systemComparison.length : 0;
  const activeSystems = systemComparison?.filter(system => system.status === 'active').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Cross-System Analysis</h1>
        <p className="text-gray-600">
          Comprehensive analysis and comparison across all grant systems using DAOIP-5 standardized data
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Ecosystem Funding"
          value={formatCurrency(totalFunding)}
          description="Across all systems"
          icon={DollarSign}
          loading={systemLoading}
        />
        <MetricCard
          title="Total Applications"
          value={totalApplications.toLocaleString()}
          description="Grant applications processed"
          icon={Users}
          loading={systemLoading}
        />
        <MetricCard
          title="Average Approval Rate"
          value={`${averageApproval.toFixed(1)}%`}
          description="Across active systems"
          icon={Target}
          loading={systemLoading}
        />
        <MetricCard
          title="Active Systems"
          value={activeSystems}
          description="Currently operating"
          icon={Activity}
          loading={systemLoading}
        />
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="comparison" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comparison">System Comparison</TabsTrigger>
          <TabsTrigger value="mechanisms">Funding Mechanisms</TabsTrigger>
          <TabsTrigger value="trends">Funding Trends</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-6">
          {systemComparison && systemComparison.length > 0 ? (
            <>
              <SystemComparisonChart data={systemComparison} />
              
              {/* System Details Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Layers className="h-5 w-5 text-[#800020] mr-2" />
                    System Details
                  </CardTitle>
                  <CardDescription>
                    Detailed metrics for each grant system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {systemComparison.map((system, index) => (
                      <Card key={`${system.systemName}-${index}`} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg capitalize">{system.systemName}</CardTitle>
                            <Badge 
                              variant={system.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {system.status}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="w-fit text-xs">
                            {system.source.toUpperCase()}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Funding:</span>
                            <span className="text-sm font-medium">{formatCurrency(system.totalFunding)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Applications:</span>
                            <span className="text-sm font-medium">{system.totalApplications}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Approval Rate:</span>
                            <span className="text-sm font-medium">{system.approvalRate.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Grant Rounds:</span>
                            <span className="text-sm font-medium">{system.totalPools}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Avg per Project:</span>
                            <span className="text-sm font-medium">{formatCurrency(system.averageFundingPerProject)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Shuffle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading System Data</h3>
                  <p className="text-gray-600">Fetching comprehensive data from all grant systems...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="mechanisms" className="space-y-6">
          {mechanismAnalysis && mechanismAnalysis.length > 0 ? (
            <FundingMechanismChart data={mechanismAnalysis} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Mechanism Analysis</h3>
                  <p className="text-gray-600">Analyzing funding mechanisms across systems...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {fundingTrends && fundingTrends.length > 0 ? (
            <FundingTrendsChart data={fundingTrends} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Trend Analysis</h3>
                  <p className="text-gray-600">Analyzing funding trends over time...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6">
          {systemComparison && systemComparison.length > 0 ? (
            <>
              <EfficiencyScatterChart data={systemComparison} />
              
              {/* Ecosystem Diversity Metrics */}
              {diversity && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MetricCard
                    title="Funding Distribution"
                    value={`${(diversity.fundingConcentration * 100).toFixed(1)}%`}
                    description="Distribution score (higher = more distributed)"
                    icon={Globe}
                    loading={diversityLoading}
                  />
                  <MetricCard
                    title="System Diversity"
                    value={diversity.systemDiversity}
                    description="Active grant systems"
                    icon={Layers}
                    loading={diversityLoading}
                  />
                  <MetricCard
                    title="Mechanism Diversity"
                    value={diversity.mechanismDiversity}
                    description="Different funding mechanisms"
                    icon={Shuffle}
                    loading={diversityLoading}
                  />
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Efficiency Analysis</h3>
                  <p className="text-gray-600">Calculating system efficiency metrics...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}