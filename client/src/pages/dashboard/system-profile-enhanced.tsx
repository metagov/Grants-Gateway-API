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
  ChevronDown,
  ChevronRight,
  BarChart3,
  Award,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Twitter,
  Github,
  Globe,
  Mail,
  MapPin,
  Star,
  Eye,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  dashboardApi,
  formatCurrency,
  getSystemColor,
  invalidateAllCaches,
} from "@/lib/dashboard-api";
import { queryClient } from "@/lib/queryClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";
import { useState } from "react";

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  loading = false,
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
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
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
function FundingDistributionChart({
  pools,
  applications,
}: {
  pools: any[];
  applications: any[];
}) {
  const chartData = pools
    .map((pool) => {
      const poolApps = applications.filter(
        (app) => app.grantPoolId === pool.id,
      );
      const totalFunding = poolApps.reduce((sum, app) => {
        return sum + parseFloat(app.fundsApprovedInUSD || "0");
      }, 0);

      return {
        name:
          pool.name.length > 20
            ? pool.name.substring(0, 20) + "..."
            : pool.name,
        funding: totalFunding,
        applications: poolApps.length,
        approved: poolApps.filter(
          (app) => app.status === "funded" || app.status === "approved",
        ).length,
      };
    })
    .filter((item) => item.funding > 0);

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
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
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
                  name === "funding" ? formatCurrency(value) : value,
                  name === "funding"
                    ? "Total Funding"
                    : name === "applications"
                      ? "Applications"
                      : "Approved",
                ]}
                labelStyle={{ color: "#374151" }}
              />
              <Bar dataKey="funding" fill="#800020" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to extract round number for sorting (supports both scf_x and round_x patterns)
const getRoundNumber = (pool: any): number => {
  const src = (pool.name || pool.id || "").toString();
  // Look for round-specific patterns first (round_33, scf_38, scf-12, SCF #38)
  const roundMatch = src.match(/(?:round|scf)[^0-9]*?(\d+)/i);
  if (roundMatch) return parseInt(roundMatch[1], 10);
  // Fallback to any number found
  const genericMatch = src.match(/(\d+)/);
  return genericMatch ? parseInt(genericMatch[1], 10) : -Infinity;
};

// Helper function to format pool names
const formatPoolName = (pool: any): string => {
  const rawName = pool.name || pool.id.split(":").pop();
  // Convert scf_1 -> SCF #1, scf_38 -> SCF #38
  if (rawName && rawName.toLowerCase().startsWith("scf_")) {
    const number = rawName.match(/\d+/);
    return number ? `SCF #${number[0]}` : rawName;
  }
  return rawName;
};

