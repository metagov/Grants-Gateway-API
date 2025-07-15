import { Express, Request, Response } from 'express';
import { BaseAdapter } from '../adapters/base';
import { OctantAdapter } from '../adapters/octant';
import { GivethAdapter } from '../adapters/giveth';
import { QuestbookAdapter } from '../adapters/questbook';

interface AuthenticatedRequest extends Request {
  user?: any;
}

interface DashboardMetrics {
  totalFunding: {
    usd: number;
    eth: number;
  };
  totalProjects: number;
  totalApplications: number;
  activePools: number;
  grantSystems: number;
  fundingBySystem: Array<{
    name: string;
    amount: number;
    color: string;
  }>;
  fundingTrends: Array<{
    date: string;
    amount: number;
    applications: number;
  }>;
  topProjects: Array<{
    name: string;
    funding: number;
    system: string;
  }>;
  poolMetrics: Array<{
    system: string;
    pools: number;
    avgSize: number;
    successRate: number;
  }>;
}

export function registerAnalyticsRoutes(app: Express) {
  const adapters: { [key: string]: BaseAdapter } = {
    octant: new OctantAdapter(),
    giveth: new GivethAdapter(),
    questbook: new QuestbookAdapter(),
  };

  app.get('/api/v1/analytics/dashboard', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { system, timeRange } = req.query;
      const selectedAdapters = system && system !== 'all' 
        ? { [system as string]: adapters[system as string] }
        : adapters;

      // Aggregate data from all selected adapters
      const allPools = [];
      const allProjects = [];
      const allApplications = [];
      const systemMetrics = [];

      for (const [systemName, adapter] of Object.entries(selectedAdapters)) {
        try {
          const [pools, projects, applications] = await Promise.all([
            adapter.getGrantPools(),
            adapter.getProjects(),
            adapter.getApplications()
          ]);

          allPools.push(...pools.map(p => ({ ...p, system: systemName })));
          allProjects.push(...projects.map(p => ({ ...p, system: systemName })));
          allApplications.push(...applications.map(a => ({ ...a, system: systemName })));

          // Calculate system-specific metrics
          const totalFunding = pools.reduce((sum, pool) => {
            return sum + (pool.totalGrantPoolSize?.[0]?.amount ? parseFloat(pool.totalGrantPoolSize[0].amount) : 0);
          }, 0);

          systemMetrics.push({
            system: systemName,
            pools: pools.length,
            projects: projects.length,
            applications: applications.length,
            totalFunding,
          });
        } catch (error) {
          console.error(`Error fetching data from ${systemName}:`, error);
        }
      }

      // Calculate total funding
      const totalFundingETH = allPools.reduce((sum, pool) => {
        return sum + (pool.totalGrantPoolSize?.[0]?.amount ? parseFloat(pool.totalGrantPoolSize[0].amount) : 0);
      }, 0);

      // Rough ETH to USD conversion (should use real exchange rate)
      const ethToUSD = 3000; // Placeholder - should fetch from API
      const totalFundingUSD = totalFundingETH * ethToUSD;

      // Funding by system
      const fundingBySystem = systemMetrics.map((metric, index) => ({
        name: metric.system.charAt(0).toUpperCase() + metric.system.slice(1),
        amount: metric.totalFunding * ethToUSD,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'][index % 4]
      }));

      // Generate sample funding trends (should use real historical data)
      const fundingTrends = generateSampleTrends(timeRange as string, totalFundingUSD, allApplications.length);

      // Top projects by funding
      const topProjects = allProjects
        .map(project => ({
          name: project.name || 'Unnamed Project',
          funding: Math.random() * 100000, // Placeholder - should calculate from actual funding data
          system: project.system
        }))
        .sort((a, b) => b.funding - a.funding)
        .slice(0, 10);

      // Pool metrics by system
      const poolMetrics = systemMetrics.map(metric => ({
        system: metric.system,
        pools: metric.pools,
        avgSize: metric.pools > 0 ? (metric.totalFunding * ethToUSD) / metric.pools : 0,
        successRate: metric.applications > 0 ? Math.round((metric.applications * 0.3) * 100) : 0 // Placeholder calculation
      }));

      const dashboardData: DashboardMetrics = {
        totalFunding: {
          usd: totalFundingUSD,
          eth: totalFundingETH
        },
        totalProjects: allProjects.length,
        totalApplications: allApplications.length,
        activePools: allPools.filter(pool => pool.isOpen).length,
        grantSystems: Object.keys(selectedAdapters).length,
        fundingBySystem,
        fundingTrends,
        topProjects,
        poolMetrics
      };

      res.json(dashboardData);
    } catch (error) {
      console.error('Analytics dashboard error:', error);
      res.status(500).json({ error: 'Failed to generate dashboard analytics' });
    }
  });

  app.get('/api/v1/analytics/system/:systemName', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { systemName } = req.params;
      const adapter = adapters[systemName];

      if (!adapter) {
        return res.status(404).json({ error: 'Grant system not found' });
      }

      const [systems, pools, projects, applications] = await Promise.all([
        adapter.getGrantSystems(),
        adapter.getGrantPools(),
        adapter.getProjects(),
        adapter.getApplications()
      ]);

      const analytics = {
        system: systemName,
        overview: {
          pools: pools.length,
          projects: projects.length,
          applications: applications.length,
          totalFunding: pools.reduce((sum, pool) => {
            return sum + (pool.totalGrantPoolSize?.[0]?.amount ? parseFloat(pool.totalGrantPoolSize[0].amount) : 0);
          }, 0)
        },
        pools: pools.map(pool => ({
          id: pool.id,
          name: pool.name,
          funding: pool.totalGrantPoolSize?.[0]?.amount || '0',
          isOpen: pool.isOpen,
          applicationCount: applications.filter(app => app.grantPoolId === pool.id).length
        })),
        recentActivity: applications
          .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
          .slice(0, 10)
          .map(app => ({
            type: 'application',
            projectName: app.projectName,
            poolName: pools.find(p => p.id === app.grantPoolId)?.name || 'Unknown Pool',
            date: app.createdAt,
            amount: app.fundsApproved || '0'
          }))
      };

      res.json(analytics);
    } catch (error) {
      console.error(`System analytics error for ${req.params.systemName}:`, error);
      res.status(500).json({ error: 'Failed to generate system analytics' });
    }
  });
}

function generateSampleTrends(timeRange: string, totalFunding: number, totalApplications: number) {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
  const trends = [];
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    trends.push({
      date: date.toISOString().split('T')[0],
      amount: Math.round(totalFunding * (0.5 + Math.random() * 0.5) / days),
      applications: Math.round(totalApplications * (0.5 + Math.random() * 0.5) / days)
    });
  }
  
  return trends;
}