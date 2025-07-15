# Grant System Integration Guide

## 4-Tier Integration Framework for OpenGrants Gateway

This guide outlines our comprehensive integration strategy for connecting grant systems to the OpenGrants Gateway API using the DAOIP-5 metadata standard.

## Integration Types Overview

### Type 1: Source API Integration
**Best for**: Grant systems with existing REST/GraphQL APIs
**Examples**: Octant, Giveth
**Complexity**: High - requires custom field mapping and transformation
**Maintenance**: Medium - API changes require adapter updates

### Type 2: Direct DAOIP-5 Integration  
**Best for**: Grant systems that can implement DAOIP-5 endpoints
**Examples**: Questbook
**Complexity**: Low - minimal transformation needed
**Maintenance**: Low - standardized interface reduces breaking changes

### Type 3: Static Data Integration
**Best for**: Grant systems with CSV/Airtable data exports
**Examples**: Legacy systems, manual grant programs
**Complexity**: Medium - requires data conversion pipeline
**Maintenance**: Low - static files with scheduled updates

### Type 4: Custom Integration
**Best for**: Complex systems requiring hybrid approaches
**Examples**: Multi-chain systems, federated grant networks
**Complexity**: Variable - depends on specific requirements
**Maintenance**: Variable - custom solutions require tailored support

## Choosing Integration Type

1. **Does the system have live APIs?** → Consider Type 1 or Type 2
2. **Can they implement DAOIP-5 endpoints?** → Use Type 2
3. **Only have static data exports?** → Use Type 3
4. **Complex multi-source requirements?** → Design Type 4 solution

## Prerequisites

- Node.js 20+
- PostgreSQL database
- Basic understanding of TypeScript and REST APIs
- Access to the grant system's API documentation

## Integration Steps

### 1. Information Gathering

Before starting development, gather information about the grant system:

- API endpoints and authentication requirements
- Data structure and field mappings
- Rate limits and caching strategies
- Currency formats (ETH, USD, native tokens)

### 2. Create Adapter Class

Create a new adapter in `server/adapters/[system-name].ts`:

```typescript
import { BaseAdapter } from './base';
import { GrantSystem, GrantPool, Project, Application } from '@/types/daoip5';

export class MySystemAdapter extends BaseAdapter {
  constructor() {
    super('my-system', 'https://api.mysystem.org');
  }

  async getGrantSystems(): Promise<GrantSystem[]> {
    // Implement system metadata
  }

  async getGrantPools(): Promise<GrantPool[]> {
    // Implement pool fetching and transformation
  }

  async getProjects(): Promise<Project[]> {
    // Implement project fetching and transformation
  }

  async getApplications(): Promise<Application[]> {
    // Implement application fetching and transformation
  }
}
```

### 3. Register Adapter

Add your adapter to `server/routes.ts`:

```typescript
import { MySystemAdapter } from './adapters/my-system';

const adapters: { [key: string]: BaseAdapter } = {
  octant: new OctantAdapter(),
  giveth: new GivethAdapter(),
  questbook: new QuestbookAdapter(),
  'my-system': new MySystemAdapter(), // Add here
};
```

### 4. Environment Configuration

Add any required environment variables to `.env`:

```
MY_SYSTEM_API_URL=https://api.mysystem.org
MY_SYSTEM_API_KEY=your_api_key_here
```

### 5. Health Monitoring

Update health service in `server/services/health.ts` to monitor your integration.

### 6. Testing

Test your integration:

```bash
# Test system endpoint
curl "http://localhost:5000/api/v1/systems?system=my-system"

# Test pools endpoint
curl "http://localhost:5000/api/v1/pools?system=my-system"
```

## Field Mapping Guidelines

Map your system's fields to DAOIP-5 standard:

- **id**: Use semantic format `daoip5:system-name:type:identifier`
- **amounts**: Convert to USD for consistency
- **dates**: Use ISO 8601 format
- **addresses**: Use CAIP-10 format when applicable

## Best Practices

1. **Error Handling**: Implement robust error handling with fallbacks
2. **Caching**: Use appropriate caching strategies for performance
3. **Rate Limiting**: Respect API rate limits
4. **Documentation**: Document any system-specific behavior
5. **Testing**: Add comprehensive tests for your adapter

## Example Implementation

See existing adapters like `server/adapters/octant.ts` for complete implementation examples.

## Deployment

After development:

1. Update `replit.md` with integration details
2. Test thoroughly with real data
3. Deploy and monitor health endpoints
4. Update frontend documentation if needed

## Support

For questions or assistance with integration, refer to existing adapter implementations or create an issue in the repository.