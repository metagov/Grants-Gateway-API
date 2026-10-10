// OpenAPI 3.1 description of the public, read-only OpenGrants Gateway API.
// Served at GET /api/v1/openapi.json. The MCP server (mcp/) is generated from it, so
// operationIds become MCP tool names and descriptions become tool descriptions:
// keep them precise and written for someone (or an agent) who has never seen the API.

const daoip5Id = (example: string) => ({ type: "string", description: "DAOIP-5 ID", example });

const systemParam = {
  name: "system",
  in: "query",
  required: false,
  description:
    'Grant system to query. Use "scf" for the Stellar Community Fund, "octant" or "giveth". Omit to query all systems.',
  schema: { type: "string", enum: ["scf", "octant", "giveth"] },
};
const limitParam = {
  name: "limit",
  in: "query",
  required: false,
  description: "Page size, 1–100 (default 10).",
  schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
};
const offsetParam = {
  name: "offset",
  in: "query",
  required: false,
  description: "Number of records to skip (default 0). Use with limit to page through results.",
  schema: { type: "integer", minimum: 0, default: 0 },
};
const sortOrderParam = {
  name: "sortOrder",
  in: "query",
  required: false,
  description: "Sort direction.",
  schema: { type: "string", enum: ["asc", "desc"] },
};
const idPath = (what: string, example: string) => ({
  name: "id",
  in: "path",
  required: true,
  description: `DAOIP-5 ${what} ID, e.g. "${example}". URL-encode it (":" becomes "%3A").`,
  schema: { type: "string" },
});

const amount = {
  type: "array",
  items: {
    type: "object",
    properties: { amount: { type: "string" }, denomination: { type: "string" } },
  },
};

const extensions = {
  type: "object",
  description:
    'System-specific fields, keyed by namespace. SCF data is under "org.stellar.communityfund" (round, category, totalAwardedUSD, totalPaidUSD, trancheCompletionPercent, awardType, …).',
  additionalProperties: true,
};

const pagination = {
  type: "object",
  properties: {
    totalCount: { type: "integer" },
    totalPages: { type: "integer" },
    currentPage: { type: "integer" },
    limit: { type: "integer" },
    offset: { type: "integer" },
    hasNext: { type: "boolean" },
    hasPrevious: { type: "boolean" },
  },
};

const page = (ref: string) => ({
  type: "object",
  properties: {
    "@context": { type: "string" },
    data: { type: "array", items: { $ref: ref } },
    pagination,
  },
});

