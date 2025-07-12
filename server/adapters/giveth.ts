import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application, QueryFilters } from "./base";
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
          id: this.toCaip10(`0x${round.id}`, "1"), // Ethereum mainnet
          name: round.name || "",
          description: round.description || `Quadratic Funding round on Giveth platform. ${round.name} provides funding for public goods projects through community-driven quadratic funding mechanisms.`,
          grantFundingMechanism: "Quadratic Funding",
          isOpen: round.isActive || false,
          closeDate: round.endDate ? this.formatDate(round.endDate) : undefined,
          applicationsURI: `/api/v1/applications?poolId=${this.toCaip10(`0x${round.id}`, "1")}`,
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
              totalGrantPoolSizeUSD: totalGrantPoolSizeUSD,
              beginDate: round.beginDate,
              endDate: round.endDate,
              isActive: round.isActive
            },
            "io.giveth.platform": {
              platform: "giveth",
              fundingMechanism: "quadratic_funding",
              network: "ethereum",
              chainId: "1",
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
      const query = `
        query GetProjects($limit: Int, $skip: Int) {
          allProjects(limit: $limit, skip: $skip) {
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
        limit: filters?.limit || 10,
        skip: filters?.offset || 0
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
          id: primaryAddress ? this.toCaip10(primaryAddress) : `giveth:project:${project.id}`,
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

      return projects;
    } catch (error) {
      console.error("Error fetching Giveth projects:", error);
      return [];
    }
  }

  async getProject(id: string): Promise<DAOIP5Project | null> {
    const projects = await this.getProjects();
    return projects.find(project => project.id === id) || null;
  }

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      // For Giveth, applications are implicit through project-QF round relationships
      const projects = await this.getProjects({ limit: 100 });
      const pools = await this.getPools({ limit: 100 });
      const applications: DAOIP5Application[] = [];

      for (const project of projects) {
        // Since Giveth doesn't have explicit applications, we create them based on QF round participation
        for (const pool of pools) {
          const application: DAOIP5Application = {
            type: "Application",
            id: `${project.id}-${pool.id}`,
            projectId: project.id,
            poolId: pool.id,
            status: pool.isOpen ? "pending" : "approved",
            submissionDate: new Date().toISOString(), // Giveth doesn't provide submission dates
          };

          // Apply filters
          if (filters?.poolId && application.poolId !== filters.poolId) continue;
          if (filters?.projectId && application.projectId !== filters.projectId) continue;
          if (filters?.status && application.status !== filters.status) continue;

          applications.push(application);
        }
      }

      return applications.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 10));
    } catch (error) {
      console.error("Error fetching Giveth applications:", error);
      return [];
    }
  }

  async getApplication(id: string): Promise<DAOIP5Application | null> {
    const applications = await this.getApplications();
    return applications.find(app => app.id === id) || null;
  }
}
