import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { 
  Building2, 
  ArrowLeft, 
  DollarSign, 
  Users, 
  TrendingUp,
  Calendar,
  Award,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  BarChart3,
  PieChart
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { dashboardApi, formatCurrency, getSystemColor } from "@/lib/dashboard-api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import { useState } from "react";

function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  loading = false 
}: {
  title: string;
  value: string | number;
  description: string;
  icon: any;
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
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

// Funding Distribution Chart
function FundingDistributionChart({ pools, applications }: { 
  pools: any[]; 
  applications: any[];
}) {
  const chartData = pools.map(pool => {
    const poolApps = applications.filter(app => app.grantPoolId === pool.id);
    const totalFunding = poolApps.reduce((sum, app) => {
      return sum + parseFloat(app.fundsApprovedInUSD || '0');
    }, 0);
    
    return {
      name: pool.name.length > 20 ? pool.name.substring(0, 20) + '...' : pool.name,
      funding: totalFunding,
      applications: poolApps.length,
      approved: poolApps.filter(app => app.status === 'funded' || app.status === 'approved').length
    };
  }).filter(item => item.funding > 0).sort((a, b) => b.funding - a.funding);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 text-[#800020] mr-2" />
          Funding Distribution by Round
        </CardTitle>
        <CardDescription>
          Total funding distributed across different grant rounds
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
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [
                  name === 'funding' ? formatCurrency(value) : value,
                  name === 'funding' ? 'Total Funding' : 
                  name === 'applications' ? 'Applications' : 'Approved'
                ]}
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="funding" fill="#800020" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Application Status Chart
function ApplicationStatusChart({ applications }: { applications: any[] }) {
  const statusCounts = applications.reduce((acc, app) => {
    const status = app.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: count as number,
    percentage: (((count as number) / applications.length) * 100).toFixed(1)
  }));

  const COLORS = {
    'Funded': '#10B981',
    'Approved': '#3B82F6', 
    'Pending': '#F59E0B',
    'Rejected': '#EF4444',
    'Unknown': '#6B7280'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="h-5 w-5 text-[#800020] mr-2" />
          Application Status Distribution
        </CardTitle>
        <CardDescription>
          Breakdown of application statuses across all rounds
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
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[entry.name as keyof typeof COLORS] || COLORS.Unknown} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any, props: any) => [
                    `${value} (${props.payload.percentage}%)`,
                    'Applications'
                  ]}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {chartData.map((item, index) => (
              <div key={`${item.name}-${index}`} className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: COLORS[item.name as keyof typeof COLORS] || COLORS.Unknown }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-medium text-gray-900">
                  {String(item.value)} ({String(item.percentage)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Funding Timeline Chart
function FundingTimelineChart({ applications }: { applications: any[] }) {
  const timelineData = applications
    .filter(app => app.createdAt && parseFloat(app.fundsApprovedInUSD || '0') > 0)
    .map(app => ({
      date: new Date(app.createdAt!).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      }),
      funding: parseFloat(app.fundsApprovedInUSD || '0'),
      timestamp: new Date(app.createdAt!).getTime()
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Group by month and sum funding
  const monthlyData = timelineData.reduce((acc, item) => {
    const existing = acc.find(d => d.month === item.date);
    if (existing) {
      existing.funding += item.funding;
      existing.count += 1;
    } else {
      acc.push({
        month: item.date,
        funding: item.funding,
        count: 1
      });
    }
    return acc;
  }, [] as Array<{ month: string; funding: number; count: number }>);

  if (monthlyData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funding Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No timeline data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 text-[#800020] mr-2" />
          Funding Timeline
        </CardTitle>
        <CardDescription>
          Monthly funding distribution over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [
                  name === 'funding' ? formatCurrency(value) : value,
                  name === 'funding' ? 'Total Funding' : 'Applications Funded'
                ]}
              />
              <Bar dataKey="funding" fill="#800020" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function GrantPoolCard({ pool, applications, systemId }: { 
  pool: any; 
  applications: any[];
  systemId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [poolApplications, setPoolApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  
  // Load applications for this pool when expanded
  const loadPoolApplications = async () => {
    if (poolApplications.length > 0) return; // Already loaded
    
    setLoadingApps(true);
    try {
      if (systemId && pool.id) {
        // Try to fetch real pool applications from DAOIP5 API  
        const response = await fetch(`/api/proxy/daoip5/${systemId}/${pool.id}`);
        if (response.ok) {
          const data = await response.json();
          const apps = Array.isArray(data) ? data : 
                      data.applications || 
                      (data.data && Array.isArray(data.data) ? data.data : []);
          setPoolApplications(apps);
        } else {
          // Fallback to filtered applications
          setPoolApplications(applications.filter(app => app.grantPoolId === pool.id));
        }
      } else {
        // Filter applications for this specific pool
        setPoolApplications(applications.filter(app => app.grantPoolId === pool.id));
      }
    } catch (error) {
      console.warn('Failed to load pool applications:', error);
      setPoolApplications(applications.filter(app => app.grantPoolId === pool.id));
    }
    setLoadingApps(false);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadPoolApplications();
    }
  };

  const approvedApps = poolApplications.filter(app => 
    app.status === 'funded' || app.status === 'approved'
  );
  
  const totalFunding = poolApplications.reduce((sum, app) => {
    return sum + parseFloat(app.fundsApprovedInUSD || '0');
  }, 0);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <CardTitle className="text-lg">{pool.name}</CardTitle>
                <CardDescription className="flex items-center space-x-4 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {pool.grantFundingMechanism}
                  </Badge>
                  <Badge 
                    variant={pool.isOpen ? "default" : "secondary"} 
                    className="text-xs"
                  >
                    {pool.isOpen ? "Open" : "Closed"}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {poolApplications.length} applications
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(totalFunding)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {approvedApps.length}/{poolApplications.length} approved
                  </div>
                </div>
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loadingApps ? (
              <div className="text-center py-8">
                <div className="text-sm text-gray-600 mb-2">Loading applications...</div>
                <Skeleton className="h-4 w-48 mx-auto" />
              </div>
            ) : poolApplications.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-medium">Project</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium text-right">Funding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poolApplications
                      .sort((a, b) => parseFloat(b.fundsApprovedInUSD || '0') - parseFloat(a.fundsApprovedInUSD || '0'))
                      .slice(0, 10)
                      .map((app) => (
                      <TableRow key={app.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">
                              {app.projectName || 'Unknown Project'}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-xs">
                              {app.id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              app.status === 'funded' ? 'default' :
                              app.status === 'approved' ? 'secondary' :
                              app.status === 'rejected' ? 'destructive' :
                              'outline'
                            }
                            className="text-xs capitalize"
                          >
                            {app.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-medium">
                            {app.fundsApprovedInUSD ? formatCurrency(parseFloat(app.fundsApprovedInUSD)) : '--'}
                          </div>
                          {app.fundsApproved && app.fundsApproved[0] && (
                            <div className="text-xs text-gray-500">
                              {app.fundsApproved[0].amount} {app.fundsApproved[0].denomination}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {poolApplications.length > 10 && (
                  <div className="p-3 bg-gray-50 text-center">
                    <span className="text-sm text-gray-600">
                      Showing top 10 of {poolApplications.length} applications
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No applications found for this pool</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default function SystemProfileEnhanced() {
  const [, params] = useRoute("/dashboard/systems/:systemName");
  const systemName = params?.systemName || '';
  
  // Map display names to system IDs to fix URL encoding issues
  const systemIdMap: Record<string, string> = {
    'stellar': 'stellar',
    'stellar-community-fund': 'stellar',
    'optimism': 'optimism', 
    'optimism-retropgf': 'optimism',
    'arbitrum-foundation': 'arbitrumfoundation',
    'arbitrumfoundation': 'arbitrumfoundation',
    'celo': 'celo-org',
    'celo-foundation': 'celo-org',
    'celo-org': 'celo-org',
    'clr-fund': 'clrfund',
    'clrfund': 'clrfund',
    'dao-drops': 'dao-drops-dorgtech',
    'octant': 'octant',
    'giveth': 'giveth'
  };
  
  const systemId = systemIdMap[systemName.toLowerCase()] || systemName.toLowerCase();
  
  const { data: systemData, isLoading, error } = useQuery({
    queryKey: ['dashboard-system-details', systemId],
    queryFn: () => dashboardApi.getSystemDetails(systemId),
    staleTime: 5 * 60 * 1000,
    enabled: !!systemId,
  });

  const systemColor = getSystemColor(systemName);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !systemData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/systems">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Systems
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">System not found</h3>
              <p className="text-gray-600 mb-4">
                Unable to load data for system "{systemName}".
              </p>
              <Link href="/dashboard/systems">
                <Button variant="outline">
                  Back to Systems
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { pools, applications, stats } = systemData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/systems">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Systems
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <div 
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: systemColor }}
            >
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 capitalize">{systemName}</h1>
              <p className="text-gray-600">Grant system profile and funding analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Funding"
          value={formatCurrency(stats.totalFunding)}
          description="Distributed to projects"
          icon={DollarSign}
        />
        <StatsCard
          title="Total Applications"
          value={stats.totalApplications}
          description="Applications processed"
          icon={Users}
        />
        <StatsCard
          title="Approval Rate"
          value={`${stats.approvalRate.toFixed(1)}%`}
          description="Applications approved/funded"
          icon={TrendingUp}
        />
        <StatsCard
          title="Grant Rounds"
          value={pools.length}
          description="Funding rounds available"
          icon={Calendar}
        />
      </div>

      {/* Charts Section */}
      {applications.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FundingDistributionChart pools={pools} applications={applications} />
          <ApplicationStatusChart applications={applications} />
        </div>
      )}

      {/* Funding Timeline */}
      {applications.length > 0 && (
        <FundingTimelineChart applications={applications} />
      )}

      {/* Grant Pools Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Grant Rounds</h2>
          <Badge variant="secondary" className="text-sm">
            {pools.length} rounds
          </Badge>
        </div>
        
        {pools.length > 0 ? (
          <div className="space-y-4">
            {pools
              .sort((a, b) => {
                if (a.closeDate && b.closeDate) {
                  return new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime();
                }
                if (a.closeDate) return -1;
                if (b.closeDate) return 1;
                return 0;
              })
              .map((pool) => (
                <GrantPoolCard 
                  key={pool.id} 
                  pool={pool} 
                  applications={applications}
                  systemId={systemId}
                />
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No grant rounds found</h3>
                <p className="text-gray-600">
                  This system doesn't have any grant rounds available yet.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}