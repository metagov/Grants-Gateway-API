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
  dashboardApi,
  formatCurrency,
  getSystemColor,
} from "@/lib/dashboard-api";

// Helper function to get system ID from display name
const getSystemId = (systemName: string): string => {
  const nameToIdMap: Record<string, string> = {
    octant: "octant",
    giveth: "giveth",
    "stellar community fund": "stellar",
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

function SystemCard({ system }: { system: any }) {
  const systemColor = getSystemColor(system.name);
  const compatibilityColor =
    system.compatibility >= 90
      ? "text-green-600"
      : system.compatibility >= 75
        ? "text-yellow-600"
        : "text-orange-600";

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group cursor-pointer relative">
      {system.addedDate &&
        new Date(system.addedDate).getTime() >
          Date.now() - 7 * 24 * 60 * 60 * 1000 && (
          <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs">
            NEW
          </Badge>
        )}
      <Link href={`/dashboard/systems/${getSystemId(system.name)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center relative"
                style={{ backgroundColor: systemColor }}
              >
                <Building2 className="h-6 w-6 text-white" />
                {system.compatibility && (
                  <div
                    className={`absolute -bottom-1 -right-1 text-xs font-bold ${compatibilityColor} bg-white rounded-full px-1 border`}
                  >
                    {system.compatibility}%
                  </div>
                )}
              </div>
              <div>
                <CardTitle className="text-lg group-hover:text-[#800020] transition-colors">
                  {system.name}
                </CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: systemColor, color: systemColor }}
                  >
                    {system.source === "opengrants" ? "Type 1" : "Type 2"}
                  </Badge>
                  {system.compatibility && (
                    <span className="text-xs text-gray-500">
                      DAOIP-5: {system.compatibility}%
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#800020] transition-colors" />
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
              <span className="text-gray-500 block">Approval:</span>
              <span className="font-medium text-gray-400 italic block">
                Coming soon
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-gray-500 block">Rounds:</span>
              <span className="font-medium block">{system.totalPools || 0}</span>
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
                      {mechanism}
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
              <div className="flex items-center space-x-1 text-[#800020] text-sm font-medium group-hover:underline">
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
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      {/* API Integrated Systems */}
      {apiSystems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-semibold text-gray-900">
              Type 1: Live API Integrations
            </h2>
            <Badge variant="secondary" className="text-xs">
              Real-time data
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apiSystems.map((system) => (
              <SystemCard key={system.name} system={system} />
            ))}
          </div>
        </div>
      )}
      {/* Static Data Systems */}
      {staticSystems.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staticSystems.map((system) => (
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
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Unable to load systems
              </h3>
              <p className="text-gray-600 mb-4">
                There was an error fetching the grant systems data.
              </p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {/* DAOIP-5 Value Proposition */}{" "}
      {/*
      <Card className="bg-gradient-to-r from-[#800020]/5 to-green-500/5 border-[#800020]/20">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="h-5 w-5 text-[#800020] mr-2" />
            DAOIP-5 Standardization Impact
          </CardTitle>
          <CardDescription>
            How standardization enables automatic integration and comparison
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                Auto-Discovery
              </h4>
              <p className="text-sm text-gray-600">
                New grant systems are automatically detected and added to the dashboard 
                without manual configuration, thanks to DAOIP-5 compliance.
              </p>
              <div className="text-xs text-green-600 font-medium">
                {systems?.filter(s => s.addedDate && new Date(s.addedDate).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000).length || 0} new systems this month
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center">
                <div className="h-2 w-2 bg-blue-500 rounded-full mr-2"></div>
                Unified Analysis
              </h4>
              <p className="text-sm text-gray-600">
                DAOIP-5 standardization enables meaningful comparison across diverse 
                ecosystems with different funding mechanisms.
              </p>
              <div className="text-xs text-blue-600 font-medium">
                {systems?.length || 0} systems comparable
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 flex items-center">
                <div className="h-2 w-2 bg-purple-500 rounded-full mr-2"></div>
                Compatibility Scoring
              </h4>
              <p className="text-sm text-gray-600">
                Each system's DAOIP-5 compatibility is automatically assessed, 
                ensuring data quality and integration reliability.
              </p>
              <div className="text-xs text-purple-600 font-medium">
                Avg: {systems && systems.length > 0 ? Math.round(systems.reduce((sum, s) => sum + (s.compatibility || 0), 0) / systems.length) : 0}% compatible
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <h5 className="font-medium text-gray-900">Proven Value</h5>
                <p className="text-sm text-gray-600 mt-1">
                  By standardizing grant data with DAOIP-5, we can automatically integrate 
                  new ecosystems and enable cross-system analysis that was previously impossible. 
                  This dashboard proves that diverse grant ecosystems become comparable and 
                  analyzable when following a common standard.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>  */}
    </div>
  );
}
