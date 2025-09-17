import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application, QueryFilters, PaginatedResult } from "./base";
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
    super("Giveth", process.env.GIVETH_API_URL || "https://mainnet.serve.giveth.io/graphql");
  }

  async getSystems(): Promise<DAOIP5System[]> {
    return [{
      "@context": "http://www.daostar.org/schemas",
      name: "Giveth",
      type: "DAO",
      grantPoolsURI: "/api/v1/grantPools?system=giveth",
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



  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      const allPools = await this.getPools({ limit: 1000 }); // Fetch all pools to ensure QF Round 15 is included
      
      // If no specific poolId is provided, get applications for the latest (most recent) round only
      let targetPools = allPools;
      let targetQfRoundId: number | null = null; // Use let for reassignment in fallback
      let selectedPool: DAOIP5GrantPool | null = null; // Single mutable variable for fallback reassignment
      
      if (!filters?.poolId) {
        // Find a pool with applications (prefer latest active, then latest closed)
        
        // First try active pools (isOpen: true) in reverse chronological order
        const activePools = allPools.filter(pool => pool.isOpen).sort((a, b) => {
          const dateA = a.closeDate ? new Date(a.closeDate) : new Date(0);
          const dateB = b.closeDate ? new Date(b.closeDate) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Then try closed pools in reverse chronological order
        const closedPools = allPools.filter(pool => !pool.isOpen).sort((a, b) => {
          const dateA = a.closeDate ? new Date(a.closeDate) : new Date(0);
          const dateB = b.closeDate ? new Date(b.closeDate) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Combine pools to check: active first, then closed
        const poolsToCheck = [...activePools, ...closedPools];
        
        // Debug pool selection
        console.log(`🔍 Available pools:`, poolsToCheck.map(p => ({ 
          name: p.name, 
          isOpen: p.isOpen, 
          qfRoundId: p.extensions?.["io.giveth.roundMetadata"]?.qfRoundId 
        })));
        
        // For now, prioritize known pools with applications based on testing
        const knownActiveRounds = [15, 14, 13]; // Rounds known to have applications
        
        for (const roundId of knownActiveRounds) {
          console.log(`🔍 Looking for QF Round ${roundId}...`);
          const poolForRound = poolsToCheck.find(pool => {
            const rawQfRoundId = pool.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
            const parsedRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;
            console.log(`  - Pool "${pool.name}" has QF Round ID: ${parsedRoundId}`);
            return parsedRoundId === roundId;
          });
          
          if (poolForRound) {
            selectedPool = poolForRound;
            targetQfRoundId = roundId;
            console.log(`✅ Selected QF Round ${roundId} (${poolForRound.name}) - known to have applications`);
            break;
          } else {
            console.log(`❌ QF Round ${roundId} not found in available pools`);
          }
        }
        
        // Fallback to latest pool if no pool with applications found
        if (!selectedPool) {
          selectedPool = allPools.reduce((latest, pool) => {
            if (!latest) return pool;
            const latestDate = latest.closeDate ? new Date(latest.closeDate) : new Date(0);
            const poolDate = pool.closeDate ? new Date(pool.closeDate) : new Date(0);
            return poolDate > latestDate ? pool : latest;
          }, allPools[0]);
          
          const rawQfRoundId = selectedPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
          targetQfRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;
        }
        
        targetPools = selectedPool ? [selectedPool] : [];

      } else {
        // Filter to specific pool if poolId is provided
        targetPools = allPools.filter(pool => pool.id === filters.poolId);
        selectedPool = targetPools[0];
        const rawQfRoundId = selectedPool?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
        targetQfRoundId = rawQfRoundId ? parseInt(String(rawQfRoundId)) : null;

      }
      
      if (!targetQfRoundId || targetPools.length === 0) {
        console.log(`❌ No valid pools found with applications`);
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
      selectedPool = selectedPool || targetPools[0]; // Use selected pool or first target pool

      // Collect all project names for batch Karma search
      const projects = data.allProjects?.projects || [];
      console.log(`📋 Processing ${projects.length} projects from QF Round ${targetQfRoundId} (${selectedPool?.name})`);
      
      if (projects.length === 0) {
        console.log(`⚠️ No projects found in QF Round ${targetQfRoundId} (${selectedPool?.name})`);
        
        // Check if the round is still open (close date > now)
        const isRoundOpen = selectedPool?.closeDate ? new Date(selectedPool.closeDate) > new Date() : selectedPool?.isOpen;
        
        if (isRoundOpen) {
          console.log(`ℹ️ QF Round ${targetQfRoundId} is still open, keeping it as selected round even with 0 applications`);
          // Don't fallback for open rounds - they might get applications later
          return [];
        }
        
        // Fallback: Only try other rounds if the current one is closed
        console.log(`🔄 Round is closed, running fallback to find a round with applications...`);
        
        const activePools = allPools.filter(pool => pool.isOpen).sort((a, b) => {
          const dateA = a.closeDate ? new Date(a.closeDate) : new Date(0);
          const dateB = b.closeDate ? new Date(b.closeDate) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        const closedPools = allPools.filter(pool => !pool.isOpen).sort((a, b) => {
          const dateA = a.closeDate ? new Date(a.closeDate) : new Date(0);
          const dateB = b.closeDate ? new Date(b.closeDate) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        
        const poolsToCheck = [...activePools, ...closedPools];
        const knownActiveRounds = [15, 14, 13]; // Rounds known to have applications
        
        for (const roundId of knownActiveRounds) {
          const poolForRound = poolsToCheck.find(pool => {
            const rawQfRoundId = pool.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
            return rawQfRoundId && parseInt(String(rawQfRoundId)) === roundId;
          });
          
          if (poolForRound) {
            console.log(`✅ Fallback selected QF Round ${roundId} (${poolForRound.name})`);
            selectedPool = poolForRound;
            targetQfRoundId = roundId;
            
            // Retry the GraphQL query with the new round
            const fallbackData = await this.executeGraphQL(query, {
              ...variables,
              qfRoundId: targetQfRoundId
            });
            
            const fallbackProjects = fallbackData.allProjects?.projects || [];
            console.log(`📋 Fallback found ${fallbackProjects.length} projects in QF Round ${targetQfRoundId}`);
            
            if (fallbackProjects.length > 0) {
              // Update projects array for processing below
              projects.length = 0;
              projects.push(...fallbackProjects);
              break;
            }
          }
        }
        
        if (projects.length === 0) {
          console.log(`❌ No rounds found with applications`);
          return [];
        }
      }
      const projectNames = projects.map((project: any) => project.title || "");
      const karmaResults = await searchKarmaProjectsBatch(projectNames);

      for (const project of projects) {
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

        const projectName = project.title || "";
        
        // Get Karma UID from batch results
        const karmaUID = karmaResults.get(projectName);
        
        const application: DAOIP5Application = {
          type: "GrantApplication",
          id: `daoip5:giveth:grantPool:${targetQfRoundId}:grantApplication:${project.id}`,
          grantPoolId: selectedPool.id,
          grantPoolName: selectedPool.name,
          projectId: `daoip5:giveth:project:${project.id}`,
          projectName: projectName,
          createdAt: project.creationDate ? 
            this.formatDate(project.creationDate) : 
            new Date().toISOString(),
          contentURI: `https://giveth.io/project/${project.slug}`,
          socials: socials.length > 0 ? socials : undefined,
          payoutAddress: primaryAddress ? {
            type: "EthereumAddress", 
            value: primaryAddress
          } : undefined,
          status: selectedPool.isOpen ? "pending" : "approved",
          extensions: {
            "io.giveth.applicationMetadata": {
              projectId: project.id,
              projectSlug: project.slug,
              qfRoundSlug: selectedPool.extensions?.["io.giveth.roundMetadata"]?.slug,
              projectStatus: project.status?.name,
              qfRoundId: targetQfRoundId,
              projectDescription: project.description,
              projectImage: project.image,
              projectAddresses: project.addresses,
              projectSocialMedia: project.socialMedia,
              qfRounds: project.qfRounds
            },
            // Add KARMA GAP UID if found
            ...(karmaUID ? { "x-karmagap-uid": karmaUID } : {})
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
      const selectedPoolForPaginated = targetPools[0];
      const rawQfRoundId = selectedPoolForPaginated?.extensions?.["io.giveth.roundMetadata"]?.qfRoundId;
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
