// Dynamic Data Source Registry for automatic integration of new grant systems
// This demonstrates how DAOIP-5 standardization enables seamless addition of new ecosystems

export interface DataSourceConfig {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'static' | 'graphql';
  source: 'opengrants' | 'daoip5' | 'custom';
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
    status: 'active' | 'pending' | 'inactive';
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
      id: 'octant',
      name: 'Octant',
      description: 'Quadratic funding for Ethereum public goods through ETH staking proceeds',
      type: 'api',
      source: 'opengrants',
      endpoints: {
        systems: 'https://grants.daostar.org/api/v1/grantSystems',
        pools: 'https://grants.daostar.org/api/v1/grantPools?system=octant',
        applications: 'https://grants.daostar.org/api/v1/grantApplications?system=octant'
      },
      standardization: {
        version: 'DAOIP-5 v1.0',
        mappings: {
          'id': 'id',
          'name': 'name',
          'status': 'status',
          'fundsApprovedInUSD': 'fundsApprovedInUSD',
          'grantPoolId': 'grantPoolId'
        },
        compatibility: 100
      },
      features: {
        fundingMechanism: ['Quadratic Funding'],
        dataRefreshRate: 'daily',
        historicalData: true,
        realTimeUpdates: false
      },
      metadata: {
        addedDate: '2024-01-15',
        lastUpdated: new Date().toISOString(),
        status: 'active',
        network: ['ethereum'],
        currency: ['ETH']
      }
    });

    this.register({
      id: 'giveth',
      name: 'Giveth',
      description: 'Donation platform for public goods and social impact projects',
      type: 'api',
      source: 'opengrants',
      endpoints: {
        systems: 'https://grants.daostar.org/api/v1/grantSystems',
        pools: 'https://grants.daostar.org/api/v1/grantPools?system=giveth',
        applications: 'https://grants.daostar.org/api/v1/grantApplications?system=giveth'
      },
      standardization: {
        version: 'DAOIP-5 v1.0',
        mappings: {
          'id': 'id',
          'name': 'name',
          'status': 'status',
          'fundsApprovedInUSD': 'fundsApprovedInUSD',
          'grantPoolId': 'grantPoolId'
        },
        compatibility: 100
      },
      features: {
        fundingMechanism: ['Donations', 'Quadratic Funding'],
        dataRefreshRate: 'real-time',
        historicalData: true,
        realTimeUpdates: true
      },
      metadata: {
        addedDate: '2024-01-15',
        lastUpdated: new Date().toISOString(),
        status: 'active',
        network: ['ethereum', 'gnosis'],
        currency: ['ETH', 'GIV']
      }
    });

    // DAOIP5 Static sources
    this.register({
      id: 'stellar',
      name: 'Stellar Community Fund',
      description: 'Community-driven funding for Stellar ecosystem development',
      type: 'static',
      source: 'daoip5',
      endpoints: {
        systems: 'https://daoip5.daostar.org/',
        pools: 'https://daoip5.daostar.org/stellar',
        applications: 'https://daoip5.daostar.org/stellar/{pool}.json'
      },
      standardization: {
        version: 'DAOIP-5 v1.0',
        mappings: {
          'id': 'id',
          'projectName': 'projectName',
          'status': 'status',
          'fundsApprovedInUSD': 'fundsApprovedInUSD',
          'grantPoolId': 'grantPoolId'
        },
        compatibility: 95
      },
      features: {
        fundingMechanism: ['Direct Grants'],
        dataRefreshRate: 'quarterly',
        historicalData: true,
        realTimeUpdates: false
      },
      metadata: {
        addedDate: '2024-02-01',
        lastUpdated: new Date().toISOString(),
        status: 'active',
        network: ['stellar'],
        currency: ['XLM', 'USD']
      }
    });

    this.register({
      id: 'optimism',
      name: 'Optimism RetroPGF',
      description: 'Retroactive Public Goods Funding for Optimism ecosystem',
      type: 'static',
      source: 'daoip5',
      endpoints: {
        systems: 'https://daoip5.daostar.org/',
        pools: 'https://daoip5.daostar.org/optimism'
      },
      standardization: {
        version: 'DAOIP-5 v1.0',
        mappings: {
          'id': 'id',
          'name': 'projectName',
          'status': 'status',
          'fundsApprovedInUSD': 'fundsApprovedInUSD'
        },
        compatibility: 90
      },
      features: {
        fundingMechanism: ['Retroactive Public Goods'],
        dataRefreshRate: 'quarterly',
        historicalData: true
      },
      metadata: {
        addedDate: '2024-02-15',
        lastUpdated: new Date().toISOString(),
        status: 'active',
        network: ['optimism'],
        currency: ['OP']
      }
    });

    this.register({
      id: 'arbitrum',
      name: 'Arbitrum Foundation',
      description: 'Grant programs for Arbitrum ecosystem growth',
      type: 'static',
      source: 'daoip5',
      endpoints: {
        systems: 'https://daoip5.daostar.org/',
        pools: 'https://daoip5.daostar.org/arbitrumfoundation'
      },
      standardization: {
        version: 'DAOIP-5 v1.0',
        mappings: {
          'id': 'id',
          'name': 'projectName',
          'status': 'status',
          'fundsApprovedInUSD': 'fundsApprovedInUSD'
        },
        compatibility: 88
      },
      features: {
        fundingMechanism: ['Direct Grants', 'Milestone-Based'],
        dataRefreshRate: 'monthly',
        historicalData: true
      },
      metadata: {
        addedDate: '2024-03-01',
        lastUpdated: new Date().toISOString(),
        status: 'active',
        network: ['arbitrum'],
        currency: ['ARB', 'ETH']
      }
    });

    this.register({
      id: 'celo',
      name: 'Celo Foundation',
      description: 'Grants for financial inclusion and mobile-first blockchain solutions',
      type: 'static',
      source: 'daoip5',
      endpoints: {
        systems: 'https://daoip5.daostar.org/',
        pools: 'https://daoip5.daostar.org/celo-org'
      },
      standardization: {
        version: 'DAOIP-5 v1.0',
        mappings: {
          'id': 'id',
          'name': 'projectName',
          'status': 'status',
          'fundsApprovedInUSD': 'fundsApprovedInUSD'
        },
        compatibility: 85
      },
      features: {
        fundingMechanism: ['Direct Grants'],
        dataRefreshRate: 'monthly',
        historicalData: true
      },
      metadata: {
        addedDate: '2024-03-15',
        lastUpdated: new Date().toISOString(),
        status: 'active',
        network: ['celo'],
        currency: ['CELO', 'cUSD']
      }
    });
  }

  // Register a new data source
  register(config: DataSourceConfig): void {
    this.sources.set(config.id, config);
    this.notifyListeners();
    console.log(`📊 Registered new data source: ${config.name} with DAOIP-5 compatibility: ${config.standardization.compatibility}%`);
  }

  // Auto-discover and register new sources from APIs
  async autoDiscover(): Promise<DataSourceConfig[]> {
    const discovered: DataSourceConfig[] = [];

    try {
      // Check OpenGrants for new systems
      const response = await fetch('https://grants.daostar.org/api/v1/grantSystems');
      if (response.ok) {
        const data = await response.json();
        const systems = data.data || [];
        
        systems.forEach((system: any) => {
          const id = system.name.toLowerCase();
          if (!this.sources.has(id)) {
            const newSource: DataSourceConfig = {
              id,
              name: system.name,
              description: system.extensions?.description || 'Auto-discovered grant system',
              type: 'api',
              source: 'opengrants',
              endpoints: {
                pools: `https://grants.daostar.org/api/v1/grantPools?system=${id}`,
                applications: `https://grants.daostar.org/api/v1/grantApplications?system=${id}`
              },
              standardization: {
                version: 'DAOIP-5 v1.0',
                mappings: this.detectFieldMappings(system),
                compatibility: this.calculateCompatibility(system)
              },
              features: {
                fundingMechanism: this.detectFundingMechanisms(system),
                dataRefreshRate: 'daily',
                historicalData: true
              },
              metadata: {
                addedDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                status: 'active'
              }
            };
            
            this.register(newSource);
            discovered.push(newSource);
          }
        });
      }
    } catch (error) {
      console.error('Error auto-discovering sources:', error);
    }

    // Check DAOIP5 for new systems
    try {
      const response = await fetch('https://daoip5.daostar.org/');
      if (response.ok) {
        const systems = await response.json();
        systems.forEach((systemName: string) => {
          if (!this.sources.has(systemName)) {
            const newSource: DataSourceConfig = {
              id: systemName,
              name: this.formatSystemName(systemName),
              description: `Auto-discovered DAOIP5 system: ${systemName}`,
              type: 'static',
              source: 'daoip5',
              endpoints: {
                pools: `https://daoip5.daostar.org/${systemName}`
              },
              standardization: {
                version: 'DAOIP-5 v1.0',
                mappings: this.getDefaultMappings(),
                compatibility: 75 // Base compatibility for auto-discovered
              },
              features: {
                fundingMechanism: ['Direct Grants'],
                dataRefreshRate: 'monthly'
              },
              metadata: {
                addedDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                status: 'pending'
              }
            };
            
            this.register(newSource);
            discovered.push(newSource);
          }
        });
      }
    } catch (error) {
      console.error('Error auto-discovering DAOIP5 sources:', error);
    }

    return discovered;
  }

  // Get all registered sources
  getAllSources(): DataSourceConfig[] {
    return Array.from(this.sources.values());
  }

  // Get active sources
  getActiveSources(): DataSourceConfig[] {
    return this.getAllSources().filter(source => source.metadata.status === 'active');
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
    this.listeners.forEach(listener => listener(sources));
  }

  private detectFieldMappings(system: any): Record<string, string> {
    // Intelligent field mapping detection based on DAOIP-5 standard
    const mappings: Record<string, string> = {};
    const standardFields = ['id', 'name', 'status', 'fundsApprovedInUSD', 'grantPoolId', 'projectId', 'projectName'];
    
    standardFields.forEach(field => {
      // Check if field exists directly or in extensions
      if (system[field]) {
        mappings[field] = field;
      } else if (system.extensions) {
        Object.keys(system.extensions).forEach(ext => {
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
    const requiredFields = ['id', 'name', 'type'];
    const optionalFields = ['status', 'fundsApprovedInUSD', 'grantPoolId', 'projectId'];
    
    requiredFields.forEach(field => {
      if (system[field]) score += 20;
    });
    
    optionalFields.forEach(field => {
      if (system[field] || this.findFieldInExtensions(system, field)) {
        score += 10;
      }
    });
    
    return Math.min(score, 100);
  }

  private findFieldInExtensions(obj: any, field: string): boolean {
    if (!obj.extensions) return false;
    return Object.values(obj.extensions).some((ext: any) => 
      ext && typeof ext === 'object' && field in ext
    );
  }

  private detectFundingMechanisms(system: any): string[] {
    // Detect funding mechanisms from system metadata
    const mechanisms: string[] = [];
    const keywords = {
      'quadratic': 'Quadratic Funding',
      'retroactive': 'Retroactive Public Goods',
      'direct': 'Direct Grants',
      'milestone': 'Milestone-Based',
      'donation': 'Donations'
    };
    
    const searchText = JSON.stringify(system).toLowerCase();
    Object.entries(keywords).forEach(([key, value]) => {
      if (searchText.includes(key)) {
        mechanisms.push(value);
      }
    });
    
    return mechanisms.length > 0 ? mechanisms : ['Direct Grants'];
  }

  private formatSystemName(id: string): string {
    // Convert system ID to readable name
    return id
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getDefaultMappings(): Record<string, string> {
    // Default DAOIP-5 field mappings
    return {
      'id': 'id',
      'name': 'name',
      'projectName': 'projectName',
      'status': 'status',
      'fundsApprovedInUSD': 'fundsApprovedInUSD',
      'grantPoolId': 'grantPoolId',
      'grantPoolName': 'grantPoolName'
    };
  }
}

// Global registry instance
export const dataSourceRegistry = new DataSourceRegistry();

// Auto-discover sources on initialization
if (typeof window !== 'undefined') {
  dataSourceRegistry.autoDiscover().then(discovered => {
    if (discovered.length > 0) {
      console.log(`🔍 Auto-discovered ${discovered.length} new data sources`);
    }
  });
}