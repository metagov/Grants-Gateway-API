
# OpenGrants Gateway API

A unified interface for accessing grant data across the Ethereum ecosystem using the DAOIP-5 metadata standard.

## 🚀 Quick Start

### Get API Access

1. Visit the [API dashboard](https://grants-gateway-api.replit.app)
2. Sign in with Replit OAuth
3. Generate your API key
4. Start making requests

### Basic Usage

```bash
# Get all grant systems
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://grants-gateway-api.replit.app/api/v1/grantSystems"

# Get grant pools with pagination
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://grants-gateway-api.replit.app/api/v1/grantPools?system=octant&limit=20&page=1"
```

## 🔐 Authentication & Security

### API Key Authentication

Protected endpoints (`/api/v1/*`) require an API key in the Authorization header:

```bash
Authorization: Bearer YOUR_API_KEY
```

### Endpoint Protection Levels

**Protected (API Key Required):**
- `/api/v1/grantSystems` - Grant systems
- `/api/v1/grantPools` - Grant pools
- `/api/v1/projects` - Projects
- `/api/v1/grantApplications` - Applications
- `/api/proxy/*` - Proxy endpoints

**Public (No Auth):**
- `/api/public/daoip5/*` - Cached DAOIP-5 data for frontend

**Admin (OAuth):**
- `/api/admin/*` - Admin dashboard

## ⚡ Rate Limiting

Rate limits are enforced **per minute**:

- **Authenticated**: 100 requests/minute
- **Anonymous**: 20 requests/minute
- **Custom**: Configurable per user

The limit window resets every 60 seconds. Exceeding the limit returns `429 Too Many Requests`.

## 📄 Pagination

All collection endpoints support pagination:

### Parameters
- `limit` - Items per page (default: 10, max: 100)
- `offset` - Items to skip (default: 0)
- `page` - Page number (alternative to offset)

### Example
```bash
GET /api/v1/grantPools?limit=25&page=2
```

### Response
```json
{
  "data": [...],
  "pagination": {
    "totalCount": 150,
    "totalPages": 6,
    "currentPage": 2,
    "limit": 25,
    "offset": 25,
    "hasNext": true,
    "hasPrevious": true,
    "nextPage": 3,
    "previousPage": 1
  }
}
```

## 🌐 Supported Grant Systems

### Active Integrations

- **Octant** - Quadratic funding for Ethereum public goods
- **Giveth** - Donation platform for social impact projects
- **Stellar** - Cross-border payments and grants (DAOIP-5 data)
- **Optimism** - RetroPGF and grants programs (DAOIP-5 data)
- **Arbitrum** - Arbitrum Foundation grants (DAOIP-5 data)
- **Celo** - Celo Foundation grants (DAOIP-5 data)
- **CLRFund** - Quadratic funding rounds (DAOIP-5 data)

### Coming Soon
- **Questbook** - Decentralized grants orchestration

## 📚 API Endpoints

### Grant Systems
```bash
GET /api/v1/grantSystems
GET /api/v1/grantSystems/:id
```

### Grant Pools
```bash
GET /api/v1/grantPools?system=octant&limit=20&isOpen=true
GET /api/v1/grantPools/:id
```

### Projects
```bash
GET /api/v1/projects?system=giveth&limit=50&search=climate
GET /api/v1/projects/:id
```

### Applications
```bash
GET /api/v1/grantApplications?poolId=daoip5:octant:grantPool:7&limit=100
GET /api/v1/grantApplications/:id
```

### Health
```bash
GET /api/v1/health
GET /api/v1/health?refresh=true
```

## 🏗️ DAOIP-5 Compliance

This API implements the [DAOIP-5 metadata standard](https://github.com/metagov/daostar/blob/main/DAOIPs/daoip-5.md) for interoperable grant data exchange.

All responses include JSON-LD context:
```json
{
  "@context": "http://www.daostar.org/schemas",
  "type": "GrantPool",
  "data": [...]
}
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database
- pnpm package manager

### Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/grants-gateway-api
cd grants-gateway-api

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and other configs

# Push database schema
pnpm run db:push

# Start development server
pnpm run dev
```

The API will be available at `http://localhost:5000`

### Environment Variables
```bash
DATABASE_URL=postgresql://user:password@host/database
NODE_ENV=development
OCTANT_API_URL=https://backend.octant.app/allocations
GIVETH_API_URL=https://mainnet.serve.giveth.io/graphql
```

## 📖 Documentation

- **API Docs**: [docs/README.md](docs/README.md)
- **Integration Guide**: [docs/integration-guide.md](docs/integration-guide.md)
- **Field Mappings**: [docs/field-mappings.md](docs/field-mappings.md)
- **Interactive Docs**: Available at `/` when running

## 🔧 Tech Stack

- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Frontend**: React, Vite, TanStack Query
- **UI**: shadcn/ui, Tailwind CSS
- **Auth**: Replit OAuth
- **Deployment**: Replit Autoscale

## 📊 Features

- ✅ DAOIP-5 compliant data normalization
- ✅ Multi-system adapter pattern
- ✅ Rate limiting per user
- ✅ Comprehensive pagination
- ✅ API key authentication
- ✅ Real-time health monitoring
- ✅ Interactive API documentation
- ✅ Analytics dashboard
- ✅ Cross-system data integration
- ✅ Karma GAP project matching

## 🤝 Contributing

See [docs/integration-guide.md](docs/integration-guide.md) for adding new grant systems.

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: Interactive docs at root URL
- **Health Status**: `/api/v1/health` endpoint
- **GitHub Issues**: Report bugs and feature requests
- **Replit Community**: Get help from the community

---

Built with ❤️ using [Replit](https://replit.com) and the [DAOIP-5 standard](https://github.com/metagov/daostar)
