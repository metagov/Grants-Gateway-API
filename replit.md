# OpenGrants Gateway API

## Overview

OpenGrants Gateway API is a unified interface for accessing grant data across multiple blockchain ecosystems using the DAOIP-5 metadata standard. The application provides a standardized REST API that normalizes data from various grant systems including Octant and Giveth, making it easier for developers to build applications that work with multiple funding platforms.

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
- June 27, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```