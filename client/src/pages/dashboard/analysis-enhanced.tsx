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
  Shuffle,
  FileText
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
  Radar,
  ComposedChart,
  Area
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
import { Link } from "wouter";

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
    <Card className="hover:shadow-md transition-shadow relative">
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
  const chartData = data.map(system => {
    // Create shorter names for better chart display
    let shortName = system.systemName;
    if (shortName === "Stellar Community Fund") shortName = "Stellar SCF";
    if (shortName === "Celo Public Goods") shortName = "Celo PG";
    if (shortName === "Octant") shortName = "Octant";
    if (shortName === "Giveth") shortName = "Giveth";
    
    return {
      name: shortName,
      funding: system.totalFunding,
      fundingMillions: system.totalFunding / 1000000, // Convert to millions for better display
      applications: system.totalApplications,
      approvalRate: system.approvalRate,
      avgFunding: system.averageFundingPerProject
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{label}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              <span className="font-medium text-[#800020]">Total Funding:</span> {formatCurrency(data.funding)}
            </p>
            <p className="text-sm">
              <span className="font-medium text-[#3B82F6]">Applications:</span> {data.applications}
            </p>
            <p className="text-sm">
              <span className="font-medium text-gray-600">Approval Rate:</span> {data.approvalRate}%
            </p>
            <p className="text-sm">
              <span className="font-medium text-gray-600">Avg Funding:</span> {formatCurrency(data.avgFunding)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 text-[#800020] mr-2" />
          System Funding Overview & Application Metrics
        </CardTitle>
        <CardDescription>
          Combined view of funding amounts and application counts by system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
                interval={0}
                stroke="#6B7280"
              />
              <YAxis 
                yAxisId="funding"
                orientation="left"
                fontSize={12}
                stroke="#6B7280"
                label={{ 
                  value: 'Funding (Millions USD)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <YAxis 
                yAxisId="applications"
                orientation="right"
                fontSize={12}
                stroke="#6B7280"
                label={{ 
                  value: 'Applications Count', 
                  angle: 90, 
                  position: 'insideRight',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Funding bars */}
              <Bar 
                yAxisId="funding"
                dataKey="fundingMillions" 
                fill={COLORS.primary} 
                radius={[4, 4, 0, 0]} 
                name="Funding (Millions)"
                opacity={0.8}
              />
              
              {/* Applications bars */}
              <Bar 
                yAxisId="applications"
                dataKey="applications" 
                fill={COLORS.info} 
                radius={[4, 4, 0, 0]} 
                name="Applications"
                opacity={0.7}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center mt-4 space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.primary, opacity: 0.8 }}></div>
            <span className="text-sm text-gray-600">Total Funding (Millions USD)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS.info, opacity: 0.7 }}></div>
            <span className="text-sm text-gray-600">Application Count</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FundingMechanismPieChart({ data }: { data: FundingMechanismAnalysis[] }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 text-[#800020] mr-2" />
            Funding by Mechanism
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">No funding mechanism data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalFunding = data.reduce((sum, item) => sum + item.totalFunding, 0);
  const pieChartData = data.map((item, index) => ({
    name: item.mechanism,
    value: item.totalFunding,
    systems: item.systems,
    percentage: ((item.totalFunding / totalFunding) * 100),
    color: CHART_COLORS[index % CHART_COLORS.length]
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="h-5 w-5 text-[#800020] mr-2" />
          Funding Distribution by Mechanism
        </CardTitle>
        <CardDescription>
          Breakdown of funding by grant mechanism and participating systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Total Funding']}
                  labelFormatter={(label) => `${label}`}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend and Details */}
          <div className="space-y-4">
            <div className="text-center lg:text-left">
              <div className="text-sm font-medium text-gray-600">Total Funding</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalFunding)}</div>
            </div>
            
            <div className="space-y-3">
              {pieChartData.map((item, index) => (
                <div key={`${item.name}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-600">
                          {item.systems.length} system{item.systems.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatCurrency(item.value)}</div>
                      <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Systems: {item.systems.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CeloVsStellarBreakdownChart({ data }: { data: SystemComparisonData[] }) {
  // Filter for only Celo and Stellar systems  
  const directGrantSystems = data.filter(system => 
    system.systemName.includes("Stellar") || system.systemName.includes("Celo")
  );
  
  const chartData = directGrantSystems.map(system => {
    let shortName = system.systemName;
    if (shortName === "Stellar Community Fund") shortName = "Stellar SCF";
    if (shortName === "Celo Public Goods") shortName = "Celo PG";
    
    return {
      name: shortName,
      funding: system.totalFunding,
      applications: system.totalApplications,
      pools: system.totalPools
    };
  });

  const totalDirectGrantsFunding = chartData.reduce((sum, item) => sum + item.funding, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 text-[#800020] mr-2" />
          Direct Grants: Celo vs Stellar Breakdown
        </CardTitle>
        <CardDescription>
          Funding distribution between Celo and Stellar direct grant systems
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
                  label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === 0 ? '#2563eb' : '#dc2626'} // Blue for first system, red for second
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Funding']}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <div className="text-center lg:text-left mb-4">
              <div className="text-sm font-medium text-gray-600">Total Direct Grants</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalDirectGrantsFunding)}</div>
            </div>
            {chartData.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center justify-between space-x-4 min-w-[300px]">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: index === 0 ? '#2563eb' : '#dc2626' }}
                  />
                  <span className="text-sm font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{formatCurrency(item.funding)}</div>
                  <div className="text-xs text-gray-500">{item.pools} rounds, {item.applications} apps</div>
                  <div className="text-xs text-blue-600">
                    {((item.funding / totalDirectGrantsFunding) * 100).toFixed(1)}% of direct grants
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemFundingDistributionChart({ data }: { data: SystemComparisonData[] }) {
  const chartData = data.map(system => {
    // Create shorter names for better chart display
    let shortName = system.systemName;
    if (shortName === "Stellar Community Fund") shortName = "Stellar SCF";
    if (shortName === "Celo Public Goods") shortName = "Celo PG";
    if (shortName === "Octant") shortName = "Octant";
    if (shortName === "Giveth") shortName = "Giveth";
    
    return {
      name: shortName,
      funding: system.totalFunding,
      applications: system.totalApplications,
      pools: system.totalPools
    };
  });

  const totalFunding = chartData.reduce((sum, item) => sum + item.funding, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="h-5 w-5 text-[#800020] mr-2" />
          All Grant Systems Distribution
        </CardTitle>
        <CardDescription>
          Distribution of funding across all grant systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="funding"
                  label={({ name, percent }) => {
                    const percentage = (percent * 100);
                    return percentage > 5 ? `${name} ${percentage.toFixed(0)}%` : `${percentage.toFixed(1)}%`;
                  }}
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
          {/* Legend and Details */}
          <div className="space-y-4">
            <div className="text-center lg:text-left">
              <div className="text-sm font-medium text-gray-600">Total Funding</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalFunding)}</div>
            </div>
            
            <div className="space-y-3">
              {chartData.map((item, index) => (
                <div key={`${item.name}-${index}`} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-600">
                          {item.pools} rounds, {item.applications} apps
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatCurrency(item.funding)}</div>
                      <div className="text-xs text-gray-500">
                        {((item.funding / totalFunding) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
  // Example data for demonstration purposes
  const exampleData = [
    {
      name: "Stellar Community Fund",
      x: 68622, // Average funding per project
      y: 45.2, // Approval rate percentage
      totalFunding: 49133209,
      applications: 716,
    },
    {
      name: "Celo Public Goods", 
      x: 138753, // Higher average funding
      y: 35.8, // Approval rate percentage
      totalFunding: 82280,
      applications: 593,
    },
    {
      name: "Example System A",
      x: 25000,
      y: 62.5,
      totalFunding: 1500000,
      applications: 240,
    },
    {
      name: "Example System B",
      x: 95000,
      y: 28.3,
      totalFunding: 3800000,
      applications: 180,
    },
  ];

  const chartData = data && data.length > 0 && data.some(system => system.averageFundingPerProject > 0 && system.approvalRate > 0)
    ? data.map(system => ({
        name: system.systemName,
        x: system.averageFundingPerProject,
        y: system.approvalRate,
        totalFunding: system.totalFunding,
        applications: system.totalApplications
      }))
    : exampleData;

  // Custom dot component to show system names
  const CustomDot = (props: any) => {
    const { cx, cy, payload, index } = props;
    return (
      <g>
        <circle 
          cx={cx} 
          cy={cy} 
          r={6} 
          fill={CHART_COLORS[index % CHART_COLORS.length]} 
          stroke="#fff"
          strokeWidth={2}
        />
        <text 
          x={cx} 
          y={cy - 10} 
          fill="#374151" 
          fontSize={11}
          textAnchor="middle"
          fontWeight="500"
        >
          {payload.name}
        </text>
      </g>
    );
  };

  return (
    <Card className="relative" data-testid="card-efficiency-analysis">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 text-[#800020] mr-2" />
          System Efficiency Analysis
        </CardTitle>
        <CardDescription>
          Each point represents a grant system - higher and further right means better efficiency
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legend explaining the chart */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>Each dot = One grant system</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>↑ Higher = Better approval rate</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>→ Further right = Higher avg funding</span>
            </div>
          </div>
          
          <div className="h-80 w-full" data-testid="chart-efficiency-scatter">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 30, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Avg Funding per Project"
                  tickFormatter={(value) => formatCurrency(value)}
                  fontSize={12}
                  label={{ value: 'Average Funding per Project ($)', position: 'insideBottom', offset: -5, fontSize: 12 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Approval Rate"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  fontSize={12}
                  label={{ value: 'Approval Rate (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-medium text-gray-900">{data.name}</p>
                          <p className="text-sm text-gray-600">
                            Approval Rate: <span className="font-medium">{data.y.toFixed(1)}%</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Avg Funding: <span className="font-medium">{formatCurrency(data.x)}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Total Funding: <span className="font-medium">{formatCurrency(data.totalFunding)}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Applications: <span className="font-medium">{data.applications}</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter 
                  data={chartData} 
                  fill={COLORS.primary}
                  shape={<CustomDot />}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          {/* Systems ranked by efficiency */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Efficiency Rankings</h4>
            <div className="space-y-1 text-xs">
              {[...chartData]
                .sort((a, b) => (b.x * b.y) - (a.x * a.y))
                .slice(0, 5)
                .map((system, index) => (
                  <div key={system.name} className="flex items-center justify-between" data-testid={`row-efficiency-${index}`}>
                    <span className="text-gray-600">
                      {index + 1}. {system.name}
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(system.x)} @ {system.y.toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Coming Soon Blur Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 rounded-lg flex items-center justify-center backdrop-blur-sm" data-testid="status-coming-soon">
        <div className="bg-white/90 px-4 py-2 rounded-full shadow-sm border border-gray-200">
          <span className="text-sm font-medium text-gray-600">
            Coming Soon - Advanced Efficiency Metrics
          </span>
        </div>
      </div>
    </Card>
  );
}

export default function EcosystemOverview() {
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
        <h1 className="text-3xl font-bold text-gray-900">Ecosystem Overview</h1>
        <p className="text-gray-600">
          Comprehensive analytics across all integrated grant systems
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      <Link 
                        key={`${system.systemName}-${index}`} 
                        href={`/systems/${system.systemName.toLowerCase().replace(/\s+/g, '-')}`}
                        data-testid={`link-system-${system.systemName.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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
                              <span className="text-sm text-gray-600">Grant Rounds:</span>
                              <span className="text-sm font-medium">{system.totalPools}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Avg per Project:</span>
                              <span className="text-sm font-medium">{formatCurrency(system.averageFundingPerProject)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
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
          {mechanismAnalysis && mechanismAnalysis.length > 0 && (
            <FundingMechanismPieChart data={mechanismAnalysis} />
          )}
          {systemComparison && systemComparison.length > 0 ? (
            <>
              <CeloVsStellarBreakdownChart data={systemComparison} />
              <SystemFundingDistributionChart data={systemComparison} />
            </>
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