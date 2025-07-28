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
  Loader2,
  Info as InfoIcon,
  BookOpen,
  ExternalLink,
  Activity,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
    mutationFn: async () => {
      return apiClient.executeQuery(entityType, queryFilters);
    },
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

    { id: "health", label: "API Health", icon: Activity },
    { id: "supporters", label: "Contributors", icon: Heart },
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
                    if (item.id === 'health') {
                      window.location.href = '/health';
                    } else {
                      setActiveSection(item.id);
                      setSidebarOpen(false);
                    }
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
              Systems Live
            </div>
            <div className="space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center px-4 py-2 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-gray-600 dark:text-gray-300">Octant</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Grant System</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center px-4 py-2 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-gray-600 dark:text-gray-300">Giveth</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Grant System</p>
                </TooltipContent>
              </Tooltip>


              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center px-4 py-2 text-sm">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                    <span className="text-gray-600 dark:text-gray-300"> Karma </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Project Identity Provider</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center px-4 py-2 text-sm">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
                    <span className="text-gray-600 dark:text-gray-300">Open Source Observer</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Infrastructure provider</p>
                </TooltipContent>
              </Tooltip>
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
              <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-2xl p-6 md:p-8">
                <div className="max-w-4xl">
                  <h1 className="text-3xl md:text-4xl font-bold mb-4">OpenGrants Gateway API</h1>
                  <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-6">
                    A unified interface for accessing grant data across Ethereum Ecosystem using the DAOIP-5 metadata standard.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={() => setActiveSection("query-builder")} className="flex items-center justify-center">
                      <Play className="h-4 w-4 mr-2" />
                      Get Started
                    </Button>
                    <Button variant="outline" onClick={() => setActiveSection("endpoints")} className="flex items-center justify-center">
                      <Book className="h-4 w-4 mr-2" />
                      API Documentation
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick Start */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
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
                      title="Get all grant systems (3 active integrations)"
                      language="http"
                    />
                    <CodeBlock
                      code="GET /api/v1/pools?system=octant"
                      title="Get grant pools from Octant"
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
                        <CheckCircle className="h-3 w-3 ml-1 mr-1" />
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
                        <CheckCircle className="h-3 w-3 ml-1 mr-1" />
                        Active Integration
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

              {/* Resources */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Code className="h-5 w-5 text-primary mr-2" />
                    Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-3">Integration Guide</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                        Step-by-step guide to integrate new grant systems into the API gateway.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span>Complete file changes walkthrough</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span>API information gathering checklist</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span>Field mapping and testing procedures</span>
                        </div>
                      </div>
                      <a
                        href="https://github.com/metagov/Grants-Gateway-API/blob/main/docs/integration-guide.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        View Integration Guide
                      </a>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-3">Documentation</h3>
                      <div className="space-y-3">
                        <a
                          href="https://docs.daostar.org/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <FileText className="h-5 w-5 text-primary mr-3" />
                          <div>
                            <div className="font-medium text-sm">DAOstar Docs</div>
                            <div className="text-xs text-gray-500">API reference and guides</div>
                          </div>
                        </a>
                        <a
                          href="https://github.com/metagov/daostar/blob/main/DAOIPs/daoip-5.md"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <ExternalLink className="h-5 w-5 text-primary mr-3" />
                          <div>
                            <div className="font-medium text-sm">DAOIP-5 Spec</div>
                            <div className="text-xs text-gray-500">Official specification</div>
                          </div>
                        </a>
                        <a
                          href="https://github.com/metagov/Grants-Gateway-API/blob/main/docs/field-mappings.md"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center p-3 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <GitBranch className="h-5 w-5 text-primary mr-3" />
                          <div>
                            <div className="font-medium text-sm">Field Mappings</div>
                            <div className="text-xs text-gray-500">Platform to DAOIP-5 mappings</div>
                          </div>
                        </a>
                      </div>
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

                    {entityType === "applications" && (
                      <div>
                        <Label htmlFor="poolId" className="flex items-center">
                          Grant Pool ID
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon className="h-4 w-4 ml-1 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Optional. Defaults to latest grant pool if not specified.</p>
                              <p>Format: daoip5:&lt;grantSystemName&gt;:grantPool:&lt;poolId&gt;</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          placeholder="e.g., daoip5:octant:grantPool:7 (defaults to latest)"
                          value={queryFilters.poolId || ""}
                          onChange={(e) => setQueryFilters(prev => ({ ...prev, poolId: e.target.value || undefined }))}
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

              {/* Grant Systems */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Grant Systems
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">GET /api/v1/systems</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Retrieve all available grant systems following DAOIP-5 specification.
                    </p>
                    
                    <Tabs defaultValue="curl" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                      </TabsList>
                      <TabsContent value="curl" className="mt-4">
                        <CodeBlock
                          code={`curl -X GET \\
  "https://opengrants.replit.app/api/v1/systems" \\
  -H "Accept: application/json"`}
                          language="bash"
                        />
                      </TabsContent>
                      <TabsContent value="javascript" className="mt-4">
                        <CodeBlock
                          code={`const response = await fetch('/api/v1/systems');
const systems = await response.json();
console.log(systems);`}
                          language="javascript"
                        />
                      </TabsContent>
                      <TabsContent value="typescript" className="mt-4">
                        <CodeBlock
                          code={`interface GrantSystem {
  "@context": string;
  name: string;
  type: string;
  grantPoolsURI: string;
}

interface SystemsResponse {
  "@context": string;
  data: GrantSystem[];
  total: number;
  page: number;
}

const response = await fetch('/api/v1/systems');
const systems: SystemsResponse = await response.json();
console.log(systems);`}
                          language="typescript"
                        />
                      </TabsContent>
                      <TabsContent value="python" className="mt-4">
                        <CodeBlock
                          code={`import requests
from typing import List, Dict, Any

response = requests.get(
    'https://opengrants.replit.app/api/v1/systems'
)
systems: Dict[str, Any] = response.json()
print(systems)`}
                          language="python"
                        />
                      </TabsContent>
                    </Tabs>
                    
                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Response Format</h5>
                      <CodeBlock
                        code={`{
  "@context": "http://www.daostar.org/schemas",
  "data": [
    {
      "@context": "http://www.daostar.org/schemas",
      "name": "Octant",
      "type": "DAO",
      "grantPoolsURI": "/api/v1/pools?system=octant"
    }
  ],
  "total": 3,
  "page": 1
}`}
                        language="json"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">GET /api/v1/systems/:id</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Get details for a specific grant system.
                    </p>
                    
                    <Tabs defaultValue="curl" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                      </TabsList>
                      <TabsContent value="curl" className="mt-4">
                        <CodeBlock
                          code={`curl -X GET \\
  "https://opengrants.replit.app/api/v1/systems/octant"`}
                          language="bash"
                        />
                      </TabsContent>
                      <TabsContent value="javascript" className="mt-4">
                        <CodeBlock
                          code={`const response = await fetch('/api/v1/systems/octant');
const system = await response.json();
console.log(system);`}
                          language="javascript"
                        />
                      </TabsContent>
                      <TabsContent value="typescript" className="mt-4">
                        <CodeBlock
                          code={`interface GrantSystem {
  "@context": string;
  name: string;
  type: string;
  grantPoolsURI: string;
}

const response = await fetch('/api/v1/systems/octant');
const system: GrantSystem = await response.json();
console.log(system);`}
                          language="typescript"
                        />
                      </TabsContent>
                      <TabsContent value="python" className="mt-4">
                        <CodeBlock
                          code={`import requests
from typing import Dict, Any

response = requests.get(
    'https://opengrants.replit.app/api/v1/systems/octant'
)
system: Dict[str, Any] = response.json()
print(system)`}
                          language="python"
                        />
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>

              {/* Grant Pools */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Layers className="h-5 w-5 mr-2" />
                    Grant Pools
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">GET /api/v1/pools</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Retrieve grant pools from one or more systems with optional filtering.
                    </p>
                    
                    <div className="mb-4">
                      <h5 className="font-medium mb-2">Query Parameters</h5>
                      <div className="text-sm space-y-1">
                        <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">system</code> - Filter by grant system (octant, giveth)</div>
                        <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">limit</code> - Maximum number of results (default: 50)</div>
                        <div><code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">offset</code> - Number of results to skip (default: 0)</div>
                      </div>
                    </div>
                    
                    <Tabs defaultValue="curl" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                      </TabsList>
                      <TabsContent value="curl" className="mt-4">
                        <CodeBlock
                          code={`curl -X GET \\
  "https://opengrants.replit.app/api/v1/pools?system=octant&limit=10"`}
                          language="bash"
                        />
                      </TabsContent>
                      <TabsContent value="javascript" className="mt-4">
                        <CodeBlock
                          code={`const params = new URLSearchParams({
  system: 'octant',
  limit: '10'
});

const response = await fetch(\`/api/v1/pools?\${params}\`);
const pools = await response.json();
console.log(pools);`}
                          language="javascript"
                        />
                      </TabsContent>
                      <TabsContent value="typescript" className="mt-4">
                        <CodeBlock
                          code={`interface GrantPool {
  type: string;
  id: string;
  name: string;
  description: string;
  grantFundingMechanism: string;
  isOpen: boolean;
  closeDate: string;
  totalGrantPoolSize: Array<{
    amount: string;
    denomination: string;
  }>;
}

interface PoolsResponse {
  "@context": string;
  name: string;
  type: string;
  grantPools: GrantPool[];
  total: number;
}

const params = new URLSearchParams({
  system: 'octant',
  limit: '10'
});

const response = await fetch(\`/api/v1/pools?\${params}\`);
const pools: PoolsResponse = await response.json();
console.log(pools);`}
                          language="typescript"
                        />
                      </TabsContent>
                      <TabsContent value="python" className="mt-4">
                        <CodeBlock
                          code={`import requests
from typing import Dict, List, Any

params = {
    'system': 'octant',
    'limit': 10
}

response = requests.get(
    'https://opengrants.replit.app/api/v1/pools',
    params=params
)
pools: Dict[str, Any] = response.json()
print(f"Found {pools['total']} grant pools")`}
                          language="python"
                        />
                      </TabsContent>
                    </Tabs>

                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Response Format</h5>
                      <CodeBlock
                        code={`{
  "@context": "http://www.daostar.org/schemas",
  "name": "Grant Pools",
  "type": "GrantPoolCollection", 
  "grantPools": [
    {
      "type": "GrantPool",
      "id": "daoip5:octant:grantPool:4",
      "name": "Octant Epoch 4",
      "description": "Quadratic funding round for Octant epoch 4",
      "grantFundingMechanism": "Quadratic Funding",
      "isOpen": false,
      "closeDate": "2024-12-24T00:00:00Z",
      "totalGrantPoolSize": [
        {
          "amount": "567845123456789012345",
          "denomination": "ETH"
        }
      ]
    }
  ],
  "total": 7
}`}
                        language="json"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Applications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Applications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2">GET /api/v1/applications</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Retrieve grant applications with approved funding amounts.
                    </p>
                    
                    <Tabs defaultValue="curl" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        <TabsTrigger value="typescript">TypeScript</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                      </TabsList>
                      <TabsContent value="curl" className="mt-4">
                        <CodeBlock
                          code={`curl -X GET \\
  "https://opengrants.replit.app/api/v1/applications?system=octant&limit=5"`}
                          language="bash"
                        />
                      </TabsContent>
                      <TabsContent value="javascript" className="mt-4">
                        <CodeBlock
                          code={`const params = new URLSearchParams({
  system: 'octant',
  limit: '5'
});

const response = await fetch(\`/api/v1/applications?\${params}\`);
const applications = await response.json();
console.log(applications);`}
                          language="javascript"
                        />
                      </TabsContent>
                      <TabsContent value="typescript" className="mt-4">
                        <CodeBlock
                          code={`interface Application {
  type: string;
  id: string;
  projectId: string;
  poolId: string;
  status: string;
  submissionDate: string;
  approvedAmount: Array<{
    amount: string;
    denomination: string;
  }>;
}

interface ApplicationsResponse {
  "@context": string;
  name: string;
  type: string;
  applications: Application[];
  total: number;
}

const params = new URLSearchParams({
  system: 'octant',
  limit: '5'
});

const response = await fetch(\`/api/v1/applications?\${params}\`);
const applications: ApplicationsResponse = await response.json();
console.log(\`Found \${applications.total} applications\`);`}
                          language="typescript"
                        />
                      </TabsContent>
                      <TabsContent value="python" className="mt-4">
                        <CodeBlock
                          code={`import requests
from typing import Dict, List, Any

params = {
    'system': 'octant',
    'limit': 5
}

response = requests.get(
    'https://opengrants.replit.app/api/v1/applications',
    params=params
)
applications: Dict[str, Any] = response.json()
print(f"Found {applications['total']} applications")`}
                          language="python"
                        />
                      </TabsContent>
                    </Tabs>

                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Response Format</h5>
                      <CodeBlock
                        code={`{
  "@context": "http://www.daostar.org/schemas",
  "name": "Applications",
  "type": "ApplicationCollection",
  "applications": [
    {
      "type": "Application",
      "id": "eip155:1:0x1234567890abcdef-epoch-3",
      "projectId": "eip155:1:0x1234567890abcdef",
      "poolId": "eip155:1:0x0000000000000000000000000000000000000000?contractId=3",
      "status": "approved",
      "submissionDate": "2025-03-31T06:15:57.285Z",
      "approvedAmount": [
        {
          "amount": "4.591929",
          "denomination": "ETH"
        }
      ]
    }
  ],
  "total": 156
}`}
                        language="json"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Authentication */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ticket className="h-5 w-5 mr-2" />
                    Authentication (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    The API supports optional authentication for higher rate limits. Anonymous requests are limited to 100 requests per hour.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <h5 className="font-medium mb-2">cURL with API Key</h5>
                      <CodeBlock
                        code={`curl -X GET \\
  "https://opengrants.replit.app/api/v1/systems" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                        language="bash"
                      />
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">JavaScript with API Key</h5>
                      <CodeBlock
                        code={`const response = await fetch('/api/v1/systems', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});`}
                        language="javascript"
                      />
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Python with API Key</h5>
                      <CodeBlock
                        code={`import requests

headers = {
  'Authorization': 'Bearer YOUR_API_KEY'
}
response = requests.get(
  'https://opengrants.replit.app/api/v1/systems',
  headers=headers
)`}
                        language="python"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}





          {activeSection === "supporters" && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold mb-4">Contributors & Supporters</h1>
                <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-8">
                  Building the future of grants interoperability together. Thank you to our contributors and supporters who believe in open, standardized grant data.
                </p>
              </div>

              {/* Mission Statement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Target className="h-5 w-5 mr-2" />
                    Our Mission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Grant funding is fragmented across dozens of platforms, each with unique APIs and data formats. 
                    Developers building grant discovery tools, analytics platforms, or ecosystem overviews face 
                    significant integration challenges.
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    OpenGrants Gateway bridges this gap by providing a unified DAOIP-5 compliant API that 
                    standardizes grant data across multiple ecosystems, enabling innovation and transparency 
                    in the grants space.
                  </p>
                </CardContent>
              </Card>

              {/* Current Contributors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Data Contributors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Octant */}
                    <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-4 flex items-center justify-center">
                        <Layers className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Octant</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Quadratic funding for Ethereum public goods
                      </p>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Integrated
                      </Badge>
                    </div>

                    {/* Giveth */}
                    <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg mb-4 flex items-center justify-center">
                        <Heart className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Giveth</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Donation platform for public goods and social impact
                      </p>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Integrated
                      </Badge>
                    </div>



                    {/* Questbook */}
                    <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg mb-4 flex items-center justify-center">
                        <Book className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Questbook</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Decentralized grants orchestration platform
                      </p>
                      <Badge variant="secondary" className="bg-purple-100 text-yellow-800 dark:bg-purple-900 dark:text-yellow-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Type 3 Integration
                      </Badge>
                    </div>

                    {/* KarmaGAP */}
                    <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg mb-4 flex items-center justify-center">
                        <Book className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">KarmaGAP</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Grants Accountablity Platform
                      </p>
                      <Badge variant="secondary" className="bg-purple-100 text-yellow-800 dark:bg-purple-900 dark:text-yellow-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Project Identity Provider
                      </Badge>
                    </div>

                    {/* Stellar */}
                    <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg mb-4 flex items-center justify-center">
                        <Star className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Stellar</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Cross-border payments and financial inclusion platform
                      </p>
                      <Badge variant="secondary" className="bg-pink-100 text-yellow-800 dark:bg-pink-900 dark:text-yellow-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Type 1 Integration
                      </Badge>
                    </div>

                    {/* OSO */}
                    <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:shadow-lg transition-shadow">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg mb-4 flex items-center justify-center">
                        <Database className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">OSO</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Open Source Observer for impact measurement
                      </p>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Infrastruture Provider
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Community Testimonials */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Heart className="h-5 w-5 mr-2" />
                    Why This Matters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">For Grant Platforms</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            "Standardized APIs reduce integration overhead and enable cross-platform analytics, 
                            helping us understand funding flows across the entire ecosystem."
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                          <Code className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">For Developers</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            "One API to access grant data from multiple platforms saves weeks of integration work. 
                            The DAOIP-5 standard ensures consistent, high-quality data for our applications."
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <Target className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">For Grant Seekers</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            "Better tooling means easier discovery of funding opportunities. 
                            Standardized data enables powerful search and matching platforms."
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                          <Layers className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">For Ecosystem Health</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            "Transparent, accessible funding data improves accountability and enables 
                            data-driven decisions about resource allocation across public goods."
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Get Involved */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Star className="h-5 w-5 mr-2" />
                    Get Involved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-4">Join the Mission</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-6">
                        Help us build the future of grants interoperability. Whether you're a grant platform, 
                        developer, or ecosystem supporter, there are many ways to contribute.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <Building className="h-8 w-8 mx-auto mb-3 text-primary" />
                        <h4 className="font-semibold mb-2">Grant Platforms</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Integrate your platform to increase discoverability and enable ecosystem analytics.
                        </p>
                      </div>

                      <div className="text-center p-4 border rounded-lg">
                        <Code className="h-8 w-8 mx-auto mb-3 text-primary" />
                        <h4 className="font-semibold mb-2">Developers</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Contribute to our open-source codebase or build applications using our API.
                        </p>
                      </div>

                      <div className="text-center p-4 border rounded-lg">
                        <Heart className="h-8 w-8 mx-auto mb-3 text-primary" />
                        <h4 className="font-semibold mb-2">Supporters</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Help fund development and infrastructure costs to keep the API free and accessible.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
