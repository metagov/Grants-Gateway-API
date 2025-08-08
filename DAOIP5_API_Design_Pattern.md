# DAOIP-5 API Design Pattern for Grant Systems
*A comprehensive guide for publishing DAOIP-5 compliant grant data endpoints*

## Overview

This design pattern enables organizations to publish their grant data following the DAOIP-5 standard while maintaining the same quality standards as the OpenGrants Gateway API. Organizations can implement these endpoints to make their data easily integrable with aggregation platforms.

## 1. Core API Architecture

### 1.1 Base URL Structure
```
https://api.{your-domain}.com/daoip5/v1/
```

### 1.2 Required Endpoints
All implementations must provide these core endpoints:

```
GET /grantSystems           # System metadata
GET /grantSystems/{id}      # Individual system details
GET /grantPools             # Grant pools/rounds
GET /grantPools/{id}        # Individual pool details
GET /grantApplications      # Grant applications
GET /grantApplications/{id} # Individual application details
GET /health                 # System health check
```

## 2. DAOIP-5 Schema Compliance

### 2.1 Grant System Schema
```typescript
interface DAOIP5System {
  "@context": "http://www.daostar.org/schemas";
  name: string;                    // Organization name
  type: string;                    // "DAO" | "Organization" 
  grantPoolsURI?: string;          // Relative path to pools endpoint
  extensions?: {
    "app.{yourorg}.systemMetadata": {
      platform: string;           // Your platform identifier
      description: string;        // System description
      website: string;            // Main website URL
      apiEndpoint: string;        // This API's base URL
      supportedNetworks: string[]; // ["ethereum", "polygon", etc.]
      fundingMechanisms: string[]; // ["direct", "quadratic_funding", etc.]
      established: string;        // Year established
      [key: string]: any;         // Additional metadata
    };
  };
}
```

### 2.2 Grant Pool Schema
```typescript
interface DAOIP5GrantPool {
  type: "GrantPool";
  id: string;                      // Format: "daoip5:{org}:grantPool:{poolId}"
  name: string;                    // Human readable pool name
  description: string;             // Pool description
  grantFundingMechanism: string;   // "Direct" | "Quadratic Funding" | "Retroactive"
  isOpen: boolean;                 // Currently accepting applications
  closeDate?: string;              // ISO 8601 date when pool closes
  applicationsURI?: string;        // Relative path to applications
  governanceURI?: string;          // Governance documentation URL
  attestationIssuersURI?: string;  // Attestation issuers if applicable
  requiredCredentials?: string[];  // Required credentials
  totalGrantPoolSize?: Array<{
    amount: string;                // Amount as string (to handle large numbers)
    denomination: string;          // "ETH" | "USDC" | "DAI" | etc.
  }>;
  email?: string;                  // Contact email
  image?: string;                  // Pool image URL
  coverImage?: string;             // Pool cover image URL
  extensions?: {
    "app.{yourorg}.poolMetadata": {
      // Your organization-specific metadata
      totalGrantPoolSizeUSD?: string;
      roundNumber?: number;
      [key: string]: any;
    };
  };
}
```

### 2.3 Grant Application Schema
```typescript
interface DAOIP5Application {
  type: "GrantApplication";
  id: string;                      // Format: "daoip5:{org}:grantPool:{poolId}:grantApplication:{appId}"
  grantPoolId: string;             // Reference to parent pool
  grantPoolName?: string;          // Human readable pool name
  projectId: string;               // Format: "daoip5:{project-name}:project:{identifier}"
  projectName?: string;            // Human readable project name
  createdAt?: string;              // ISO 8601 creation date
  contentURI?: string;             // Application content URL
  discussionsTo?: string;          // Discussion/forum URL
  licenseURI?: string;             // License information URL
  isInactive?: boolean;            // Application is no longer active
  applicationCompletionRate?: number; // 0-100 completion percentage
  socials?: Array<{
    platform: string;             // "Website" | "Twitter" | "GitHub" | etc.
    url: string;                   // Social media URL
  }>;
  fundsAsked?: Array<{
    amount: string;                // Requested amount as string
    denomination: string;          // Currency denomination
  }>;
  fundsAskedInUSD?: string;        // USD equivalent of funds asked
  fundsApproved?: Array<{
    amount: string;                // Approved amount as string
    denomination: string;          // Currency denomination  
  }>;
  fundsApprovedInUSD?: string;     // USD equivalent of funds approved
  payoutAddress?: {
    type: string;                  // "EthereumAddress" | "PolygonAddress" | etc.
    value: string;                 // The actual address
  };
  status: "pending" | "in_review" | "approved" | "funded" | "rejected" | "completed";
  payouts?: Array<{
    type: string;                  // Payout type identifier
    value: any;                    // Payout details
    proof?: string;                // Transaction hash or proof URL
  }>;
  extensions?: {
    "app.{yourorg}.applicationMetadata": {
      // Your organization-specific metadata
      [key: string]: any;
    };
    // Cross-platform integration
    "x-karmagap-uid"?: string;     // KARMA GAP project UID if available
  };
}
```

