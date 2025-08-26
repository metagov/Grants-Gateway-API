import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  Filter, 
  Calendar, 
  DollarSign,
  Building2,
  Users,
  Download,
  SlidersHorizontal
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { DatePickerWithRange } from "@/components/ui/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { dashboardApi, formatCurrency } from "@/lib/dashboard-api";
import { DateRange } from "react-day-picker";

interface SearchFilters {
  search: string;
  system: string;
  status: string;
  dateRange?: DateRange;
  minAmount?: number;
  maxAmount?: number;
}

export default function SearchAndFilter() {
  const [filters, setFilters] = useState<SearchFilters>({
    search: '',
    system: '',
    status: ''
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Fetch systems for filter dropdown
  const { data: systems } = useQuery({
    queryKey: ['dashboard-all-systems'],
    queryFn: dashboardApi.getAllSystems,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch applications based on filters
  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-search', filters],
    queryFn: async () => {
      // This is a simplified version - in reality you'd implement more sophisticated search
      const allSystems = systems || [];
      const results = [];
      
      for (const system of allSystems) {
        try {
          const systemData = await dashboardApi.getSystemDetails(system.name);
          const filteredApps = systemData.applications.filter(app => {
            // Search filter
            if (filters.search && !app.projectName?.toLowerCase().includes(filters.search.toLowerCase())) {
              return false;
            }
            
            // System filter
            if (filters.system && system.name.toLowerCase() !== filters.system.toLowerCase()) {
              return false;
            }
            
            // Status filter
            if (filters.status && app.status !== filters.status) {
              return false;
            }
            
            // Amount filters
            const fundingAmount = parseFloat(app.fundsApprovedInUSD || '0');
            if (filters.minAmount && fundingAmount < filters.minAmount) {
              return false;
            }
            if (filters.maxAmount && fundingAmount > filters.maxAmount) {
              return false;
            }
            
            return true;
          });
          
          results.push(...filteredApps.map(app => ({
            ...app,
            systemName: system.name,
            systemType: system.type
          })));
        } catch (error) {
          console.error(`Error searching ${system.name}:`, error);
        }
      }
      
      return results.sort((a, b) => 
        parseFloat(b.fundsApprovedInUSD || '0') - parseFloat(a.fundsApprovedInUSD || '0')
      );
    },
    enabled: !!systems,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const handleSearch = () => {
    refetch();
  };

  const totalFunding = searchResults?.reduce((sum, app) => 
    sum + parseFloat(app.fundsApprovedInUSD || '0'), 0
  ) || 0;

  const uniqueProjects = new Set(searchResults?.map(app => app.projectId)).size;
  const uniqueSystems = new Set(searchResults?.map(app => app.systemName)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Search & Filter</h1>
        <p className="text-gray-600">
          Search across all grant systems and filter by criteria
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 text-[#800020] mr-2" />
            Search Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search by project name..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />
            </div>
            <Button onClick={handleSearch} className="bg-[#800020] hover:bg-[#600018]">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Advanced Filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Advanced Filters
                {filtersOpen ? ' (Hide)' : ' (Show)'}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* System Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Grant System</label>
                  <Select value={filters.system} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, system: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All Systems" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Systems</SelectItem>
                      {systems?.map(system => (
                        <SelectItem key={system.name} value={system.name.toLowerCase()}>
                          {system.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Select value={filters.status} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, status: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Statuses</SelectItem>
                      <SelectItem value="funded">Funded</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Min Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Min Amount (USD)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minAmount || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                  />
                </div>

                {/* Max Amount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Max Amount (USD)</label>
                  <Input
                    type="number"
                    placeholder="No limit"
                    value={filters.maxAmount || ''}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxAmount: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                  />
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ search: '', system: '', status: '' })}
                >
                  Clear Filters
                </Button>
                <Button onClick={handleSearch} className="bg-[#800020] hover:bg-[#600018]">
                  Apply Filters
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Search Results Summary */}
      {searchResults && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Results</p>
                  <p className="text-2xl font-bold text-gray-900">{searchResults.length}</p>
                </div>
                <Users className="h-8 w-8 text-[#800020]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Funding</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFunding)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-[#800020]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Projects</p>
                  <p className="text-2xl font-bold text-gray-900">{uniqueProjects}</p>
                </div>
                <Building2 className="h-8 w-8 text-[#800020]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Systems</p>
                  <p className="text-2xl font-bold text-gray-900">{uniqueSystems}</p>
                </div>
                <Building2 className="h-8 w-8 text-[#800020]" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Search Results</CardTitle>
            <CardDescription>
              {searchResults ? `${searchResults.length} applications found` : 'Enter search criteria to see results'}
            </CardDescription>
          </div>
          {searchResults && searchResults.length > 0 && (
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-medium">Project</TableHead>
                    <TableHead className="font-medium">System</TableHead>
                    <TableHead className="font-medium">Grant Pool</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium text-right">Funding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.slice(0, 50).map((app) => (
                    <TableRow key={app.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {app.projectName || 'Unknown Project'}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">
                            {app.projectId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {app.systemName}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900 truncate max-w-xs">
                          {app.grantPoolName || 'Unknown Pool'}
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
              {searchResults.length > 50 && (
                <div className="p-4 bg-gray-50 text-center">
                  <span className="text-sm text-gray-600">
                    Showing first 50 of {searchResults.length} results
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchResults ? 'No results found' : 'Start searching'}
              </h3>
              <p className="text-gray-600">
                {searchResults 
                  ? 'Try adjusting your search criteria or filters.'
                  : 'Enter search terms above to find grant applications.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}