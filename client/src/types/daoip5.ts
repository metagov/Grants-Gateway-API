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
  totalGrantPoolSize?: Array<{
    amount: string;
    denomination: string;
  }>;
  email?: string;
  image?: string;
  coverImage?: string;
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
