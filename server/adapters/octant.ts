import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application, QueryFilters } from "./base";

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
      projectsURI: "/api/v1/projects?system=octant"
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
      
      // Process epochs based on filters or default range
      const epochRange = filters?.limit ? Math.min(filters.limit, 5) : 5;
      const startEpoch = Math.max(1, currentEpoch - epochRange + 1);

      for (let epoch = startEpoch; epoch <= currentEpoch; epoch++) {
        try {
          const epochInfoResponse = await fetch(`${this.baseUrl}/epochs/info/${epoch}`);
          if (!epochInfoResponse.ok) continue;
          
          const epochInfo = await epochInfoResponse.json();
          
          // Calculate epoch dates (90-day epochs starting from Oct 1, 2023)
          const epoch0Start = new Date('2023-10-01');
          const epochStart = new Date(epoch0Start.getTime() + (epoch * 90 * 24 * 60 * 60 * 1000));
          const epochEnd = new Date(epochStart.getTime() + (90 * 24 * 60 * 60 * 1000));
          
          const pool: DAOIP5GrantPool = {
            type: "GrantPool",
            id: this.toCaip10(`0x${epoch.toString().padStart(40, '0')}`),
            name: `Octant Epoch ${epoch}`,
            description: `Quadratic funding round for Ethereum public goods - Epoch ${epoch}. Duration: 90 days`,
            grantFundingMechanism: "Quadratic Funding",
            isOpen: epoch === currentEpoch,
            closeDate: epochEnd.toISOString(),
            applicationsURI: `/api/v1/applications?poolId=${this.toCaip10(`0x${epoch.toString().padStart(40, '0')}`)}`,
            governanceURI: "https://octant.app/",
            totalGrantPoolSize: epochInfo.leftover ? [{
              amount: String(parseInt(epochInfo.leftover) / 1e18), // Convert wei to ETH
              denomination: "ETH"
            }] : undefined,
            email: "hello@octant.app",
            image: "https://octant.app/favicon.ico"
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
          id: this.toCaip10(project.address),
          name: project.name || `Project ${project.address.slice(-8)}`,
          description: project.description || "Ethereum public goods project funded through Octant",
          contentURI: project.website || `https://octant.app/project/${project.address}`,
          image: project.profileImageSmall || "",
          coverImage: project.profileImageMedium || project.profileImageSmall || "",
          socials: socials.length > 0 ? socials : undefined,
          relevantTo: [`octant-epoch-${currentEpoch}`]
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

      // Determine which epoch to query based on filters
      let epoch = currentEpoch;
      if (filters?.poolId) {
        const poolIdMatch = filters.poolId.match(/0x0*(\d+)/);
        if (poolIdMatch) {
          epoch = parseInt(poolIdMatch[1]) || currentEpoch;
        }
      }

      const applications: DAOIP5Application[] = [];

      try {
        // Fetch allocations for the epoch
        const allocationsResponse = await fetch(`${this.baseUrl}/allocations/epoch/${epoch}?includeZeroAllocations=false`);
        
        if (allocationsResponse.ok) {
          const allocationsData = await allocationsResponse.json();
          
          for (const allocation of allocationsData.allocations || []) {
            const amountInEth = parseInt(allocation.amount) / 1e18; // Convert wei to ETH
            
            const application: DAOIP5Application = {
              type: "Application",
              id: `${this.toCaip10(allocation.projectAddress)}-epoch-${epoch}`,
              projectId: this.toCaip10(allocation.projectAddress),
              poolId: this.toCaip10(`0x${epoch.toString().padStart(40, '0')}`),
              status: amountInEth > 0 ? "approved" : "pending",
              submissionDate: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)).toISOString(), // Approximate epoch start
              approvedAmount: amountInEth > 0 ? [{
                amount: amountInEth.toFixed(6),
                denomination: "ETH"
              }] : undefined
            };

            // Apply filters
            if (filters?.poolId && application.poolId !== filters.poolId) continue;
            if (filters?.projectId && application.projectId !== filters.projectId) continue;
            if (filters?.status && application.status !== filters.status) continue;

            applications.push(application);
          }
        }

        // Also try to fetch project rewards for more complete data
        try {
          const rewardsResponse = await fetch(`${this.baseUrl}/rewards/projects/epoch/${epoch}`);
          if (rewardsResponse.ok) {
            const rewardsData = await rewardsResponse.json();
            
            for (const reward of rewardsData.rewards || []) {
              const existingApp = applications.find(app => 
                app.projectId === this.toCaip10(reward.address)
              );
              
              if (existingApp && reward.allocated) {
                const rewardInEth = parseInt(reward.allocated) / 1e18;
                existingApp.approvedAmount = [{
                  amount: rewardInEth.toFixed(6),
                  denomination: "ETH"
                }];
                existingApp.status = "approved";
              }
            }
          }
        } catch (rewardError) {
          // Rewards endpoint might not be available for all epochs
          console.log(`Rewards not available for epoch ${epoch}`);
        }

      } catch (error) {
        console.error(`Error fetching data for epoch ${epoch}:`, error);
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
