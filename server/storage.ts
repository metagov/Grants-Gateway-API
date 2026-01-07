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
  // OAuth user methods
  async getOAuthUser(id: string): Promise<OAuthUser | undefined> {
    const [user] = await db.select().from(oauthUsers).where(eq(oauthUsers.id, id));
    return user || undefined;
  }

  async upsertOAuthUser(user: UpsertOAuthUser): Promise<OAuthUser> {
    const [result] = await db
      .insert(oauthUsers)
      .values(user)
      .onConflictDoUpdate({
        target: oauthUsers.id,
        set: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // API user methods
  async getApiUser(id: string): Promise<ApiUser | undefined> {
    const [user] = await db.select().from(apiUsers).where(eq(apiUsers.id, id));
    return user || undefined;
  }

  async getApiUserByReplitId(replitUserId: string): Promise<ApiUser | undefined> {
    const [user] = await db.select().from(apiUsers).where(eq(apiUsers.replitUserId, replitUserId));
    return user || undefined;
  }

  async createApiUser(user: InsertApiUser): Promise<ApiUser> {
    const [result] = await db.insert(apiUsers).values(user).returning();
    return result;
  }

  async updateApiUser(id: string, user: Partial<InsertApiUser>): Promise<ApiUser> {
    const [result] = await db
      .update(apiUsers)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(apiUsers.id, id))
      .returning();
    return result;
  }

  // API key methods
  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [result] = await db.insert(apiKeys).values(apiKey).returning();
    return result;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash));
    return key || undefined;
  }

  async getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async revokeApiKey(id: string): Promise<ApiKey> {
    const [result] = await db
      .update(apiKeys)
      .set({ status: "revoked" })
      .where(eq(apiKeys.id, id))
      .returning();
    return result;
  }

  // Request logging methods
  async createRequestLog(log: InsertRequestLog): Promise<RequestLog> {
    const [result] = await db.insert(requestLogs).values(log).returning();
    return result;
  }

  async getRequestLogs(userId?: string, limit = 100): Promise<RequestLog[]> {
    if (userId) {
      return await db.select().from(requestLogs)
        .where(eq(requestLogs.userId, userId))
        .orderBy(desc(requestLogs.timestamp))
        .limit(limit);
    }
    return await db.select().from(requestLogs)
      .orderBy(desc(requestLogs.timestamp))
      .limit(limit);
  }

  // Rate limiting methods
  async getRateLimit(userId: string, endpointPattern: string): Promise<RateLimit | undefined> {
    const [result] = await db.select().from(rateLimits)
      .where(and(eq(rateLimits.userId, userId), eq(rateLimits.endpointPattern, endpointPattern)));
    return result || undefined;
  }

  async updateRateLimit(userId: string, endpointPattern: string, increment: number): Promise<RateLimit> {
    const [result] = await db
      .insert(rateLimits)
      .values({ userId, endpointPattern, requestCount: increment })
      .onConflictDoUpdate({
        target: [rateLimits.userId, rateLimits.endpointPattern],
        set: { requestCount: sql`${rateLimits.requestCount} + ${increment}` },
      })
      .returning();
    return result;
  }

  async resetRateLimit(userId: string, endpointPattern: string): Promise<void> {
    await db.update(rateLimits)
      .set({ requestCount: 0, windowStart: new Date() })
      .where(and(eq(rateLimits.userId, userId), eq(rateLimits.endpointPattern, endpointPattern)));
  }

  // Admin methods
  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getAllApiUsers(): Promise<ApiUser[]> {
    return await db.select().from(apiUsers).orderBy(desc(apiUsers.createdAt));
  }

  async getApiLogsByUserId(userId: string, params?: { limit?: number }): Promise<ApiLog[]> {
    return await db.select().from(apiLogs)
      .orderBy(desc(apiLogs.createdAt))
      .limit(params?.limit || 100);
  }

  async getAllRequestLogs(params?: { limit?: number; startDate?: Date }): Promise<RequestLog[]> {
    let query = db.select().from(requestLogs).orderBy(desc(requestLogs.timestamp));
    if (params?.limit) {
      query = query.limit(params.limit) as any;
    }
    return await query;
  }

  async getRequestLogsByUserId(userId: string, params?: { limit?: number }): Promise<RequestLog[]> {
    return await db.select().from(requestLogs)
      .where(eq(requestLogs.userId, userId))
      .orderBy(desc(requestLogs.timestamp))
      .limit(params?.limit || 100);
  }

  // Legacy user methods
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

  async getApiLogs(params?: { userId?: number; limit?: number; startDate?: Date }): Promise<ApiLog[]> {
    const limit = params?.limit || 100;
    if (params?.userId) {
      return await db.select().from(apiLogs)
        .where(eq(apiLogs.userId, params.userId))
        .orderBy(desc(apiLogs.createdAt))
        .limit(limit);
    }

    return await db.select().from(apiLogs)
      .orderBy(desc(apiLogs.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