## 3. Authentication & Security Standards

### 3.1 API Key Authentication
Implement Bearer token authentication:

```typescript
// Request headers
Authorization: Bearer {api_key}

// Response for invalid key
{
  "error": "Invalid API key",
  "message": "The provided API key is not valid"
}

// Allow anonymous access with reduced rate limits
// No authorization header = anonymous access
```

### 3.2 Rate Limiting
Implement per-user and anonymous rate limiting:

```typescript
// Rate limit headers (include in all responses)
X-RateLimit-Limit: "100"              // Requests per minute
X-RateLimit-Remaining: "95"           // Remaining requests
X-RateLimit-Reset: "2024-08-08T20:15:00Z"  // Reset time

// Rate limit exceeded response
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Limit: 100 requests per minute.",
  "retryAfter": 45  // Seconds until reset
}

// Suggested limits:
// - Anonymous: 20 requests/minute
// - Authenticated: 100+ requests/minute (configurable per user)
```

## 4. Error Handling Standards

### 4.1 Standard Error Format
All error responses must follow this structure:

```typescript
{
  "error": string;     // Error category
  "message": string;   // Human readable message
  // Optional additional fields for specific errors
}
```

### 4.2 HTTP Status Codes
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid or missing API key)
- `404` - Not Found (resource doesn't exist)
- `429` - Rate Limited
- `500` - Internal Server Error
- `503` - Service Unavailable

### 4.3 Error Examples
```typescript
// Not found
{
  "error": "Pool not found",
  "message": "Grant pool with ID daoip5:allo:grantPool:123 not found"
}

// Bad request
{
  "error": "Invalid parameters",
  "message": "limit must be between 1 and 100"
}

// Server error
{
  "error": "Internal server error", 
  "message": "Failed to fetch grant pools"
}
```

## 5. Pagination Standards

### 5.1 Query Parameters
Support these pagination parameters:

```typescript
// Query parameters
limit?: number;    // 1-100, default 10
offset?: number;   // 0+, default 0
page?: number;     // Alternative to offset (page * limit = offset)
```

### 5.2 Pagination Response Format
```typescript
interface PaginatedResponse<T> {
  "@context": "http://www.daostar.org/schemas";
  data: T[];
  pagination: {
    totalCount: number;      // Total items available
    totalPages: number;      // Total pages available
    currentPage: number;     // Current page number (1-indexed)
    limit: number;           // Items per page
    offset: number;          // Current offset
    hasNext: boolean;        // Has next page
    hasPrevious: boolean;    // Has previous page
    nextPage?: number;       // Next page number if hasNext
    previousPage?: number;   // Previous page number if hasPrevious
  };
}
```

## 6. Query Filter Standards

### 6.1 Grant Pools Filters
```typescript
// Supported query parameters
GET /grantPools?isOpen=true&mechanism=Quadratic%20Funding&limit=20&offset=0

interface PoolFilters {
  isOpen?: boolean;          // Filter by open/closed status
  mechanism?: string;        // Filter by funding mechanism
  limit?: number;            // Pagination limit
  offset?: number;           // Pagination offset
}
```

### 6.2 Grant Applications Filters
```typescript
// Supported query parameters
GET /grantApplications?poolId=daoip5:allo:grantPool:123&status=funded&limit=20

interface ApplicationFilters {
  poolId?: string;           // Filter by grant pool
  projectId?: string;        // Filter by project
  status?: string;           // Filter by application status
  limit?: number;            // Pagination limit
  offset?: number;           // Pagination offset
}
```

## 7. Health Check Endpoint

### 7.1 Basic Health Check
```typescript
GET /health

// Response
{
  "status": "healthy" | "degraded" | "down",
  "timestamp": "2024-08-08T20:15:00Z",
  "services": {
    "database": "connected" | "disconnected",
    "external_apis": "healthy" | "degraded" | "down"
  },
  "version": "1.0.0",
  "uptime": 86400  // Seconds
}
```

## 8. Data Quality Standards

### 8.1 ID Format Standards
Use semantic, consistent ID formats:

```typescript
// System IDs
"daoip5:{org-name}:system"

// Pool IDs  
"daoip5:{org-name}:grantPool:{pool-identifier}"

// Application IDs
"daoip5:{org-name}:grantPool:{pool-id}:grantApplication:{app-identifier}"

// Project IDs
"daoip5:{project-name}:project:{project-identifier}"
```

### 8.2 Date Format Standards
- Use ISO 8601 format: `2024-08-08T20:15:00Z`
- Always include timezone (prefer UTC)
- Ensure consistent date formatting across all endpoints

### 8.3 Currency Standards
- Use string format for all monetary amounts to prevent precision loss
- Always specify denomination clearly
- Provide USD equivalents when possible
- Support multiple currencies in funding arrays

## 9. Performance Standards

### 9.1 Response Time Targets
- `/health` endpoint: < 100ms
- List endpoints: < 500ms  
- Individual resource endpoints: < 300ms
- Complex aggregation queries: < 2000ms

### 9.2 Availability Standards
- Target 99.9% uptime
- Implement graceful degradation for external dependencies
- Provide meaningful error messages during outages

## 10. Implementation Checklist

### 10.1 Required Implementation Steps

#### Phase 1: Core Infrastructure
- [ ] Set up basic API server with routing
- [ ] Implement authentication middleware
- [ ] Implement rate limiting middleware
- [ ] Set up error handling middleware
- [ ] Implement request logging

#### Phase 2: DAOIP-5 Endpoints
- [ ] Implement `/grantSystems` endpoint
- [ ] Implement `/grantPools` endpoint with pagination
- [ ] Implement `/grantApplications` endpoint with pagination
- [ ] Implement individual resource endpoints (`/{id}`)
- [ ] Implement `/health` endpoint

#### Phase 3: Data Quality
- [ ] Ensure all responses follow DAOIP-5 schema
- [ ] Implement proper ID formatting
- [ ] Add currency conversion to USD
- [ ] Validate all required fields
- [ ] Test pagination edge cases

#### Phase 4: Integration Ready
- [ ] Add CORS headers for web integration
- [ ] Implement comprehensive filtering
- [ ] Add API documentation endpoint
- [ ] Set up monitoring and alerting
- [ ] Load test all endpoints

### 10.2 Testing Requirements
- Unit tests for all endpoints
- Integration tests for pagination
- Load testing for performance standards
- Schema validation testing
- Error handling testing

### 10.3 Documentation Requirements
- OpenAPI/Swagger specification
- Integration examples
- Rate limiting documentation
- Error code reference
- Authentication setup guide

## 11. Integration with OpenGrants Gateway

Once your API implements this pattern, integration with the OpenGrants Gateway requires:

1. **Registration**: Submit your API base URL and system metadata
2. **Validation**: Gateway validates DAOIP-5 compliance
3. **Adapter Creation**: Gateway creates a lightweight adapter
4. **Testing**: End-to-end integration testing
5. **Production**: Your data becomes available through the unified API

### 11.1 Adapter Integration Pattern
```typescript
// Your endpoints become accessible through:
https://api.opengrants.com/api/v1/grantPools?system=allo-capital
https://api.opengrants.com/api/v1/grantApplications?system=allo-capital

// And in unified queries:
https://api.opengrants.com/api/v1/grantPools  // Includes your data
```

## 12. Example Implementation

### 12.1 Sample Express.js Route Structure
```typescript
// Basic route structure following the pattern
app.get('/daoip5/v1/grantPools', rateLimitMiddleware, async (req, res) => {
  try {
    const { isOpen, mechanism, limit = 10, offset = 0 } = req.query;
    
    // Apply filters and pagination
    const result = await getGrantPools({ isOpen, mechanism, limit, offset });
    
    const response: PaginatedResponse<DAOIP5GrantPool> = {
      "@context": "http://www.daostar.org/schemas",
      data: result.data,
      pagination: calculatePagination(result.totalCount, limit, offset)
    };
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch grant pools"
    });
  }
});
```

This design pattern ensures your API meets the same quality standards as the OpenGrants Gateway while maintaining the flexibility to showcase your organization's unique features through the extensions mechanism.