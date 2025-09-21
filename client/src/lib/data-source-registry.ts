// Dynamic Data Source Registry for automatic integration of new grant systems
// This demonstrates how DAOIP-5 standardization enables seamless addition of new ecosystems

export interface DataSourceConfig {
  id: string;
  name: string;
  description: string;
  type: "api" | "static" | "graphql";
  source: "opengrants" | "daoip5" | "custom";
  endpoints?: {
    systems?: string;
    pools?: string;
    applications?: string;
    projects?: string;
  };
  standardization: {
    version: string; // DAOIP-5 version
    mappings: Record<string, string>; // Field mappings to DAOIP-5
    compatibility: number; // 0-100 compatibility score
  };
  features: {
    fundingMechanism: string[];
    dataRefreshRate?: string;
    historicalData?: boolean;
    realTimeUpdates?: boolean;
  };
  metadata: {
    addedDate: string;
    lastUpdated: string;
    status: "active" | "pending" | "inactive";
    network?: string[];
    currency?: string[];
  };
}

// Registry of all available data sources
class DataSourceRegistry {
  private sources: Map<string, DataSourceConfig> = new Map();
  private listeners: Set<(sources: DataSourceConfig[]) => void> = new Set();

  constructor() {
    this.initializeCoreSources();
  }

  private initializeCoreSources() {
    // OpenGrants API sources
    this.register({
      id: "octant",
      name: "Octant",
      description:
        "Quadratic funding for Ethereum public goods through ETH staking proceeds",
      type: "api",
      source: "opengrants",
      endpoints: {
        systems: "https://grants.daostar.org/api/v1/grantSystems",
        pools: "https://grants.daostar.org/api/v1/grantPools?system=octant",
        applications:
          "https://grants.daostar.org/api/v1/grantApplications?system=octant",
      },
      standardization: {
        version: "DAOIP-5 v1.0",
        mappings: {
          id: "id",
          name: "name",
          status: "status",
          fundsApprovedInUSD: "fundsApprovedInUSD",
          grantPoolId: "grantPoolId",
        },
        compatibility: 100,
      },
      features: {
        fundingMechanism: ["Quadratic Funding"],
        dataRefreshRate: "daily",
        historicalData: true,
        realTimeUpdates: false,
      },
      metadata: {
        addedDate: "2024-01-15",
        lastUpdated: new Date().toISOString(),
        status: "active",
        network: ["ethereum"],
        currency: ["ETH"],
      },
    });

    this.register({
      id: "giveth",
      name: "Giveth",
      description:
        "Donation platform for public goods and social impact projects",
      type: "api",
      source: "opengrants",
      endpoints: {
        systems: "https://grants.daostar.org/api/v1/grantSystems",
        pools: "https://grants.daostar.org/api/v1/grantPools?system=giveth",
        applications:
          "https://grants.daostar.org/api/v1/grantApplications?system=giveth",
      },
      standardization: {
        version: "DAOIP-5 v1.0",
        mappings: {
          id: "id",
          name: "name",
          status: "status",
          fundsApprovedInUSD: "fundsApprovedInUSD",
          grantPoolId: "grantPoolId",
        },
        compatibility: 100,
      },
      features: {
        fundingMechanism: ["Donations", "Quadratic Funding"],
        dataRefreshRate: "real-time",
        historicalData: true,
        realTimeUpdates: true,
      },
      metadata: {
        addedDate: "2024-01-15",
        lastUpdated: new Date().toISOString(),
        status: "active",
        network: ["ethereum", "gnosis"],
        currency: ["ETH", "GIV"],
      },
    });

    // DAOIP5 Static sources
    this.register({
      id: "stellar",
      name: "Stellar Community Fund",
      description: "Community-driven funding for Stellar ecosystem development",
      type: "static",
      source: "daoip5",
      endpoints: {
        systems: "https://daoip5.daostar.org",
        pools: "https://daoip5.daostar.org/stellar",
        applications: "https://daoip5.daostar.org/stellar/{pool}.json",
      },
      standardization: {
        version: "DAOIP-5 v1.0",
        mappings: {
          id: "id",
          projectName: "projectName",
          status: "status",
          fundsApprovedInUSD: "fundsApprovedInUSD",
          grantPoolId: "grantPoolId",
        },
        compatibility: 95,
      },
      features: {
        fundingMechanism: ["Direct Grants"],
        dataRefreshRate: "quarterly",
        historicalData: true,
        realTimeUpdates: false,
      },
      metadata: {
        addedDate: "2024-02-01",
        lastUpdated: new Date().toISOString(),
        status: "active",
        network: ["stellar"],
        currency: ["XLM", "USD"],
      },
    });

    // Only register the 3 requested systems - Octant, Giveth, and Stellar
  }

  // Register a new data source
  register(config: DataSourceConfig): void {
    this.sources.set(config.id, config);
    this.notifyListeners();
    console.log(
      `📊 Registered new data source: ${config.name} with DAOIP-5 compatibility: ${config.standardization.compatibility}%`,
    );
  }

