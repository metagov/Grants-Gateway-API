// Persistent data storage service for accurate grant data computation and storage
import { db } from '../db.js';
import { dataValidationService } from './dataValidationService.js';
import { historicalPriceService } from './historicalPriceService.js';

// Database schema interfaces
interface StoredGrantPool {
  id: string;
  system_id: string;
  name: string;
  description?: string;
  funding_mechanism: string;
  is_open: boolean;
  close_date?: string;
  total_funding_usd: number;
  total_applications: number;
  raw_data: any;
  created_at: string;
  updated_at: string;
  data_quality_score: number;
}

interface StoredGrantApplication {
  id: string;
  system_id: string;
  pool_id: string;
  project_name: string;
  status: string;
  funding_usd: number;
  created_at: string;
  updated_at: string;
  raw_data: any;
  data_quality_score: number;
}

interface StoredSystemMetrics {
  system_id: string;
  total_funding: number;
  total_applications: number;
  total_pools: number;
  approval_rate: number;
  data_quality_score: number;
  last_updated: string;
  computation_details: any;
}

class DataStorageService {
  // Store validated and normalized grant pools
  async storeGrantPools(systemId: string, pools: any[]): Promise<{ stored: number; errors: string[] }> {
    const errors: string[] = [];
    let stored = 0;

    for (const pool of pools) {
      try {
        // Validate and normalize the pool data
        const validation = await dataValidationService.validateGrantPool(pool, systemId);
        
        if (!validation.isValid) {
          errors.push(`Pool ${pool.id}: ${validation.errors.join(', ')}`);
          continue;
        }

        const normalizedPool = validation.normalizedData;
        
        // Calculate accurate USD funding amount
        const fundingUSD = await this.calculatePoolFundingUSD(normalizedPool);
        
        const storedPool: StoredGrantPool = {
          id: normalizedPool.id,
          system_id: systemId,
          name: normalizedPool.name,
          description: normalizedPool.description,
          funding_mechanism: normalizedPool.grantFundingMechanism,
          is_open: normalizedPool.isOpen,
          close_date: normalizedPool.closeDate,
          total_funding_usd: fundingUSD,
          total_applications: 0, // Will be updated when applications are stored
          raw_data: pool,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          data_quality_score: validation.errors.length === 0 ? 100 : 75
        };

        // Store in database (using a simple in-memory store for now)
        await this.upsertGrantPool(storedPool);
        stored++;
        
      } catch (error) {
        errors.push(`Pool ${pool.id}: ${error.message}`);
      }
    }

    return { stored, errors };
  }

  // Store validated and normalized grant applications
  async storeGrantApplications(systemId: string, applications: any[]): Promise<{ stored: number; errors: string[] }> {
    const errors: string[] = [];
    let stored = 0;

    for (const app of applications) {
      try {
        // Validate and normalize the application data
        const validation = await dataValidationService.validateGrantApplication(app, systemId);
        
        if (!validation.isValid) {
          errors.push(`Application ${app.id}: ${validation.errors.join(', ')}`);
          continue;
        }

        const normalizedApp = validation.normalizedData;
        
        // Calculate accurate USD funding amount
        const fundingUSD = await this.calculateApplicationFundingUSD(normalizedApp);
        
        const storedApp: StoredGrantApplication = {
          id: normalizedApp.id,
          system_id: systemId,
          pool_id: normalizedApp.grantPoolId,
          project_name: normalizedApp.projectName,
          status: normalizedApp.status.toLowerCase(),
          funding_usd: fundingUSD,
          created_at: normalizedApp.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          raw_data: app,
          data_quality_score: validation.errors.length === 0 ? 100 : 75
        };

        // Store in database
        await this.upsertGrantApplication(storedApp);
        stored++;
        
      } catch (error) {
        errors.push(`Application ${app.id}: ${error.message}`);
      }
    }

    // Update pool application counts
    await this.updatePoolApplicationCounts(systemId);

    return { stored, errors };
  }

  // Calculate accurate USD funding for pools
  private async calculatePoolFundingUSD(pool: any): Promise<number> {
    if (pool.totalGrantPoolSizeUSD) {
      return pool.totalGrantPoolSizeUSD;
    }

    if (!pool.totalGrantPoolSize) return 0;

    let totalUSD = 0;

    if (Array.isArray(pool.totalGrantPoolSize)) {
      for (const entry of pool.totalGrantPoolSize) {
        const amount = parseFloat(entry.amount) || 0;
        const currency = entry.denomination.toUpperCase();
        
        if (currency === 'USD') {
          totalUSD += amount;
        } else if (currency === 'ETH' && entry.amount.length > 10) {
          // Handle Wei amounts (very large numbers)
          const ethAmount = parseInt(entry.amount) / 1e18;
          const conversionDate = pool.closeDate || new Date().toISOString();
          const usdAmount = await historicalPriceService.convertToUSD(ethAmount, 'ETH', conversionDate);
          if (usdAmount !== null) {
            totalUSD += usdAmount;
          }
        } else {
          // Handle regular token amounts
          const conversionDate = pool.closeDate || new Date().toISOString();
          const usdAmount = await historicalPriceService.convertToUSD(amount, currency, conversionDate);
          if (usdAmount !== null) {
            totalUSD += usdAmount;
          }
        }
      }
    } else if (typeof pool.totalGrantPoolSize === 'string') {
      totalUSD = parseFloat(pool.totalGrantPoolSize) || 0;
    } else if (typeof pool.totalGrantPoolSize === 'number') {
      totalUSD = pool.totalGrantPoolSize;
    }

    return totalUSD;
  }

