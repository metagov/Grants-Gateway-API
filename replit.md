# OpenGrants Gateway API

## Overview
OpenGrants Gateway API provides a unified REST API for accessing grant data across the Ethereum Ecosystem, leveraging the DAOIP-5 metadata standard. It normalizes data from various grant systems like Octant and Giveth, simplifying development for applications interacting with multiple funding platforms. The project aims to facilitate easier access to and utilization of grant information, fostering innovation within the decentralized funding landscape.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Monorepo
- **Client**: React frontend with TypeScript (Vite)
- **Server**: Express.js backend with TypeScript
- **Shared**: Common schemas and types
- **Database**: PostgreSQL with Drizzle ORM

### Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript, Node.js 20
- **Database**: PostgreSQL 16 with Drizzle ORM
- **Build Tools**: Vite (frontend), esbuild (backend)

### Key Components
- **Database Schema**: Core tables for users, grant systems, field mappings, API configurations, and logs.
- **API Adapters**: Implements an adapter pattern (BaseAdapter, OctantAdapter, GivethAdapter) for integrating diverse grant systems and normalizing data to the DAOIP-5 standard. Designed for extensibility.
- **Authentication & Rate Limiting**: Dual authentication support (Replit Auth via OIDC + API key-based Bearer tokens), per-user rate limiting (10 req/min for data endpoints), query parameter validation, and structured logging with user ID and execution metrics.
- **Frontend Features**: Interactive API documentation, query builder, real-time response preview, and dark/light theme support with a mobile-responsive design.

### Data Flow
Client requests are authenticated and rate-limited, routed through appropriate grant system adapters for data transformation to DAOIP-5, and returned as a unified JSON response. All requests are logged for analytics.

### UI/UX Decisions
- Uses shadcn/ui components for a consistent and accessible user interface.
- Supports dark/light themes.
- Designed to be mobile-responsive across various devices.
- Interactive API documentation and query builder provide a user-friendly interface for testing and exploring the API.

### System Design Choices
- **Monorepo**: Facilitates shared code and consistent development across client and server.
- **Adapter Pattern**: Ensures easy integration of new grant systems without major architectural changes.
- **DAOIP-5 Standard**: Central to data normalization and interoperability.
- **Scalable Deployment**: Designed for production with Replit autoscale and optimized build pipelines.
- **Pagination Support**: All API endpoints support comprehensive pagination for efficient data retrieval.
- **Semantic IDs**: Utilizes semantic IDs for grant pools and applications for improved data integrity and clarity.

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver.
- **drizzle-orm**: Type-safe SQL query builder.
- **@tanstack/react-query**: Data fetching and caching for React.
- **@radix-ui/react-***: Accessible UI component primitives.
- **wouter**: Lightweight React router.

### Platform Integrations
- **Octant API**: Direct HTTP integration for epoch and project data.
- **Giveth GraphQL**: GraphQL integration for project and QF round data.
- **KARMA GAP API**: Integrated for enhanced project metadata and cross-platform project identification.
- **DAOIP-5 Data Sources**: Integrations with systems like Stellar, Celo, Arbitrum Foundation, and Optimism through static DAOIP-5 data files from daoip5.daostar.org.