# OpenGrants Gateway Documentation

## Overview

OpenGrants Gateway provides a unified REST API for accessing grant data across multiple blockchain ecosystems using the DAOIP-5 metadata standard.

## Quick Start

```bash
# Get all grant systems
curl "https://opengrants.replit.app/api/v1/systems"

# Get grant pools from Octant
curl "https://opengrants.replit.app/api/v1/pools?system=octant"

# Get applications for a specific pool
curl "https://opengrants.replit.app/api/v1/applications?poolId=daoip5:octant:grantPool:7"
```

## Supported Systems

- **Octant**: Ethereum public goods funding with quadratic voting
- **Giveth**: Donation platform for public goods and social impact
- **Questbook**: Decentralized grants orchestration platform

## API Endpoints

- `GET /api/v1/systems` - List all grant systems
- `GET /api/v1/pools` - List grant pools with optional filtering
- `GET /api/v1/projects` - List projects with optional search
- `GET /api/v1/applications` - List applications with optional pool filtering
- `GET /api/v1/health` - System health monitoring

## Authentication

Optional API key authentication for higher rate limits:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://opengrants.replit.app/api/v1/systems"
```

## Documentation Structure

- [Integration Guide](./integration-guide.md) - Add new grant systems
- [API Reference](../client/src/pages/landing.tsx) - Complete endpoint documentation
- [Health Monitoring](https://opengrants.replit.app/health) - System status

## Data Format

All responses follow the DAOIP-5 metadata standard with:

- Consistent USD currency conversion
- Semantic ID formatting (`daoip5:system:type:id`)
- Standardized field mappings
- CAIP-10 address formatting

## Rate Limits

- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour

## Examples

See the interactive documentation at [opengrants.replit.app](https://opengrants.replit.app) for complete examples in multiple languages.

## Support

For questions or integration assistance, refer to the integration guide or system health monitoring.