// Applications vs Funding per Round Chart
function ApplicationsVsFundingChart({
  pools,
  applications,
}: {
  pools: any[];
  applications: any[];
}) {
  const chartData = pools.map((pool) => {
    const poolApps = applications.filter((app) => app.grantPoolId === pool.id);
    // Calculate actual distributed funding from approved/funded applications
    // Support both OpenGrants and DAOIP-5 status values
    const totalFunding = poolApps.reduce((sum, app) => {
      const status = app.status?.toLowerCase();
      const hasFunding = parseFloat(app.fundsApprovedInUSD || "0") > 0;
      if (
        hasFunding && (
          status === "funded" ||
          status === "approved" ||
          status === "awarded" ||
          status === "completed" || // DAOIP-5 standard
          status === "submitted" // For any status, check actual funding
        )
      ) {
        return sum + parseFloat(app.fundsApprovedInUSD || "0");
      }
      return sum;
    }, 0);
    const awardedCount = poolApps.filter((app) => {
      const status = app.status?.toLowerCase();
      const hasFunding = parseFloat(app.fundsApprovedInUSD || "0") > 0;
      return (
        hasFunding && (
          status === "funded" ||
          status === "approved" ||
          status === "awarded" ||
          status === "completed" || // DAOIP-5 standard
          status === "submitted" // For any status, check actual funding
        )
      );
    }).length;

    const formattedName = formatPoolName(pool);
    // Create short name for chart labels with Celo support
    let shortName = formattedName.replace(/^SCF #/, "");
    
    // Handle Celo round patterns: round_33 -> R33, mint_pilot -> Pilot, etc.
    const rawName = pool.name || pool.id.split(":").pop() || "";
    if (rawName.startsWith("round_")) {
      const match = rawName.match(/round_(\d+)/);
      shortName = match ? `R${match[1]}` : shortName;
    } else if (rawName === "mint_pilot") {
      shortName = "Pilot";
    } else if (rawName === "mint_growth") {
      shortName = "Growth";
    } else if (rawName === "mint_micro") {
      shortName = "Micro";
    }

    return {
      name: formattedName,
      shortName: shortName, // For chart display
      applications: awardedCount,
      funding: totalFunding,
      poolId: pool.id,
      rawName: pool.name || pool.id.split(":").pop(), // Keep for sorting
    };
  });

  const filteredData = chartData
    .filter((item) => item.applications > 0 || item.funding > 0)
    .sort((a, b) => {
      // Use the same round number extraction logic for consistency
      const aNumber = getRoundNumber({ name: a.rawName });
      const bNumber = getRoundNumber({ name: b.rawName });
      return bNumber - aNumber; // Latest first (descending)
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 text-[#800020] mr-2" />
          Applications Awarded vs Funds Distributed
        </CardTitle>
        <CardDescription>
          Number of awarded applications and actual distributed funding per
          round
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filteredData}
              margin={{ top: 20, right: 80, left: 60, bottom: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="shortName"
                angle={-45}
                textAnchor="end"
                height={90}
                fontSize={10}
                interval={0}
                tick={{ fontSize: 10 }}
                tickMargin={10}
              />
              <YAxis
                yAxisId="left"
                orientation="left"
                tickFormatter={(value) => value.toString()}
                fontSize={10}
                width={50}
                label={{
                  value: "Applications",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: 'middle' }
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => {
                  // Format large numbers with K, M, B notation for better readability
                  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                  return `$${value}`;
                }}
                fontSize={10}
                width={70}
                label={{
                  value: "Funding",
                  angle: 90,
                  position: "insideRight",
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  name === "funding" ? formatCurrency(value) : value,
                  name === "funding" ? "Total Funding" : "Awarded Applications",
                ]}
                labelStyle={{ color: "#374151" }}
              />
              <Bar
                yAxisId="left"
                dataKey="applications"
                fill="#3B82F6"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                yAxisId="right"
                dataKey="funding"
                fill="#800020"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              {filteredData.length > 10 && (
                <Brush
                  dataKey="shortName"
                  height={20}
                  startIndex={Math.max(filteredData.length - 10, 0)}
                  stroke="#800020"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Funding Timeline Chart
function FundingTimelineChart({ applications }: { applications: any[] }) {
  const timelineData = applications
    .filter(
      (app) => app.createdAt && parseFloat(app.fundsApprovedInUSD || "0") > 0,
    )
    .map((app) => ({
      date: new Date(app.createdAt!).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      }),
      funding: parseFloat(app.fundsApprovedInUSD || "0"),
      timestamp: new Date(app.createdAt!).getTime(),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  // Group by month and sum funding
  const monthlyData = timelineData.reduce(
    (acc, item) => {
      const existing = acc.find((d) => d.month === item.date);
      if (existing) {
        existing.funding += item.funding;
        existing.count += 1;
      } else {
        acc.push({
          month: item.date,
          funding: item.funding,
          count: 1,
        });
      }
      return acc;
    },
    [] as Array<{ month: string; funding: number; count: number }>,
  );

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
            <BarChart
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                fontSize={12}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  name === "funding" ? formatCurrency(value) : value,
                  name === "funding" ? "Total Funding" : "Applications Funded",
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

function GrantPoolCard({
  pool,
  applications,
}: {
  pool: any;
  applications: any[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const poolApplications = applications.filter(
    (app) => app.grantPoolId === pool.id,
  );

  const totalFunding = poolApplications.reduce((sum, app) => {
    return sum + parseFloat(app.fundsApprovedInUSD || "0");
  }, 0);

  // Format pool name to be human-friendly
  const displayName = formatPoolName(pool);
  
  // Extract round number for indexing
  const roundNumber = getRoundNumber(pool);
  
  // Extract metadata from extensions (especially Celo)
  const extensions = pool.extensions || {};
  const celoRoundName = extensions['celopg.roundName'];
  const celoRoundType = extensions['celopg.roundType'];
  const celoPoolType = extensions['celopg.poolType'];
  const celoCategory = extensions['celopg.category'];
  const celoFundedAmount = extensions['celopg.fundedAmountInUsd'];
  const celoMatchAmount = extensions['celopg.matchAmountInUsd'];
  const celoDonorsCount = extensions['celopg.uniqueDonorsCount'];
  const celoDonationsCount = extensions['celopg.totalDonationsCount'];
  const celoQuarter = extensions['celopg.quarter'];
  const description = pool.description;
  
  // Extract timestamp information from pool extensions first, then fallback
  const poolDate = extensions['celopg.donationsEndTime'] ||
                  extensions['celopg.applicationsEndTime'] ||
                  extensions['celopg.timestamp'] ||
                  pool.closeDate || 
                  pool.createdAt || 
                  pool.startDate || 
                  pool.applicationsEndTime;
  const formattedDate = poolDate 
    ? new Date(poolDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : 'Date TBD';

  // Use enhanced name from extensions if available
  const enhancedDisplayName = celoRoundName || displayName;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <CardTitle className="text-lg">{enhancedDisplayName}</CardTitle>
                <CardDescription className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      Round {roundNumber > 0 ? roundNumber : '?'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {formattedDate}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {pool.grantFundingMechanism || 'Direct Grant'}
                    </Badge>
                    {celoRoundType && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {celoRoundType}
                      </Badge>
                    )}
                    {celoPoolType && (
                      <Badge variant="outline" className="text-xs">
                        {celoPoolType} Pool
                      </Badge>
                    )}
                    <Badge
                      variant={pool.isOpen ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {pool.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{poolApplications.length} applications</span>
                    {celoDonorsCount && (
                      <span>{celoDonorsCount} donors</span>
                    )}
                    {celoDonationsCount && (
                      <span>{celoDonationsCount} donations</span>
                    )}
                    {celoQuarter && (
                      <span>{celoQuarter}</span>
                    )}
                  </div>
                  {description && (
                    <p className="text-xs text-gray-600 line-clamp-2 max-w-md">
                      {description}
                    </p>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(totalFunding)}
                  </div>
                  {celoFundedAmount && celoFundedAmount !== totalFunding && (
                    <div className="text-xs text-gray-500">
                      Funded: {formatCurrency(celoFundedAmount)}
                    </div>
                  )}
                  {celoMatchAmount && celoMatchAmount > 0 && (
                    <div className="text-xs text-blue-600">
                      Match: {formatCurrency(celoMatchAmount)}
                    </div>
                  )}
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
            {poolApplications.length > 0 ? (
              <div className="space-y-2">
                {poolApplications
                  .sort((a, b) => {
                    // Sort by funding amount (highest first)
                    const fundingA = parseFloat(a.fundsApprovedInUSD || "0");
                    const fundingB = parseFloat(b.fundsApprovedInUSD || "0");
                    if (fundingB !== fundingA) return fundingB - fundingA;
                    
                    // Then sort alphabetically by project name
                    const nameA = (a.projectName || "Unknown").toLowerCase();
                    const nameB = (b.projectName || "Unknown").toLowerCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;
                    return 0;
                  })
                  .slice(0, 10)
                  .map((app) => (
                    <ApplicationCard key={app.id} app={app} />
                  ))}
                
                {poolApplications.length > 10 && (
                  <div className="text-center py-4">
                    <Badge variant="outline" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Showing top 10 of {poolApplications.length} applications
                    </Badge>
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

// Helper function to render social media icons
function SocialIcon({ platform }: { platform: string }) {
  const normalizedPlatform = platform.toLowerCase();
  
  if (normalizedPlatform.includes('twitter') || normalizedPlatform.includes('x.com')) {
    return <Twitter className="h-4 w-4" />;
  }
  if (normalizedPlatform.includes('github')) {
    return <Github className="h-4 w-4" />;
  }
  if (normalizedPlatform.includes('website') || normalizedPlatform.includes('www')) {
    return <Globe className="h-4 w-4" />;
  }
  if (normalizedPlatform.includes('email') || normalizedPlatform.includes('mail')) {
    return <Mail className="h-4 w-4" />;
  }
  return <ExternalLink className="h-4 w-4" />;
}

// Enhanced application card component
function ApplicationCard({ app }: { app: any }) {
  const extensions = app.extensions || {};
  const projectDetails = extensions['app.octant.projectDetails'] || 
                        extensions['io.giveth.applicationMetadata'] || 
                        extensions['projectDetails'] || {};
  const karmaUID = extensions['x-karmagap-uid'];
  const description = projectDetails.description || 
                     extensions.projectDescription || 
                     projectDetails.projectDescription;
  const projectImage = projectDetails.profileImageSmall || 
                      projectDetails.profileImageMedium || 
                      extensions.projectImage ||
                      projectDetails.image;
  const website = projectDetails.website || app.website;
  const socials = app.socials || extensions.projectSocialMedia || [];

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-4">
          {/* Project Image */}
          {projectImage && (
            <div className="flex-shrink-0">
              <img 
                src={projectImage} 
                alt={app.projectName || "Project"} 
                className="w-16 h-16 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-lg text-gray-900 mb-1">
                  {app.projectName || "Unknown Project"}
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant={(() => {
                      const status = app.status?.toLowerCase();
                      const hasFunding = parseFloat(app.fundsApprovedInUSD || "0") > 0;
                      if (hasFunding && (status === "funded" || status === "awarded" || status === "completed" || status === "submitted")) {
                        return "default";
                      } else if (status === "approved") {
                        return "secondary";
                      } else if (status === "rejected") {
                        return "destructive";
                      } else {
                        return "outline";
                      }
                    })()}
                    className="text-xs capitalize"
                  >
                    {app.status}
                  </Badge>
                  {karmaUID && (
                    <Badge variant="outline" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Karma: {karmaUID}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Funding Information */}
              <div className="text-right">
                <div className="font-semibold text-lg">
                  {app.fundsApprovedInUSD
                    ? formatCurrency(parseFloat(app.fundsApprovedInUSD))
                    : "--"}
                </div>
                {app.fundsApproved && app.fundsApproved[0] && (
                  <div className="text-sm text-gray-500">
                    {app.fundsApproved[0].amount} {app.fundsApproved[0].denomination}
                  </div>
                )}
                {app.fundsAsked && app.fundsAsked[0] && app.fundsAskedInUSD && (
                  <div className="text-xs text-gray-400">
                    Requested: {formatCurrency(parseFloat(app.fundsAskedInUSD))}
                  </div>
                )}
              </div>
            </div>

            {/* Project Description */}
            {description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {description}
              </p>
            )}

            {/* Links and Social Media */}
            <div className="flex items-center gap-4 text-sm">
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
              
              {socials && socials.length > 0 && (
                <div className="flex items-center gap-2">
                  {socials.slice(0, 3).map((social: any, index: number) => (
                    <a
                      key={index}
                      href={social.url || social.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-700"
                      title={social.platform || social.type}
                    >
                      <SocialIcon platform={social.platform || social.type} />
                    </a>
                  ))}
                  {socials.length > 3 && (
                    <span className="text-xs text-gray-400">
                      +{socials.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Technical Details */}
              {app.payoutAddress && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" />
                  {app.payoutAddress.slice(0, 8)}...{app.payoutAddress.slice(-6)}
                </div>
              )}
            </div>

            {/* Additional Metadata */}
            {(app.category || app.awardType || app.createdAt) && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                {app.category && <span>{app.category}</span>}
                {app.awardType && <span>• {app.awardType}</span>}
                {app.createdAt && (
                  <span>• Created {new Date(app.createdAt).toLocaleDateString()}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to get system ID from route name
const getSystemId = (routeName: string): string => {
  const routeToIdMap: Record<string, string> = {
    octant: "octant",
    giveth: "giveth",
    "stellar-community-fund": "stellar",
    "optimism-retropgf": "optimism",
    "arbitrum-foundation": "arbitrumfoundation",
    celopg: "celopg", 
    "celo-public-goods": "celopg", // URL-friendly mapping
    "clr-fund": "clrfund",
    "dao-drops": "dao-drops-dorgtech",
    "octant-golem": "octant-golemfoundation",
  };

  const normalizedRoute = routeName.toLowerCase();
  return routeToIdMap[normalizedRoute] || normalizedRoute.replace(/\s+/g, "-");
};

// Helper function to get display name from route name
const getDisplayName = (routeName: string): string => {
  const routeToDisplayMap: Record<string, string> = {
    octant: "Octant",
    giveth: "Giveth",
    "stellar-community-fund": "Stellar Community Fund",
    "optimism-retropgf": "Optimism RetroPGF",
    "arbitrum-foundation": "Arbitrum Foundation",
    celopg: "Celo Public Goods",
    "celo-public-goods": "Celo Public Goods",
    "clr-fund": "CLR Fund",
    "dao-drops": "DAO Drops",
    "octant-golem": "Octant (Golem)",
  };

  const normalizedRoute = routeName.toLowerCase();
  return routeToDisplayMap[normalizedRoute] || 
         // Fallback: convert route name to title case
         routeName.split('-').map(word => 
           word.charAt(0).toUpperCase() + word.slice(1)
         ).join(' ');
};

export default function SystemProfileEnhanced() {
  const [, params] = useRoute("/dashboard/systems/:systemName");
  const systemName = params?.systemName || "";
  const systemId = getSystemId(systemName);
  const displayName = getDisplayName(systemName); // Map URL parameter to correct system ID

  const {
    data: systemData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard-system-details", systemId], // Use mapped system ID
    queryFn: () => dashboardApi.getSystemDetails(systemId), // Use mapped system ID
    staleTime: 15 * 60 * 1000, // 15 minutes - cached stats
    gcTime: 30 * 60 * 1000, // 30 minutes in cache
    refetchInterval: 15 * 60 * 1000, // Auto-refresh every 15 minutes
    enabled: !!systemId, // Check mapped system ID
  });

  const systemColor = getSystemColor(systemId);

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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                System not found
              </h3>
              <p className="text-gray-600 mb-4">
                Unable to load data for system "{displayName}".
              </p>
              <Link href="/dashboard/systems">
                <Button variant="outline">Back to Systems</Button>
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
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {displayName}
                </h1>
                {systemId === "celopg" && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    Work in Progress
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">
                Grant system profile and funding analytics
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={async () => {
            console.log("🔄 User requested cache invalidation");
            await invalidateAllCaches();
            // Refresh this specific query
            queryClient.invalidateQueries({
              queryKey: ["dashboard-system-details", systemId],
            });
            console.log("✅ Cache invalidated and data refreshed");
          }}
          variant="outline"
          size="sm"
          className="text-sm"
          data-testid="button-refresh-data"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh Data
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <StatsCard
          title="Total Applications"
          value={stats.totalApplications}
          description="Applications processed"
          icon={Users}
        />
        <StatsCard
          title="Grant Rounds"
          value={pools.length}
          description="Funding rounds available"
          icon={Calendar}
        />
        <div className="relative">
          <StatsCard
            title="Total Awarded"
            value={formatCurrency(
              applications.reduce(
                (sum, app) => sum + parseFloat(app.fundsApprovedInUSD || "0"),
                0,
              ),
            )}
            description="Funds approved for projects"
            icon={Award}
          />
          {applications.reduce(
            (sum, app) => sum + parseFloat(app.fundsApprovedInUSD || "0"),
            0,
          ) === 0 && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 rounded-lg flex items-center justify-center backdrop-blur-xs">
              <div className="bg-white/90 px-3 py-1 rounded-full shadow-sm border border-gray-200">
                <span className="text-xs font-medium text-gray-600">
                  Coming Soon
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <StatsCard
            title="Total Paid"
            value={(() => {
              // Check if we have any payout data in applications
              const totalPaid = applications.reduce((sum, app: any) => {
                if (app.payouts && app.payouts.length > 0) {
                  // Sum up payouts if available
                  return (
                    sum +
                    app.payouts.reduce((payoutSum: number, payout: any) => {
                      const amount = parseFloat(payout.value?.amount || "0");
                      return payoutSum + amount;
                    }, 0)
                  );
                }
                return sum;
              }, 0);
              return totalPaid > 0 ? formatCurrency(totalPaid) : "Coming soon";
            })()}
            description="Funds disbursed to projects"
            icon={CreditCard}
          />
          {(() => {
            const totalPaid = applications.reduce((sum, app: any) => {
              if (app.payouts && app.payouts.length > 0) {
                return (
                  sum +
                  app.payouts.reduce((payoutSum: number, payout: any) => {
                    const amount = parseFloat(payout.value?.amount || "0");
                    return payoutSum + amount;
                  }, 0)
                );
              }
              return sum;
            }, 0);
            return totalPaid === 0;
          })() && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 rounded-lg flex items-center justify-center backdrop-blur-xs">
              <div className="bg-white/90 px-3 py-1 rounded-full shadow-sm border border-gray-200">
                <span className="text-xs font-medium text-gray-600">
                  Coming Soon
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      {applications.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6">
            <FundingDistributionChart
              pools={pools}
              applications={applications}
            />
          </div>
          <ApplicationsVsFundingChart
            pools={pools}
            applications={applications}
          />
        </>
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
            {[...pools]
              .sort((a, b) => {
                // Use proper round number extraction from name, not ID
                return getRoundNumber(b) - getRoundNumber(a); // Latest rounds first (descending)
              })
              .map((pool) => (
                <GrantPoolCard
                  key={pool.id}
                  pool={pool}
                  applications={applications}
                />
              ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No grant rounds found
                </h3>
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
