import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Building2,
  ExternalLink,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  ArrowRight,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  dashboardApi,
  formatCurrency,
  getSystemColor,
} from "@/lib/dashboard-api";

// Helper function to get system ID from display name
const getSystemId = (systemName: string): string => {
  const nameToIdMap: Record<string, string> = {
    octant: "octant",
    giveth: "giveth",
    "stellar community fund": "Stellar Community Fund",
    "optimism retropgf": "optimism",
    "arbitrum foundation": "arbitrumfoundation",
    celopg: "celopg", // Updated to correct system ID
    "celo public goods": "celopg", // Alternative name mapping
    "celo-public-goods": "celopg", // URL-friendly mapping
    "clr fund": "clrfund",
    "dao drops": "dao-drops-dorgtech",
    "octant (golem)": "octant-golemfoundation",
  };

  const normalizedName = systemName.toLowerCase();
  return nameToIdMap[normalizedName] || normalizedName.replace(/\s+/g, "-");
};

// Helper function to format funding mechanism names
const formatMechanismName = (mechanism: string): string => {
  const mechanismMap: Record<string, string> = {
    quadratic_funding: "Quadratic Funding",
    direct_grants: "Direct Grants",
    donations: "Donations",
    retroactive_funding: "Retroactive Funding",
    milestone_based: "Milestone Based",
  };

  return (
    mechanismMap[mechanism] ||
    mechanism
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
};

function SystemCard({ system }: { system: any }) {
  const systemColor = getSystemColor(system.name);
  const compatibilityColor = system.compatibility >= 90 ? 'text-green-600' : system.compatibility >= 75 ? 'text-yellow-600' : 'text-orange-600';

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group cursor-pointer relative">
      {system.addedDate &&
        new Date(system.addedDate).getTime() >
          Date.now() - 7 * 24 * 60 * 60 * 1000 && (
          <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
            NEW
          </Badge>
        )}
      {system.status === "work_in_progress" && (
        <Badge className="absolute -top-2 -left-2 bg-yellow-500 text-white text-xs">
          WORK IN PROGRESS
        </Badge>
      )}
      <Link href={`/systems/${getSystemId(system.name)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center relative"
                style={{ backgroundColor: systemColor }}
              >
                {system.id === "scf" ? (
                  <img
                    src="/attached_assets/stellar-logo.png"
                    alt="Stellar"
                    className="h-6 w-6"
                  />
                ) : system.id === "celopg" ? (
                  <img
                    src="/attached_assets/celo-logo.png"
                    alt="Celo"
                    className="h-6 w-6"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {system.name}
                </CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block">
                          <Badge
                            variant="outline"
                            className="text-xs cursor-help"
                            style={{
                              borderColor: systemColor,
                              color: systemColor,
                            }}
                          >
                            {system.source === "opengrants"
                              ? "Type 1"
                              : "Type 2"}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {system.source === "opengrants"
                            ? "Type 1: Live API Integration"
                            : "Type 2: DAOIP-5 Static Data"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div className="space-y-1">
              <span className="text-gray-500 block">Funding:</span>
              <span className="font-medium block">
                {formatCurrency(system.totalFunding || 0)}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500 block">Applications:</span>
              <span className="font-medium block">
                {system.totalApplications || 0}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500 block">Avg per Project:</span>
              <span className="font-medium block">
                {system.totalApplications && system.totalApplications > 0
                  ? formatCurrency(
                      (system.totalFunding || 0) / system.totalApplications,
                    )
                  : "--"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500 block">Rounds:</span>
              <span className="font-medium block">
                {system.totalPools || 0}
              </span>
            </div>
          </div>

          {system.fundingMechanisms && system.fundingMechanisms.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex flex-wrap gap-1">
                {system.fundingMechanisms
                  .slice(0, 2)
                  .map((mechanism: string) => (
                    <Badge
                      key={mechanism}
                      variant="secondary"
                      className="text-xs"
                    >
                      {formatMechanismName(mechanism)}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {system.source === "opengrants" ? "Live API" : "Static Data"}
              </span>
              <div className="flex items-center space-x-1 text-primary text-sm font-medium group-hover:underline">
                <span>View Details</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

function SystemSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Skeleton className="h-4 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function GrantSystems() {
  const {
    data: systems,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard-all-systems"],
    queryFn: dashboardApi.getAllSystems,
    staleTime: 15 * 60 * 1000, // 15 minutes - cached stats
    gcTime: 30 * 60 * 1000, // 30 minutes in cache
    refetchInterval: 15 * 60 * 1000, // Auto-refresh every 15 minutes
  });

  const apiSystems =
    systems?.filter(
      (s) =>
        s.source === "opengrants" &&
        !["giveth", "octant"].includes(s.name.toLowerCase()),
    ) || [];
  const staticSystems = systems?.filter((s) => s.source === "daoip5") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Grant Systems</h1>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Systems</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? <Skeleton className="h-8 w-12" /> : systems?.length || 0}
            </div>
            <p className="text-xs text-gray-600 mt-1">Integrated platforms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Live Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? <Skeleton className="h-8 w-12" /> : apiSystems.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Real-time API access</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Data Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {isLoading ? <Skeleton className="h-8 w-12" /> : staticSystems.length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Static data sources</p>
          </CardContent>
        </Card>
      </div>

      {/* All Systems */}
      {systems && systems.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {systems.map((system) => (
              <SystemCard key={system.name} system={system} />
            ))}
          </div>
        </div>
      )}
      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Loading Systems...
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <SystemSkeleton key={i} />
            ))}
          </div>
        </div>
      )}
      {/* Error State */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">API Connection Error</h3>
              <p className="text-gray-600 mb-4">
                Unable to connect to the grant systems API. The OpenGrants API server may be unavailable.
              </p>
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
