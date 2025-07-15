import { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target,
  Building,
  Layers,
  Activity,
  Filter,
  Download,
  RefreshCw,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface DashboardMetrics {
  totalFunding: {
    usd: number;
    eth: number;
  };
  totalProjects: number;
  totalApplications: number;
  activePools: number;
  grantSystems: number;
  fundingBySystem: Array<{
    name: string;
    amount: number;
    color: string;
  }>;
  fundingTrends: Array<{
    date: string;
    amount: number;
    applications: number;
  }>;
  topProjects: Array<{
    name: string;
    funding: number;
    system: string;
  }>;
  poolMetrics: Array<{
    system: string;
    pools: number;
    avgSize: number;
    successRate: number;
  }>;
}

export default function DashboardPage() {
  const [selectedSystem, setSelectedSystem] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("30d");

  const { data: dashboardData, isLoading, refetch } = useQuery<DashboardMetrics>({
    queryKey: ['/api/v1/analytics/dashboard', selectedSystem, timeRange],
    enabled: true
  });

  const { data: systemsData } = useQuery({
    queryKey: ['/api/v1/systems']
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading analytics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Grant Analytics Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Comprehensive insights across all integrated grant systems
            </p>
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <Select value={selectedSystem} onValueChange={setSelectedSystem}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select system" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Systems</SelectItem>
                <SelectItem value="octant">Octant</SelectItem>
                <SelectItem value="giveth">Giveth</SelectItem>
                <SelectItem value="questbook">Questbook</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
                <SelectItem value="1y">1 year</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Funding</p>
                  <p className="text-2xl font-bold">{formatCurrency(dashboardData?.totalFunding.usd || 0)}</p>
                  <p className="text-xs text-gray-500">{dashboardData?.totalFunding.eth.toFixed(2) || 0} ETH</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Projects</p>
                  <p className="text-2xl font-bold">{formatNumber(dashboardData?.totalProjects || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Applications</p>
                  <p className="text-2xl font-bold">{formatNumber(dashboardData?.totalApplications || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Layers className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Pools</p>
                  <p className="text-2xl font-bold">{formatNumber(dashboardData?.activePools || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Grant Systems</p>
                  <p className="text-2xl font-bold">{dashboardData?.grantSystems || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funding by System */}
          <Card>
            <CardHeader>
              <CardTitle>Funding by Grant System</CardTitle>
              <CardDescription>Distribution of funding across platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData?.fundingBySystem || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {dashboardData?.fundingBySystem?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Funding Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Funding Trends</CardTitle>
              <CardDescription>Funding amount and applications over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardData?.fundingTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'amount' ? formatCurrency(value) : formatNumber(value),
                      name === 'amount' ? 'Funding' : 'Applications'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stackId="1" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="applications" 
                    stackId="2" 
                    stroke="#10B981" 
                    fill="#10B981" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Projects */}
          <Card>
            <CardHeader>
              <CardTitle>Top Funded Projects</CardTitle>
              <CardDescription>Projects with highest funding amounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.topProjects?.map((project, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{project.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {project.system}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(project.funding)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pool Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Pool Metrics by System</CardTitle>
              <CardDescription>Pool count, average size, and success rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData?.poolMetrics || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="system" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="pools" fill="#3B82F6" name="Pool Count" />
                  <Bar dataKey="avgSize" fill="#10B981" name="Avg Size (USD)" />
                  <Bar dataKey="successRate" fill="#F59E0B" name="Success Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
            <CardDescription>Current status of all grant system integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Octant</h4>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Type 1 - Active
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">REST API Integration</p>
                <p className="text-xs text-gray-500 mt-1">Last sync: 2 minutes ago</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Giveth</h4>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Type 1 - Active
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">GraphQL Integration</p>
                <p className="text-xs text-gray-500 mt-1">Last sync: 5 minutes ago</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Questbook</h4>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Type 2 - Active
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">DAOIP-5 Direct</p>
                <p className="text-xs text-gray-500 mt-1">Last sync: 1 minute ago</p>
              </div>

              <div className="p-4 border rounded-lg opacity-60">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Stellar</h4>
                  <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Type 4 - Coming Soon
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Blockchain Integration</p>
                <p className="text-xs text-gray-500 mt-1">In development</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}