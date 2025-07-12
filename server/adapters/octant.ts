import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application, QueryFilters } from "./base";
import { currencyService } from "../services/currency";

interface OctantProject {
  address: string;
  name: string;
  description: string;
  profileImageSmall: string;
  profileImageMedium: string;
  website: string;
  socials?: {
    twitter?: string;
    github?: string;
    discord?: string;
  };
}

interface OctantEpoch {
  epoch: number;
  budget: string;
  status: "current" | "pending" | "finalized";
  startDate: string;
  endDate: string;
}

interface OctantAllocation {
  projectAddress: string;
  amount: string;
  donor: string;
}

export class OctantAdapter extends BaseAdapter {
  constructor() {
    super("Octant", process.env.OCTANT_API_URL || "https://backend.mainnet.octant.app");
  }

  async getSystems(): Promise<DAOIP5System[]> {
    return [{
      "@context": "http://www.daostar.org/schemas",
      name: "Octant",
      type: "DAO",
      grantPoolsURI: "/api/v1/pools?system=octant",
      extensions: {
        "app.octant.systemMetadata": {
          platform: "octant",
          description: "Quadratic funding for Ethereum public goods through ETH staking proceeds",
          website: "https://octant.app",
          apiEndpoint: this.baseUrl,
          supportedNetworks: ["ethereum"],
          fundingMechanisms: ["quadratic_funding"],
          established: "2023",
          epochDuration: "90_days",
          fundingSource: "eth_staking_proceeds"
        }
      }
    }];
  }

  async getSystem(id: string): Promise<DAOIP5System | null> {
    const systems = await this.getSystems();
    return systems[0] || null;
  }

