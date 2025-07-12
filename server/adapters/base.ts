export interface DAOIP5System {
  "@context": string;
  name: string;
  type: string;
  grantPoolsURI?: string;
  projectsURI?: string;
  extensions?: Record<string, any>;
}

export interface DAOIP5GrantPool {
  type: "GrantPool";
  id: string;
  name: string;
  description: string;
  grantFundingMechanism: string;
  isOpen: boolean;
  closeDate?: string;
  applicationsURI?: string;
  governanceURI?: string;
  attestationIssuersURI?: string;
  requiredCredentials?: string[];
  totalGrantPoolSize?: Array<{
    amount: string;
    denomination: string;
  }>;
  email?: string;
  image?: string;
  coverImage?: string;
  extensions?: Record<string, any>;
}

export interface DAOIP5Project {
  type: "Project";
  id: string;
  name: string;
  description: string;
  contentURI?: string;
  email?: string;
  membersURI?: string;
  attestationIssuersURI?: string;
  relevantTo?: string[];
  image?: string;
  coverImage?: string;
  licenseURI?: string;
  socials?: Array<{
    name: string;
    value: string;
  }>;
  extensions?: Record<string, any>;
}

export interface DAOIP5Application {
  type: "GrantApplication";
  id: string;
  grantPoolId: string;
  grantPoolName?: string;
  projectId: string;
  projectName?: string;
  createdAt?: string;
  contentURI?: string;
  discussionsTo?: string;
  licenseURI?: string;
  isInactive?: boolean;
  applicationCompletionRate?: number;
  socials?: Array<{
    platform: string;
    url: string;
  }>;
  fundsAsked?: Array<{
    amount: string;
    denomination: string;
  }>;
  fundsAskedInUSD?: string;
  fundsApproved?: Array<{
    amount: string;
    denomination: string;
  }>;
  fundsApprovedInUSD?: string;
  payoutAddress?: {
    type: string;
    value: string;
  };
  status: "pending" | "in_review" | "approved" | "funded" | "rejected" | "completed";
  payouts?: Array<{
    type: string;
    value: any;
    proof?: string;
  }>;
  extensions?: Record<string, any>;
}

export interface QueryFilters {
  limit?: number;
  offset?: number;
  search?: string;
  category?: string;
  isOpen?: boolean;
  status?: string;
  poolId?: string;
  projectId?: string;
  mechanism?: string;
}

export abstract class BaseAdapter {
  protected systemName: string;
  protected baseUrl: string;

  constructor(systemName: string, baseUrl: string) {
    this.systemName = systemName;
    this.baseUrl = baseUrl;
  }

  // Transform address to CAIP-10 format
  protected toCaip10(address: string, chainId: string = "1"): string {
    if (!address) return "";
    return `eip155:${chainId}:${address}`;
  }

  // Format date to ISO 8601
  protected formatDate(date: string | Date): string {
    if (!date) return "";
    try {
      return new Date(date).toISOString();
    } catch {
      return "";
    }
  }

  // Transform currency amounts
  protected formatAmount(amount: number | string, fromCurrency: string = "ETH", toCurrency: string = "USD"): string {
    if (!amount) return "0";
    // This would normally include currency conversion logic
    return String(amount);
  }

  abstract getSystems(): Promise<DAOIP5System[]>;
  abstract getSystem(id: string): Promise<DAOIP5System | null>;
  abstract getPools(filters?: QueryFilters): Promise<DAOIP5GrantPool[]>;
  abstract getPool(id: string): Promise<DAOIP5GrantPool | null>;
  abstract getProjects(filters?: QueryFilters): Promise<DAOIP5Project[]>;
  abstract getProject(id: string): Promise<DAOIP5Project | null>;
  abstract getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]>;
  abstract getApplication(id: string): Promise<DAOIP5Application | null>;
}
