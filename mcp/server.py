"""OpenGrants MCP server, generated from the Gateway API's OpenAPI spec.

Every operation in GET {OPENGRANTS_API_URL}/api/v1/openapi.json becomes an MCP tool; the
spec's operationIds are the tool names and its descriptions are the tool descriptions.
There is no hand-written tool code: change the API spec (server/openapi.ts) and restart.

Run:
    OPENGRANTS_API_URL=https://grants.daostar.org python server.py
Serves MCP over Streamable HTTP at http://0.0.0.0:$PORT/mcp (default port 8000).
"""
import os
import time

import httpx2
from fastmcp import FastMCP
from fastmcp.server.providers.openapi import MCPType, RouteMap
from starlette.requests import Request
from starlette.responses import JSONResponse

API_URL = os.environ.get("OPENGRANTS_API_URL", "https://grants.daostar.org").rstrip("/")
API_KEY = os.environ.get("OPENGRANTS_API_KEY", "")
SPEC_URL = f"{API_URL}/api/v1/openapi.json"

INSTRUCTIONS = """OpenGrants is open data infrastructure for Web3 grants, in the DAOIP-5 standard.
A grant system (e.g. the Stellar Community Fund, system="scf") runs grant pools (rounds,
e.g. "SCF #45"); projects receive grant applications (awards) in those pools.
IDs are DAOIP-5 URIs such as "daoip-5:scf:project:stellar_light".
Typical flow: list_grant_pools(system="scf") to find a round, then
list_grant_applications(system="scf", poolId=...) for its awards; or
list_grant_applications(system="scf", projectId=...) for one project's full funding history.
Always pass poolId, or system together with projectId, to list_grant_applications. List tools are paginated
(limit <= 100, offset) and return pagination.totalCount. SCF-specific fields (round,
category, totalAwardedUSD, totalPaidUSD, trancheCompletionPercent) are under
extensions["org.stellar.communityfund"]."""


def load_spec(retries: int = 5) -> dict:
    """Fetch the live spec so the tools always match the deployed API."""
    for attempt in range(retries):
        try:
            r = httpx2.get(SPEC_URL, timeout=30)
            r.raise_for_status()
            return r.json()
        except Exception:
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("unreachable")


def build_server(spec: dict, client: "httpx2.AsyncClient | None" = None) -> FastMCP:
    headers = {"Accept": "application/json", "User-Agent": "opengrants-mcp"}
    if API_KEY:
        headers["Authorization"] = f"Bearer {API_KEY}"
    client = client or httpx2.AsyncClient(base_url=API_URL, headers=headers, timeout=30)

    mcp = FastMCP.from_openapi(
        openapi_spec=spec,
        client=client,
        name="opengrants",
        instructions=INSTRUCTIONS,
        # The spec only describes public, read-only GET endpoints; expose each as a tool.
        route_maps=[
            RouteMap(methods=["GET"], mcp_type=MCPType.TOOL),
            RouteMap(mcp_type=MCPType.EXCLUDE),
        ],
    )

    @mcp.custom_route("/health", methods=["GET"])
    async def health(_: Request) -> JSONResponse:
        return JSONResponse({"status": "ok", "api": API_URL})

    return mcp


if __name__ == "__main__":
    server = build_server(load_spec())
    server.run(transport="http", host="0.0.0.0", port=int(os.environ.get("PORT", "8000")), path="/mcp")
