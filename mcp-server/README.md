# OpenGrants MCP Server

An [MCP](https://modelcontextprotocol.io) server that exposes the OpenGrants dataset — Web3 grant
funding data in the [DAOIP-5](https://github.com/metagov/daostar) standard, including every
completed Stellar Community Fund round — so AI agents, researchers and downstream tools (e.g. PG
Atlas) can query it directly.

It is a thin, read-only wrapper over the public OpenGrants Gateway API
(`https://grants.daostar.org/api/v1`). No database access is needed.

## Tools

| Tool | What it returns | Gateway endpoint |
| --- | --- | --- |
| `list_grant_systems` | Grant systems (funding programs) | `GET /api/v1/grantSystems` |
| `get_grant_system` | One grant system by id | `GET /api/v1/grantSystems/:id` |
| `list_grant_pools` | Rounds; filter by `system`, `isOpen`, `mechanism` | `GET /api/v1/grantPools` |
| `get_grant_pool` | One round by id | `GET /api/v1/grantPools/:id` |
| `list_grant_applications` | Applications; filter by `system`, `poolId`, `projectId`, `status` | `GET /api/v1/grantApplications` |
| `get_grant_application` | One application by id | `GET /api/v1/grantApplications/:id` |
| `list_projects` | Projects | `GET /api/v1/projects` |
| `get_project` | One project by id | `GET /api/v1/projects/:id` |
| `get_system_funding_summary` | Aggregate funding summary for one or all systems | `GET /api/public/daoip5/...` |
| `api_health` | Gateway and adapter health | `GET /api/v1/health` |

List tools take `limit` (1–100, default 10) and `offset`, and return the API's `pagination` block.
Use `system: "scf"` for Stellar Community Fund data.

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `OPENGRANTS_API_URL` | `https://grants.daostar.org` | Gateway base URL (point at `http://localhost:5000` for local dev) |
| `OPENGRANTS_API_KEY` | _(unset)_ | Optional. Anonymous access is rate-limited to 20 req/min; a key from <https://grants.daostar.org> raises it to 100 req/min. |

## Usage

```bash
cd mcp-server
npm install
npm run build
```

### Claude Code

```bash
claude mcp add opengrants -- node /path/to/Grants-Gateway-API/mcp-server/dist/index.js
# with an API key:
claude mcp add opengrants -e OPENGRANTS_API_KEY=... -- node /path/to/.../dist/index.js
```

### Claude Desktop / other MCP clients

```json
{
  "mcpServers": {
    "opengrants": {
      "command": "node",
      "args": ["/path/to/Grants-Gateway-API/mcp-server/dist/index.js"],
      "env": { "OPENGRANTS_API_KEY": "" }
    }
  }
}
```

### Example prompts

- "How much has the Stellar Community Fund awarded across all rounds?"
- "List the open grant rounds using quadratic funding."
- "Show every grant application from project `<id>` and the amounts approved."

## Development

```bash
npm run dev    # run from source with tsx
npm test       # unit tests (stubbed HTTP, in-memory MCP transport)
npx @modelcontextprotocol/inspector node dist/index.js   # interactive inspector
```
