import { useState, useEffect } from "react";
import { 
  Building, 
  Layers, 
  FileText, 
  Target, 
  Code, 
  Ticket, 
  Book, 
  Play, 
  Zap, 
  Star, 
  Check, 
  CheckCircle, 
  Clock, 
  Heart, 
  GitBranch, 
  Moon, 
  Sun,
  Menu,
  X,
  Copy,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useThemeContext } from "@/components/ui/theme-provider";
import { CodeBlock } from "@/components/ui/code-block";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { QueryFilters } from "@/types/daoip5";

export default function LandingPage() {
  const { theme, toggleTheme } = useThemeContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [activeMapping, setActiveMapping] = useState("octant");
  
  // Query builder state
  const [entityType, setEntityType] = useState("systems");
  const [queryFilters, setQueryFilters] = useState<QueryFilters>({});
  const [queryPreview, setQueryPreview] = useState("/api/v1/systems");

  // Update query preview when filters change
  useEffect(() => {
    let query = `/api/v1/${entityType}`;
    const params = new URLSearchParams();
    
    Object.entries(queryFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    if (params.toString()) {
      query += `?${params.toString()}`;
    }

    setQueryPreview(query);
  }, [entityType, queryFilters]);

  // Execute query mutation
  const executeQueryMutation = useMutation({
    mutationFn: () => apiClient.executeQuery(entityType, queryFilters),
    onError: (error) => {
      console.error("Query execution failed:", error);
    }
  });

  const handleExecuteQuery = () => {
    executeQueryMutation.mutate();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const sidebarItems = [
    { id: "overview", label: "Overview", icon: Building },
    { id: "endpoints", label: "API Endpoints", icon: Target },
    { id: "query-builder", label: "Query Builder", icon: Code },
    { id: "field-mapping", label: "Field Mapping", icon: Ticket },
    { id: "examples", label: "Examples", icon: Book },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 shadow-lg border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold">OpenGrants</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeSection === item.id ? "secondary" : "ghost"}
                  className={`w-full justify-start ${activeSection === item.id ? 'bg-primary/10 text-primary' : ''}`}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {item.label}
                </Button>
              );
            })}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Grant Systems
            </div>
            <div className="space-y-1">
              <div className="flex items-center px-4 py-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300">Octant</span>
              </div>
              <div className="flex items-center px-4 py-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300">Giveth</span>
              </div>
              <div className="flex items-center px-4 py-2 text-sm">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300">Gitcoin (Coming Soon)</span>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden mr-4"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">OpenGrants Gateway API</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-slate-700 rounded-lg px-3 py-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm font-medium">API Status: Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {/* Overview Section */}
          {activeSection === "overview" && (
            <div className="space-y-8">
              {/* Hero Section */}
              <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl p-8">
                <div className="max-w-4xl">
                  <h1 className="text-4xl font-bold mb-4">OpenGrants Gateway API</h1>
                  <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                    A unified interface for accessing grant data across multiple blockchain ecosystems using the DAOIP-5 metadata standard.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Button onClick={() => setActiveSection("query-builder")}>
                      <Play className="h-4 w-4 mr-2" />
                      Get Started
                    </Button>
                    <Button variant="outline">
                      <Book className="h-4 w-4 mr-2" />
                      Documentation
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Start */}
              <div className="grid lg:grid-cols-2 gap-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Zap className="h-5 w-5 text-primary mr-2" />
                      Quick Start
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CodeBlock
                      code="GET /api/v1/systems"
                      title="Get all grant systems"
                      language="http"
                    />
                    <CodeBlock
                      code="GET /api/v1/projects?system=octant"
                      title="Get projects from Octant"
                      language="http"
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Star className="h-5 w-5 text-primary mr-2" />
                      Key Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-3" />
                        <span>DAOIP-5 compliant responses</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-3" />
                        <span>Multi-system data aggregation</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-3" />
                        <span>Real-time query builder</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-3" />
                        <span>Automated field mapping</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Supported Systems */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Supported Grant Systems</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg mb-4 flex items-center justify-center">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Octant</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                        Ethereum public goods funding platform with quadratic funding mechanisms.
                      </p>
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active Integration
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-purple-600 rounded-lg mb-4 flex items-center justify-center">
                        <Heart className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Giveth</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                        Platform for funding public goods projects with transparent donation tracking.
                      </p>
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active Integration
                      </Badge>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-purple-500 rounded-lg mb-4 flex items-center justify-center">
                        <GitBranch className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Gitcoin</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                        Leading platform for funding open source development and public goods.
                      </p>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* API Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>API Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">DAOIP-5 Entity Types</h3>
                      <div className="space-y-3">
                        <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                          <Building className="h-5 w-5 text-primary mr-3" />
                          <div>
                            <div className="font-medium">Grant Systems</div>
                            <div className="text-sm text-gray-500">Organizations managing grants</div>
                          </div>
                        </div>
                        <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                          <Layers className="h-5 w-5 text-primary mr-3" />
                          <div>
                            <div className="font-medium">Grant Pools</div>
                            <div className="text-sm text-gray-500">Funding pools with specific criteria</div>
                          </div>
                        </div>
                        <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                          <Target className="h-5 w-5 text-primary mr-3" />
                          <div>
                            <div className="font-medium">Projects</div>
                            <div className="text-sm text-gray-500">Initiatives seeking funding</div>
                          </div>
                        </div>
                        <div className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                          <FileText className="h-5 w-5 text-primary mr-3" />
                          <div>
                            <div className="font-medium">Applications</div>
                            <div className="text-sm text-gray-500">Project applications to pools</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Response Formats</h3>
                      <CodeBlock
                        code={`{
  "@context": "http://www.daostar.org/schemas",
  "name": "Grant System Name",
  "type": "DAO",
  "data": [...]
}`}
                        title="Standard DAOIP-5 Response"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Query Builder Section */}
          {activeSection === "query-builder" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-4">Interactive Query Builder</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Build and test API queries with real-time preview and execution.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Query Builder Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Build Your Query</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label htmlFor="entityType">Entity Type</Label>
                      <Select value={entityType} onValueChange={setEntityType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="systems">Grant Systems</SelectItem>
                          <SelectItem value="pools">Grant Pools</SelectItem>
                          <SelectItem value="applications">Applications</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="system">Grant System</Label>
                      <Select 
                        value={queryFilters.system || "all"} 
                        onValueChange={(value) => setQueryFilters(prev => ({ ...prev, system: value === "all" ? undefined : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Systems" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Systems</SelectItem>
                          <SelectItem value="octant">Octant</SelectItem>
                          <SelectItem value="giveth">Giveth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>



                    {entityType === "projects" && (
                      <div>
                        <Label htmlFor="search">Search</Label>
                        <Input
                          placeholder="Search projects by name..."
                          value={queryFilters.search || ""}
                          onChange={(e) => setQueryFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                        />
                      </div>
                    )}



                    <Button 
                      onClick={handleExecuteQuery} 
                      className="w-full"
                      disabled={executeQueryMutation.isPending}
                    >
                      {executeQueryMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Execute Query
                    </Button>
                  </CardContent>
                </Card>

                {/* Query Preview and Results */}
                <div className="space-y-6">
                  {/* Query Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Query Preview
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(queryPreview)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">REQUEST URL</div>
                        <code className="text-sm text-primary break-all">
                          {queryPreview}
                        </code>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Results Display */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        Response
                        {executeQueryMutation.isSuccess && (
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            200 OK
                          </Badge>
                        )}
                        {executeQueryMutation.isError && (
                          <Badge variant="destructive">
                            Error
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 min-h-[200px]">
                        {executeQueryMutation.isPending && (
                          <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            Executing query...
                          </div>
                        )}
                        {executeQueryMutation.isSuccess && (
                          <pre className="text-sm overflow-x-auto text-gray-800 dark:text-gray-200">
                            {JSON.stringify(executeQueryMutation.data, null, 2)}
                          </pre>
                        )}
                        {executeQueryMutation.isError && (
                          <div className="text-red-600 dark:text-red-400">
                            Error: {executeQueryMutation.error.message}
                          </div>
                        )}
                        {executeQueryMutation.isIdle && (
                          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            Click "Execute Query" to see results here
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}


          {activeSection === "endpoints" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-4">API Endpoints</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Complete reference for all available API endpoints with DAOIP-5 compliant responses.
                </p>
              </div>
              {/* Endpoint documentation cards would go here */}
            </div>
          )}

          {activeSection === "field-mapping" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-4">DAOIP-5 Field Mappings</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-8">
                  See how we standardize data from different grant systems to the DAOIP-5 specification with consistent USD conversions.
                </p>

                {/* Live Data Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        Octant System
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ETH-based funding converted to USD
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Source Currency:</span>
                          <span className="text-sm text-blue-600 dark:text-blue-400">ETH (Wei)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">ID Format:</span>
                          <span className="text-sm font-mono text-blue-600 dark:text-blue-400">eip155:1:0x(epoch)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Funding Mechanism:</span>
                          <span className="text-sm text-blue-600 dark:text-blue-400">Quadratic Funding</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Data Source:</span>
                          <span className="text-sm text-blue-600 dark:text-blue-400">On-chain + API</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        Giveth System
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        USD-based funding (direct)
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Source Currency:</span>
                          <span className="text-sm text-green-600 dark:text-green-400">USD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">ID Format:</span>
                          <span className="text-sm font-mono text-green-600 dark:text-green-400">eip155:1:0x(round_id)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Funding Mechanism:</span>
                          <span className="text-sm text-green-600 dark:text-green-400">Quadratic Funding</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Data Source:</span>
                          <span className="text-sm text-green-600 dark:text-green-400">GraphQL API</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Mapping Tables */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Grant Pool Field Mappings</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        How raw system data is transformed to DAOIP-5 standard
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                              <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">DAOIP-5 Field</th>
                              <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">Octant Mapping</th>
                              <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">Giveth Mapping</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            <tr>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-mono">id</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">epoch → CAIP-10</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">qfRounds[].id → CAIP-10</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-mono">name</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">Generated: "Octant Epoch (n)"</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">qfRounds[].name (direct)</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-mono">totalGrantPoolSize</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">wei → ETH conversion</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">allocatedFund (USD direct)</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-mono">totalGrantPoolSizeUSD</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">ETH → USD (live rates)</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">allocatedFund (direct)</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-mono">isOpen</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">epoch === currentEpoch</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">qfRounds[].isActive</td>
                            </tr>
                            <tr>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-mono">closeDate</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">Calculated (90-day epochs)</td>
                              <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">qfRounds[].endDate</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Currency Conversion Details</CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        How we standardize funding amounts to USD
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Octant (ETH → USD)</h4>
                          <div className="space-y-2 text-sm">
                            <div>1. Fetch epoch info from API</div>
                            <div>2. Extract leftover/communityFund/ppf (wei)</div>
                            <div>3. Convert wei → ETH (÷ 10^18)</div>
                            <div>4. Get live ETH/USD rate</div>
                            <div>5. Calculate USD amount</div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3">Giveth (USD Direct)</h4>
                          <div className="space-y-2 text-sm">
                            <div>1. Fetch QF rounds from GraphQL</div>
                            <div>2. Extract allocatedFund (USD)</div>
                            <div>3. Use direct USD amount</div>
                            <div>4. No conversion needed</div>
                            <div>5. Ready for display</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {activeSection === "examples" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-3xl font-bold mb-4">API Examples</h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Real-world examples of API usage with complete request and response data.
                </p>
              </div>
              {/* Example content would go here */}
            </div>
          )}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