  async getPools(filters?: QueryFilters): Promise<DAOIP5GrantPool[]> {
    try {
      const currentEpochResponse = await fetch(`${this.baseUrl}/epochs/current`);
      if (!currentEpochResponse.ok) {
        throw new Error(`Failed to fetch current epoch: ${currentEpochResponse.status}`);
      }
      const currentEpochData = await currentEpochResponse.json();
      const currentEpoch = currentEpochData.currentEpoch;

      const pools: DAOIP5GrantPool[] = [];
      
      // Configure range: epochs 1-7 as requested, with config for current-1 
      const maxEpoch = Math.min(7, currentEpoch - 1); // current-1 configuration
      const minEpoch = 1;

      for (let epoch = minEpoch; epoch <= maxEpoch; epoch++) {
        try {
          const epochInfoResponse = await fetch(`${this.baseUrl}/epochs/info/${epoch}`);
          if (!epochInfoResponse.ok) continue;
          
          const epochInfo = await epochInfoResponse.json();
          
          // Calculate epoch dates based on the actual Octant epoch schedule
          const epochCloseDates: Record<number, string> = {
            1: "2024-03-29T00:00:00Z",
            2: "2024-06-27T00:00:00Z", 
            3: "2024-09-25T00:00:00Z",
            4: "2024-12-24T00:00:00Z",
            5: "2025-03-24T00:00:00Z",
            6: "2025-06-22T00:00:00Z",
            7: "2025-09-20T00:00:00Z"
          };
          const closeDate = epochCloseDates[epoch as keyof typeof epochCloseDates] || new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString();
          
          // Calculate pool funding from totalGrantPoolSize based on actual epoch data
          // Priority: matchedRewards or totalGrantPoolSize from the epoch data
          let poolSizeWei = epochInfo.matchedRewards || epochInfo.totalGrantPoolSize;
          
          // If matchedRewards is not available, calculate from ppf + communityFund  
          if (!poolSizeWei && epochInfo.ppf && epochInfo.communityFund) {
            poolSizeWei = String(BigInt(epochInfo.ppf) + BigInt(epochInfo.communityFund));
          }
          
          // Fallback to leftover if no other funding data available
          if (!poolSizeWei) {
            poolSizeWei = epochInfo.leftover;
          }

          let totalGrantPoolSize: Array<{ amount: string; denomination: string }> = [];
          let totalGrantPoolSizeUSD: string | undefined;

          if (poolSizeWei) {
            // Keep wei amount as shown in the example format
            totalGrantPoolSize = [{
              amount: poolSizeWei,
              denomination: "ETH"
            }];
            
            // Convert to ETH for USD calculation
            const ethAmount = String(parseInt(poolSizeWei) / 1e18);
            totalGrantPoolSizeUSD = await currencyService.convertETHToUSD(ethAmount);
          }

          const pool: DAOIP5GrantPool = {
            type: "GrantPool",
            id: `daoip5:octant:grantPool:${epoch}`,
            name: `Octant Epoch ${epoch}`,
            description: `Quadratic funding round for Octant epoch ${epoch} - 90-day funding period supporting Ethereum public goods`,
            grantFundingMechanism: "Quadratic Funding",
            isOpen: epoch === currentEpoch,
            closeDate: closeDate,
            applicationsURI: `./applications_epoch_${epoch}.json`,
            governanceURI: "https://docs.octant.app/how-it-works/mechanism",
            totalGrantPoolSize,
            extensions: {
              "app.octant.epochMetadata": {
                stakingProceeds: epochInfo.stakingProceeds,
                totalEffectiveDeposit: epochInfo.totalEffectiveDeposit,
                vanillaIndividualRewards: epochInfo.vanillaIndividualRewards,
                operationalCost: epochInfo.operationalCost,
                matchedRewards: epochInfo.matchedRewards,
                patronsRewards: epochInfo.patronsRewards,
                totalWithdrawals: epochInfo.totalWithdrawals,
                leftover: epochInfo.leftover,
                ppf: epochInfo.ppf,
                communityFund: epochInfo.communityFund,
                totalGrantPoolSizeUSD: totalGrantPoolSizeUSD
              },
              "app.octant.epochDetails": {
                epochNumber: epoch,
                isFinalized: epoch < currentEpoch,
                isCurrent: epoch === currentEpoch,
                apiEndpoint: `${this.baseUrl}/epochs/info/${epoch}`
              }
            }
          };

          // Apply filters
          if (filters?.isOpen !== undefined && pool.isOpen !== filters.isOpen) {
            continue;
          }
          
          if (filters?.mechanism && pool.grantFundingMechanism !== filters.mechanism) {
            continue;
          }

          pools.push(pool);
        } catch (error) {
          console.error(`Error fetching epoch ${epoch}:`, error);
        }
      }

      return pools.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || pools.length));
    } catch (error) {
      console.error("Error fetching Octant pools:", error);
      return [];
    }
  }

  async getPool(id: string): Promise<DAOIP5GrantPool | null> {
    const pools = await this.getPools();
    return pools.find(pool => pool.id === id) || null;
  }

  async getProjects(filters?: QueryFilters): Promise<DAOIP5Project[]> {
    try {
      const currentEpochResponse = await fetch(`${this.baseUrl}/epochs/current`);
      if (!currentEpochResponse.ok) {
        throw new Error(`Failed to fetch current epoch: ${currentEpochResponse.status}`);
      }
      const currentEpochData = await currentEpochResponse.json();
      const currentEpoch = currentEpochData.currentEpoch;

      // Fetch projects from multiple epochs for comprehensive data
      const epochsToQuery = [currentEpoch];
      if (currentEpoch > 1) epochsToQuery.push(currentEpoch - 1);
      
      const allProjects = new Map<string, any>(); // Use Map to deduplicate by address

      for (const epoch of epochsToQuery) {
        try {
          const projectsResponse = await fetch(`${this.baseUrl}/projects/epoch/${epoch}`);
          if (!projectsResponse.ok) continue;

          const projectsData = await projectsResponse.json();
          
          for (const project of projectsData.projects || []) {
            if (!allProjects.has(project.address)) {
              allProjects.set(project.address, project);
            }
          }
        } catch (error) {
          console.error(`Error fetching projects for epoch ${epoch}:`, error);
        }
      }

      const projects: DAOIP5Project[] = [];

      for (const project of Array.from(allProjects.values())) {
        const socials: Array<{ name: string; value: string }> = [];
        
        // Transform social media data
        if (project.profileImageSmall?.includes('twitter')) {
          socials.push({ name: "twitter", value: project.website || "" });
        }
        if (project.profileImageSmall?.includes('github')) {
          socials.push({ name: "github", value: project.website || "" });
        }
        if (project.website) {
          socials.push({ name: "website", value: project.website });
        }

        const daoip5Project: DAOIP5Project = {
          type: "Project",
          id: `daoip5:${project.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}:project:${project.address}`,
          name: project.name || `Project ${project.address.slice(-8)}`,
          description: project.description || "Ethereum public goods project funded through Octant",
          contentURI: project.website || `https://octant.app/project/${project.address}`,
          image: project.profileImageSmall || "",
          coverImage: project.profileImageMedium || project.profileImageSmall || "",
          socials: socials.length > 0 ? socials : undefined,
          relevantTo: [`octant-epoch-${currentEpoch}`],
          extensions: {
            "app.octant.projectMetadata": {
              address: project.address,
              profileImageSmall: project.profileImageSmall,
              profileImageMedium: project.profileImageMedium,
              website: project.website,
              lastActive: epochsToQuery[0],
              participatingEpochs: epochsToQuery
            },
            "app.octant.funding": {
              platform: "octant",
              fundingMechanism: "quadratic_funding",
              network: "ethereum",
              chainId: "1"
            }
          }
        };

        // Apply search filter
        if (filters?.search) {
          const searchTerm = filters.search.toLowerCase();
          if (!daoip5Project.name.toLowerCase().includes(searchTerm) &&
              !daoip5Project.description.toLowerCase().includes(searchTerm) &&
              !project.address.toLowerCase().includes(searchTerm)) {
            continue;
          }
        }

        projects.push(daoip5Project);
      }

      // Sort by name for consistent ordering
      projects.sort((a, b) => a.name.localeCompare(b.name));

      return projects.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
    } catch (error) {
      console.error("Error fetching Octant projects:", error);
      return [];
    }
  }

  async getProject(id: string): Promise<DAOIP5Project | null> {
    const projects = await this.getProjects();
    return projects.find(project => project.id === id) || null;
  }

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      const currentEpochResponse = await fetch(`${this.baseUrl}/epochs/current`);
      if (!currentEpochResponse.ok) {
        throw new Error(`Failed to fetch current epoch: ${currentEpochResponse.status}`);
      }
      const currentEpochData = await currentEpochResponse.json();
      const currentEpoch = currentEpochData.currentEpoch;

      const applications: DAOIP5Application[] = [];
      
      // Query epochs 1-7 for comprehensive application data, focusing on approved applications
      const maxEpoch = Math.min(7, currentEpoch - 1); // Use current-1 config like pools
      const epochsToQuery = filters?.poolId ? 
        [parseInt(filters.poolId.split(':')[3] || "1")] : // Extract epoch from daoip5:octant:grantPool:epochId
        Array.from({length: maxEpoch}, (_, i) => i + 1);

      for (const epoch of epochsToQuery) {
        try {
          // Fetch project rewards for each epoch - focusing on approved applications with funding
          const rewardsResponse = await fetch(`${this.baseUrl}/rewards/projects/epoch/${epoch}`);
          
          if (rewardsResponse.ok) {
            const rewardsData = await rewardsResponse.json();
            
            for (const reward of rewardsData.rewards || []) {
              const amountInEth = parseInt(reward.allocated) / 1e18; // Convert wei to ETH
              
              // Only include approved applications (with funding > 0) as requested
              if (amountInEth > 0 && reward.address) {
                const projectId = this.toCaip10(reward.address);
                const application: DAOIP5Application = {
                  type: "Application",
                  id: `daoip5:octant:grantApplication:${reward.address}-epoch-${epoch}`,
                  projectId: projectId,
                  poolId: `daoip5:octant:grantPool:${epoch}`,
                  status: "approved", // Only showing approved applications with funding
                  submissionDate: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)).toISOString(),
                  approvedAmount: [{
                    amount: amountInEth.toFixed(6),
                    denomination: "ETH"
                  }]
                };

                // Apply filters
                if (filters?.poolId && application.poolId !== filters.poolId) continue;
                if (filters?.projectId && application.projectId !== filters.projectId) continue;

                applications.push(application);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching rewards for epoch ${epoch}:`, error);
        }
      }

      // Sort by approved amount (highest first)
      applications.sort((a, b) => {
        const amountA = parseFloat(a.approvedAmount?.[0]?.amount || '0');
        const amountB = parseFloat(b.approvedAmount?.[0]?.amount || '0');
        return amountB - amountA;
      });

      return applications.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
    } catch (error) {
      console.error("Error fetching Octant applications:", error);
      return [];
    }
  }

  async getApplication(id: string): Promise<DAOIP5Application | null> {
    const applications = await this.getApplications();
    return applications.find(app => app.id === id) || null;
  }
}
