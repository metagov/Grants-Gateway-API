// Optimized React hooks for analytics data with efficient caching and memoization
import { useQuery, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { 
  analyticsDataService, 
  type CrossSystemAnalytics, 
  type SystemData,
  type SystemComparison,
  type MechanismAnalysis,
  type TrendData,
  type DiversityMetrics
} from "./analytics-data-service";

// Main hook for cross-system analytics with optimized caching
export function useCrossSystemAnalytics() {
  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['cross-system-analytics'],
    queryFn: () => analyticsDataService.getCrossSystemAnalytics(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  // Memoized derived data to prevent unnecessary recalculations
  const derivedData = useMemo(() => {
    if (!analytics) return null;

    const topSystems = analytics.comparisons
      .sort((a, b) => b.metrics.totalFunding - a.metrics.totalFunding)
      .slice(0, 5);

    const mechanismStats = analytics.mechanisms
      .sort((a, b) => b.totalFunding - a.totalFunding);

    const growthMetrics = analytics.trends.map(trend => ({
      period: trend.period,
      totalFunding: trend.totals.funding,
      totalApplications: trend.totals.applications,
      systemCount: trend.systems.length
    }));

    const healthScore = calculateEcosystemHealth(analytics);

    return {
      topSystems,
      mechanismStats,
      growthMetrics,
      healthScore
    };
  }, [analytics]);

  return {
    analytics,
    derivedData,
    isLoading,
    error,
    refetch,
    // Helper functions
    getSystemByName: (name: string) => analytics?.systems.find(s => s.name === name),
    getSystemRank: (systemName: string, metric: keyof SystemComparison['rank']) => 
      analytics?.comparisons.find(c => c.systemName === systemName)?.rank[metric],
    isStale: analyticsDataService.needsRefresh()
  };
}

// Hook for individual system data with background refresh
export function useSystemData(systemId?: string) {
  const { data: allSystems, isLoading } = useQuery({
    queryKey: ['analytics-system-data'],
    queryFn: () => analyticsDataService.loadAllSystemData(),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.systems
  });

  const systemData = useMemo(() => {
    if (!allSystems || !systemId) return undefined;
    return allSystems.get(systemId);
  }, [allSystems, systemId]);

  return {
    system: systemData,
    allSystems: allSystems ? Array.from(allSystems.values()) : [],
    isLoading,
    exists: !!systemData
  };
}

// Hook for comparative metrics between systems
export function useSystemComparison(systemIds: string[]) {
  const { analytics } = useCrossSystemAnalytics();

  const comparisonData = useMemo(() => {
    if (!analytics || systemIds.length === 0) return null;

    const systems = systemIds
      .map(id => analytics.systems.find(s => s.id === id))
      .filter(Boolean) as SystemData[];

    if (systems.length === 0) return null;

    // Calculate comparative metrics
    const metrics = {
      funding: {
        values: systems.map(s => s.metrics.totalFunding),
        leader: systems.reduce((max, s) => 
          s.metrics.totalFunding > max.metrics.totalFunding ? s : max
        ),
        total: systems.reduce((sum, s) => sum + s.metrics.totalFunding, 0)
      },
      applications: {
        values: systems.map(s => s.metrics.totalApplications),
        leader: systems.reduce((max, s) => 
          s.metrics.totalApplications > max.metrics.totalApplications ? s : max
        ),
        total: systems.reduce((sum, s) => sum + s.metrics.totalApplications, 0)
      },
      approvalRate: {
        values: systems.map(s => s.metrics.approvalRate),
        leader: systems.reduce((max, s) => 
          s.metrics.approvalRate > max.metrics.approvalRate ? s : max
        ),
        average: systems.reduce((sum, s) => sum + s.metrics.approvalRate, 0) / systems.length
      }
    };

    // Calculate efficiency scores (funding per approved application)
    const efficiencyScores = systems.map(system => {
      const approvedApps = Math.floor(system.metrics.totalApplications * system.metrics.approvalRate / 100);
      return {
        systemName: system.name,
        efficiency: approvedApps > 0 ? system.metrics.totalFunding / approvedApps : 0,
        approvedApps
      };
    });

    return {
      systems,
      metrics,
      efficiencyScores: efficiencyScores.sort((a, b) => a.efficiency - b.efficiency),
      diversity: {
        mechanisms: Array.from(new Set(systems.flatMap(s => s.fundingMechanisms))),
        sources: Array.from(new Set(systems.map(s => s.source))),
        avgCompatibility: systems.reduce((sum, s) => sum + s.compatibility, 0) / systems.length
      }
    };
  }, [analytics, systemIds]);

  return comparisonData;
}

// Hook for funding mechanism analysis
export function useFundingMechanisms() {
  const { analytics, isLoading } = useCrossSystemAnalytics();

  const mechanismData = useMemo(() => {
    if (!analytics) return null;

    const mechanisms = analytics.mechanisms.map(mechanism => ({
      ...mechanism,
      efficiency: mechanism.totalApplications > 0 ? mechanism.totalFunding / mechanism.totalApplications : 0,
      systemCount: mechanism.systems.length
    }));

    // Group by efficiency and market share
    const categories = {
      highVolume: mechanisms.filter(m => m.marketShare > 0.2),
      emerging: mechanisms.filter(m => m.marketShare < 0.1 && m.totalApplications > 0),
      efficient: mechanisms.filter(m => m.avgApprovalRate > 70),
      diverse: mechanisms.filter(m => m.systemCount > 2)
    };

    return {
      all: mechanisms,
      categories,
      totalMechanisms: mechanisms.length,
      dominantMechanism: mechanisms.reduce((max, m) => m.marketShare > max.marketShare ? m : max)
    };
  }, [analytics]);

  return {
    mechanisms: mechanismData,
    isLoading
  };
}

// Hook for trend analysis with performance optimization
export function useFundingTrends(timeframe: 'quarterly' | 'yearly' = 'quarterly') {
  const { analytics, isLoading } = useCrossSystemAnalytics();

  const trendData = useMemo(() => {
    if (!analytics) return null;

    let trends = analytics.trends;
    
    // Aggregate yearly if requested
    if (timeframe === 'yearly') {
      const yearlyMap = new Map<string, TrendData>();
      
      trends.forEach(trend => {
        const year = trend.period.split('-')[0];
        if (!yearlyMap.has(year)) {
          yearlyMap.set(year, {
            period: year,
            systems: trend.systems.map(s => ({ ...s, funding: 0, applications: 0 })),
            totals: { funding: 0, applications: 0 }
          });
        }
        
        const yearData = yearlyMap.get(year)!;
        trend.systems.forEach((system, index) => {
          yearData.systems[index].funding += system.funding;
          yearData.systems[index].applications += system.applications;
        });
        yearData.totals.funding += trend.totals.funding;
        yearData.totals.applications += trend.totals.applications;
      });
      
      trends = Array.from(yearlyMap.values());
    }

    // Calculate growth rates
    const growthRates = trends.map((trend, index) => {
      if (index === 0) return { ...trend, growthRate: 0 };
      
      const previous = trends[index - 1];
      const growthRate = previous.totals.funding > 0 
        ? ((trend.totals.funding - previous.totals.funding) / previous.totals.funding) * 100
        : 0;
      
      return { ...trend, growthRate };
    });

    return {
      trends: growthRates,
      totalGrowth: growthRates.length > 1 ? growthRates[growthRates.length - 1].growthRate : 0,
      averageGrowth: growthRates.reduce((sum, t) => sum + (t as any).growthRate, 0) / Math.max(growthRates.length - 1, 1),
      peakPeriod: growthRates.reduce((max, t) => t.totals.funding > max.totals.funding ? t : max)
    };
  }, [analytics, timeframe]);

  return {
    trends: trendData,
    isLoading
  };
}

// Hook for ecosystem diversity metrics
export function useEcosystemDiversity() {
  const { analytics, isLoading } = useCrossSystemAnalytics();

  const diversityAnalysis = useMemo(() => {
    if (!analytics) return null;

    const diversity = analytics.diversity;
    
    // Calculate diversity score (0-100)
    const diversityScore = Math.round(
      (diversity.fundingConcentration * 30) + 
      (Math.min(diversity.mechanismDiversity / 5, 1) * 25) +
      (Math.min(diversity.activeSystems / 10, 1) * 25) +
      (diversity.completionRate * 20)
    );

    // Risk assessment
    const risks = [];
    if (diversity.fundingConcentration < 0.5) risks.push('High funding concentration');
    if (diversity.mechanismDiversity < 3) risks.push('Limited mechanism diversity');
    if (diversity.activeSystems < 5) risks.push('Few active systems');
    if (diversity.completionRate < 0.7) risks.push('Incomplete data coverage');

    return {
      ...diversity,
      diversityScore,
      riskLevel: risks.length > 2 ? 'high' : risks.length > 0 ? 'medium' : 'low',
      risks,
      recommendations: generateDiversityRecommendations(diversity, risks)
    };
  }, [analytics]);

  return {
    diversity: diversityAnalysis,
    isLoading
  };
}

// Helper function to calculate ecosystem health score
function calculateEcosystemHealth(analytics: CrossSystemAnalytics): number {
  const { totals, diversity, comparisons } = analytics;
  
  // Weighted health factors (0-100)
  const factors = {
    volume: Math.min(totals.funding / 10000000, 1) * 25, // Up to $10M = 25 points
    participation: Math.min(totals.applications / 1000, 1) * 20, // Up to 1000 apps = 20 points
    efficiency: Math.min(totals.avgApprovalRate / 100, 1) * 20, // Approval rate = 20 points
    diversity: diversity.fundingConcentration * 15, // Distribution = 15 points
    growth: Math.min(comparisons.reduce((sum, c) => sum + c.metrics.monthlyTrend, 0) / comparisons.length / 10, 1) * 20 // Growth trend = 20 points
  };
  
  return Math.round(Object.values(factors).reduce((sum, factor) => sum + factor, 0));
}

// Helper function to generate diversity recommendations
function generateDiversityRecommendations(diversity: DiversityMetrics, risks: string[]): string[] {
  const recommendations = [];
  
  if (risks.includes('High funding concentration')) {
    recommendations.push('Encourage more distributed funding across systems');
  }
  if (risks.includes('Limited mechanism diversity')) {
    recommendations.push('Explore integration of additional funding mechanisms');
  }
  if (risks.includes('Few active systems')) {
    recommendations.push('Onboard more grant systems to increase ecosystem coverage');
  }
  if (risks.includes('Incomplete data coverage')) {
    recommendations.push('Improve data collection and API integrations');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Maintain current diversity levels and monitor for changes');
  }
  
  return recommendations;
}