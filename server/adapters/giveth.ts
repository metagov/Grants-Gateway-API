import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application, QueryFilters, PaginatedResult } from "./base";
import { currencyService } from "../services/currency";

interface GivethProject {
  id: string;
  title: string;
  description: string;
  slug: string;
  image: string;
  creationDate: string;
  status: {
    name: string;
  };
  addresses: Array<{
    address: string;
    chainType: string;
    isRecipient: boolean;
  }>;
  socialMedia: Array<{
    type: string;
    link: string;
  }>;
  qfRounds: Array<{
    id: string;
    name: string;
    isActive: boolean;
  }>;
}

interface GivethQFRound {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  beginDate: string;
  endDate: string;
  allocatedFund: number;
  roundUSDCapPerProject: number;
  network: string;
}

export class GivethAdapter extends BaseAdapter {
  constructor() {
    super("Giveth", process.env.GIVETH_API_URL || "https://mainnet.serve.giveth.io/graphql");
  }

  async getSystems(): Promise<DAOIP5System[]> {
    return [{
      "@context": "http://www.daostar.org/schemas",
      name: "Giveth",
      type: "DAO",
      grantPoolsURI: "/api/v1/pools?system=giveth",
      extensions: {
        "io.giveth.systemMetadata": {
          platform: "giveth",
          description: "Donation platform for public goods and social impact projects",
          website: "https://giveth.io",
          apiEndpoint: this.baseUrl,
          supportedNetworks: ["ethereum"],
          fundingMechanisms: ["donations", "quadratic_funding"],
          established: "2016"
        }
      }
    }];
  }

  async getSystem(id: string): Promise<DAOIP5System | null> {
    const systems = await this.getSystems();
    return systems[0] || null;
  }

