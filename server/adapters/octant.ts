import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application, QueryFilters, PaginatedResult } from "./base";
import { currencyService } from "../services/currency";
import { karmaService } from "../services/karma";

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
                isCurrent: epoch === currentEpoch
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

      // Fetch project details with names for all epochs
      const projectsMap = new Map<string, any>();
      for (const epoch of epochsToQuery) {
        try {
          const projectDetailsResponse = await fetch(`${this.baseUrl}/projects/details?epochs=${epoch}&searchPhrases=`);
          if (projectDetailsResponse.ok) {
            const projectDetailsData = await projectDetailsResponse.json();
            for (const project of projectDetailsData.projectsDetails || []) {
              if (!projectsMap.has(project.address)) {
                projectsMap.set(project.address, project);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching project details for epoch ${epoch}:`, error);
        }
      }

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
                const projectData = projectsMap.get(reward.address);
                const projectId = `daoip5:${projectData?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}:project:${reward.address}`;
                
                // Calculate USD amount
                const ethAmount = amountInEth.toFixed(6);
                const fundsApprovedInUSD = await currencyService.convertETHToUSD(ethAmount);
                
                // Build socials array from project data
                const socials: Array<{ platform: string; url: string }> = [];
                if (projectData?.website) {
                  socials.push({ platform: "Website", url: projectData.website });
                }
                
                // Fetch KARMA GAP UID for the project
                const projectName = projectData?.name || `Project ${reward.address.slice(-8)}`;
                const karmaUID = await karmaService.searchProjectUID(projectName);
                
                const application: DAOIP5Application = {
                  type: "GrantApplication",
                  id: `daoip5:octant:grantPool:${epoch}:grantApplication:${reward.address}`,
                  grantPoolId: `daoip5:octant:grantPool:${epoch}`,
                  grantPoolName: `Octant Epoch ${epoch}`,
                  projectId: projectId,
                  projectName: projectName,
                  createdAt: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)).toISOString(),
                  contentURI: projectData?.website || `https://octant.app/project/${reward.address}`,
                  socials: socials.length > 0 ? socials : undefined,
                  fundsApproved: [{
                    amount: ethAmount,
                    denomination: "ETH"
                  }],
                  fundsApprovedInUSD: fundsApprovedInUSD,
                  payoutAddress: {
                    type: "EthereumAddress",
                    value: reward.address
                  },
                  status: "funded", // Octant applications with rewards are considered funded
                  extensions: {
                    "app.octant.applicationMetadata": {
                      epochNumber: epoch,
                      rewardAllocation: reward.allocated,
                      projectAddress: reward.address,
                      fundingMechanism: "quadratic_funding",
                      network: "ethereum",
                      chainId: "1"
                    },
                    "app.octant.projectDetails": {
                      profileImageSmall: projectData?.profileImageSmall,
                      profileImageMedium: projectData?.profileImageMedium,
                      description: projectData?.description,
                      website: projectData?.website
                    },
                    // Add KARMA GAP UID if found
                    ...(karmaUID ? { "x-karmagap-uid": karmaUID } : {})
                  }
                };

                // Apply filters
                if (filters?.poolId && application.grantPoolId !== filters.poolId) continue;
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
        const amountA = parseFloat(a.fundsApproved?.[0]?.amount || '0');
        const amountB = parseFloat(b.fundsApproved?.[0]?.amount || '0');
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

  async getPoolsPaginated(filters?: QueryFilters): Promise<PaginatedResult<DAOIP5GrantPool>> {
    const allPools = await this.getPools(filters);
    return {
      data: allPools,
      totalCount: allPools.length
    };
  }



  async getApplicationsPaginated(filters?: QueryFilters): Promise<PaginatedResult<DAOIP5Application>> {
    // For Octant, we need to calculate total without applying limit/offset
    const allApplications = await this.getApplications({ ...filters, limit: undefined, offset: undefined });
    const totalCount = allApplications.length;
    
    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 20;
    const data = allApplications.slice(offset, offset + limit);
    
    return {
      data,
      totalCount
    };
  }
}
