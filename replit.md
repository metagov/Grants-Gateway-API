# OpenGrants Gateway API

## Overview

OpenGrants Gateway API is a unified interface for accessing grant data across Ethereum Ecosystem using the DAOIP-5 metadata standard. The application provides a standardized REST API that normalizes data from various grant systems including Octant and Giveth, making it easier for developers to build applications that work with multiple funding platforms.

## System Architecture

### Full-Stack Monorepo Structure
- **Client**: React frontend with TypeScript, built using Vite
- **Server**: Express.js backend with TypeScript
- **Shared**: Common schemas and types shared between client and server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js, TypeScript, Node.js 20
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Build Tools**: Vite for frontend, esbuild for backend
- **Deployment**: Replit autoscale with production build pipeline

## Key Components

### Database Schema
The application uses a PostgreSQL database with the following core tables:
- **users**: User authentication and API key management
- **grantSystems**: Configuration for different grant platforms
- **fieldMappings**: Maps platform-specific fields to DAOIP-5 standard
- **apiConfigurations**: Platform-specific API configuration
- **apiLogs**: Request logging and analytics

### API Adapters
Implements the adapter pattern for different grant systems:
- **BaseAdapter**: Abstract base class defining the DAOIP-5 interface
- **OctantAdapter**: Integration with Octant funding rounds
- **GivethAdapter**: Integration with Giveth donation platform
- Extensible design allows easy addition of new platforms

### Authentication & Rate Limiting
- API key-based authentication with Bearer token support
- Per-user rate limiting with configurable limits
- Anonymous access with reduced rate limits
- In-memory rate limiting store (Redis recommended for production)

### Frontend Features
- Interactive API documentation and testing interface
- Query builder for constructing API requests
- Real-time response preview
- Dark/light theme support
- Mobile-responsive design using shadcn/ui components

## Data Flow

1. **Client Request**: Frontend or external client makes API request
2. **Authentication**: Middleware validates API key and sets user context
3. **Rate Limiting**: Request counted against user's rate limit
4. **Adapter Selection**: Route determines which grant system adapter(s) to use
5. **Data Transformation**: Platform-specific data normalized to DAOIP-5 format
6. **Response**: Unified JSON response returned to client
7. **Logging**: Request details logged to database for analytics

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **drizzle-orm**: Type-safe SQL query builder
- **@tanstack/react-query**: Data fetching and caching for React
- **@radix-ui/react-***: Accessible UI component primitives
- **wouter**: Lightweight React router

### Platform Integrations
- **Octant API**: Direct HTTP integration for epoch and project data
- **Giveth GraphQL**: GraphQL integration for project and QF round data
- External APIs configured via environment variables

## Deployment Strategy

### Development Environment
- Runs on port 5000 with Vite development server
- Hot reload for both frontend and backend changes
- PostgreSQL database provisioned via Replit

### Production Build
- Frontend: Vite builds optimized static assets
- Backend: esbuild bundles server code to ESM format
- Single process deployment serving both API and static files
- Database migrations handled via Drizzle Kit

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment mode (development/production)
- `OCTANT_API_URL`: Octant API endpoint
- `GIVETH_API_URL`: Giveth GraphQL endpoint

## Changelog

