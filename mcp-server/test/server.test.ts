import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { OpenGrantsClient } from "../src/client.js";
import { createServer } from "../src/server.js";

type Call = { url: URL; headers: Record<string, string> };

function stubFetch(respond: (url: URL) => { status: number; body: unknown }) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const { status, body } = respond(url);
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

async function connect(apiClient: OpenGrantsClient) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer(apiClient).connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

test("lists all read-only tools", async () => {
  const { fetchImpl } = stubFetch(() => ({ status: 200, body: {} }));
  const client = await connect(new OpenGrantsClient({ fetchImpl }));
  const { tools } = await client.listTools();
  assert.deepEqual(
    tools.map((t) => t.name).sort(),
    [
      "api_health",
      "get_grant_application",
      "get_grant_pool",
      "get_grant_system",
      "get_project",
      "get_system_funding_summary",
      "list_grant_applications",
      "list_grant_pools",
      "list_grant_systems",
      "list_projects",
    ],
  );
  assert.ok(tools.every((t) => t.annotations?.readOnlyHint === true));
});

test("list_grant_pools forwards filters as query params and drops unset ones", async () => {
  const { calls, fetchImpl } = stubFetch(() => ({ status: 200, body: { data: [{ id: "p1" }], pagination: {} } }));
  const client = await connect(new OpenGrantsClient({ baseUrl: "https://example.test/", fetchImpl }));
  const res = await client.callTool({
    name: "list_grant_pools",
    arguments: { system: "scf", isOpen: false, limit: 5 },
  });
  assert.equal(res.isError, undefined);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin + calls[0].url.pathname, "https://example.test/api/v1/grantPools");
  assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), { system: "scf", isOpen: "false", limit: "5" });
  assert.match((res.content as { text: string }[])[0].text, /"p1"/);
});

test("ids containing ':' and '/' are URL-encoded into the path", async () => {
  const { calls, fetchImpl } = stubFetch(() => ({ status: 200, body: { id: "x" } }));
  const client = await connect(new OpenGrantsClient({ fetchImpl }));
  await client.callTool({ name: "get_grant_pool", arguments: { id: "daoip5:octant:grantPool:7" } });
  assert.equal(calls[0].url.pathname, "/api/v1/grantPools/daoip5%3Aoctant%3AgrantPool%3A7");
});

test("sends API key as bearer token only when configured", async () => {
  const anon = stubFetch(() => ({ status: 200, body: {} }));
  await (await connect(new OpenGrantsClient({ fetchImpl: anon.fetchImpl }))).callTool({
    name: "api_health",
    arguments: {},
  });
  assert.equal(anon.calls[0].headers.Authorization, undefined);

  const keyed = stubFetch(() => ({ status: 200, body: {} }));
  await (await connect(new OpenGrantsClient({ apiKey: "k123", fetchImpl: keyed.fetchImpl }))).callTool({
    name: "api_health",
    arguments: {},
  });
  assert.equal(keyed.calls[0].headers.Authorization, "Bearer k123");
});

test("summary tool switches endpoint on whether system is given", async () => {
  const { calls, fetchImpl } = stubFetch(() => ({ status: 200, body: {} }));
  const client = await connect(new OpenGrantsClient({ fetchImpl }));
  await client.callTool({ name: "get_system_funding_summary", arguments: { system: "scf" } });
  await client.callTool({ name: "get_system_funding_summary", arguments: {} });
  assert.deepEqual(
    calls.map((c) => c.url.pathname),
    ["/api/public/daoip5/scf/summary", "/api/public/daoip5/systems"],
  );
});

test("API errors come back as tool errors, not protocol errors", async () => {
  const { fetchImpl } = stubFetch((url) =>
    url.pathname.includes("grantPools")
      ? { status: 404, body: { error: "Pool not found", message: "Grant pool with ID nope not found" } }
      : { status: 429, body: { error: "Too many requests" } },
  );
  const client = await connect(new OpenGrantsClient({ fetchImpl }));

  const notFound = await client.callTool({ name: "get_grant_pool", arguments: { id: "nope" } });
  assert.equal(notFound.isError, true);
  assert.match((notFound.content as { text: string }[])[0].text, /^Not found: .*Grant pool with ID nope not found/);

  const limited = await client.callTool({ name: "list_projects", arguments: {} });
  assert.equal(limited.isError, true);
  assert.match((limited.content as { text: string }[])[0].text, /OPENGRANTS_API_KEY/);
});

test("rejects out-of-range limit via input schema", async () => {
  const { calls, fetchImpl } = stubFetch(() => ({ status: 200, body: {} }));
  const client = await connect(new OpenGrantsClient({ fetchImpl }));
  const res = await client.callTool({ name: "list_projects", arguments: { limit: 500 } });
  assert.equal(res.isError, true);
  assert.equal(calls.length, 0);
});
