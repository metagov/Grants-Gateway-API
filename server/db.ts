import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import fs from 'fs';
import path from 'path';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Load CA certificate for SSL connection to DigitalOcean Managed PostgreSQL
const caPath = path.resolve(process.cwd(), 'ca.crt');
const sslConfig = fs.existsSync(caPath)
  ? { ca: fs.readFileSync(caPath, 'utf-8') }
  : true; // Fall back to system CAs if ca.crt not found

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
});

// Set search_path so Drizzle finds auth tables in the grants_api_auth schema
pool.on('connect', (client) => {
  client.query("SET search_path TO grants_api_auth, public");
});

export const db = drizzle({ client: pool, schema });
