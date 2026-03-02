import { useState, useEffect } from "react";
import {
  Play,
  Copy,
  Loader2,
  Info as InfoIcon,
  Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation } from "@tanstack/react-query";
import { QueryFilters } from "@/types/daoip5";
import { useAuth } from "@/hooks/useAuth";

export default function QueryBuilderPage() {
  const { authenticated, apiKey: registeredKey, login } = useAuth();

  // Query builder state
  const [entityType, setEntityType] = useState("grantSystems");
  const [queryFilters, setQueryFilters] = useState<QueryFilters>({});
  const [queryPreview, setQueryPreview] = useState("https://grants.daostar.org/api/v1/grantSystems");
  const [customApiKey, setCustomApiKey] = useState("");

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

  // Execute query mutation — optionally attach API key for higher rate limits
  const executeQueryMutation = useMutation({
    mutationFn: async () => {
      const url = `/api/v1/${entityType}`;
      const params = new URLSearchParams();
      Object.entries(queryFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (customApiKey.trim()) {
        headers['Authorization'] = `Bearer ${customApiKey.trim()}`;
      }

      const res = await fetch(fullUrl, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
      }
      return res.json();
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
        <p className="text-gray-600 ">
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
                <SelectItem value="scf">Stellar Community Fund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sorting options - only for Pools and Applications */}
          {(entityType === "grantPools" || entityType === "grantApplications") && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sortBy">Sort By</Label>
                <Select 
                  value={queryFilters.sortBy || "id"} 
                  onValueChange={(value) => setQueryFilters(prev => ({ ...prev, sortBy: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">ID</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="closeDate">Close Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sortOrder">Order</Label>
                <Select 
                  value={queryFilters.sortOrder || "desc"} 
                  onValueChange={(value) => setQueryFilters(prev => ({ ...prev, sortOrder: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

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

          {/* API Key (optional — increases rate limit) */}
          <div>
            <Label htmlFor="apiKey" className="flex items-center">
              <Key className="h-3.5 w-3.5 mr-1" />
              API Key (optional)
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 ml-1 text-gray-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Without a key: 20 requests/min</p>
                  <p>With a key: 100 requests/min</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              type="password"
              placeholder="Paste your API key for higher rate limits"
              value={customApiKey}
              onChange={(e) => setCustomApiKey(e.target.value)}
            />
            {!authenticated && (
              <p className="text-xs text-muted-foreground mt-1">
                Don't have a key?{" "}
                <button onClick={login} className="text-primary underline hover:no-underline">
                  Log in
                </button>
                {" "}to register for one.
              </p>
            )}
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
          <CardContent className="space-y-4">
            <div className="bg-gray-50  rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500  mb-2">REQUEST URL</div>
              <code className="text-sm text-primary break-all">
                {queryPreview}
              </code>
            </div>
            <div className="bg-gray-50  rounded-lg p-4">
              <div className="text-xs font-medium text-gray-500  mb-2">CURL</div>
              <code className="text-xs text-gray-700  break-all whitespace-pre-wrap">
                {customApiKey.trim()
                  ? `curl -H "Authorization: Bearer ${customApiKey.trim()}" \\\n  "${queryPreview}"`
                  : `curl "${queryPreview}"`}
              </code>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {customApiKey.trim() ? "100 req/min" : "20 req/min"}
              </Badge>
              {customApiKey.trim() ? "Authenticated rate limit" : "Anonymous rate limit"}
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
              <Badge variant="default" className="bg-green-100 text-green-800  ">
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
          <div className="bg-gray-50  rounded-lg p-4 min-h-[400px]">
            {executeQueryMutation.isPending && (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Executing query...
              </div>
            )}
            {executeQueryMutation.isSuccess && (
              <pre className="text-sm overflow-x-auto max-h-[600px] text-gray-800 whitespace-pre-wrap break-all">
                {JSON.stringify(executeQueryMutation.data, null, 2)}
              </pre>
            )}
            {executeQueryMutation.isError && (
              <div className="text-red-600 ">
                Error: {executeQueryMutation.error.message}
              </div>
            )}
            {executeQueryMutation.isIdle && (
              <div className="flex items-center justify-center h-[400px] text-gray-500 ">
                Click "Execute Query" to see results here
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}