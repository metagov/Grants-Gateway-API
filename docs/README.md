# OpenGrants Gateway API Documentation

## Overview

The OpenGrants Gateway API provides a unified interface for accessing grant data across the Ethereum ecosystem using the DAOIP-5 metadata standard. This documentation covers API usage, supported systems, and integration guides.

## Quick Start

### Authentication

All API requests require authentication using an API key in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://grant-metadata-api.replit.app/api/v1/systems"
```

### Basic Usage

```bash
# Get all grant systems
GET /api/v1/systems

# Get grant pools from specific system
GET /api/v1/grantPools?system=octant

# Get projects
GET /api/v1/projects?system=giveth&limit=10

# Get applications for a grant pool
GET /api/v1/applications?poolId=daoip5:octant:grantPool:7
```

## Supported Systems

### Active Integrations

- **Octant** - Quadratic funding for Ethereum public goods through ETH staking proceeds
- **Giveth** - Donation platform for public goods and social impact projects

### Coming Soon

- **Stellar** - Cross-border payments and financial inclusion platform
- **Questbook** - Decentralized grants orchestration platform

## API Reference

### Endpoints

| Endpoint | Description | Parameters |
|----------|-------------|------------|
| `GET /api/v1/systems` | List all grant systems | `system` (optional) |
| `GET /api/v1/grantPools` | List grant pools | `system`, `limit`, `offset`, `isOpen` |
| `GET /api/v1/projects` | List projects | `system`, `limit`, `offset`, `search` |
| `GET /api/v1/applications` | List applications | `system`, `poolId`, `limit`, `offset` |
| `GET /api/v1/health` | API health status | `refresh` (optional) |

### Response Format

All responses follow the DAOIP-5 standard with JSON-LD context:

```json
{
  "@context": "http://www.daostar.org/schemas",
  "data": [...]
}
```

## Rate Limits

- **Authenticated requests**: 1000 requests per hour
- **Anonymous requests**: 100 requests per hour

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

## DAOIP-5 Compliance

This API implements the [DAOIP-5 metadata standard](http://www.daostar.org/EIPs/eip-4824) for interoperable grant data exchange.

## Integration Guide

For adding new grant systems to the API, see the [Integration Guide](./integration-guide.md).

## Field Mappings

For detailed field transformations between platform APIs and DAOIP-5 format, see [Field Mappings](./field-mappings.md).

## Support

- **API Documentation**: Available in the web interface query builder
- **Health Monitoring**: `/health` endpoint for real-time status
- **Integration Support**: See integration guide for adding new systems