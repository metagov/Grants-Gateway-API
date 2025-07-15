# Grant System Integration Guide

## Overview

This guide provides a comprehensive walkthrough for developers who want to integrate a new grant system into the OpenGrants Gateway API. The integration process involves creating a new adapter that transforms the grant system's data into the DAOIP-5 standard format.

## Prerequisites

Before starting the integration, ensure you have:

1. **API Access**: Valid API credentials or endpoints for the grant system
2. **Technical Documentation**: Understanding of the grant system's data structure
3. **Development Environment**: Local setup with Node.js, TypeScript, and PostgreSQL
4. **DAOIP-5 Knowledge**: Familiarity with the DAOIP-5 metadata standard

## Integration Types

There are two primary integration approaches supported by the OpenGrants Gateway API:

### Type 1: Source API Integration (Transform to DAOIP-5)
- **Use Case**: Grant systems with custom APIs that need data transformation
- **Examples**: Octant, Giveth
- **Process**: Fetch from source API → Transform to DAOIP-5 → Return standardized response
- **Implementation**: Custom adapter with full data transformation logic

### Type 2: Direct DAOIP-5 Integration (Proxy/Cache)
- **Use Case**: Grant systems that already publish DAOIP-5 compliant endpoints
- **Examples**: Questbook (https://api.questbook.app/daoip-5/grant_pools.json)
- **Process**: Proxy/cache DAOIP-5 endpoint → Return with minimal processing
- **Implementation**: Lightweight adapter with caching for performance

## Complete Integration Requirements

For any new API integration to be considered complete, it must be supported in all three critical areas:

### 1. Query Builder Integration
- Add the new system to the Grant System dropdown in `client/src/pages/landing.tsx`
- Ensure interactive testing works through the web interface
- Update system selection options to include the new grant system

### 2. Supported Systems Documentation
- Update the landing page to show the new system as "Active Integration"
- Update total system count in examples and documentation
- Include the new system in API parameter documentation (e.g., `system=newsystem`)

### 3. API Health Monitoring
- Add the adapter to the health service in `server/services/health.ts`
- Implement external API dependency monitoring through `healthCheck()` method
- Ensure `/api/v1/health` and `/api/v1/health/:adapter` endpoints work
- Monitor external API connectivity and response times for reliability

## Integration Steps

### 1. Information Gathering Phase

Before writing any code, determine integration type and gather information:

#### A. Determine Integration Type
```bash
# Check if the grant system provides DAOIP-5 endpoints:
curl -I "https://api.grantsystem.com/daoip-5/grant_pools.json"
curl -I "https://api.grantsystem.com/daoip-5/projects.json"

# If DAOIP-5 endpoints exist:
#   → Use Type 2: Direct DAOIP-5 Integration
# If custom API only:
#   → Use Type 1: Source API Integration
```

#### B. API Documentation Review
```bash
# For Type 1 (Source API): Document the following for each entity type:
- Grant system overview and funding mechanism
- Available API endpoints and authentication methods
- Data structures for projects, pools, applications
- Rate limits and pagination patterns
- Error handling and response formats

# For Type 2 (DAOIP-5): Document the following:
- DAOIP-5 endpoint URLs and update frequency
- Authentication requirements
- Cache invalidation strategy
- Rate limits and availability SLA
```

#### C. Sample Data Collection
```bash
# Collect sample API responses for:
curl -X GET "https://api.grantsystem.com/projects" > sample-projects.json
curl -X GET "https://api.grantsystem.com/pools" > sample-pools.json
curl -X GET "https://api.grantsystem.com/applications" > sample-applications.json
```

#### D. Field Mapping Planning
Create a mapping document that maps source fields to DAOIP-5 targets:

```typescript
// Field mapping example for a new grant system
const fieldMappings = {
  projects: {
    'id' -> 'id',
    'title' -> 'name', 
    'summary' -> 'description',
    'website_url' -> 'contentURI',
    'social_links' -> 'socials',
    'logo_image' -> 'image'
  },
  pools: {
    'round_id' -> 'id',
    'round_name' -> 'name',
    'round_description' -> 'description',
    'funding_type' -> 'grantFundingMechanism',
    'is_active' -> 'isOpen',
    'end_date' -> 'closeDate'
  },
  applications: {
    'application_id' -> 'id',
    'project_id' -> 'projectId',
    'round_id' -> 'grantPoolId',
    'requested_amount' -> 'fundsAsked',
    'approved_amount' -> 'fundsApproved',
    'payout_wallet' -> 'payoutAddress'
  }
};
```

### 2. Implementation Phase

#### A. Create the Adapter Class

Choose the appropriate implementation based on integration type:

##### Type 1: Source API Integration (Octant/Giveth Style)

Create a new adapter file: `server/adapters/[system-name].ts`

```typescript
import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application, QueryFilters } from "./base";
import { currencyService } from "../services/currency";

interface SystemProject {
  // Define interfaces based on the grant system's API response
  id: string;
  title: string;
  description: string;
  // ... other fields
}

interface SystemPool {
  // Define interfaces for grant pools/rounds
  id: string;
  name: string;
  // ... other fields
}

interface SystemApplication {
  // Define interfaces for applications
  id: string;
  projectId: string;
  // ... other fields
}

export class NewSystemAdapter extends BaseAdapter {
  constructor() {
    super("newsystem", "https://api.newsystem.com");
  }

  async getSystems(): Promise<DAOIP5System[]> {
    return [{
      "@context": "http://www.daostar.org/schemas",
      name: "New Grant System",
      type: "GrantSystem",
      extensions: {
        "com.newsystem.systemMetadata": {
          platform: "newsystem",
          version: "1.0",
          network: "ethereum",
          fundingMechanism: "quadratic_funding"
        }
      }
    }];
  }

  async getSystem(id: string): Promise<DAOIP5System | null> {
    const systems = await this.getSystems();
    return systems.find(system => system.name.toLowerCase() === id.toLowerCase()) || null;
  }

  private async makeRequest(endpoint: string, options?: RequestInit): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          // Add authentication headers as needed
          // 'Authorization': `Bearer ${process.env.NEWSYSTEM_API_KEY}`
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error making request to ${endpoint}:`, error);
      throw error;
    }
  }

  async getPools(filters?: QueryFilters): Promise<DAOIP5GrantPool[]> {
    try {
      const response = await this.makeRequest('/pools');
      const pools: DAOIP5GrantPool[] = [];

      for (const pool of response.data || []) {
        const daoip5Pool: DAOIP5GrantPool = {
          type: "GrantPool",
          id: `daoip5:newsystem:grantPool:${pool.id}`,
          name: pool.name || "",
          description: pool.description || "",
          grantFundingMechanism: this.mapFundingMechanism(pool.funding_type),
          isOpen: pool.is_active || false,
          closeDate: pool.end_date ? this.formatDate(pool.end_date) : undefined,
          totalGrantPoolSize: pool.total_funding ? [{
            amount: pool.total_funding.toString(),
            denomination: pool.currency || "ETH"
          }] : undefined,
          extensions: {
            "com.newsystem.poolMetadata": {
              originalId: pool.id,
              fundingType: pool.funding_type,
              // Include platform-specific fields here
            }
          }
        };

        // Apply filters
        if (filters?.isOpen !== undefined && daoip5Pool.isOpen !== filters.isOpen) continue;
        if (filters?.mechanism && daoip5Pool.grantFundingMechanism !== filters.mechanism) continue;

        pools.push(daoip5Pool);
      }

      return pools.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
    } catch (error) {
      console.error("Error fetching pools:", error);
      return [];
    }
  }

  async getPool(id: string): Promise<DAOIP5GrantPool | null> {
    const pools = await this.getPools();
    return pools.find(pool => pool.id === id) || null;
  }

  async getProjects(filters?: QueryFilters): Promise<DAOIP5Project[]> {
    try {
      const response = await this.makeRequest('/projects');
      const projects: DAOIP5Project[] = [];

      for (const project of response.data || []) {
        // Build socials array
        const socials: Array<{ name: string; value: string }> = [];
        if (project.social_links) {
          for (const [platform, url] of Object.entries(project.social_links)) {
            socials.push({ name: platform, value: url as string });
          }
        }

        const daoip5Project: DAOIP5Project = {
          type: "Project",
          id: `daoip5:${project.title?.toLowerCase().replace(/\s+/g, '-') || 'project'}:project:${project.id}`,
          name: project.title || "",
          description: project.description || "",
          contentURI: project.website_url,
          image: project.logo_image,
          socials: socials.length > 0 ? socials : undefined,
          extensions: {
            "com.newsystem.projectMetadata": {
              originalId: project.id,
              category: project.category,
              tags: project.tags,
              // Include platform-specific fields here
            }
          }
        };

        // Apply filters
        if (filters?.search && !daoip5Project.name.toLowerCase().includes(filters.search.toLowerCase())) continue;
        if (filters?.category && project.category !== filters.category) continue;

        projects.push(daoip5Project);
      }

      return projects.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  }

  async getProject(id: string): Promise<DAOIP5Project | null> {
    const projects = await this.getProjects();
    return projects.find(project => project.id === id) || null;
  }

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      const response = await this.makeRequest('/applications');
      const applications: DAOIP5Application[] = [];

      // Fetch project and pool data for enrichment
      const [projects, pools] = await Promise.all([
        this.getProjects({ limit: 1000 }),
        this.getPools({ limit: 1000 })
      ]);

      const projectsMap = new Map(projects.map(p => [p.extensions?.["com.newsystem.projectMetadata"]?.originalId, p]));
      const poolsMap = new Map(pools.map(p => [p.extensions?.["com.newsystem.poolMetadata"]?.originalId, p]));

      for (const application of response.data || []) {
        const project = projectsMap.get(application.project_id);
        const pool = poolsMap.get(application.round_id);

        // Calculate USD amounts if possible
        const fundsApprovedInUSD = application.approved_amount ? 
          await currencyService.convertETHToUSD(application.approved_amount.toString()) : undefined;

        const daoip5Application: DAOIP5Application = {
          type: "GrantApplication",
          id: `daoip5:newsystem:grantApplication:${application.id}`,
          grantPoolId: `daoip5:newsystem:grantPool:${application.round_id}`,
          grantPoolName: pool?.name,
          projectId: project?.id || `daoip5:unknown:project:${application.project_id}`,
          projectName: project?.name,
          createdAt: application.created_at ? this.formatDate(application.created_at) : undefined,
          contentURI: `https://newsystem.com/application/${application.id}`,
          fundsAsked: application.requested_amount ? [{
            amount: application.requested_amount.toString(),
            denomination: application.currency || "ETH"
          }] : undefined,
          fundsApproved: application.approved_amount ? [{
            amount: application.approved_amount.toString(),
            denomination: application.currency || "ETH"
          }] : undefined,
          fundsApprovedInUSD: fundsApprovedInUSD,
          payoutAddress: application.payout_wallet ? {
            type: "EthereumAddress",
            value: application.payout_wallet
          } : undefined,
          status: this.mapApplicationStatus(application.status),
          extensions: {
            "com.newsystem.applicationMetadata": {
              originalId: application.id,
              submissionRound: application.round_id,
              // Include platform-specific fields here
            }
          }
        };

        // Apply filters
        if (filters?.poolId && daoip5Application.grantPoolId !== filters.poolId) continue;
        if (filters?.projectId && daoip5Application.projectId !== filters.projectId) continue;
        if (filters?.status && daoip5Application.status !== filters.status) continue;

        applications.push(daoip5Application);
      }

      return applications.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
    } catch (error) {
      console.error("Error fetching applications:", error);
      return [];
    }
  }

  async getApplication(id: string): Promise<DAOIP5Application | null> {
    const applications = await this.getApplications();
    return applications.find(app => app.id === id) || null;
  }

  private mapFundingMechanism(systemMechanism: string): string {
    const mechanisms: Record<string, string> = {
      'quadratic': 'quadratic_funding',
      'direct': 'direct_grants',
      'retroactive': 'retroactive_funding',
      'contest': 'contest',
      // Add more mappings as needed
    };
    return mechanisms[systemMechanism?.toLowerCase()] || 'direct_grants';
  }

  private mapApplicationStatus(systemStatus: string): "pending" | "in_review" | "approved" | "funded" | "rejected" | "completed" {
    const statusMap: Record<string, any> = {
      'submitted': 'pending',
      'under_review': 'in_review',
      'accepted': 'approved',
      'funded': 'funded',
      'rejected': 'rejected',
      'completed': 'completed',
      // Add more status mappings as needed
    };
    return statusMap[systemStatus?.toLowerCase()] || 'pending';
  }
}
```

##### Type 2: Direct DAOIP-5 Integration (Questbook Style)

For systems that already provide DAOIP-5 endpoints, create a lightweight caching adapter:

```typescript
import { BaseAdapter, DAOIP5System, DAOIP5GrantPool, DAOIP5Project, DAOIP5Application, QueryFilters } from "./base";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class QuestbookAdapter extends BaseAdapter {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly ENDPOINTS = {
    systems: "https://api.questbook.app/daoip-5/systems.json",
    pools: "https://api.questbook.app/daoip-5/grant_pools.json",
    projects: "https://api.questbook.app/daoip-5/projects.json",
    applications: "https://api.questbook.app/daoip-5/applications.json"
  };

  constructor() {
    super("questbook", "https://api.questbook.app");
  }

  private isCacheValid<T>(cacheEntry: CacheEntry<T>): boolean {
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
  }

  private async fetchWithCache<T>(endpoint: string, cacheKey: string): Promise<T> {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OpenGrants-Gateway/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: this.CACHE_TTL
      });

      return data;
    } catch (error) {
      // Return cached data if available, even if expired
      if (cached) {
        console.warn(`Using stale cache for ${cacheKey}:`, error);
        return cached.data;
      }
      throw error;
    }
  }

  async getSystems(): Promise<DAOIP5System[]> {
    try {
      const response = await this.fetchWithCache<{ systems: DAOIP5System[] }>(
        this.ENDPOINTS.systems, 
        'systems'
      );
      return response.systems || [];
    } catch (error) {
      console.error("Error fetching Questbook systems:", error);
      return [];
    }
  }

  async getSystem(id: string): Promise<DAOIP5System | null> {
    const systems = await this.getSystems();
    return systems.find(system => 
      system.name.toLowerCase().includes(id.toLowerCase())
    ) || null;
  }

  async getPools(filters?: QueryFilters): Promise<DAOIP5GrantPool[]> {
    try {
      const response = await this.fetchWithCache<{ grantPools: DAOIP5GrantPool[] }>(
        this.ENDPOINTS.pools, 
        'pools'
      );
      let pools = response.grantPools || [];

      // Apply filters
      if (filters?.isOpen !== undefined) {
        pools = pools.filter(pool => pool.isOpen === filters.isOpen);
      }
      if (filters?.mechanism) {
        pools = pools.filter(pool => pool.grantFundingMechanism === filters.mechanism);
      }

      return pools.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
    } catch (error) {
      console.error("Error fetching Questbook pools:", error);
      return [];
    }
  }

  async getPool(id: string): Promise<DAOIP5GrantPool | null> {
    const pools = await this.getPools();
    return pools.find(pool => pool.id === id) || null;
  }

  async getProjects(filters?: QueryFilters): Promise<DAOIP5Project[]> {
    try {
      const response = await this.fetchWithCache<{ projects: DAOIP5Project[] }>(
        this.ENDPOINTS.projects, 
        'projects'
      );
      let projects = response.projects || [];

      // Apply filters
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        projects = projects.filter(project => 
          project.name.toLowerCase().includes(searchLower) ||
          project.description.toLowerCase().includes(searchLower)
        );
      }

      return projects.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
    } catch (error) {
      console.error("Error fetching Questbook projects:", error);
      return [];
    }
  }

  async getProject(id: string): Promise<DAOIP5Project | null> {
    const projects = await this.getProjects();
    return projects.find(project => project.id === id) || null;
  }

  async getApplications(filters?: QueryFilters): Promise<DAOIP5Application[]> {
    try {
      const response = await this.fetchWithCache<{ applications: DAOIP5Application[] }>(
        this.ENDPOINTS.applications, 
        'applications'
      );
      let applications = response.applications || [];

      // Apply filters
      if (filters?.poolId) {
        applications = applications.filter(app => app.grantPoolId === filters.poolId);
      }
      if (filters?.projectId) {
        applications = applications.filter(app => app.projectId === filters.projectId);
      }
      if (filters?.status) {
        applications = applications.filter(app => app.status === filters.status);
      }

      return applications.slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 20));
    } catch (error) {
      console.error("Error fetching Questbook applications:", error);
      return [];
    }
  }

  async getApplication(id: string): Promise<DAOIP5Application | null> {
    const applications = await this.getApplications();
    return applications.find(app => app.id === id) || null;
  }

  // Health check method for monitoring
  async healthCheck(): Promise<{ status: string; endpoints: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    
    for (const [key, endpoint] of Object.entries(this.ENDPOINTS)) {
      try {
        const response = await fetch(endpoint, { method: 'HEAD' });
        results[key] = response.ok;
      } catch {
        results[key] = false;
      }
    }

    const allHealthy = Object.values(results).every(Boolean);
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      endpoints: results
    };
  }
}
```

#### B. Register the Adapter

Update `server/routes.ts` to include the new adapter:

```typescript
// Add import at the top
import { NewSystemAdapter } from './adapters/newsystem';

