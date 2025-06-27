import { 
  users, grantSystems, fieldMappings, apiConfigurations, apiLogs,
  type User, type InsertUser, type GrantSystem, type InsertGrantSystem,
  type FieldMapping, type InsertFieldMapping, type ApiConfiguration, 
  type InsertApiConfiguration, type ApiLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserApiKey(id: number, apiKey: string): Promise<User>;

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

  // API logging methods
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
    let query = db.select().from(apiLogs);
    
    if (userId) {
      query = query.where(eq(apiLogs.userId, userId));
    }
    
    return await query.orderBy(desc(apiLogs.createdAt)).limit(limit);
  }
}

export const storage = new DatabaseStorage();
