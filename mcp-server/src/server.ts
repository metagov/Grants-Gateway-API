import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OpenGrantsApiError, OpenGrantsClient, type QueryValue } from "./client.js";

export const SERVER_NAME = "opengrants";
export const SERVER_VERSION = "0.1.0";

const INSTRUCTIONS = `OpenGrants is open data infrastructure for Web3 grants. All records follow the DAOIP-5
metadata standard: a grant system (e.g. Stellar Community Fund, Octant, Giveth) runs grant pools
(rounds); projects submit grant applications to pools. IDs are DAOIP-5 URIs such as
"daoip5:octant:grantPool:7". Use list_grant_systems first to discover valid "system" filter values,
then narrow down with the pool / application / project tools. List tools are paginated
(limit <= 100, offset) and return a "pagination" object with totalCount and hasNext.`;

// Filter values accepted by the gateway's adapters.
const systemParam = z
  .string()
  .optional()
  .describe('Grant system to query, e.g. "scf" (Stellar Community Fund), "octant", "giveth". Omit for all systems.');
const limitParam = z.number().int().min(1).max(100).optional().describe("Page size (1-100, default 10).");
const offsetParam = z.number().int().min(0).optional().describe("Number of records to skip (default 0).");
const sortOrderParam = z.enum(["asc", "desc"]).optional().describe("Sort direction.");

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

async function run(fn: () => Promise<unknown>): Promise<ToolResult> {
  try {
    const data = await fn();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  } catch (err) {
    const message =
      err instanceof OpenGrantsApiError
        ? err.status === 404
          ? `Not found: ${err.message}`
          : err.status === 429
            ? `Rate limited by the OpenGrants API. Retry later, or set OPENGRANTS_API_KEY for a higher limit. (${err.message})`
            : err.message
        : `Request to OpenGrants API failed: ${err instanceof Error ? err.message : String(err)}`;
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

const readOnly = { readOnlyHint: true, openWorldHint: true } as const;

export function createServer(client: OpenGrantsClient): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: INSTRUCTIONS });

  const get = (path: string, query?: Record<string, QueryValue>) => run(() => client.get(path, query));
  const enc = encodeURIComponent;

  server.registerTool(
    "list_grant_systems",
    {
      title: "List grant systems",
      description: "List the grant systems (funding programs) indexed by OpenGrants, as DAOIP-5 grantSystem records.",
      inputSchema: { system: systemParam, limit: limitParam, offset: offsetParam },
      annotations: readOnly,
    },
    (args) => get("/api/v1/grantSystems", args),
  );

  server.registerTool(
    "get_grant_system",
    {
      title: "Get grant system",
      description: "Fetch a single grant system by its DAOIP-5 id.",
      inputSchema: { id: z.string().min(1).describe("Grant system id."), system: systemParam },
      annotations: readOnly,
    },
    ({ id, system }) => get(`/api/v1/grantSystems/${enc(id)}`, { system }),
  );

  server.registerTool(
    "list_grant_pools",
    {
      title: "List grant pools",
      description:
        "List grant pools (funding rounds), optionally filtered by system, open/closed state or funding mechanism.",
      inputSchema: {
        system: systemParam,
        isOpen: z.boolean().optional().describe("true = only open rounds, false = only closed rounds."),
        mechanism: z.string().optional().describe('Grant funding mechanism, e.g. "Quadratic Funding", "Direct Grants".'),
        sortBy: z.enum(["id", "name", "closeDate"]).optional().describe("Field to sort by."),
        sortOrder: sortOrderParam,
        limit: limitParam,
        offset: offsetParam,
      },
      annotations: readOnly,
    },
    (args) => get("/api/v1/grantPools", args),
  );

  server.registerTool(
    "get_grant_pool",
    {
      title: "Get grant pool",
      description: 'Fetch a single grant pool (round) by DAOIP-5 id, e.g. "daoip5:octant:grantPool:7".',
      inputSchema: { id: z.string().min(1).describe("Grant pool id."), system: systemParam },
      annotations: readOnly,
    },
    ({ id, system }) => get(`/api/v1/grantPools/${enc(id)}`, { system }),
  );

  server.registerTool(
    "list_grant_applications",
    {
      title: "List grant applications",
      description:
        "List grant applications (funded or submitted proposals) with requested/approved amounts. Filter by system, pool, project or status.",
      inputSchema: {
        system: systemParam,
        poolId: z.string().optional().describe("Only applications to this grant pool id."),
        projectId: z.string().optional().describe("Only applications from this project id."),
        status: z
          .string()
          .optional()
          .describe('DAOIP-5 application status, e.g. "funded", "approved", "rejected", "pending", "completed".'),
        sortBy: z.string().optional().describe('Field to sort by, e.g. "fundsApprovedInUSD", "createdAt".'),
        sortOrder: sortOrderParam,
        limit: limitParam,
        offset: offsetParam,
      },
      annotations: readOnly,
    },
    (args) => get("/api/v1/grantApplications", args),
  );

  server.registerTool(
    "get_grant_application",
    {
      title: "Get grant application",
      description: "Fetch a single grant application by its DAOIP-5 id.",
      inputSchema: { id: z.string().min(1).describe("Grant application id."), system: systemParam },
      annotations: readOnly,
    },
    ({ id, system }) => get(`/api/v1/grantApplications/${enc(id)}`, { system }),
  );

  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description: "List projects that have applied to or received grants.",
      inputSchema: {
        system: systemParam,
        sortBy: z.string().optional().describe('Field to sort by, e.g. "name".'),
        sortOrder: sortOrderParam,
        limit: limitParam,
        offset: offsetParam,
      },
      annotations: readOnly,
    },
    (args) => get("/api/v1/projects", args),
  );

  server.registerTool(
    "get_project",
    {
      title: "Get project",
      description: "Fetch a single project by its DAOIP-5 id.",
      inputSchema: { id: z.string().min(1).describe("Project id."), system: systemParam },
      annotations: readOnly,
    },
    ({ id, system }) => get(`/api/v1/projects/${enc(id)}`, { system }),
  );

  server.registerTool(
    "get_system_funding_summary",
    {
      title: "Get system funding summary",
      description:
        "Aggregate funding summary for one grant system (total funding, rounds, applications) from the cached DAOIP-5 dataset. Omit system to get summaries for every system.",
      inputSchema: { system: systemParam },
      annotations: readOnly,
    },
    ({ system }) =>
      system ? get(`/api/public/daoip5/${enc(system)}/summary`) : get("/api/public/daoip5/systems"),
  );

  server.registerTool(
    "api_health",
    {
      title: "API health",
      description: "Check the health of the OpenGrants Gateway API and its per-system data adapters.",
      inputSchema: {},
      annotations: readOnly,
    },
    () => get("/api/v1/health"),
  );

  return server;
}