// Update the getAdapter function
function getAdapter(system?: string) {
  const adapters = [
    new OctantAdapter(),
    new GivethAdapter(),
    new NewSystemAdapter(), // Add your new adapter here
  ];

  if (system) {
    const systemLower = system.toLowerCase();
    return adapters.filter(adapter => 
      adapter.constructor.name.toLowerCase().includes(systemLower) ||
      (adapter as any).systemName?.toLowerCase() === systemLower
    );
  }

  return adapters;
}
```

#### C. Add Environment Variables

Update `.env` file with necessary configuration:

```bash
# Add to .env file
NEWSYSTEM_API_URL=https://api.newsystem.com
NEWSYSTEM_API_KEY=your_api_key_here
```

#### D. Update Database Schema (if needed)

If you need to store system-specific configuration:

```sql
-- Add to database migration
INSERT INTO grant_systems (name, type, api_endpoint, is_active, adapter_config) 
VALUES (
  'newsystem',
  'GrantSystem', 
  'https://api.newsystem.com',
  true,
  '{"requiresAuth": true, "rateLimit": 100, "supportsPagination": true}'
);
```

### 3. Performance Considerations

#### Type 2 DAOIP-5 Integrations (Direct Endpoint)

To ensure direct DAOIP-5 integrations don't slow down the API:

1. **Caching Strategy**: 
   - Implement 5-minute cache TTL for frequently accessed data
   - Use stale-while-revalidate pattern for graceful degradation
   - Cache at the adapter level to reduce external API calls

2. **Async Processing**:
   - Cache refresh happens asynchronously to avoid blocking user requests
   - Parallel health checks for multiple endpoints
   - Non-blocking error handling with fallback to cached data

3. **Circuit Breaker Pattern**:
   ```typescript
   // Example: Graceful degradation in QuestbookAdapter
   try {
     const response = await fetch(endpoint);
     const data = await response.json();
     // Cache successful response
     this.cache.set(cacheKey, { data, timestamp: Date.now(), ttl: this.CACHE_TTL });
     return data;
   } catch (error) {
     // Return cached data if available, even if expired
     if (cached) {
       console.warn(`Using stale cache for ${cacheKey}:`, error);
       return cached.data; // Return stale data rather than failing
     }
     throw error;
   }
   ```

4. **Monitoring & Health Checks**:
   - Dedicated health check endpoints for each integration type
   - Response time tracking and alerting via `/api/v1/health`
   - Automatic failover to cached data during outages

#### Performance Best Practices

- **Type 1 (Source API)**: Focus on efficient data transformation and pagination
- **Type 2 (DAOIP-5)**: Prioritize caching and graceful degradation
- **Both types**: Implement comprehensive error handling and monitoring
- **Production**: Use Redis for shared caching across multiple server instances

### 4. Testing Phase

#### A. Unit Tests

Create test files for your adapter:

```typescript
// tests/adapters/newsystem.test.ts
import { NewSystemAdapter } from '../../server/adapters/newsystem';

