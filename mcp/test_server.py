"""Offline tests: the real spec from server/openapi.ts against a stubbed Gateway.

Regenerate the fixture after changing the spec:
    curl -s http://localhost:5000/api/v1/openapi.json > mcp/openapi.fixture.json
"""
import json
from pathlib import Path

import httpx2
import pytest
from fastmcp import Client

from server import build_server

SPEC = json.loads((Path(__file__).parent / "openapi.fixture.json").read_text())
EXPECTED_TOOLS = {
    "list_grant_systems", "get_grant_system", "list_grant_pools", "get_grant_pool",
    "list_grant_applications", "get_grant_application", "list_projects", "get_project",
    "list_system_summaries", "get_system_summary", "get_api_health",
}


def make_client(calls):
    def handler(request: httpx2.Request) -> httpx2.Response:
        calls.append(request)
        if request.url.path.endswith("/projects/daoip-5:scf:project:missing"):
            return httpx2.Response(404, json={"error": "Project not found"})
        return httpx2.Response(200, json={"@context": "x", "data": [{"id": "p1"}], "pagination": {"totalCount": 1}})

    return httpx2.AsyncClient(base_url="https://api.test", transport=httpx2.MockTransport(handler))


@pytest.mark.asyncio
async def test_every_spec_operation_is_a_tool():
    async with Client(build_server(SPEC, make_client([]))) as c:
        assert {t.name for t in await c.list_tools()} == EXPECTED_TOOLS


@pytest.mark.asyncio
async def test_query_params_forwarded():
    calls = []
    async with Client(build_server(SPEC, make_client(calls))) as c:
        await c.call_tool("list_grant_applications",
                          {"system": "scf", "projectId": "daoip-5:scf:project:stellar_light", "limit": 5})
    q = dict(calls[0].url.params)
    assert calls[0].url.path == "/api/v1/grantApplications"
    assert q == {"system": "scf", "projectId": "daoip-5:scf:project:stellar_light", "limit": "5"}


@pytest.mark.asyncio
async def test_api_errors_surface_as_tool_errors():
    async with Client(build_server(SPEC, make_client([]))) as c:
        with pytest.raises(Exception, match="404"):
            await c.call_tool("get_project", {"id": "daoip-5:scf:project:missing"})
