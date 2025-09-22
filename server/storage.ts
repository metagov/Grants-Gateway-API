import { 
  users, grantSystems, fieldMappings, apiConfigurations, apiLogs,
  oauthUsers, apiUsers, apiKeys, requestLogs, rateLimits,
  type User, type InsertUser, type GrantSystem, type InsertGrantSystem,
  type FieldMapping, type InsertFieldMapping, type ApiConfiguration, 
  type InsertApiConfiguration, type ApiLog,
  type OAuthUser, type UpsertOAuthUser, type ApiUser, type InsertApiUser,
  type ApiKey, type InsertApiKey, type RequestLog, type InsertRequestLog,
  type RateLimit
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // Legacy user methods (keep for existing data)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserApiKey(id: number, apiKey: string): Promise<User>;

  // New OAuth user methods (for Replit Auth)
  getOAuthUser(id: string): Promise<OAuthUser | undefined>;
  upsertOAuthUser(user: UpsertOAuthUser): Promise<OAuthUser>;

  // API user methods (for registration and API access)
  getApiUser(id: string): Promise<ApiUser | undefined>;
  getApiUserByReplitId(replitUserId: string): Promise<ApiUser | undefined>;
  createApiUser(user: InsertApiUser): Promise<ApiUser>;
  updateApiUser(id: string, user: Partial<InsertApiUser>): Promise<ApiUser>;

  // API key methods
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  getApiKeysByUserId(userId: string): Promise<ApiKey[]>;
  updateApiKeyLastUsed(id: string): Promise<void>;
  revokeApiKey(id: string): Promise<ApiKey>;

  // Request logging methods
  createRequestLog(log: InsertRequestLog): Promise<RequestLog>;
  getRequestLogs(userId?: string, limit?: number): Promise<RequestLog[]>;

  // Rate limiting methods
  getRateLimit(userId: string, endpointPattern: string): Promise<RateLimit | undefined>;
  updateRateLimit(userId: string, endpointPattern: string, increment: number): Promise<RateLimit>;
  resetRateLimit(userId: string, endpointPattern: string): Promise<void>;

  // Grant system methods
  getGrantSystems(): Promise<GrantSystem[]>;
  getGrantSystem(id: number): Promise<GrantSystem | undefined>;
  getGrantSystemByName(name: string): Promise<GrantSystem | undefined>;
  createGrantSystem(system: InsertGrantSystem): Promise<GrantSystem>;
  updateGrantSystem(id: number, system: Partial<InsertGrantSystem>): Promise<GrantSystem>;

  // Field mapping methods
  getFieldMappings(systemId: number, entityType?: string): Promise<FieldMapping[]>;
  createFieldMapping(mapping: InsertFieldMapping): Promise<FieldMapping>;
  updateFieldMapping(id: number, mapping: Partial<InsertFieldMapping>): Promise<FieldMapping>;

  // API configuration methods
  getApiConfigurations(systemId: number): Promise<ApiConfiguration[]>;
  createApiConfiguration(config: InsertApiConfiguration): Promise<ApiConfiguration>;

  // API logging methods (legacy)
  createApiLog(log: Omit<ApiLog, 'id' | 'createdAt'>): Promise<ApiLog>;
  getApiLogs(params?: { userId?: number; limit?: number; startDate?: Date }): Promise<ApiLog[]>;

  // Admin methods for dashboard
  getAllApiKeys(): Promise<ApiKey[]>;
  getAllApiUsers(): Promise<ApiUser[]>;
  getApiLogsByUserId(userId: string, params?: { limit?: number }): Promise<ApiLog[]>;
  
  // New request logs methods for modern analytics
  getAllRequestLogs(params?: { limit?: number; startDate?: Date }): Promise<RequestLog[]>;
  getRequestLogsByUserId(userId: string, params?: { limit?: number }): Promise<RequestLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.apiKey, apiKey));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserApiKey(id: number, apiKey: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ apiKey })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getGrantSystems(): Promise<GrantSystem[]> {
    return await db.select().from(grantSystems).where(eq(grantSystems.isActive, true));
  }

  async getGrantSystem(id: number): Promise<GrantSystem | undefined> {
    const [system] = await db.select().from(grantSystems).where(eq(grantSystems.id, id));
    return system || undefined;
  }

  async getGrantSystemByName(name: string): Promise<GrantSystem | undefined> {
    const [system] = await db.select().from(grantSystems).where(eq(grantSystems.name, name));
    return system || undefined;
  }

  async createGrantSystem(system: InsertGrantSystem): Promise<GrantSystem> {
    const [newSystem] = await db.insert(grantSystems).values(system).returning();
    return newSystem;
  }

  async updateGrantSystem(id: number, system: Partial<InsertGrantSystem>): Promise<GrantSystem> {
    const [updatedSystem] = await db
      .update(grantSystems)
      .set({ ...system, updatedAt: new Date() })
      .where(eq(grantSystems.id, id))
      .returning();
    return updatedSystem;
  }

  async getFieldMappings(systemId: number, entityType?: string): Promise<FieldMapping[]> {
    const conditions = [eq(fieldMappings.systemId, systemId)];
    if (entityType) {
      conditions.push(eq(fieldMappings.entityType, entityType));
    }
    return await db.select().from(fieldMappings).where(and(...conditions));
  }

  async createFieldMapping(mapping: InsertFieldMapping): Promise<FieldMapping> {
    const [newMapping] = await db.insert(fieldMappings).values(mapping).returning();
    return newMapping;
  }

  async updateFieldMapping(id: number, mapping: Partial<InsertFieldMapping>): Promise<FieldMapping> {
    const [updatedMapping] = await db
      .update(fieldMappings)
      .set(mapping)
      .where(eq(fieldMappings.id, id))
      .returning();
    return updatedMapping;
  }

  async getApiConfigurations(systemId: number): Promise<ApiConfiguration[]> {
    return await db.select().from(apiConfigurations).where(eq(apiConfigurations.systemId, systemId));
  }

  async createApiConfiguration(config: InsertApiConfiguration): Promise<ApiConfiguration> {
    const [newConfig] = await db.insert(apiConfigurations).values(config).returning();
    return newConfig;
  }

  async createApiLog(log: Omit<ApiLog, 'id' | 'createdAt'>): Promise<ApiLog> {
    const [newLog] = await db.insert(apiLogs).values(log).returning();
    return newLog;
  }

  async getApiLogs(userId?: number, limit = 100): Promise<ApiLog[]> {
    if (userId) {
      return await db.select().from(apiLogs)
        .where(eq(apiLogs.userId, userId))
        .orderBy(desc(apiLogs.createdAt))
        .limit(limit);
    }

    return await db.select().from(apiLogs)
      .orderBy(desc(apiLogs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
