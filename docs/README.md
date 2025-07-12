# OpenGrants Gateway API - Developer Documentation

## Overview

OpenGrants Gateway API provides a unified interface for accessing grant data across the Ethereum Ecosystem using the DAOIP-5 metadata standard. This documentation helps developers understand how to use and extend the API.

## Quick Start

### Using the API

```bash
# Get all grant systems
curl "https://your-domain.com/api/v1/systems"

# Get grant pools from Octant
curl "https://your-domain.com/api/v1/pools?system=octant"

# Get projects from all systems
curl "https://your-domain.com/api/v1/projects?limit=10"

# Get applications for a specific grant pool
curl "https://your-domain.com/api/v1/applications?poolId=daoip5:octant:grantPool:1"
```

### Authentication

```bash
# Using API key authentication
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "https://your-domain.com/api/v1/applications"
```

## API Endpoints

| Endpoint | Description | Parameters |
|----------|-------------|------------|
| `GET /api/v1/systems` | List all grant systems | `system` (optional) |
| `GET /api/v1/pools` | List grant pools | `system`, `limit`, `offset`, `isOpen` |
| `GET /api/v1/projects` | List projects | `system`, `limit`, `offset`, `search` |
| `GET /api/v1/applications` | List applications | `system`, `poolId`, `projectId`, `status`, `limit`, `offset` |

## Currently Supported Systems

- **Octant**: Ethereum public goods funding with quadratic funding mechanism
- **Giveth**: Donation platform for public goods projects

## DAOIP-5 Compliance

All API responses follow the [DAOIP-5 metadata standard](http://www.daostar.org/schemas) for grant data interoperability:

```json
{
  "@context": "http://www.daostar.org/schemas",
  "type": "GrantApplication",
  "id": "daoip5:octant:grantApplication:0xF6CB...-epoch-1",
  "grantPoolId": "daoip5:octant:grantPool:1",
  "grantPoolName": "Octant Epoch 1",
  "projectId": "daoip5:protocol-guild:project:0xF6CB...",
  "projectName": "Protocol Guild",
  "fundsApproved": [{"amount": "0.957816", "denomination": "ETH"}],
  "fundsApprovedInUSD": "2817.21",
  "status": "funded"
}
```

## Documentation Sections

### For API Users
- **[API Reference](./api-reference.md)** - Complete endpoint documentation
- **[Authentication Guide](./authentication.md)** - API key setup and usage
- **[Query Examples](./query-examples.md)** - Common use cases and examples

### For Developers
- **[Integration Guide](./integration-guide.md)** - How to add new grant systems
- **[Architecture Overview](./architecture.md)** - System design and components
- **[Development Setup](./development-setup.md)** - Local development environment

### For Contributors
- **[Contributing Guidelines](./contributing.md)** - How to contribute to the project
- **[Testing Guide](./testing.md)** - Running and writing tests
- **[Deployment Guide](./deployment.md)** - Production deployment instructions

## Key Features

### Unified Data Format
- **DAOIP-5 Standard**: All grant data normalized to DAOIP-5 format
- **Semantic IDs**: Clear, hierarchical identifiers like `daoip5:octant:grantPool:1`
- **Currency Conversion**: Automatic ETH to USD conversion for funding amounts

### Flexible Querying
- **Multi-System**: Query across multiple grant systems simultaneously
- **Filtering**: Filter by system, status, funding amounts, dates
- **Pagination**: Efficient pagination for large datasets

### Developer-Friendly
- **TypeScript**: Full TypeScript support with type definitions
- **Rate Limiting**: Built-in rate limiting with API key management
- **Error Handling**: Comprehensive error responses with helpful messages

## Getting Started

1. **Explore the API**: Use the interactive query builder at the root URL
2. **Get API Keys**: Contact us for API access credentials
3. **Read the Integration Guide**: Learn how to add new grant systems
4. **Join the Community**: Contribute to the open-source project

## Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Comprehensive guides and examples
- **Community**: Join our developer community discussions

## License

This project is open source under the MIT License. See the LICENSE file for details.

---

*For technical questions about integrating new grant systems, start with the [Integration Guide](./integration-guide.md) which provides step-by-step instructions for adding support for new funding platforms.*