```
Changelog:
- January 15, 2025. Removed Questbook Integration
  - Removed Questbook adapter class and all associated code from server/adapters/questbook.ts
  - Updated server/routes.ts to remove QuestbookAdapter import and initialization
  - Updated server/services/health.ts to remove Questbook from health monitoring
  - Removed Questbook references from frontend UI components across landing page and health page
  - Removed Questbook from query builder system dropdown and documentation
  - Updated field mapping documentation to remove Questbook system mappings
  - Updated integration guide to remove Questbook references
  - Now supports 2 active integrations: Octant and Giveth
- January 15, 2025. Enhanced Landing Page with OSO Integration and Optimized Query Builder
  - Fixed runtime error in field mapping table by properly escaping JSX interpolation syntax
  - Added OSO (Open Source Observer) integration as "Coming Soon" in supported systems section
  - Simplified API Health tab to directly link to /health page with clean iframe display
  - Optimized Query Builder for Questbook with "Direct DAOIP-5" label and notification banner
  - Updated Quick Start example from Questbook to Octant for better consistency
  - Fixed Giveth ID format in field mapping table to use proper semantic format
  - Enhanced currency conversion documentation with CoinGecko API and 5-minute caching details
  - All 3 systems (Octant, Giveth, Questbook) properly documented with correct integration types
- January 15, 2025. Completed Full Questbook API Integration with Comprehensive Support
  - Updated Questbook adapter to use correct API endpoints: /grant_pools.json and /applications
  - Fixed response parsing to use "grantsPools" field from API response instead of "grants"
  - Enabled Questbook adapter in routes.ts and health service monitoring
  - QUERY BUILDER: Added Questbook to system dropdown for interactive testing
  - SUPPORTED SYSTEMS: Updated status from "Coming Soon" to "Active Integration" with 3 total systems
  - API HEALTH: Enhanced external API dependency monitoring with detailed endpoint checks
  - Updated API documentation to reflect all 3 systems in examples and parameters
  - Integration follows complete pattern: Query Builder + Systems List + Health Monitoring
  - Questbook integration type: Direct DAOIP-5 endpoint routing with 5-minute caching
- January 12, 2025. Added Responsive Design and Integrated API Health Navigation
  - Made all styling responsive to screen sizes with proper mobile/tablet/desktop breakpoints
  - Integrated API Health page into main navigation sidebar instead of external link
  - Added comprehensive API Health section to landing page with health dashboard access
  - Enhanced responsive design for health monitoring page with mobile-optimized components
  - Improved hero section with responsive buttons and better mobile layout
  - Added direct links from overview to API documentation, health monitoring, and integration guide
  - Fixed navigation structure to provide clear access to all documentation and monitoring features
  - Enhanced mobile experience with responsive grid layouts and proper button sizing
- January 12, 2025. Added API Health Monitoring and Enhanced Integration Documentation
  - Created comprehensive health monitoring system with dedicated health service (server/services/health.ts)
  - Added API health endpoints: /api/v1/health, /api/v1/health/:adapter, /api/v1/health-quick
  - Built interactive health monitoring page (/health) with real-time adapter status, response times, and error tracking
  - Enhanced integration documentation with two integration types: Source API (Octant/Giveth) vs Direct DAOIP-5 (Questbook)
  - Added performance considerations section covering caching strategies, circuit breaker patterns, and graceful degradation
  - Created Questbook adapter example (server/adapters/questbook.ts) demonstrating DAOIP-5 endpoint caching with 5-minute TTL
  - Added health navigation to landing page with external link handling
  - Updated grant system references from Gitcoin to Questbook to match implementation
  - Performance optimizations ensure direct DAOIP-5 integrations don't slow down API through caching and async processing
- January 12, 2025. Added Comprehensive Grant System Integration Documentation
  - Created detailed integration guide (docs/integration-guide.md) with step-by-step instructions for adding new grant systems
  - Documentation covers complete workflow: information gathering, API analysis, field mapping, adapter implementation, testing, and deployment
  - Includes practical code examples for adapter class structure, error handling, pagination, and data transformation
  - Added developer resources section to landing page with direct links to integration documentation
  - Created docs/README.md with overview of API usage, supported systems, and documentation structure
  - Integration guide covers all file changes needed: adapters, routes, environment variables, database schema, and testing
  - Documentation designed for developers to independently integrate new grant systems without additional guidance
- January 12, 2025. Enhanced Applications Schema with Full DAOIP-5 Field Support
  - Updated application interface to match complete DAOIP-5 grant application schema specification
  - Added comprehensive field mappings: grantPoolId, grantPoolName, projectName, createdAt, contentURI, fundsApproved, fundsApprovedInUSD, payoutAddress, status, socials, extensions
  - Enhanced Octant adapter to fetch real project names using /projects/details API endpoint
  - Projects now display actual names: Protocol Guild, Rotki, Hypercerts instead of address fragments
  - Applications include USD conversion, proper status mapping, and semantic project IDs
  - Improved semantic project ID format: daoip5:<project-name>:project:<address>
  - Added social media links extraction and proper CAIP-10 address formatting for payout addresses
  - Enhanced extensions with detailed application and project metadata for both platforms
  - Fixed poolId field references throughout codebase to use grantPoolId for consistency
- January 12, 2025. Cleaned up DAOIP-5 Extensions and Improved Grant Pool ID Format
  - Cleaned up extensions to only include platform-specific fields not in DAOIP-5 standard
  - Changed grant pool ID format from EIP-155 to semantic format: daoip5:grantPool:<networkId>:<epochId>
  - Improved applications endpoint to fetch latest grant pool by default or accept specific grantPool ID
  - Fixed confusing EIP-155 IDs that referenced non-existent contract addresses
  - Octant pools now use semantic IDs like daoip5:grantPool:1:1 (network 1, epoch 1)
  - Giveth pools now use semantic IDs like daoip5:grantPool:1:14 (network 1, QF round 14)
  - Applications endpoint automatically selects latest grant pool when no poolId parameter provided
  - Maintained DAOIP-5 extensions with proper vendor prefixes (app.octant.* and io.giveth.*)
- January 12, 2025. Implemented DAOIP-5 Extensions Field Support
  - Updated base adapter interfaces to include optional extensions field for all schema components
  - Implemented Octant-specific extensions with epochMetadata, grantMechanism, and epochDetails
  - Implemented Giveth-specific extensions with roundMetadata, platform details, and project metadata
  - Moved platform-specific fields (USD amounts, metadata) from base schema to extensions
  - Added system-level extensions with platform metadata for both Octant and Giveth
  - Maintained strict DAOIP-5 base compliance while enabling platform innovation
  - Used proper vendor-specific naming conventions (app.octant.* and io.giveth.*)
- June 30, 2025. Enhanced API documentation and DAOIP-5 compliance
  - Replaced Gitcoin with Questbook in supported systems overview
  - Updated grant systems to return proper DAOIP-5 format with @context field
  - Removed projectsURI fields from systems responses per specification
  - Hidden epochMetadata from Octant pools responses (commented for future use)
  - Moved comprehensive API documentation to dedicated "API Endpoints" tab
  - Added tabbed interface for code examples with cURL, JavaScript, TypeScript, and Python
  - Transformed Examples tab into Contributors & Supporters page with mission statement
  - Updated ecosystem description from "blockchain ecosystems" to "Ethereum Ecosystem"
  - Generated .env file for local development setup
  - Kept landing page overview brief and focused
- June 28, 2025. Successfully implemented real API functionality with authentic data from Octant and Giveth
  - Fixed Octant adapter to fetch real epoch data and transform to DAOIP-5 format
  - Fixed Giveth GraphQL queries to fetch actual QF rounds data
  - Combined API now returns 15+ real grant pools with actual funding amounts
  - Query builder functional with real-time API execution and response display
- June 27, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```