  private async executeGraphQL(query: string, variables: any = {}): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  async getPools(filters?: QueryFilters): Promise<DAOIP5GrantPool[]> {
    try {
      const query = `
        query GetQFRounds {
          qfRounds {
            id
            name
            slug
            description
            isActive
            beginDate
            endDate
            allocatedFund
          }
        }
      `;

      const data = await this.executeGraphQL(query);
      const qfRounds = data.qfRounds || [];
      const pools: DAOIP5GrantPool[] = [];

      for (const round of qfRounds) {
        // Calculate pool funding with proper USD standardization
        let totalGrantPoolSize: Array<{ amount: string; denomination: string }> = [];
        let totalGrantPoolSizeUSD: string | undefined;

        if (round.allocatedFund) {
          const usdAmount = String(round.allocatedFund);
          totalGrantPoolSize = [{
            amount: usdAmount,
            denomination: "USD"
          }];
          totalGrantPoolSizeUSD = usdAmount; // Already in USD
        }

        const pool: DAOIP5GrantPool = {
          type: "GrantPool",
          id: `daoip5:giveth:grantPool:${round.id}`,
          name: round.name || "",
          description: round.description || `Quadratic Funding round on Giveth platform. ${round.name} provides funding for public goods projects through community-driven quadratic funding mechanisms.`,
          grantFundingMechanism: "Quadratic Funding",
          isOpen: round.isActive || false,
          closeDate: round.endDate ? this.formatDate(round.endDate) : undefined,
          applicationsURI: `/api/v1/applications?poolId=daoip5:giveth:grantPool:${round.id}`,
          governanceURI: `https://giveth.io/qf/${round.slug}`,
          attestationIssuersURI: "https://giveth.io/attestations",
          requiredCredentials: ["EthereumAddress", "GivethProfile"],
          totalGrantPoolSize,
          email: "info@giveth.io",
          image: "https://giveth.io/images/logo.png",
          coverImage: "https://giveth.io/images/banner.jpg",
          extensions: {
            "io.giveth.roundMetadata": {
              qfRoundId: round.id,
              slug: round.slug,
              allocatedFund: round.allocatedFund,
              platformUrl: `https://giveth.io/qf/${round.slug}`,
              donationUrl: `https://giveth.io/donate/${round.slug}`
            }
          }
        };

        // Apply filters
        if (filters?.isOpen !== undefined && pool.isOpen !== filters.isOpen) {
          continue;
        }

        pools.push(pool);
      }

      return pools.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 10));
    } catch (error) {
      console.error("Error fetching Giveth pools:", error);
      return [];
    }
  }

  async getPool(id: string): Promise<DAOIP5GrantPool | null> {
    const pools = await this.getPools();
    return pools.find(pool => pool.id === id) || null;
  }

  async getProjects(filters?: QueryFilters): Promise<DAOIP5Project[]> {
    try {
      const limit = filters?.limit || 10;
      const skip = filters?.offset || 0;
      
      const query = `
        query GetAllProjects($skip: Int!, $take: Int!, $limit: Int!, $searchTerm: String, $qfRoundId: Int) {
          allProjects(
            skip: $skip
            take: $take
            limit: $limit
            orderBy: { field: GIVPower, direction: DESC }
            searchTerm: $searchTerm
            qfRoundId: $qfRoundId
          ) {
            projects {
              id
              title
              slug
              description
              image
              creationDate
              status {
                name
              }
              addresses {
                address
                chainType
                isRecipient
              }
              socialMedia {
                type
                link
              }
              qfRounds {
                id
                name
                isActive
              }
            }
          }
        }
      `;

      const variables = {
        skip,
        take: limit,
        limit,
        searchTerm: filters?.search || null,
        qfRoundId: null // Will be set dynamically if needed
      };

      const data = await this.executeGraphQL(query, variables);
      const projects: DAOIP5Project[] = [];

      for (const project of data.allProjects?.projects || []) {
        // Get primary recipient address
        const primaryAddress = project.addresses?.find((addr: any) => addr.isRecipient)?.address || "";
        
        // Transform social media
        const socials: Array<{ name: string; value: string }> = [];
        if (project.socialMedia) {
          for (const social of project.socialMedia) {
            socials.push({
              name: social.type.toLowerCase(),
              value: social.link
            });
          }
        }

        const daoip5Project: DAOIP5Project = {
          type: "Project",
          id: `daoip5:${project.title?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}:project:${project.id}`,
          name: project.title || "",
          description: project.description || "",
          contentURI: `https://giveth.io/project/${project.slug}`,
          image: project.image || "",
          coverImage: project.image || "",
          socials: socials.length > 0 ? socials : undefined,
          extensions: {
            "io.giveth.projectMetadata": {
              projectId: project.id,
              slug: project.slug,
              creationDate: project.creationDate,
              status: project.status?.name,
              addresses: project.addresses,
              socialMedia: project.socialMedia,
              qfRounds: project.qfRounds,
              primaryRecipientAddress: primaryAddress
            },
            "io.giveth.platform": {
              platform: "giveth",
              fundingMechanism: "donations_and_qf",
              network: "ethereum",
              chainId: "1",
              projectUrl: `https://giveth.io/project/${project.slug}`,
              donationUrl: `https://giveth.io/donate/${project.slug}`
            }
          }
        };

        projects.push(daoip5Project);
      }

      return projects;
    } catch (error) {
      console.error("Error fetching Giveth projects:", error);
      return [];
    }
  }

  async getProject(id: string): Promise<DAOIP5Project | null> {
    const allProjects = await this.getProjects();
    return allProjects.find(project => project.id === id) || null;
  }

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      const allPools = await this.getPools({ limit: 20 });
      
      // If no specific poolId is provided, get applications for the latest (most recent) round only
      let targetPools = allPools;
      let targetQfRoundId: number | null = null;
      
      if (!filters?.poolId) {
        // Find the latest pool by close date
        const latestPool = allPools.reduce((latest, pool) => {
          if (!latest) return pool;
          const latestDate = latest.closeDate ? new Date(latest.closeDate) : new Date(0);
          const poolDate = pool.closeDate ? new Date(pool.closeDate) : new Date(0);
          return poolDate > latestDate ? pool : latest;
        }, allPools[0]);
        
        targetPools = latestPool ? [latestPool] : [];
        const rawQfRoundId = latestPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
        targetQfRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;

      } else {
        // Filter to specific pool if poolId is provided
        targetPools = allPools.filter(pool => pool.id === filters.poolId);
        const targetPool = targetPools[0];
        const rawQfRoundId = targetPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
        targetQfRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;

      }
      
      if (!targetQfRoundId || targetPools.length === 0) {
        return [];
      }

      // Fetch projects for the specific QF round using allProjects query
      const limit = filters?.limit || 10;
      const skip = filters?.offset || 0;
      
      const query = `
        query GetProjectsForQFRound($skip: Int!, $take: Int!, $limit: Int!, $qfRoundId: Int!, $searchTerm: String) {
          allProjects(
            skip: $skip
            take: $take
            limit: $limit
            orderBy: { field: GIVPower, direction: DESC }
            searchTerm: $searchTerm
            qfRoundId: $qfRoundId
          ) {
            projects {
              id
              title
              slug
              description
              image
              creationDate
              status {
                name
              }
              addresses {
                address
                chainType
                isRecipient
              }
              socialMedia {
                type
                link
              }
              qfRounds {
                id
                name
                isActive
              }
            }
          }
        }
      `;

      const variables = {
        skip,
        take: limit,
        limit,
        qfRoundId: targetQfRoundId,
        searchTerm: filters?.search || null
      };


      const data = await this.executeGraphQL(query, variables);
      const applications: DAOIP5Application[] = [];
      const targetPool = targetPools[0];

      for (const project of data.allProjects?.projects || []) {
        // Get primary recipient address
        const primaryAddress = project.addresses?.find((addr: any) => addr.isRecipient)?.address || "";
        
        // Extract social media for DAOIP-5 format
        const socials: Array<{ platform: string; url: string }> = [];
        if (project.socialMedia) {
          for (const social of project.socialMedia) {
            socials.push({
              platform: social.type,
              url: social.link
            });
          }
        }

        const application: DAOIP5Application = {
          type: "GrantApplication",
          id: `daoip5:giveth:grantApplication:${project.id}-${targetPool.id}`,
          grantPoolId: targetPool.id,
          grantPoolName: targetPool.name,
          projectId: `daoip5:${project.title?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}:project:${project.id}`,
          projectName: project.title || "",
          createdAt: project.creationDate ? 
            this.formatDate(project.creationDate) : 
            new Date().toISOString(),
          contentURI: `https://giveth.io/project/${project.slug}`,
          socials: socials.length > 0 ? socials : undefined,
          payoutAddress: primaryAddress ? {
            type: "EthereumAddress", 
            value: primaryAddress
          } : undefined,
          status: targetPool.isOpen ? "pending" : "approved",
          extensions: {
            "io.giveth.applicationMetadata": {
              projectId: project.id,
              projectSlug: project.slug,
              qfRoundSlug: targetPool.extensions?.["io.giveth.roundMetadata"]?.slug,
              projectStatus: project.status?.name,
              qfRoundId: targetQfRoundId,
              projectDescription: project.description,
              projectImage: project.image,
              projectAddresses: project.addresses,
              projectSocialMedia: project.socialMedia,
              qfRounds: project.qfRounds
            }
          }
        };

        // Apply remaining filters
        if (filters?.projectId && !application.projectId.includes(filters.projectId)) continue;
        if (filters?.status && application.status !== filters.status) continue;

        applications.push(application);
      }

      return applications;
    } catch (error) {
      console.error("Error fetching Giveth applications:", error);
      return [];
    }
  }

  async getApplication(id: string): Promise<DAOIP5Application | null> {
    const applications = await this.getApplications();
    return applications.find(app => app.id === id) || null;
  }

  async getPoolsPaginated(filters?: QueryFilters): Promise<PaginatedResult<DAOIP5GrantPool>> {
    const allPools = await this.getPools(filters);
    return {
      data: allPools,
      totalCount: allPools.length
    };
  }

  async getProjectsPaginated(filters?: QueryFilters): Promise<PaginatedResult<DAOIP5Project>> {
    // For now, use the actual data length as total count
    // In production, this could be optimized with a proper count query
    const projects = await this.getProjects(filters);
    
    // For projects, we need to estimate total count based on current data
    // This is a simplified approach - in production you'd want a proper count API
    const totalCount = projects.length;
    
    return {
      data: projects,
      totalCount
    };
  }

  async getApplicationsPaginated(filters?: QueryFilters): Promise<PaginatedResult<DAOIP5Application>> {
    // Get all pools first to determine the target QF round
    const allPools = await this.getPools();
    let targetQfRoundId: number | null = null;
    let targetPools: DAOIP5GrantPool[] = [];

    if (!filters?.poolId) {
      // Find the latest pool by close date when no poolId is provided
      const latestPool = allPools.reduce((latest, pool) => {
        const poolDate = pool.closeDate ? new Date(pool.closeDate) : new Date(0);
        const latestDate = latest.closeDate ? new Date(latest.closeDate) : new Date(0);
        return poolDate > latestDate ? pool : latest;
      }, allPools[0]);
      
      targetPools = latestPool ? [latestPool] : [];
      const rawQfRoundId = latestPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
      targetQfRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;
    } else {
      // Filter to specific pool if poolId is provided
      targetPools = allPools.filter(pool => pool.id === filters.poolId);
      const targetPool = targetPools[0];
      const rawQfRoundId = targetPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
      targetQfRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;
    }
    
    if (!targetQfRoundId || targetPools.length === 0) {
      return { data: [], totalCount: 0 };
    }

    // For now, get all applications first and then count
    // This could be optimized with proper GraphQL count queries in production
    const allApplications = await this.getApplications({ ...filters, limit: undefined, offset: undefined });
    const totalCount = allApplications.length;
    
    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 10;
    const applications = allApplications.slice(offset, offset + limit);
    
    return {
      data: applications,
      totalCount
    };
  }
}
