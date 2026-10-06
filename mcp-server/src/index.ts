#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OpenGrantsClient } from "./client.js";
import { createServer } from "./server.js";

const client = new OpenGrantsClient({
  baseUrl: process.env.OPENGRANTS_API_URL,
  apiKey: process.env.OPENGRANTS_API_KEY,
});

const server = createServer(client);
await server.connect(new StdioServerTransport());
// stdout is the MCP channel; log to stderr only.
console.error("OpenGrants MCP server running on stdio");
