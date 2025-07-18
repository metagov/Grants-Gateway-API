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
      // For now, return a sample of projects to demonstrate the structure
      // This will be replaced with proper GraphQL integration once API structure is confirmed
      const sampleProjects: DAOIP5Project[] = [
        {
          type: "Project",
          id: "daoip5:protocol-guild:project:sample1",
          name: "Protocol Guild",
          description: "Supporting Ethereum core protocol development",
          contentURI: "https://giveth.io/project/protocol-guild",
          image: "https://giveth.io/images/protocol-guild.png",
          coverImage: "https://giveth.io/images/protocol-guild-cover.png",
          socials: [
            { name: "twitter", value: "https://twitter.com/protocolguild" },
            { name: "github", value: "https://github.com/protocolguild" }
          ],
          extensions: {
            "io.giveth.projectMetadata": {
              projectId: "sample1",
              slug: "protocol-guild",
              creationDate: "2023-01-15T00:00:00.000Z",
              status: "active",
              addresses: [{ address: "0x123...", chainType: "ethereum", isRecipient: true }],
              socialMedia: [
                { type: "twitter", link: "https://twitter.com/protocolguild" }
              ],
              qfRounds: [{ id: "14", name: "ENS x Octant Public Goods", isActive: false }],
              primaryRecipientAddress: "0x123..."
            },
            "io.giveth.platform": {
              platform: "giveth",
              fundingMechanism: "donations_and_qf",
              network: "ethereum",
              chainId: "1",
              projectUrl: "https://giveth.io/project/protocol-guild",
              donationUrl: "https://giveth.io/donate/protocol-guild"
            }
          }
        },
        {
          type: "Project",
          id: "daoip5:public-goods-network:project:sample2",
          name: "Public Goods Network",
          description: "Infrastructure for sustainable public goods funding",
          contentURI: "https://giveth.io/project/public-goods-network",
          image: "https://giveth.io/images/pgn.png",
          coverImage: "https://giveth.io/images/pgn-cover.png",
          extensions: {
            "io.giveth.projectMetadata": {
              projectId: "sample2",
              slug: "public-goods-network",
              creationDate: "2023-06-01T00:00:00.000Z",
              status: "active",
              addresses: [{ address: "0x456...", chainType: "ethereum", isRecipient: true }],
              qfRounds: [{ id: "13", name: "Loving on Public Goods", isActive: false }],
              primaryRecipientAddress: "0x456..."
            },
            "io.giveth.platform": {
              platform: "giveth",
              fundingMechanism: "donations_and_qf",
              network: "ethereum",
              chainId: "1",
              projectUrl: "https://giveth.io/project/public-goods-network",
              donationUrl: "https://giveth.io/donate/public-goods-network"
            }
          }
        }
      ];

      // Apply filters
      let results = sampleProjects;
      
      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        results = results.filter(project => 
          project.name.toLowerCase().includes(searchTerm) ||
          project.description.toLowerCase().includes(searchTerm)
        );
      }

      const startIndex = filters?.offset || 0;
      const endIndex = startIndex + (filters?.limit || 10);
      
      return results.slice(startIndex, endIndex);
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
      // For Giveth, applications are implicit through project-QF round relationships
      const projectsList = await this.getProjects({ limit: filters?.limit || 50 });
      const allPools = await this.getPools({ limit: 20 });
      
      // If no specific poolId is provided, get applications for the latest (most recent) round only
      let targetPools = allPools;
      if (!filters?.poolId) {
        // Find the latest pool by close date
        const latestPool = allPools.reduce((latest, pool) => {
          if (!latest) return pool;
          const latestDate = latest.closeDate ? new Date(latest.closeDate) : new Date(0);
          const poolDate = pool.closeDate ? new Date(pool.closeDate) : new Date(0);
          return poolDate > latestDate ? pool : latest;
        }, allPools[0]);
        
        targetPools = latestPool ? [latestPool] : [];
      } else {
        // Filter to specific pool if poolId is provided
        targetPools = allPools.filter(pool => pool.id === filters.poolId);
      }
      
      const applications: DAOIP5Application[] = [];

      for (const project of projectsList) {
        // Only create applications for projects that actually participated in QF rounds
        const projectQfRounds = project.extensions?.["io.giveth.projectMetadata"]?.qfRounds || [];
        
        for (const pool of targetPools) {
          // Check if this project actually participated in this QF round
          const participatedInRound = projectQfRounds.some((qfRound: any) => 
            qfRound.id === pool.extensions?.["io.giveth.roundMetadata"]?.qfRoundId
          );
          
          if (!participatedInRound) continue;
          // Extract social media for DAOIP-5 format
          const socials: Array<{ platform: string; url: string }> = [];
          if (project.extensions?.["io.giveth.projectMetadata"]?.socialMedia) {
            for (const social of project.extensions["io.giveth.projectMetadata"].socialMedia) {
              socials.push({
                platform: social.type,
                url: social.link
              });
            }
          }

          const application: DAOIP5Application = {
            type: "GrantApplication",
            id: `daoip5:giveth:grantApplication:${project.id}-${pool.id}`,
            grantPoolId: pool.id,
            grantPoolName: pool.name,
            projectId: project.id,
            projectName: project.name || "",
            createdAt: project.extensions?.["io.giveth.projectMetadata"]?.creationDate ? 
              this.formatDate(project.extensions["io.giveth.projectMetadata"].creationDate) : 
              new Date().toISOString(),
            contentURI: `https://giveth.io/project/${project.extensions?.["io.giveth.projectMetadata"]?.slug}`,
            socials: socials.length > 0 ? socials : undefined,
            payoutAddress: project.extensions?.["io.giveth.projectMetadata"]?.primaryRecipientAddress ? {
              type: "EthereumAddress", 
              value: project.extensions["io.giveth.projectMetadata"].primaryRecipientAddress
            } : undefined,
            status: pool.isOpen ? "pending" : "approved",
            extensions: {
              "io.giveth.applicationMetadata": {
                projectSlug: project.extensions?.["io.giveth.projectMetadata"]?.slug,
                qfRoundSlug: pool.extensions?.["io.giveth.roundMetadata"]?.slug,
                projectStatus: project.extensions?.["io.giveth.projectMetadata"]?.status,
                qfRoundId: pool.extensions?.["io.giveth.roundMetadata"]?.qfRoundId
              }
            }
          };

          // Apply remaining filters (poolId already handled above)
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
