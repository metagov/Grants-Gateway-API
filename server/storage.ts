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
  getApiLogs(userId?: number, limit?: number): Promise<ApiLog[]>;
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

  // OAuth user methods (for Replit Auth)
  async getOAuthUser(id: string): Promise<OAuthUser | undefined> {
    const [user] = await db.select().from(oauthUsers).where(eq(oauthUsers.id, id));
    return user || undefined;
  }

  async upsertOAuthUser(userData: UpsertOAuthUser & { id?: string }): Promise<OAuthUser> {
    const { id, ...userDataWithoutId } = userData;
    
    if (id) {
      // Update existing user
      const [user] = await db
        .insert(oauthUsers)
        .values({ id, ...userDataWithoutId })
        .onConflictDoUpdate({
          target: oauthUsers.id,
          set: {
            ...userDataWithoutId,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } else {
      // Create new user (PostgreSQL will generate UUID)
      const [user] = await db
        .insert(oauthUsers)
        .values(userDataWithoutId)
        .returning();
      return user;
    }
  }

  // API user methods (for registration and API access)
  async getApiUser(id: string): Promise<ApiUser | undefined> {
    const [user] = await db.select().from(apiUsers).where(eq(apiUsers.id, id));
    return user || undefined;
  }

  async getApiUserByReplitId(replitUserId: string): Promise<ApiUser | undefined> {
    const [user] = await db.select().from(apiUsers).where(eq(apiUsers.replitUserId, replitUserId));
    return user || undefined;
  }

  async createApiUser(userData: InsertApiUser): Promise<ApiUser> {
    const [user] = await db.insert(apiUsers).values(userData).returning();
    return user;
  }

  async updateApiUser(id: string, userData: Partial<InsertApiUser>): Promise<ApiUser> {
    const [user] = await db
      .update(apiUsers)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(apiUsers.id, id))
      .returning();
    return user;
  }

  // API key methods
  async createApiKey(keyData: InsertApiKey): Promise<ApiKey> {
    const [apiKey] = await db.insert(apiKeys).values(keyData).returning();
    return apiKey;
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys)
      .where(and(
        eq(apiKeys.keyHash, keyHash),
        eq(apiKeys.status, 'active'),
        gte(apiKeys.expiresAt, new Date())
      ));
    return apiKey || undefined;
  }

  async getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id));
  }

  async revokeApiKey(id: string): Promise<ApiKey> {
    const [apiKey] = await db
      .update(apiKeys)
      .set({ status: 'revoked' })
      .where(eq(apiKeys.id, id))
      .returning();
    return apiKey;
  }

  // Request logging methods
  async createRequestLog(logData: InsertRequestLog): Promise<RequestLog> {
    const [log] = await db.insert(requestLogs).values(logData).returning();
    return log;
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
    const [rateLimit] = await db.select().from(rateLimits)
      .where(and(
        eq(rateLimits.userId, userId),
        eq(rateLimits.endpointPattern, endpointPattern)
      ));
    return rateLimit || undefined;
  }

  async updateRateLimit(userId: string, endpointPattern: string, increment: number): Promise<RateLimit> {
    // Check if rate limit exists
    const existing = await this.getRateLimit(userId, endpointPattern);
    
    if (existing) {
      // Check if window has expired
      const windowEnd = new Date(existing.windowStart);
      windowEnd.setHours(windowEnd.getHours() + 1); // 1 hour window
      
      if (new Date() > windowEnd) {
        // Reset window
        const [rateLimit] = await db
          .update(rateLimits)
          .set({ 
            requestCount: increment,
            windowStart: new Date()
          })
          .where(eq(rateLimits.id, existing.id))
          .returning();
        return rateLimit;
      } else {
        // Increment existing
        const [rateLimit] = await db
          .update(rateLimits)
          .set({ requestCount: (existing.requestCount || 0) + increment })
          .where(eq(rateLimits.id, existing.id))
          .returning();
        return rateLimit;
      }
    } else {
      // Create new rate limit
      const [rateLimit] = await db.insert(rateLimits).values({
        userId,
        endpointPattern,
        requestCount: increment,
        windowStart: new Date()
      }).returning();
      return rateLimit;
    }
  }

  async resetRateLimit(userId: string, endpointPattern: string): Promise<void> {
    await db
      .update(rateLimits)
      .set({ 
        requestCount: 0,
        windowStart: new Date()
      })
      .where(and(
        eq(rateLimits.userId, userId),
        eq(rateLimits.endpointPattern, endpointPattern)
      ));
  }
}

export const storage = new DatabaseStorage();
