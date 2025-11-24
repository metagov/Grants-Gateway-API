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
  grantFundingMechanism: 
    | "Direct Grants"
    | "Quadratic Funding" 
    | "Streaming Quadratic Funding"
    | "Retro Funding"
    | "Conviction Voting"
    | "Self-Curated Registries"
    | "Gift Circles"
    | "Social Media-Based Capital Allocation"
    | "Futarchy"
    | "Assurance Contracts"
    | "Cookie Jar"
    | "Impact Attestations"
    | "Stokvel"
    | "Request for Proposal (RFP)"
    | "Delegated Domain Allocation"
    | "Evolutionary Grants Games"
    | "Direct to Contract Incentives"
    | "Angel Investment"
    | "Dominant Assurance Contracts"
    | "Community Currencies"
    | "Universal Basic Income (UBI)"
    | "Bounties"
    | "Gnosis Safe"
    | "Waqf"
    | "Ranked Choice Voting"
    | "Honour"
    | "Mutual Aid Networks"
    | "Bonding Curves"
    | "Zakat"
    | "Decentralized Validators"
    | "Revnets";
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
  totalGrantPoolSizeUSD?: string; // Standardized USD conversion
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

export interface ApiResponse<T> {
  "@context": string;
  data?: T[];
  name?: string;
  type?: string;
  total?: number;
  page?: number;
  grantPools?: DAOIP5GrantPool[];
  projects?: DAOIP5Project[];
  applications?: DAOIP5Application[];
}

export interface QueryFilters {
  system?: string;
  page?: number;
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
