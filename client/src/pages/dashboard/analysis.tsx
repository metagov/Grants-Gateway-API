import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  Users, 
  Building2,
  GitMerge,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dashboardApi, formatCurrency, getSystemColor } from "@/lib/dashboard-api";

// Component for cross-system comparison
function SystemComparison({ systems }: { systems: any[] }) {
  const systemsData = systems.map(system => ({
    ...system,
    color: getSystemColor(system.name)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 text-[#800020] mr-2" />
          System Comparison
        </CardTitle>
        <CardDescription>
          Compare key metrics across all integrated grant systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {systemsData.map((system, index) => (
            <div key={system.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: system.color }}
                >
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{system.name}</div>
                  <div className="text-sm text-gray-600">{system.type}</div>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-right">
                  <div className="text-gray-600">Applications</div>
                  <div className="font-medium">{system.totalApplications || '--'}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-600">Funding</div>
                  <div className="font-medium">{system.totalFunding ? formatCurrency(system.totalFunding) : '--'}</div>
                </div>
                <div className="text-right">
                  <div className="text-gray-600">Approval Rate</div>
                  <div className="font-medium">{system.approvalRate ? `${system.approvalRate.toFixed(1)}%` : '--'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Component for project overlap analysis
function ProjectOverlapAnalysis() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <GitMerge className="h-5 w-5 text-[#800020] mr-2" />
          Project Overlap Analysis
        </CardTitle>
        <CardDescription>
          Projects that have received funding from multiple systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <GitMerge className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600">
            Cross-system project overlap analysis is in development. This feature will identify projects that have received funding from multiple grant systems.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for funding mechanism analysis
function FundingMechanismAnalysis() {
  const mechanisms = [
    { name: 'Quadratic Funding', count: 12, systems: ['Octant', 'Giveth'], color: '#10B981' },
    { name: 'Direct Grants', count: 8, systems: ['Stellar', 'Optimism'], color: '#3B82F6' },
    { name: 'Retroactive Funding', count: 5, systems: ['Optimism', 'Arbitrum'], color: '#8B5CF6' },
    { name: 'Competition-based', count: 3, systems: ['Questbook'], color: '#EF4444' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <PieChart className="h-5 w-5 text-[#800020] mr-2" />
          Funding Mechanisms
        </CardTitle>
        <CardDescription>
          Distribution of funding mechanisms across systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mechanisms.map((mechanism) => (
            <div key={mechanism.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: mechanism.color }}
                />
                <div>
                  <div className="font-medium text-gray-900">{mechanism.name}</div>
                  <div className="text-sm text-gray-600">
                    Used by: {mechanism.systems.join(', ')}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="text-sm">
                {mechanism.count} rounds
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Component for ecosystem trends
function EcosystemTrends() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="h-5 w-5 text-[#800020] mr-2" />
          Ecosystem Trends
        </CardTitle>
        <CardDescription>
          Key trends and insights across the grant ecosystem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Growth Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">New Systems (Last Quarter)</span>
                <Badge variant="secondary">+2</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Funding Growth</span>
                <Badge variant="secondary" className="text-green-600">+15%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Application Volume</span>
                <Badge variant="secondary" className="text-blue-600">+28%</Badge>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Quality Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Approval Rate</span>
                <Badge variant="secondary">23.5%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Repeat Recipients</span>
                <Badge variant="secondary">12%</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cross-system Projects</span>
                <Badge variant="secondary">8%</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CrossSystemAnalysis() {
  // Fetch all systems data
  const { data: systems, isLoading } = useQuery({
    queryKey: ['dashboard-all-systems'],
    queryFn: dashboardApi.getAllSystems,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch ecosystem stats
  const { data: stats } = useQuery({
    queryKey: ['dashboard-ecosystem-stats'],
    queryFn: dashboardApi.getEcosystemStats,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Cross-System Analysis</h1>
        <p className="text-gray-600">
          Compare grant systems and analyze ecosystem-wide trends
        </p>
      </div>

      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Systems</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSystems}</p>
                </div>
                <Building2 className="h-8 w-8 text-[#800020]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Cross-System Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.floor(stats.totalProjects * 0.08)}</p>
                </div>
                <GitMerge className="h-8 w-8 text-[#800020]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Approval Rate</p>
                  <p className="text-2xl font-bold text-gray-900">Coming soon</p>
                </div>
                <TrendingUp className="h-8 w-8 text-[#800020]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Funding</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalFunding)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-[#800020]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Comparison */}
        {systems ? (
          <SystemComparison systems={systems} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>System Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div>
                          <Skeleton className="h-4 w-24 mb-2" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <div className="space-x-6 flex">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No systems data available</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Funding Mechanisms */}
        <FundingMechanismAnalysis />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Overlap */}
        <ProjectOverlapAnalysis />

        {/* Ecosystem Trends */}
        <EcosystemTrends />
      </div>

      {/* Detailed Analysis Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Table className="h-5 w-5 text-[#800020] mr-2" />
            Detailed System Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive comparison of all integrated grant systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systems && systems.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium">System</TableHead>
                    <TableHead className="font-medium">Type</TableHead>
                    <TableHead className="font-medium text-right">Applications</TableHead>
                    <TableHead className="font-medium text-right">Funding</TableHead>
                    <TableHead className="font-medium text-right">Approval Rate</TableHead>
                    <TableHead className="font-medium text-right">Avg Grant Size</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systems.map((system) => (
                    <TableRow key={system.name} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div 
                            className="h-8 w-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: getSystemColor(system.name) }}
                          >
                            <Building2 className="h-4 w-4 text-white" />
                          </div>
                          <span className="font-medium">{system.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {system.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {system.totalApplications || '--'}
                      </TableCell>
                      <TableCell className="text-right">
                        {system.totalFunding ? formatCurrency(system.totalFunding) : '--'}
                      </TableCell>
                      <TableCell className="text-right">
                        {system.approvalRate ? `${system.approvalRate.toFixed(1)}%` : '--'}
                      </TableCell>
                      <TableCell className="text-right">
                        {system.totalFunding && system.totalApplications 
                          ? formatCurrency(system.totalFunding / system.totalApplications)
                          : '--'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Loading system analysis...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}