const ok = (description: string, schema: object) => ({
  description,
  content: { "application/json": { schema } },
});
const notFound = { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } };

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "OpenGrants Gateway API",
    version: "1.0.0",
    description:
      "Read-only access to Web3 grant funding data in the DAOIP-5 standard: grant systems (funding programs), grant pools (rounds), grant applications (awards) and projects. Includes every Stellar Community Fund (SCF) round. Anonymous access is rate-limited (20 requests/minute); an API key raises the limit.",
    license: { name: "MIT" },
    contact: { name: "OpenGrants", url: "https://opengrants.daostar.org/about" },
  },
  servers: [{ url: "https://grants.daostar.org" }],
  security: [{}, { bearerAuth: [] }],
  tags: [
    { name: "systems", description: "Grant systems (funding programs)" },
    { name: "pools", description: "Grant pools (funding rounds)" },
    { name: "applications", description: "Grant applications (awards)" },
    { name: "projects", description: "Projects that applied for or received grants" },
    { name: "summaries", description: "Pre-computed funding summaries" },
    { name: "meta", description: "Service status" },
  ],
  paths: {
    "/api/v1/grantSystems": {
      get: {
        operationId: "list_grant_systems",
        tags: ["systems"],
        summary: "List grant systems",
        description: "List the grant systems (funding programs) indexed by OpenGrants. Start here to find valid `system` values.",
        parameters: [systemParam, limitParam, offsetParam],
        responses: { "200": ok("Grant systems", page("#/components/schemas/GrantSystem")) },
      },
    },
    "/api/v1/grantSystems/{id}": {
      get: {
        operationId: "get_grant_system",
        tags: ["systems"],
        summary: "Get a grant system",
        parameters: [idPath("grant system", "daoip5:scf"), systemParam],
        responses: { "200": ok("Grant system", { $ref: "#/components/schemas/GrantSystem" }), "404": notFound },
      },
    },
    "/api/v1/grantPools": {
      get: {
        operationId: "list_grant_pools",
        tags: ["pools"],
        summary: "List grant pools (rounds)",
        description:
          "List funding rounds, optionally filtered by system, open/closed state or funding mechanism. SCF rounds are named like \"SCF #45\".",
        parameters: [
          systemParam,
          { name: "isOpen", in: "query", required: false, description: "true = only open rounds, false = only closed rounds.", schema: { type: "boolean" } },
          { name: "mechanism", in: "query", required: false, description: 'Funding mechanism, e.g. "Direct Grants", "Quadratic Funding".', schema: { type: "string" } },
          { name: "sortBy", in: "query", required: false, description: "Field to sort by.", schema: { type: "string", enum: ["id", "name", "closeDate"] } },
          sortOrderParam,
          limitParam,
          offsetParam,
        ],
        responses: { "200": ok("Grant pools", page("#/components/schemas/GrantPool")) },
      },
    },
    "/api/v1/grantPools/{id}": {
      get: {
        operationId: "get_grant_pool",
        tags: ["pools"],
        summary: "Get a grant pool (round)",
        parameters: [idPath("grant pool", "daoip-5:scf:grantPool:scf_#45"), systemParam],
        responses: { "200": ok("Grant pool", { $ref: "#/components/schemas/GrantPool" }), "404": notFound },
      },
    },
    "/api/v1/grantApplications": {
      get: {
        operationId: "list_grant_applications",
        tags: ["applications"],
        summary: "List grant applications (awards)",
        description:
          "List grant applications with amounts awarded and paid. Filter by round (poolId) or project (projectId) — e.g. all SCF awards to one project: system=scf&projectId=daoip-5:scf:project:stellar_light. To get every award for a project, pass system together with projectId. Otherwise always pass poolId: without it, results come from a single default round, which is not necessarily the most recent.",
        parameters: [
          systemParam,
          { name: "poolId", in: "query", required: false, description: "Only applications to this grant pool (round) ID.", schema: { type: "string" } },
          { name: "projectId", in: "query", required: false, description: "Only applications from this project ID.", schema: { type: "string" } },
          { name: "status", in: "query", required: false, description: "DAOIP-5 application status.", schema: { type: "string", enum: ["pending", "in_review", "approved", "funded", "rejected", "completed"] } },
          { name: "sortBy", in: "query", required: false, description: "Field to sort by.", schema: { type: "string" } },
          sortOrderParam,
          limitParam,
          offsetParam,
        ],
        responses: { "200": ok("Grant applications", page("#/components/schemas/GrantApplication")) },
      },
    },
    "/api/v1/grantApplications/{id}": {
      get: {
        operationId: "get_grant_application",
        tags: ["applications"],
        summary: "Get a grant application",
        parameters: [idPath("grant application", "daoip-5:scf:application:stellar_light"), systemParam],
        responses: { "200": ok("Grant application", { $ref: "#/components/schemas/GrantApplication" }), "404": notFound },
      },
    },
    "/api/v1/projects": {
      get: {
        operationId: "list_projects",
        tags: ["projects"],
        summary: "List projects",
        description: "List projects that applied for or received grants.",
        parameters: [
          systemParam,
          { name: "sortBy", in: "query", required: false, description: "Field to sort by.", schema: { type: "string", enum: ["id", "name"] } },
          sortOrderParam,
          limitParam,
          offsetParam,
        ],
        responses: { "200": ok("Projects", page("#/components/schemas/Project")) },
      },
    },
    "/api/v1/projects/{id}": {
      get: {
        operationId: "get_project",
        tags: ["projects"],
        summary: "Get a project",
        description: "Get one project. For its funding history, call list_grant_applications with this projectId.",
        parameters: [idPath("project", "daoip-5:scf:project:stellar_light"), systemParam],
        responses: { "200": ok("Project", { $ref: "#/components/schemas/Project" }), "404": notFound },
      },
    },
    "/api/public/daoip5/systems": {
      get: {
        operationId: "list_system_summaries",
        tags: ["summaries"],
        summary: "Funding summaries for all systems",
        description: "Totals per grant system (funding, rounds, applications) from the cached DAOIP-5 dataset.",
        responses: { "200": ok("Summaries", { type: "array", items: { type: "object", additionalProperties: true } }) },
      },
    },
    "/api/public/daoip5/{system}/summary": {
      get: {
        operationId: "get_system_summary",
        tags: ["summaries"],
        summary: "Funding summary for one system",
        parameters: [{ name: "system", in: "path", required: true, description: 'Grant system, e.g. "scf".', schema: { type: "string" } }],
        responses: { "200": ok("Summary", { type: "object", additionalProperties: true }) },
      },
    },
    "/api/v1/health": {
      get: {
        operationId: "get_api_health",
        tags: ["meta"],
        summary: "API health",
        description: "Overall service health and per-system adapter status.",
        responses: { "200": ok("Healthy or degraded", { type: "object", additionalProperties: true }), "503": { description: "Down" } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", description: "Optional API key from https://grants.daostar.org; raises the rate limit." },
    },
    schemas: {
      Error: { type: "object", properties: { error: { type: "string" }, message: { type: "string" } } },
      GrantSystem: {
        type: "object",
        properties: {
          "@context": { type: "string" },
          name: { type: "string" },
          type: { type: "string" },
          grantPoolsURI: { type: "string" },
          extensions,
        },
      },
      GrantPool: {
        type: "object",
        properties: {
          type: { const: "GrantPool" },
          id: daoip5Id("daoip-5:scf:grantPool:scf_#45"),
          name: { type: "string" },
          description: { type: "string" },
          grantFundingMechanism: { type: "string" },
          isOpen: { type: "boolean" },
          closeDate: { type: "string" },
          totalGrantPoolSize: amount,
          extensions,
        },
      },
      GrantApplication: {
        type: "object",
        properties: {
          type: { const: "GrantApplication" },
          id: daoip5Id("daoip-5:scf:application:stellar_light"),
          grantPoolId: { type: "string" },
          grantPoolName: { type: "string" },
          projectId: { type: "string" },
          projectName: { type: "string" },
          createdAt: { type: "string" },
          contentURI: { type: "string" },
          status: { type: "string" },
          fundsApprovedInUSD: { type: "string" },
          fundsApproved: amount,
          extensions,
        },
      },
      Project: {
        type: "object",
        properties: {
          type: { const: "Project" },
          id: daoip5Id("daoip-5:scf:project:stellar_light"),
          name: { type: "string" },
          description: { type: "string" },
          contentURI: { type: "string" },
          image: { type: "string" },
          socials: { type: "array", items: { type: "object", properties: { name: { type: "string" }, value: { type: "string" } } } },
          extensions,
        },
      },
    },
  },
} as const;
