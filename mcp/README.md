# OpenGrants MCP Server

A remote [MCP](https://modelcontextprotocol.io) server that lets AI agents query OpenGrants —
Web3 grant funding data in the DAOIP-5 standard, including every Stellar Community Fund round.

It is **generated** from the Gateway API's OpenAPI spec with
[FastMCP](https://gofastmcp.com) `from_openapi`. There is no hand-written tool code: every
operation in `GET /api/v1/openapi.json` (defined in `server/openapi.ts`) becomes a tool, named by
its `operationId` and described by its description. Change the spec, restart the server, and the
tools follow.

## Connect

Once deployed (e.g. at `https://mcp.grants.daostar.org/mcp`):

```bash
# Claude Code
claude mcp add --transport http opengrants https://mcp.grants.daostar.org/mcp
```

Claude Desktop, Cursor and other clients: add a remote/Streamable HTTP server with that URL.

## Tools

| Tool | Returns |
| --- | --- |
| `list_grant_systems` / `get_grant_system` | Grant systems (funding programs) |
| `list_grant_pools` / `get_grant_pool` | Rounds, filterable by system, open/closed, mechanism |
| `list_grant_applications` / `get_grant_application` | Awards with amounts, by round (`poolId`) or project (`projectId`) |
| `list_projects` / `get_project` | Projects |
| `list_system_summaries` / `get_system_summary` | Funding totals per system |
| `get_api_health` | Gateway status |

Example questions: "What has the Stellar Community Fund awarded to Tansu across all rounds?",
"List the awards in SCF #45", "Which SCF projects are in Developer Tooling?"

## Run

```bash
cd mcp
pip install -r requirements.txt
OPENGRANTS_API_URL=https://grants.daostar.org python server.py   # → http://localhost:8000/mcp
```

| Env var | Default | Purpose |
| --- | --- | --- |
| `OPENGRANTS_API_URL` | `https://grants.daostar.org` | Gateway API to read the spec from and call |
| `OPENGRANTS_API_KEY` | _(unset)_ | Optional API key; raises the rate limit from 20 to 100 req/min |
| `PORT` | `8000` | Listen port. MCP is served at `/mcp`, health at `/health` |

### Deploy (Render)

New → Web Service → this repo, **Root Directory** `mcp`, **Runtime** Docker, health check path
`/health`, env `OPENGRANTS_API_URL=https://grants.daostar.org` (plus `OPENGRANTS_API_KEY` for a
higher rate limit). Point a domain such as `mcp.grants.daostar.org` at it.

## Test

```bash
pip install -r requirements.txt pytest pytest-asyncio
python -m pytest -q        # offline: real spec, stubbed API
```

After changing `server/openapi.ts`, refresh the fixture with
`curl -s http://localhost:5000/api/v1/openapi.json > openapi.fixture.json`.

## Known limitations

- `list_grant_pools` sorts SCF rounds by name as text ("SCF #9" before "SCF #45").
- `list_grant_applications` without `poolId` or `projectId` returns one default round, not the
  most recent; the tool description tells agents to always pass one.