describe('NewSystemAdapter', () => {
  let adapter: NewSystemAdapter;

  beforeEach(() => {
    adapter = new NewSystemAdapter();
  });

  test('should fetch systems', async () => {
    const systems = await adapter.getSystems();
    expect(systems).toHaveLength(1);
    expect(systems[0].name).toBe('New Grant System');
  });

  test('should fetch pools with correct DAOIP-5 format', async () => {
    const pools = await adapter.getPools({ limit: 5 });
    expect(pools).toBeDefined();
    expect(pools.every(pool => pool.type === 'GrantPool')).toBe(true);
  });

  // Add more tests for projects, applications, etc.
});
```

#### B. Integration Testing

Test the API endpoints:

```bash
# Test systems endpoint
curl "http://localhost:5000/api/v1/systems?system=newsystem"

# Test pools endpoint  
curl "http://localhost:5000/api/v1/pools?system=newsystem"

# Test projects endpoint
curl "http://localhost:5000/api/v1/projects?system=newsystem"

# Test applications endpoint
curl "http://localhost:5000/api/v1/applications?system=newsystem"
```

### 4. Documentation Phase

#### A. Update API Documentation

Add your system to the documentation in `client/src/pages/landing.tsx`:

```typescript
// Add to supportedSystems array
const supportedSystems = [
  { name: "Octant", description: "Ethereum public goods funding", adapter: "octant" },
  { name: "Giveth", description: "Donation platform for public goods", adapter: "giveth" },
  { name: "New System", description: "Description of new grant system", adapter: "newsystem" },
];
```

#### B. Create System-Specific Documentation

Document unique features and considerations:

```markdown
# New System Integration Notes

