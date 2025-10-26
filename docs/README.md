# OpenGrants Gateway API Documentation

## Overview

The OpenGrants Gateway API provides a unified interface for accessing grant data across the Ethereum ecosystem using the DAOIP-5 metadata standard. This documentation covers API usage, supported systems, and integration guides.

## Quick Start

### Authentication

All API requests require authentication using an API key in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://grant-metadata-api.replit.app/api/v1/grantSystems"
```

### Basic Usage

```bash
# Get all grant systems
GET /api/v1/grantSystems

# Get grant pools from specific system
GET /api/v1/grantPools?system=octant

# Get projects
GET /api/v1/projects?system=giveth&limit=10

# Get applications for a grant pool
GET /api/v1/grantApplications?poolId=daoip5:octant:grantPool:7
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

| Endpoint | Description | Auth Required | Pagination | Parameters |
|----------|-------------|---------------|------------|------------|
| `GET /api/v1/grantSystems` | List all grant systems | Yes (API Key) | No | `system` (optional) |
| `GET /api/v1/grantPools` | List grant pools | Yes (API Key) | Yes | `system`, `limit`, `offset`, `page`, `isOpen` |
| `GET /api/v1/projects` | List projects | Yes (API Key) | Yes | `system`, `limit`, `offset`, `page`, `search` |
| `GET /api/v1/grantApplications` | List applications | Yes (API Key) | Yes | `system`, `poolId`, `limit`, `offset`, `page`, `status` |
| `GET /api/v1/health` | API health status | Yes (API Key) | No | `refresh` (optional) |
| `GET /api/public/daoip5/systems` | Public systems data | No | No | None |
| `GET /api/public/daoip5/:system/summary` | System summary | No | No | None |
| `GET /api/public/daoip5/:system/:pool` | Pool data | No | No | None |

### Pagination

All collection endpoints support comprehensive pagination for efficient data retrieval:

**Pagination Parameters:**
- `limit` - Number of items per page (default: 10, min: 1, max: 100)
- `offset` - Number of items to skip (default: 0)
- `page` - Alternative to offset, calculated as `(page - 1) * limit`

**Example Requests:**
```bash
# Get 20 items starting from offset 0
GET /api/v1/grantPools?limit=20&offset=0

# Get page 2 with 50 items per page
GET /api/v1/grantApplications?limit=50&page=2

# Combine with filters
GET /api/v1/grantPools?system=octant&limit=25&page=1&isOpen=true
```

**Pagination Response Metadata:**

All paginated responses include metadata:

```json
{
  "data": [...],
  "pagination": {
    "totalCount": 150,
    "totalPages": 15,
    "currentPage": 1,
    "limit": 10,
    "offset": 0,
    "hasNext": true,
    "hasPrevious": false,
    "nextPage": 2,
    "previousPage": null
  }
}
```

### Response Format

All responses follow the DAOIP-5 standard with JSON-LD context:

```json
{
  "@context": "http://www.daostar.org/schemas",
  "data": [...],
  "pagination": {...}
}
```

## Authentication & API Protection

### API Key Authentication

All API requests to `/api/v1/*` endpoints require authentication using an API key in the Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://grant-metadata-api.replit.app/api/v1/grantSystems"
```

### Protected vs Public Endpoints

**Protected Endpoints** (Require API Key):
- `/api/v1/grantSystems` - List all grant systems
- `/api/v1/grantPools` - List grant pools
- `/api/v1/projects` - List projects  
- `/api/v1/grantApplications` - List applications
- `/api/v1/health` - API health status
- `/api/proxy/*` - Proxy endpoints

**Public Endpoints** (No API Key Required):
- `/api/public/daoip5/systems` - Public grant systems data (cached)
- `/api/public/daoip5/:system/summary` - System summaries (cached)
- `/api/public/daoip5/:system/:pool` - Pool data (cached)

**Admin Endpoints** (OAuth Protected):
- `/api/admin/*` - Admin dashboard endpoints

## Rate Limits

Rate limits are enforced **per minute** with different tiers:

- **Authenticated users**: **100 requests per minute** (default)
- **Anonymous users**: **20 requests per minute**
- **Custom limits**: Can be configured per user in admin dashboard

The rate limit window resets every 60 seconds. When exceeded, you'll receive a `429 Too Many Requests` response.

### Rate Limit Headers

Response headers include:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when the limit resets

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