
import fs from 'fs/promises';
import path from 'path';

export interface SystemConfig {
  id: string;
  name: string;
  displayName: string;
  source: 'opengrants' | 'daoip5' | 'custom';
  type: string;
  enabled: boolean;
  priority: number;
  metadata: {
    description: string;
    website: string;
    apiEndpoint: string;
    supportedNetworks: string[];
    fundingMechanisms: string[];
    established: string;
    compatibility: number;
    adapterClass?: string;
    staticDataPath?: string;
    [key: string]: any;
  };
}

export interface SourceTypeConfig {
  name: string;
  baseUrl: string;
  proxyPrefix: string;
  realTimeData: boolean;
  rateLimited: boolean;
}

export interface SystemsConfiguration {
  activeSystems: SystemConfig[];
  sourceTypes: Record<string, SourceTypeConfig>;
  features: {
    autoDiscovery: boolean;
    healthChecks: boolean;
    dataValidation: boolean;
    caching: boolean;
  };
}

class SystemsConfigService {
  private config: SystemsConfiguration | null = null;
  private configPath = path.join(process.cwd(), 'server/config/systemsConfig.ts');

  async loadConfiguration(): Promise<SystemsConfiguration> {
    if (this.config) {
      return this.config;
    }

    try {
      // Try to load from TypeScript config file first
      try {
        const configModule = await import('../config/systemsConfig.ts');
        this.config = configModule.default || configModule;
        console.log('✅ Loaded systems configuration from TypeScript file');
        return this.config;
      } catch (tsError) {
        // Fallback to JSON if TS file doesn't exist
        const configData = await fs.readFile(
          path.join(process.cwd(), 'server/config/systemsConfig.json'),
          'utf-8'
        );
        this.config = JSON.parse(configData);
        console.log('✅ Loaded systems configuration from JSON file');
        return this.config;
      }
    } catch (error) {
      console.error('❌ Failed to load systems configuration:', error);
      // Return default configuration
      this.config = this.getDefaultConfiguration();
      return this.config;
    }
  }

  private getDefaultConfiguration(): SystemsConfiguration {
    return {
      activeSystems: [
        {
          id: "octant",
          name: "Octant",
          displayName: "Octant (Golem)",
          source: "opengrants",
          type: "DAO",
          enabled: true,
          priority: 1,
          metadata: {
            description: "Quadratic funding for Ethereum public goods",
            website: "https://octant.app",
            apiEndpoint: "https://backend.mainnet.octant.app",
            supportedNetworks: ["ethereum"],
            fundingMechanisms: ["quadratic_funding"],
            established: "2023",
            compatibility: 100,
            adapterClass: "OctantAdapter"
          }
        },
        {
          id: "giveth",
          name: "Giveth",
          displayName: "Giveth",
          source: "opengrants",
          type: "DAO",
          enabled: true,
          priority: 2,
          metadata: {
            description: "Donation platform for public goods",
            website: "https://giveth.io",
            apiEndpoint: "https://mainnet.serve.giveth.io/graphql",
            supportedNetworks: ["ethereum"],
            fundingMechanisms: ["donations", "quadratic_funding"],
            established: "2016",
            compatibility: 100,
            adapterClass: "GivethAdapter"
          }
        },
        {
          id: "scf",
          name: "Stellar Community Fund",
          displayName: "Stellar Community Fund",
          source: "daoip5",
          type: "Foundation",
          enabled: true,
          priority: 3,
          metadata: {
            description: "Community-driven funding for projects building on Stellar",
            website: "https://communityfund.stellar.org",
            apiEndpoint: "https://daoip5.daostar.org/stellar",
            supportedNetworks: ["stellar"],
            fundingMechanisms: ["direct_grants"],
            established: "2018",
            compatibility: 95,
            staticDataPath: "/stellar"
          }
        }
      ],
      sourceTypes: {
        opengrants: {
          name: "OpenGrants API",
          baseUrl: "https://grants.daostar.org/api/v1",
          proxyPrefix: "/api/proxy/opengrants",
          realTimeData: true,
          rateLimited: true
        },
        daoip5: {
          name: "DAOIP-5 Static Data",
          baseUrl: "https://daoip5.daostar.org",
          proxyPrefix: "/api/proxy/daoip5",
          realTimeData: false,
          rateLimited: false
        }
      },
      features: {
        autoDiscovery: true,
        healthChecks: true,
        dataValidation: true,
        caching: true
      }
    };
  }

  async getActiveSystems(): Promise<SystemConfig[]> {
    const config = await this.loadConfiguration();
    return config.activeSystems
      .filter(system => system.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  async getAllSystems(): Promise<SystemConfig[]> {
    const config = await this.loadConfiguration();
    return config.activeSystems.sort((a, b) => a.priority - b.priority);
  }

  async getSystemById(id: string): Promise<SystemConfig | null> {
    const config = await this.loadConfiguration();
    return config.activeSystems.find(system => system.id === id) || null;
  }

  async getSystemsBySource(source: 'opengrants' | 'daoip5' | 'custom'): Promise<SystemConfig[]> {
    const config = await this.loadConfiguration();
    return config.activeSystems
      .filter(system => system.source === source && system.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  async getSourceTypeConfig(sourceType: string): Promise<SourceTypeConfig | null> {
    const config = await this.loadConfiguration();
    return config.sourceTypes[sourceType] || null;
  }

  async isFeatureEnabled(feature: keyof SystemsConfiguration['features']): Promise<boolean> {
    const config = await this.loadConfiguration();
    return config.features[feature] || false;
  }

  // Validation methods
  validateSystemConfig(system: SystemConfig): string[] {
    const errors: string[] = [];

    if (!system.id) errors.push('System ID is required');
    if (!system.name) errors.push('System name is required');
    if (!system.source) errors.push('System source is required');
    if (!['opengrants', 'daoip5', 'custom'].includes(system.source)) {
      errors.push('Invalid system source');
    }
    if (typeof system.enabled !== 'boolean') errors.push('Enabled must be boolean');
    if (typeof system.priority !== 'number') errors.push('Priority must be number');
    if (!system.metadata) errors.push('System metadata is required');
    if (system.metadata && !system.metadata.description) {
      errors.push('System description is required');
    }

    return errors;
  }

  // Manual configuration reload (for development only)
  async reloadConfiguration(): Promise<void> {
    this.config = null;
    await this.loadConfiguration();
    console.log('🔄 Systems configuration reloaded');
  }
}

export const systemsConfigService = new SystemsConfigService();