## Unique Features
- Custom funding mechanism: [describe]
- Special application process: [describe]
- Unique data fields: [describe]

## Rate Limits
- API calls per minute: 100
- Bulk data endpoints: 10 requests per hour

## Authentication
- Requires API key in header: `X-API-Key`
- Rate limiting based on API key

## Known Limitations
- Historical data only available for last 2 years
- Some fields require premium API access
- Batch operations not supported
```

### 5. Production Deployment

#### A. Environment Setup

```bash
# Production environment variables
NEWSYSTEM_API_URL=https://api.newsystem.com
NEWSYSTEM_API_KEY=production_api_key
```

#### B. Monitoring

Add logging and monitoring:

```typescript
// Add to your adapter methods
console.log(`[NewSystem] Fetching ${endpoint} - Filters:`, filters);
console.log(`[NewSystem] Retrieved ${results.length} items in ${responseTime}ms`);
```

## Common Integration Patterns

### Error Handling
```typescript
private async handleApiError(error: any, context: string): Promise<void> {
  if (error.status === 429) {
    console.warn(`Rate limit hit for ${context}, backing off...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else if (error.status === 401) {
    console.error(`Authentication failed for ${context}`);
    throw new Error('Invalid API credentials');
  } else {
    console.error(`API error in ${context}:`, error);
    throw error;
  }
}
```

### Pagination Handling
```typescript
private async fetchAllPages(endpoint: string, pageSize: number = 100): Promise<any[]> {
  let allData: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await this.makeRequest(`${endpoint}?page=${page}&size=${pageSize}`);
    allData.push(...response.data);
    hasMore = response.hasNext;
    page++;
    
    // Prevent infinite loops
    if (page > 100) break;
  }

  return allData;
}
```

### Data Transformation Utilities
```typescript
private transformCurrency(amount: string | number, fromCurrency: string): Array<{amount: string, denomination: string}> {
  return [{
    amount: amount.toString(),
    denomination: fromCurrency.toUpperCase()
  }];
}

private extractSocials(socialData: any): Array<{name: string, value: string}> {
  const socials: Array<{name: string, value: string}> = [];
  
  if (socialData?.twitter) socials.push({ name: "Twitter", value: socialData.twitter });
  if (socialData?.github) socials.push({ name: "GitHub", value: socialData.github });
  if (socialData?.discord) socials.push({ name: "Discord", value: socialData.discord });
  
  return socials;
}
```

## Best Practices

1. **Use Semantic IDs**: Always use descriptive, hierarchical IDs like `daoip5:system:type:identifier`

2. **Handle Rate Limits**: Implement exponential backoff and respect API limits

3. **Cache Appropriately**: Cache stable data like project information, refresh dynamic data

4. **Error Gracefully**: Return empty arrays rather than throwing errors when possible

5. **Document Extensions**: Use vendor-specific prefixes for platform-specific fields

6. **Test Thoroughly**: Verify data integrity and DAOIP-5 compliance

7. **Monitor Performance**: Log response times and API usage

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify API keys and headers
2. **Rate Limiting**: Implement proper backoff strategies  
3. **Data Mapping**: Ensure all required DAOIP-5 fields are populated
4. **Currency Conversion**: Handle different denominations properly
5. **Date Formatting**: Use ISO 8601 format consistently

### Debug Tools

```bash
# Check API connectivity
curl -I "https://api.newsystem.com/health"

# Validate DAOIP-5 compliance
npm run validate-schema

# Test adapter in isolation
npm run test -- --grep "NewSystemAdapter"
```

## Support

For questions about integrating new grant systems:

1. Review existing adapters (Octant, Giveth) for reference patterns
2. Check the DAOIP-5 specification for field requirements
3. Test thoroughly with sample data before production deployment
4. Document any system-specific considerations for future developers

The integration process typically takes 2-5 days depending on API complexity and data availability.