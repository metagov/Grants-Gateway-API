import { useState, useEffect } from "react";
import { 
  Play, 
  Copy,
  Loader2,
  Info as InfoIcon,
  Key,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { QueryFilters } from "@/types/daoip5";
import { Link } from "wouter";

export default function QueryBuilderPage() {
  // Query builder state
  const [entityType, setEntityType] = useState("grantSystems");
  const [queryFilters, setQueryFilters] = useState<QueryFilters>({});
  const [queryPreview, setQueryPreview] = useState("https://grants.daostar.org/api/v1/grantSystems");
  const [apiKey, setApiKey] = useState("");

  // Update API client when key changes
  useEffect(() => {
    apiClient.setApiKey(apiKey || null);
  }, [apiKey]);

  // Update query preview when filters change
  useEffect(() => {
    let query = `https://grants.daostar.org/api/v1/${entityType}`;
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
      // Show success feedback
      const button = document.activeElement as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Interactive Query Builder</h1>
        <p className="text-gray-600">
          Build and test API queries with real-time preview and execution.
        </p>
      </div>

      {/* Query Builder and Preview in one row */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-8">
        {/* Query Builder Form */}
        <Card>
          <CardHeader>
            <CardTitle>Build Your Query</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
          <div>
            <Label htmlFor="apiKey" className="flex items-center">
              <Key className="h-4 w-4 mr-1 text-primary" />
              API Key
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 ml-1 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter your API key to authenticate requests.</p>
                  <p>Get one from the Get API Access page.</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Link href="/get-api-access">
                <Button variant="outline" size="icon" title="Get API Access">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            {!apiKey && (
              <p className="text-xs text-muted-foreground mt-1">
                Need an API key? <Link href="/get-api-access" className="text-primary hover:underline">Get one here</Link>
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="entityType">Entity Type</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grantSystems">Grant Systems</SelectItem>
                <SelectItem value="grantPools">Grant Pools</SelectItem>
                <SelectItem value="grantApplications">Grant Applications</SelectItem>
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

          {entityType === "grantApplications" && (
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="page">Page</Label>
              <Input
                id="page"
                type="number"
                min="1"
                placeholder="1"
                value={queryFilters.page || ""}
                onChange={(e) => setQueryFilters(prev => ({ ...prev, page: e.target.value ? parseInt(e.target.value) : undefined }))}
              />
            </div>
            <div>
              <Label htmlFor="limit" className="flex items-center">
                Limit
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 ml-1 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Number of results per page (1-100, default: 10)</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="limit"
                type="number"
                min="1"
                max="100"
                placeholder="10"
                value={queryFilters.limit || ""}
                onChange={(e) => setQueryFilters(prev => ({ ...prev, limit: e.target.value ? parseInt(e.target.value) : undefined }))}
              />
            </div>
          </div>

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
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500 mb-2">REQUEST URL</div>
              <code className="text-sm text-primary break-all">
                {queryPreview}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Section - Full width below */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Response
            {executeQueryMutation.isSuccess && (
              <Badge variant="default" className="bg-primary/10 text-primary">
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
          <div className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
            {executeQueryMutation.isPending && (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Executing query...
              </div>
            )}
            {executeQueryMutation.isSuccess && (
              <pre className="text-sm overflow-x-auto overflow-y-auto max-h-[600px] text-gray-800 whitespace-pre-wrap break-words">
                {JSON.stringify(executeQueryMutation.data, null, 2)}
              </pre>
            )}
            {executeQueryMutation.isError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-red-600 font-medium mb-2">
                  Error: {executeQueryMutation.error.message}
                </div>
                {executeQueryMutation.error.message.includes('Unauthorized') && (
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">You need a valid API key to access this endpoint.</p>
                    <Link href="/get-api-access">
                      <Button variant="outline" size="sm" className="text-primary border-primary hover:bg-primary/10">
                        <Key className="h-4 w-4 mr-2" />
                        Get API Access
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
            {executeQueryMutation.isIdle && (
              <div className="flex items-center justify-center h-[400px] text-gray-500">
                Click "Execute Query" to see results here
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}