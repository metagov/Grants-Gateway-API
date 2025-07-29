import { useState, useEffect } from "react";
import { 
  Play, 
  Copy,
  Loader2,
  Info as InfoIcon
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

export default function QueryBuilderPage() {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-4">Interactive Query Builder</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Build and test API queries with real-time preview and execution.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 lg:h-[calc(100vh-200px)]">
        {/* Query Builder Form - Fixed width panel */}
        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
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
                  <SelectItem value="questbook">Questbook</SelectItem>
                </SelectContent>
              </Select>
            </div>



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
        </div>

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
  );
}