  // Calculate accurate USD funding for applications
  private async calculateApplicationFundingUSD(app: any): Promise<number> {
    if (!app.fundsApprovedInUSD) return 0;
    
    const amount = parseFloat(app.fundsApprovedInUSD.toString());
    return isNaN(amount) ? 0 : amount;
  }

  // Compute accurate system metrics
  async computeSystemMetrics(systemId: string): Promise<StoredSystemMetrics> {
    const pools = await this.getStoredGrantPools(systemId);
    const applications = await this.getStoredGrantApplications(systemId);

    const totalFunding = pools.reduce((sum, pool) => sum + pool.total_funding_usd, 0);
    const totalApplications = applications.length;
    const totalPools = pools.length;
    
    // Calculate approval rate from actual application statuses
    const approvedStatuses = ['approved', 'funded', 'completed'];
    const approvedApplications = applications.filter(app => 
      approvedStatuses.includes(app.status.toLowerCase())
    ).length;
    const approvalRate = totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0;

    // Calculate overall data quality score
    const allRecords = [...pools, ...applications];
    const avgQualityScore = allRecords.length > 0 
      ? allRecords.reduce((sum, record) => sum + record.data_quality_score, 0) / allRecords.length 
      : 0;

    const metrics: StoredSystemMetrics = {
      system_id: systemId,
      total_funding: totalFunding,
      total_applications: totalApplications,
      total_pools: totalPools,
      approval_rate: approvalRate,
      data_quality_score: avgQualityScore,
      last_updated: new Date().toISOString(),
      computation_details: {
        pools_analyzed: totalPools,
        applications_analyzed: totalApplications,
        approved_applications: approvedApplications,
        currency_conversions_performed: pools.filter(p => p.total_funding_usd > 0).length
      }
    };

    await this.upsertSystemMetrics(metrics);
    return metrics;
  }

  // Get ecosystem-wide accurate statistics
  async getEcosystemStats(): Promise<{
    totalFunding: number;
    totalApplications: number;
    totalSystems: number;
    totalPools: number;
    averageApprovalRate: number;
    averageDataQuality: number;
    lastUpdated: string;
  }> {
    const allSystems = await this.getAllSystemMetrics();
    
    const totalFunding = allSystems.reduce((sum, system) => sum + system.total_funding, 0);
    const totalApplications = allSystems.reduce((sum, system) => sum + system.total_applications, 0);
    const totalPools = allSystems.reduce((sum, system) => sum + system.total_pools, 0);
    const averageApprovalRate = allSystems.length > 0 
      ? allSystems.reduce((sum, system) => sum + system.approval_rate, 0) / allSystems.length 
      : 0;
    const averageDataQuality = allSystems.length > 0 
      ? allSystems.reduce((sum, system) => sum + system.data_quality_score, 0) / allSystems.length 
      : 0;

    return {
      totalFunding,
      totalApplications,
      totalSystems: allSystems.length,
      totalPools,
      averageApprovalRate,
      averageDataQuality,
      lastUpdated: new Date().toISOString()
    };
  }

  // Database operations (simplified in-memory implementation)
  private grantPools = new Map<string, StoredGrantPool>();
  private grantApplications = new Map<string, StoredGrantApplication>();
  private systemMetrics = new Map<string, StoredSystemMetrics>();

  private async upsertGrantPool(pool: StoredGrantPool): Promise<void> {
    this.grantPools.set(pool.id, pool);
  }

  private async upsertGrantApplication(app: StoredGrantApplication): Promise<void> {
    this.grantApplications.set(app.id, app);
  }

  private async upsertSystemMetrics(metrics: StoredSystemMetrics): Promise<void> {
    this.systemMetrics.set(metrics.system_id, metrics);
  }

  private async getStoredGrantPools(systemId: string): Promise<StoredGrantPool[]> {
    return Array.from(this.grantPools.values()).filter(pool => pool.system_id === systemId);
  }

  private async getStoredGrantApplications(systemId: string): Promise<StoredGrantApplication[]> {
    return Array.from(this.grantApplications.values()).filter(app => app.system_id === systemId);
  }

  private async getAllSystemMetrics(): Promise<StoredSystemMetrics[]> {
    return Array.from(this.systemMetrics.values());
  }

  private async updatePoolApplicationCounts(systemId: string): Promise<void> {
    const pools = await this.getStoredGrantPools(systemId);
    const applications = await this.getStoredGrantApplications(systemId);

    for (const pool of pools) {
      const poolApplications = applications.filter(app => app.pool_id === pool.id);
      pool.total_applications = poolApplications.length;
      pool.updated_at = new Date().toISOString();
      await this.upsertGrantPool(pool);
    }
  }
}

export const dataStorageService = new DataStorageService();
export { StoredGrantPool, StoredGrantApplication, StoredSystemMetrics };
