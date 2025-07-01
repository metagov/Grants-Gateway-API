export interface DAOIP5System {
  "@context": string;
  name: string;
  type: string;
  grantPoolsURI?: string;
  projectsURI?: string;
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
  totalGrantPoolSizeUSD?: string;
  email?: string;
  image?: string;
  coverImage?: string;
  epochMetadata?: {
    stakingProceeds?: string;
    totalEffectiveDeposit?: string;
    vanillaIndividualRewards?: string;
    operationalCost?: string;
    matchedRewards?: string;
    patronsRewards?: string;
    totalWithdrawals?: string;
    leftover?: string;
    ppf?: string;
    communityFund?: string;
  };
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
}

export interface DAOIP5Application {
  type: "Application";
  id: string;
  projectId: string;
  poolId: string;
  status: "pending" | "approved" | "rejected";
  submissionDate: string;
  requestedAmount?: Array<{
    amount: string;
    denomination: string;
  }>;
  approvedAmount?: Array<{
    amount: string;
    denomination: string;
  }>;
  applicationURI?: string;
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