  // Auto-discover and register new sources from APIs
  async autoDiscover(): Promise<DataSourceConfig[]> {
    const discovered: DataSourceConfig[] = [];

    // Skip external API calls to avoid CORS issues, use known systems directly
    try {
      // Register known OpenGrants systems without external fetch
      const knownOpenGrantsSystems = [
        { name: 'Octant', extensions: { description: 'Quadratic funding for Ethereum public goods' }},
        { name: 'Giveth', extensions: { description: 'Donation platform for public goods' }}
      ];
      
      const systems = knownOpenGrantsSystems;

        systems.forEach((system: any) => {
          const id = system.name.toLowerCase();
          if (!this.sources.has(id)) {
            const newSource: DataSourceConfig = {
              id,
              name: system.name,
              description:
                system.extensions?.description ||
                "Auto-discovered grant system",
              type: "api",
              source: "opengrants",
              endpoints: {
                pools: `https://grants.daostar.org/api/v1/grantPools?system=${id}`,
                applications: `https://grants.daostar.org/api/v1/grantApplications?system=${id}`,
              },
              standardization: {
                version: "DAOIP-5 v1.0",
                mappings: this.detectFieldMappings(system),
                compatibility: this.calculateCompatibility(system),
              },
              features: {
                fundingMechanism: this.detectFundingMechanisms(system),
                dataRefreshRate: "daily",
                historicalData: true,
              },
              metadata: {
                addedDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                status: "active",
              },
            };

            this.register(newSource);
            discovered.push(newSource);
          }
        });
    } catch (error) {
      console.warn("Could not fetch from OpenGrants API, using existing sources");
    }

    // DAOIP-5 static data systems 
    const knownDaoip5Systems = [
      'stellar',  // Stellar Community Fund
      'celo-org'  // Celo Public Goods
    ];

    // Register known DAOIP5 systems without external fetch
    try {
      knownDaoip5Systems.forEach((systemName: string) => {
          if (!this.sources.has(systemName)) {
            const systemInfo = this.getDaoip5SystemInfo(systemName);
            const newSource: DataSourceConfig = {
              id: systemName,
              name: systemInfo.name,
              description: systemInfo.description,
              type: "static",
              source: "daoip5",
              endpoints: {
                systems: "https://daoip5.daostar.org/",
                pools: `https://daoip5.daostar.org/${systemName}`,
                applications: `https://daoip5.daostar.org/${systemName}/applications`,
              },
              standardization: {
                version: "DAOIP-5 v1.0",
                mappings: this.getDefaultMappings(),
                compatibility: systemInfo.compatibility,
              },
              features: {
                fundingMechanism: systemInfo.mechanisms,
                dataRefreshRate: "monthly",
                historicalData: true,
              },
              metadata: {
                addedDate: systemInfo.addedDate,
                lastUpdated: new Date().toISOString(),
                status: "active",
              },
            };

            this.register(newSource);
            discovered.push(newSource);
          }
        });
    } catch (error) {
      console.warn("Error registering DAOIP5 sources:", error);
    }

    return discovered;
  }

  // Get all registered sources
  getAllSources(): DataSourceConfig[] {
    return Array.from(this.sources.values());
  }

  // Get active sources for dashboard analytics (excludes Octant and Giveth)
  getActiveSourcesForDashboard(): DataSourceConfig[] {
    const allSources = this.getActiveSources();
    // Filter out Octant and Giveth from dashboard analytics
    return allSources.filter(source => 
      source.id !== 'octant' && source.id !== 'giveth'
    );
  }

  // Get active sources, prioritizing grants.daostar.org (Type 1) sources for better data analysis
  getActiveSources(): DataSourceConfig[] {
    const allSources = this.getAllSources().filter(
      (source) => source.metadata.status === "active",
    );
    
    // Group sources by system name (case-insensitive)
    const sourceGroups = new Map<string, DataSourceConfig[]>();
    
    allSources.forEach(source => {
      const systemKey = source.name.toLowerCase().replace(/[\s-_]/g, '');
      if (!sourceGroups.has(systemKey)) {
        sourceGroups.set(systemKey, []);
      }
      sourceGroups.get(systemKey)!.push(source);
    });
    
    // For each group, prefer grants.daostar.org (Type 1/opengrants) sources
    const preferredSources: DataSourceConfig[] = [];
    
    sourceGroups.forEach(sources => {
      if (sources.length === 1) {
        preferredSources.push(sources[0]);
      } else {
        // Multiple sources for same system - prefer grants.daostar.org (Type 1)
        const grantsDAOStarSources = sources.filter(s => 
          s.source === 'opengrants' && 
          s.endpoints?.systems?.includes('grants.daostar.org')
        );
        const otherType1Sources = sources.filter(s => 
          s.source === 'opengrants' && 
          !s.endpoints?.systems?.includes('grants.daostar.org')
        );
        const type2Sources = sources.filter(s => s.source === 'daoip5');
        
        if (grantsDAOStarSources.length > 0) {
          // First preference: grants.daostar.org sources
          preferredSources.push(grantsDAOStarSources[0]);
          console.log(`🎯 Using grants.daostar.org source for ${grantsDAOStarSources[0].name} (best data quality)`);
        } else if (otherType1Sources.length > 0) {
          // Second preference: Other Type 1 sources
          preferredSources.push(otherType1Sources[0]);
          console.log(`🔄 Using Type 1 API for ${otherType1Sources[0].name}`);
        } else {
          // Fallback to Type 2 if no Type 1 available
          preferredSources.push(type2Sources[0]);
        }
      }
    });
    
    return preferredSources;
  }

