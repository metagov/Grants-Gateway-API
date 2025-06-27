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
      const currentEpochData = await currentEpochResponse.json();
      const currentEpoch = currentEpochData.currentEpoch;

      const pools: DAOIP5GrantPool[] = [];

      // Create pools for recent epochs (current and past few)
      for (let epoch = Math.max(1, currentEpoch - 2); epoch <= currentEpoch; epoch++) {
        try {
          const epochInfoResponse = await fetch(`${this.baseUrl}/epochs/info/${epoch}`);
          if (!epochInfoResponse.ok) continue;
          
          const epochInfo = await epochInfoResponse.json();
          
          const pool: DAOIP5GrantPool = {
            type: "GrantPool",
            id: this.toCaip10(`0x${epoch.toString().padStart(40, '0')}`),
            name: `Octant Epoch ${epoch}`,
            description: `Quadratic funding round for Ethereum public goods - Epoch ${epoch}`,
            grantFundingMechanism: "Quadratic Funding",
            isOpen: epoch === currentEpoch && epochInfo.status === "current",
            closeDate: epochInfo.endDate ? this.formatDate(epochInfo.endDate) : undefined,
            applicationsURI: `/api/v1/applications?poolId=${this.toCaip10(`0x${epoch.toString().padStart(40, '0')}`)}`,
            governanceURI: "https://octant.app/",
            totalGrantPoolSize: epochInfo.budget ? [{
              amount: this.formatAmount(epochInfo.budget, "ETH", "USD"),
              denomination: "USD"
            }] : undefined,
            email: "hello@octant.app",
            image: "https://octant.app/logo.png"
          };

          // Apply filters
          if (filters?.isOpen !== undefined && pool.isOpen !== filters.isOpen) {
            continue;
          }

          pools.push(pool);
        } catch (error) {
          console.error(`Error fetching epoch ${epoch}:`, error);
        }
      }

      return pools.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 10));
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
      const currentEpochData = await currentEpochResponse.json();
      const currentEpoch = currentEpochData.currentEpoch;

      const projectsResponse = await fetch(`${this.baseUrl}/projects/epoch/${currentEpoch}`);
      if (!projectsResponse.ok) {
        throw new Error(`HTTP error! status: ${projectsResponse.status}`);
      }

      const projectsData = await projectsResponse.json();
      const projects: DAOIP5Project[] = [];

      for (const project of projectsData.projects || []) {
        const socials: Array<{ name: string; value: string }> = [];
        
        if (project.socials) {
          if (project.socials.twitter) {
            socials.push({ name: "twitter", value: project.socials.twitter });
          }
          if (project.socials.github) {
            socials.push({ name: "github", value: project.socials.github });
          }
          if (project.socials.discord) {
            socials.push({ name: "discord", value: project.socials.discord });
          }
        }

        const daoip5Project: DAOIP5Project = {
          type: "Project",
          id: this.toCaip10(project.address),
          name: project.name || "",
          description: project.description || "",
          contentURI: project.website || "",
          image: project.profileImageSmall || project.profileImageMedium || "",
          coverImage: project.profileImageMedium || project.profileImageSmall || "",
          socials: socials.length > 0 ? socials : undefined
        };

        // Apply search filter
        if (filters?.search) {
          const searchTerm = filters.search.toLowerCase();
          if (!daoip5Project.name.toLowerCase().includes(searchTerm) &&
              !daoip5Project.description.toLowerCase().includes(searchTerm)) {
            continue;
          }
        }

        projects.push(daoip5Project);
      }

      return projects.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 10));
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
      const currentEpochData = await currentEpochResponse.json();
      const currentEpoch = currentEpochData.currentEpoch;

      const epoch = filters?.poolId ? 
        parseInt(filters.poolId.split(':')[2]?.replace(/^0+/, '') || '0') : 
        currentEpoch;

      const allocationsResponse = await fetch(`${this.baseUrl}/allocations/epoch/${epoch}`);
      if (!allocationsResponse.ok) {
        return [];
      }

      const allocationsData = await allocationsResponse.json();
      const applications: DAOIP5Application[] = [];

      for (const allocation of allocationsData.allocations || []) {
        const application: DAOIP5Application = {
          type: "Application",
          id: `${this.toCaip10(allocation.projectAddress)}-${epoch}`,
          projectId: this.toCaip10(allocation.projectAddress),
          poolId: this.toCaip10(`0x${epoch.toString().padStart(40, '0')}`),
          status: "approved",
          submissionDate: new Date().toISOString(), // Octant doesn't provide submission dates
          approvedAmount: [{
            amount: this.formatAmount(allocation.amount, "ETH", "USD"),
            denomination: "USD"
          }]
        };

        // Apply filters
        if (filters?.poolId && application.poolId !== filters.poolId) continue;
        if (filters?.projectId && application.projectId !== filters.projectId) continue;
        if (filters?.status && application.status !== filters.status) continue;

        applications.push(application);
      }

      return applications.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 10));
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
