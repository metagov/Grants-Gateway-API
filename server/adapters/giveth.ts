import {
  BaseAdapter,
  DAOIP5System,
  DAOIP5GrantPool,
  DAOIP5Project,
  DAOIP5Application,
  QueryFilters,
  PaginatedResult,
} from "./base";
import { currencyService } from "../services/currency";
import { searchKarmaProjectsBatch } from "../services/karma";

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
    super(
      "Giveth",
      process.env.GIVETH_API_URL || "https://mainnet.serve.giveth.io/graphql",
    );
  }

  async getSystems(): Promise<DAOIP5System[]> {
    return [
      {
        "@context": "http://www.daostar.org/schemas",
        name: "Giveth",
        type: "DAO",
        grantPoolsURI: "/api/v1/grantPools?system=giveth",
        extensions: {
          "io.giveth.systemMetadata": {
            platform: "giveth",
            description:
              "Donation platform for public goods and social impact projects",
            website: "https://giveth.io",
            apiEndpoint: this.baseUrl,
            supportedNetworks: ["ethereum"],
            fundingMechanisms: ["donations", "quadratic_funding"],
            established: "2016",
          },
        },
      },
    ];
  }

  async getSystem(id: string): Promise<DAOIP5System | null> {
    const systems = await this.getSystems();
    return systems[0] || null;
  }

  private async executeGraphQL(
    query: string,
    variables: any = {},
  ): Promise<any> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
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
        let totalGrantPoolSize: Array<{
          amount: string;
          denomination: string;
        }> = [];
        let totalGrantPoolSizeUSD: string | undefined;

        if (round.allocatedFund) {
          const usdAmount = String(round.allocatedFund);
          totalGrantPoolSize = [
            {
              amount: usdAmount,
              denomination: "USD",
            },
          ];
          totalGrantPoolSizeUSD = usdAmount; // Already in USD
        }

        const pool: DAOIP5GrantPool = {
          type: "GrantPool",
          id: `daoip5:giveth:grantPool:${round.id}`,
          name: round.name || "",
          description:
            round.description ||
            `Quadratic Funding round on Giveth platform. ${round.name} provides funding for public goods projects through community-driven quadratic funding mechanisms.`,
          grantFundingMechanism: "Quadratic Funding",
          isOpen: round.isActive || false,
          closeDate: round.endDate ? this.formatDate(round.endDate) : undefined,
          applicationsURI: `/api/v1/applications?poolId=daoip5:giveth:grantPool:${round.id}`,
          governanceURI: `https://giveth.io/qf/${round.slug}`,
          requiredCredentials: ["EthereumAddress", "GivethProfile"],
          totalGrantPoolSize,
          image: "https://giveth.io/images/logo/logo.svg",
          extensions: {
            "io.giveth.roundMetadata": {
              qfRoundId: round.id,
              slug: round.slug,
              allocatedFund: round.allocatedFund,
              platformUrl: `https://giveth.io/qf/${round.slug}`,
              donationUrl: `https://giveth.io/donate/${round.slug}`,
            },
          },
        };

        // Apply filters
        if (filters?.isOpen !== undefined && pool.isOpen !== filters.isOpen) {
          continue;
        }

        pools.push(pool);
      }

      return pools.slice(
        filters?.offset || 0,
        (filters?.offset || 0) + (filters?.limit || 10),
      );
    } catch (error) {
      console.error("Error fetching Giveth pools:", error);
      return [];
    }
  }

  async getPool(id: string): Promise<DAOIP5GrantPool | null> {
    const pools = await this.getPools();
    return pools.find((pool) => pool.id === id) || null;
  }

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      const allPools = await this.getPools({ limit: 20 });

      // If no specific poolId is provided, get applications for the latest (most recent) round only
      let targetPools = allPools;
      let targetQfRoundId: number | null = null;

      if (!filters?.poolId) {
        // DEBUG: Log all pools with their status
        const debugLog = `🔍 [GIVETH DEBUG] All pools fetched: ${allPools.length}\n` + 
          allPools.map((pool, index) => {
            const qfRoundId = pool.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
            return `   Pool ${index + 1}: ${pool.name} (ID: ${qfRoundId}) - isOpen: ${pool.isOpen}, closeDate: ${pool.closeDate}`;
          }).join('\n');
        console.log(debugLog);
        
        // Find the latest closed pool specifically (where isOpen is false)
        const closedPools = allPools.filter(pool => !pool.isOpen);
        console.log(`🔍 [GIVETH DEBUG] Found ${closedPools.length} closed pools:`);
        closedPools.forEach((pool, index) => {
          const qfRoundId = pool.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
          console.log(`   Closed Pool ${index + 1}: ${pool.name} (ID: ${qfRoundId}) - closeDate: ${pool.closeDate}`);
        });
        
        const latestPool = closedPools.length > 0 
          ? closedPools.reduce((latest, pool) => {
              if (!latest) return pool;
              const latestDate = latest.closeDate
                ? new Date(latest.closeDate)
                : new Date(0);
              const poolDate = pool.closeDate
                ? new Date(pool.closeDate)
                : new Date(0);
              
              // DEBUG: Log date comparison
              console.log(`🔍 [GIVETH DEBUG] Comparing dates: ${pool.name} (${poolDate.toISOString()}) vs ${latest.name} (${latestDate.toISOString()})`);
              
              return poolDate > latestDate ? pool : latest;
            })
          : allPools.reduce((latest, pool) => {
              // Fallback to any pool if no closed pools found
              console.log("🔍 [GIVETH DEBUG] No closed pools found, falling back to latest pool overall");
              if (!latest) return pool;
              const latestDate = latest.closeDate
                ? new Date(latest.closeDate)
                : new Date(0);
              const poolDate = pool.closeDate
                ? new Date(pool.closeDate)
                : new Date(0);
              
              // DEBUG: Log fallback date comparison
              console.log(`🔍 [GIVETH DEBUG] Fallback comparing: ${pool.name} (${poolDate.toISOString()}) vs ${latest.name} (${latestDate.toISOString()})`);
              
              return poolDate > latestDate ? pool : latest;
            }, allPools[0]);

        // DEBUG: Log selected pool
        let finalDebugLog = '';
        if (latestPool) {
          const selectedQfRoundId = latestPool.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
          finalDebugLog = `✅ [GIVETH DEBUG] Selected pool: ${latestPool.name} (ID: ${selectedQfRoundId}) - isOpen: ${latestPool.isOpen}, closeDate: ${latestPool.closeDate}`;
          console.log(finalDebugLog);
        } else {
          finalDebugLog = "❌ [GIVETH DEBUG] No pool selected!";
          console.log(finalDebugLog);
        }

        targetPools = latestPool ? [latestPool] : [];
        const rawQfRoundId =
          latestPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
        targetQfRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;
        
        const targetDebugLog = `🎯 [GIVETH DEBUG] Target QF Round ID: ${targetQfRoundId}`;
        console.log(targetDebugLog);
      } else {
        // Filter to specific pool if poolId is provided
        targetPools = allPools.filter((pool) => pool.id === filters.poolId);
        const targetPool = targetPools[0];
        const rawQfRoundId =
          targetPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
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
        searchTerm: filters?.search || null,
      };

      const data = await this.executeGraphQL(query, variables);
      const applications: DAOIP5Application[] = [];
      const targetPool = targetPools[0];

      // Collect all project names for batch Karma search
      const projects = data.allProjects?.projects || [];
      const projectNames = projects.map((project: any) => project.title || "");
      console.log(`[KARMA DEBUG] Searching for ${projectNames.length} projects:`, projectNames.slice(0, 3));
      const karmaResults = await searchKarmaProjectsBatch(projectNames);
      console.log(`[KARMA DEBUG] Karma results found:`, Array.from(karmaResults.entries()).slice(0, 3));

      for (const project of projects) {
        // Get primary recipient address
        const primaryAddress =
          project.addresses?.find((addr: any) => addr.isRecipient)?.address ||
          "";

        // Extract social media for DAOIP-5 format
        const socials: Array<{ platform: string; url: string }> = [];
        if (project.socialMedia) {
          for (const social of project.socialMedia) {
            socials.push({
              platform: social.type,
              url: social.link,
            });
          }
        }

        const projectName = project.title || "";

        // Get Karma UID from batch results
        const karmaUID = karmaResults.get(projectName);
        console.log(`[KARMA DEBUG] Project "${projectName}" -> Karma UID: ${karmaUID || 'NOT_FOUND'}`);

        const application: DAOIP5Application = {
          type: "GrantApplication",
          id: `daoip5:giveth:grantPool:${targetQfRoundId}:grantApplication:${project.id}`,
          grantPoolId: targetPool.id,
          grantPoolName: targetPool.name,
          projectId: `daoip5:${project.title?.toLowerCase().replace(/\s+/g, "-") || "unknown"}:project:${project.id}`,
          projectName: projectName,
          createdAt: project.creationDate
            ? this.formatDate(project.creationDate)
            : new Date().toISOString(),
          contentURI: `https://giveth.io/project/${project.slug}`,
          socials: socials.length > 0 ? socials : undefined,
          payoutAddress: primaryAddress
            ? {
                type: "EthereumAddress",
                value: primaryAddress,
              }
            : undefined,
          status: targetPool.isOpen ? "pending" : "approved",
          extensions: {
            "io.giveth.applicationMetadata": {
              projectId: project.id,
              projectSlug: project.slug,
              qfRoundSlug:
                targetPool.extensions?.["io.giveth.roundMetadata"]?.slug,
              projectStatus: project.status?.name,
              qfRoundId: targetQfRoundId,
              projectDescription: project.description,
              projectImage: project.image,
              projectAddresses: project.addresses,
              projectSocialMedia: project.socialMedia,
              qfRounds: project.qfRounds,
            },
            // Add KARMA GAP UID if found
            ...(karmaUID ? { "x-karmagap-uid": karmaUID } : {}),
          },
        };

        // Apply remaining filters
        if (
          filters?.projectId &&
          !application.projectId.includes(filters.projectId)
        )
          continue;
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
    return applications.find((app) => app.id === id) || null;
  }

  async getPoolsPaginated(
    filters?: QueryFilters,
  ): Promise<PaginatedResult<DAOIP5GrantPool>> {
    const allPools = await this.getPools(filters);
    return {
      data: allPools,
      totalCount: allPools.length,
    };
  }

  async getApplicationsPaginated(
    filters?: QueryFilters,
  ): Promise<PaginatedResult<DAOIP5Application>> {
    // Get all pools first to determine the target QF round
    const allPools = await this.getPools();
    let targetQfRoundId: number | null = null;
    let targetPools: DAOIP5GrantPool[] = [];

    if (!filters?.poolId) {
      // Find the latest closed pool specifically (where isOpen is false)
      const closedPools = allPools.filter(pool => !pool.isOpen);
      
      const latestPool = closedPools.length > 0 
        ? closedPools.reduce((latest, pool) => {
            if (!latest) return pool;
            const latestDate = latest.closeDate
              ? new Date(latest.closeDate)
              : new Date(0);
            const poolDate = pool.closeDate
              ? new Date(pool.closeDate)
              : new Date(0);
            return poolDate > latestDate ? pool : latest;
          })
        : allPools.reduce((latest, pool) => {
            // Fallback to any pool if no closed pools found
            const poolDate = pool.closeDate
              ? new Date(pool.closeDate)
              : new Date(0);
            const latestDate = latest.closeDate
              ? new Date(latest.closeDate)
              : new Date(0);
            return poolDate > latestDate ? pool : latest;
          }, allPools[0]);

      targetPools = latestPool ? [latestPool] : [];
      const rawQfRoundId =
        latestPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
      targetQfRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;
    } else {
      // Filter to specific pool if poolId is provided
      targetPools = allPools.filter((pool) => pool.id === filters.poolId);
      const targetPool = targetPools[0];
      const rawQfRoundId =
        targetPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
      targetQfRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;
    }

    if (!targetQfRoundId || targetPools.length === 0) {
      return { data: [], totalCount: 0 };
    }

    // For now, get all applications first and then count
    // This could be optimized with proper GraphQL count queries in production
    const allApplications = await this.getApplications({
      ...filters,
      limit: undefined,
      offset: undefined,
    });
    const totalCount = allApplications.length;

    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 10;
    const applications = allApplications.slice(offset, offset + limit);

    return {
      data: applications,
      totalCount,
    };
  }
}