  // Get source by ID
  getSource(id: string): DataSourceConfig | undefined {
    return this.sources.get(id);
  }

  // Update source configuration
  updateSource(id: string, updates: Partial<DataSourceConfig>): void {
    const source = this.sources.get(id);
    if (source) {
      this.sources.set(id, { ...source, ...updates });
      this.notifyListeners();
    }
  }

  // Subscribe to source changes
  subscribe(listener: (sources: DataSourceConfig[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const sources = this.getAllSources();
    this.listeners.forEach((listener) => listener(sources));
  }

  private detectFieldMappings(system: any): Record<string, string> {
    // Intelligent field mapping detection based on DAOIP-5 standard
    const mappings: Record<string, string> = {};
    const standardFields = [
      "id",
      "name",
      "status",
      "fundsApprovedInUSD",
      "grantPoolId",
      "projectId",
      "projectName",
    ];

    standardFields.forEach((field) => {
      // Check if field exists directly or in extensions
      if (system[field]) {
        mappings[field] = field;
      } else if (system.extensions) {
        Object.keys(system.extensions).forEach((ext) => {
          if (system.extensions[ext][field]) {
            mappings[field] = `extensions.${ext}.${field}`;
          }
        });
      }
    });

    return mappings;
  }

  private calculateCompatibility(system: any): number {
    // Calculate DAOIP-5 compatibility score
    let score = 0;
    const requiredFields = ["id", "name", "type"];
    const optionalFields = [
      "status",
      "fundsApprovedInUSD",
      "grantPoolId",
      "projectId",
    ];

    requiredFields.forEach((field) => {
      if (system[field]) score += 20;
    });

    optionalFields.forEach((field) => {
      if (system[field] || this.findFieldInExtensions(system, field)) {
        score += 10;
      }
    });

    return Math.min(score, 100);
  }

  private findFieldInExtensions(obj: any, field: string): boolean {
    if (!obj.extensions) return false;
    return Object.values(obj.extensions).some(
      (ext: any) => ext && typeof ext === "object" && field in ext,
    );
  }

  private detectFundingMechanisms(system: any): string[] {
    // Detect funding mechanisms from system metadata
    const mechanisms: string[] = [];
    const keywords = {
      quadratic: "Quadratic Funding",
      retroactive: "Retroactive Public Goods",
      direct: "Direct Grants",
      milestone: "Milestone-Based",
      donation: "Donations",
    };

    const searchText = JSON.stringify(system).toLowerCase();
    Object.entries(keywords).forEach(([key, value]) => {
      if (searchText.includes(key)) {
        mechanisms.push(value);
      }
    });

    return mechanisms.length > 0 ? mechanisms : ["Direct Grants"];
  }

  private formatSystemName(id: string): string {
    // Convert system ID to readable name
    return id
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  private getDefaultMappings(): Record<string, string> {
    // Default DAOIP-5 field mappings
    return {
      id: "id",
      name: "name",
      projectName: "projectName",
      status: "status",
      fundsApprovedInUSD: "fundsApprovedInUSD",
      grantPoolId: "grantPoolId",
      grantPoolName: "grantPoolName",
    };
  }

  private getDaoip5SystemInfo(systemName: string): any {
    const systemInfoMap: Record<string, any> = {
      'stellar': {
        name: 'Stellar Community Fund',
        description: 'Stellar Development Foundation community fund rounds',
        compatibility: 95,
        mechanisms: ['Direct Grants', 'Community Voting'],
        addedDate: '2024-02-01'
      },
      'celo-org': {
        name: 'Celo Public Goods',
        description: 'Celo Foundation public goods funding program',
        compatibility: 90,
        mechanisms: ['Direct Grants', 'Public Goods Funding'],
        addedDate: '2024-12-01'
      }
    };

    return systemInfoMap[systemName] || {
      name: this.formatSystemName(systemName),
      description: `Grant system: ${systemName}`,
      compatibility: 75,
      mechanisms: ['Direct Grants'],
      addedDate: new Date().toISOString()
    };
  }
}

// Global registry instance
export const dataSourceRegistry = new DataSourceRegistry();

// Auto-discover sources on initialization
if (typeof window !== "undefined") {
  dataSourceRegistry.autoDiscover().then((discovered) => {
    if (discovered.length > 0) {
      console.log(`🔍 Auto-discovered ${discovered.length} new data sources`);
    }
  });
}
