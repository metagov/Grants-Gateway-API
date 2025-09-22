// Cross-system analysis utilities for DAOIP-5 standardized data
import { dashboardApi } from './dashboard-api';

export interface SystemComparisonData {
  systemName: string;
  totalFunding: number;
  totalApplications: number;
  approvalRate: number;
  totalPools: number;
  averageFundingPerProject: number;
  fundingMechanisms: string[];
  status: 'active' | 'inactive';
  source: 'opengrants' | 'daoip5' | 'unknown';
}

export interface FundingTrend {
  period: string;
  systemName: string;
  funding: number;
  applications: number;
}

export interface ProjectOverlap {
  projectName: string;
  systems: string[];
  totalFunding: number;
  applications: Array<{
    system: string;
    poolName: string;
    status: string;
    funding: number;
  }>;
}

export interface FundingMechanismAnalysis {
  mechanism: string;
  systems: string[];
  totalFunding: number;
  totalApplications: number;
  averageApprovalRate: number;
}

// Get comprehensive cross-system comparison data
export async function getCrossSystemComparison(): Promise<SystemComparisonData[]> {
  try {
    const systems = await dashboardApi.getAllSystems();
    
    return systems.map(system => ({
      systemName: system.name,
      totalFunding: system.totalFunding || 0,
      totalApplications: system.totalApplications || 0,
      approvalRate: system.approvalRate || 0,
      totalPools: system.totalPools || 0,
      averageFundingPerProject: (system.totalApplications || 0) > 0 ? 
        (system.totalFunding || 0) / (system.totalApplications || 0) : 0,
      fundingMechanisms: [], // Will be populated from detailed data
      status: (system.totalPools || 0) > 0 ? 'active' : 'inactive',
      source: (system.source || 'unknown') as 'opengrants' | 'daoip5' | 'unknown'
    })) as SystemComparisonData[];
  } catch (error) {
    console.error('Error in cross-system comparison:', error);
    return [];
  }
}

// Analyze funding mechanisms across systems
export async function getFundingMechanismAnalysis(): Promise<FundingMechanismAnalysis[]> {
  try {
    const systems = await dashboardApi.getAllSystems();
    const mechanismMap = new Map<string, {
      systems: Set<string>;
      totalFunding: number;
      totalApplications: number;
      approvalRates: number[];
    }>();

    // For now, use known funding mechanisms based on system types
    const knownMechanisms: Record<string, string[]> = {
      'octant': ['Quadratic Funding'],
      'giveth': ['Donations', 'Quadratic Funding'],
      'stellar': ['Direct Grants'],
      'optimism': ['Retroactive Public Goods'],
      'arbitrumfoundation': ['Direct Grants'],
      'celopg': ['Direct Grants']
    };

    systems.forEach(system => {
      const mechanisms = knownMechanisms[system.name.toLowerCase()] || ['Direct Grants'];
      
      mechanisms.forEach((mechanism: string) => {
        if (!mechanismMap.has(mechanism)) {
          mechanismMap.set(mechanism, {
            systems: new Set(),
            totalFunding: 0,
            totalApplications: 0,
            approvalRates: []
          });
        }
        
        const data = mechanismMap.get(mechanism)!;
        data.systems.add(system.name);
        data.totalFunding += system.totalFunding || 0;
        data.totalApplications += system.totalApplications || 0;
        if (system.approvalRate) data.approvalRates.push(system.approvalRate);
      });
    });

    return Array.from(mechanismMap.entries()).map(([mechanism, data]) => ({
      mechanism,
      systems: Array.from(data.systems),
      totalFunding: data.totalFunding,
      totalApplications: data.totalApplications,
      averageApprovalRate: data.approvalRates.length > 0 ? 
        data.approvalRates.reduce((sum, rate) => sum + rate, 0) / data.approvalRates.length : 0
    }));
  } catch (error) {
    console.error('Error in funding mechanism analysis:', error);
    return [];
  }
}

// Analyze project overlaps across systems
export async function getProjectOverlaps(): Promise<ProjectOverlap[]> {
  try {
    // This would require cross-referencing project names/IDs across systems
    // For now, return a simulated analysis based on common project patterns
    const overlaps: ProjectOverlap[] = [];
    
    // In a real implementation, this would:
    // 1. Fetch all applications from all systems
    // 2. Match projects by name, description, or cross-platform identifiers
    // 3. Calculate overlap statistics
    
    return overlaps;
  } catch (error) {
    console.error('Error analyzing project overlaps:', error);
    return [];
  }
}

// Get funding trends over time across systems
export async function getFundingTrendsComparison(): Promise<FundingTrend[]> {
  try {
    const systems = await dashboardApi.getAllSystems();
    const trends: FundingTrend[] = [];
    
    // Generate quarterly trends for each system
    const quarters = ['2023-Q4', '2024-Q1', '2024-Q2', '2024-Q3', '2024-Q4'];
    
    systems.forEach(system => {
      quarters.forEach((quarter, index) => {
        // Simulate trend data - in real implementation, this would be based on actual timestamps
        const baseAmount = system.totalFunding || 0;
        const randomFactor = 0.7 + (Math.random() * 0.6); // 0.7 to 1.3
        
        trends.push({
          period: quarter,
          systemName: system.name,
          funding: Math.floor(baseAmount * randomFactor / quarters.length),
          applications: Math.floor((system.totalApplications || 0) / quarters.length * randomFactor)
        });
      });
    });
    
    return trends;
  } catch (error) {
    console.error('Error generating funding trends:', error);
    return [];
  }
}

// Calculate ecosystem diversity metrics
export async function getEcosystemDiversity(): Promise<{
  fundingConcentration: number; // Gini coefficient-like metric
  systemDiversity: number; // Number of active systems
  mechanismDiversity: number; // Number of different funding mechanisms
  geographicDistribution: { region: string; systems: number; funding: number }[];
}> {
  try {
    const systems = await dashboardApi.getAllSystems();
    const mechanisms = await getFundingMechanismAnalysis();
    
    // Calculate funding concentration (simple version)
    const totalFunding = systems.reduce((sum, s) => sum + (s.totalFunding || 0), 0);
    const fundingPercentages = systems.map(s => (s.totalFunding || 0) / totalFunding);
    const fundingConcentration = fundingPercentages.reduce((sum, p) => sum + p * p, 0);
    
    return {
      fundingConcentration: 1 - fundingConcentration, // Higher = more distributed
      systemDiversity: systems.filter(s => (s.totalApplications || 0) > 0).length,
      mechanismDiversity: mechanisms.length,
      geographicDistribution: [
        { region: 'Global', systems: systems.length, funding: totalFunding }
      ]
    };
  } catch (error) {
    console.error('Error calculating ecosystem diversity:', error);
    return {
      fundingConcentration: 0,
      systemDiversity: 0,
      mechanismDiversity: 0,
      geographicDistribution: []
    };
  }
}