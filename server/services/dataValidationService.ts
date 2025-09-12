// Comprehensive data validation service for ensuring data accuracy and quality
import { z } from 'zod';
import { historicalPriceService } from './historicalPriceService.js';

// DAOIP-5 Schema Definitions
const GrantPoolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  grantFundingMechanism: z.string(),
  isOpen: z.boolean(),
  closeDate: z.string().optional(),
  totalGrantPoolSize: z.union([
    z.array(z.object({
      amount: z.string(),
      denomination: z.string()
    })),
    z.string(),
    z.number()
  ]),
  applicationsURI: z.string().optional(),
  extensions: z.record(z.any()).optional()
});

const GrantApplicationSchema = z.object({
  id: z.string().min(1),
  projectName: z.string().min(1),
  grantPoolId: z.string().min(1),
  status: z.string(),
  fundsApprovedInUSD: z.union([z.string(), z.number()]).optional(),
  createdAt: z.string().optional(),
  extensions: z.record(z.any()).optional()
});

const SystemMetricsSchema = z.object({
  totalFunding: z.number().min(0),
  totalApplications: z.number().min(0),
  totalPools: z.number().min(0),
  approvalRate: z.number().min(0).max(100),
  lastUpdated: z.string()
});

// Data Quality Metrics
interface DataQualityReport {
  systemId: string;
  timestamp: string;
  qualityScore: number; // 0-100
  issues: DataQualityIssue[];
  metrics: {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    missingFields: number;
    currencyConversionErrors: number;
  };
}

interface DataQualityIssue {
  type: 'validation_error' | 'missing_field' | 'currency_error' | 'duplicate' | 'inconsistency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  field?: string;
  message: string;
  recordId?: string;
}

class DataValidationService {
  private qualityReports = new Map<string, DataQualityReport>();

  // Validate grant pool data against DAOIP-5 schema
  async validateGrantPool(pool: any, systemId: string): Promise<{ isValid: boolean; errors: string[]; normalizedData?: any }> {
    const errors: string[] = [];
    
    try {
      // Schema validation
      const validatedPool = GrantPoolSchema.parse(pool);
      
      // Additional business logic validation
      const additionalValidation = await this.validatePoolBusinessLogic(validatedPool, systemId);
      
      if (additionalValidation.errors.length > 0) {
        errors.push(...additionalValidation.errors);
      }

      // Normalize currency amounts
      const normalizedPool = await this.normalizePoolCurrency(validatedPool);

      return {
        isValid: errors.length === 0,
        errors,
        normalizedData: normalizedPool
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
      } else {
        errors.push(`Validation error: ${error.message}`);
      }
      
      return { isValid: false, errors };
    }
  }

  // Validate grant application data
  async validateGrantApplication(app: any, systemId: string): Promise<{ isValid: boolean; errors: string[]; normalizedData?: any }> {
    const errors: string[] = [];
    
    try {
      const validatedApp = GrantApplicationSchema.parse(app);
      
      // Validate funding amount conversion
      if (validatedApp.fundsApprovedInUSD) {
        const fundingAmount = parseFloat(validatedApp.fundsApprovedInUSD.toString());
        if (isNaN(fundingAmount) || fundingAmount < 0) {
          errors.push('Invalid funding amount');
        }
      }

      // Validate status values
      const validStatuses = ['pending', 'approved', 'rejected', 'funded', 'completed', 'cancelled'];
      if (!validStatuses.includes(validatedApp.status.toLowerCase())) {
        errors.push(`Invalid status: ${validatedApp.status}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        normalizedData: validatedApp
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
      } else {
        errors.push(`Validation error: ${error.message}`);
      }
      
      return { isValid: false, errors };
    }
  }

  // Business logic validation for pools
  private async validatePoolBusinessLogic(pool: any, systemId: string): Promise<{ errors: string[] }> {
    const errors: string[] = [];

    // Validate close date
    if (pool.closeDate) {
      const closeDate = new Date(pool.closeDate);
      if (isNaN(closeDate.getTime())) {
        errors.push('Invalid close date format');
      }
    }

    // Validate funding mechanism
    const validMechanisms = ['Quadratic Funding', 'Direct Grants', 'Donations', 'Retroactive Funding'];
    if (!validMechanisms.includes(pool.grantFundingMechanism)) {
      errors.push(`Unknown funding mechanism: ${pool.grantFundingMechanism}`);
    }

    return { errors };
  }

  // Normalize currency amounts to USD
  private async normalizePoolCurrency(pool: any): Promise<any> {
    if (!pool.totalGrantPoolSize) return pool;

    let normalizedAmount = 0;

    if (Array.isArray(pool.totalGrantPoolSize)) {
      // Handle array format: [{ amount: "123", denomination: "ETH" }]
      for (const entry of pool.totalGrantPoolSize) {
        const amount = parseFloat(entry.amount) || 0;
        const currency = entry.denomination.toUpperCase();
        
        if (currency === 'USD') {
          normalizedAmount += amount;
        } else {
          // Convert to USD using historical price if close date available
          const conversionDate = pool.closeDate || new Date().toISOString();
          const usdAmount = await historicalPriceService.convertToUSD(amount, currency, conversionDate);
          if (usdAmount !== null) {
            normalizedAmount += usdAmount;
          }
        }
      }
    } else if (typeof pool.totalGrantPoolSize === 'string') {
      normalizedAmount = parseFloat(pool.totalGrantPoolSize) || 0;
    } else if (typeof pool.totalGrantPoolSize === 'number') {
      normalizedAmount = pool.totalGrantPoolSize;
    }

    return {
      ...pool,
      totalGrantPoolSizeUSD: normalizedAmount
    };
  }

  // Generate data quality report for a system
  async generateQualityReport(systemId: string, pools: any[], applications: any[]): Promise<DataQualityReport> {
    const issues: DataQualityIssue[] = [];
    let validRecords = 0;
    let invalidRecords = 0;
    let missingFields = 0;
    let currencyConversionErrors = 0;

    // Validate pools
    for (const pool of pools) {
      const validation = await this.validateGrantPool(pool, systemId);
      if (validation.isValid) {
        validRecords++;
      } else {
        invalidRecords++;
        validation.errors.forEach(error => {
          issues.push({
            type: 'validation_error',
            severity: 'medium',
            message: error,
            recordId: pool.id
          });
        });
      }
    }

    // Validate applications
    for (const app of applications) {
      const validation = await this.validateGrantApplication(app, systemId);
      if (validation.isValid) {
        validRecords++;
      } else {
        invalidRecords++;
        validation.errors.forEach(error => {
          issues.push({
            type: 'validation_error',
            severity: 'medium',
            message: error,
            recordId: app.id
          });
        });
      }
    }

    const totalRecords = pools.length + applications.length;
    const qualityScore = totalRecords > 0 ? Math.round((validRecords / totalRecords) * 100) : 0;

    const report: DataQualityReport = {
      systemId,
      timestamp: new Date().toISOString(),
      qualityScore,
      issues,
      metrics: {
        totalRecords,
        validRecords,
        invalidRecords,
        missingFields,
        currencyConversionErrors
      }
    };

    this.qualityReports.set(systemId, report);
    return report;
  }

  // Get quality report for a system
  getQualityReport(systemId: string): DataQualityReport | null {
    return this.qualityReports.get(systemId) || null;
  }

  // Get all quality reports
  getAllQualityReports(): DataQualityReport[] {
    return Array.from(this.qualityReports.values());
  }
}

export const dataValidationService = new DataValidationService();
export { DataQualityReport, DataQualityIssue };
