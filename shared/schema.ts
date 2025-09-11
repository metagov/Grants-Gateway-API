import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, uuid, inet, interval } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Legacy users table - keep for existing data
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key").unique(),
  rateLimit: integer("rate_limit").default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New authentication tables for OAuth and API management

// Session storage table for Replit Auth
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

// OAuth users table for Replit Auth
export const oauthUsers = pgTable("oauth_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// API users with org info and intent
export const apiUsers = pgTable("api_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  replitUserId: varchar("replit_user_id").notNull().unique().references(() => oauthUsers.id),
  email: varchar("email").notNull(),
  name: varchar("name").notNull(),
  orgName: varchar("org_name").notNull(),
  intentOfUse: text("intent_of_use").notNull(),
  status: varchar("status").default("active").notNull(), // active, suspended
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// API Keys table
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => apiUsers.id, { onDelete: "cascade" }),
  keyHash: varchar("key_hash").notNull().unique(),
  keyPreview: varchar("key_preview").notNull(), // Last 4 characters
  name: varchar("name"), // Optional key name
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at").notNull(), // 3 months from creation
  status: varchar("status").default("active").notNull(), // active, revoked
});

// Request logs table
export const requestLogs = pgTable("request_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").references(() => apiKeys.id),
  userId: varchar("user_id").references(() => apiUsers.id),
  endpoint: varchar("endpoint").notNull(),
  method: varchar("method").notNull(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  responseStatus: integer("response_status"),
  responseTimeMs: integer("response_time_ms"),
  rateLimitHit: boolean("rate_limit_hit").default(false),
});

// Rate limiting tracking
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => apiUsers.id),
  endpointPattern: varchar("endpoint_pattern").notNull(), // e.g., '/api/octant/*'
  requestCount: integer("request_count").default(0),
  windowStart: timestamp("window_start").defaultNow().notNull(),
  windowDuration: interval("window_duration").default("1 hour"),
});

export const grantSystems = pgTable("grant_systems", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  apiEndpoint: text("api_endpoint"),
  isActive: boolean("is_active").default(true),
  adapterConfig: jsonb("adapter_config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const fieldMappings = pgTable("field_mappings", {
  id: serial("id").primaryKey(),
  systemId: integer("system_id").references(() => grantSystems.id).notNull(),
  entityType: text("entity_type").notNull(), // 'project', 'pool', 'application', 'system'
  sourceField: text("source_field").notNull(),
  targetField: text("target_field").notNull(),
  transformFunction: text("transform_function"), // e.g., 'caip10', 'currency_usd', 'iso_date'
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiConfigurations = pgTable("api_configurations", {
  id: serial("id").primaryKey(),
  systemId: integer("system_id").references(() => grantSystems.id).notNull(),
  configKey: text("config_key").notNull(),
  configValue: text("config_value").notNull(),
  isSecret: boolean("is_secret").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const apiLogs = pgTable("api_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time"), // in milliseconds
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const grantSystemsRelations = relations(grantSystems, ({ many }) => ({
  fieldMappings: many(fieldMappings),
  apiConfigurations: many(apiConfigurations),
}));

export const fieldMappingsRelations = relations(fieldMappings, ({ one }) => ({
  system: one(grantSystems, {
    fields: [fieldMappings.systemId],
    references: [grantSystems.id],
  }),
}));

export const apiConfigurationsRelations = relations(apiConfigurations, ({ one }) => ({
  system: one(grantSystems, {
    fields: [apiConfigurations.systemId],
    references: [grantSystems.id],
  }),
}));

export const apiLogsRelations = relations(apiLogs, ({ one }) => ({
  user: one(users, {
    fields: [apiLogs.userId],
    references: [users.id],
  }),
}));

// New authentication relations
export const apiUsersRelations = relations(apiUsers, ({ one, many }) => ({
  replitUser: one(oauthUsers, {
    fields: [apiUsers.replitUserId],
    references: [oauthUsers.id],
  }),
  apiKeys: many(apiKeys),
  requestLogs: many(requestLogs),
  rateLimits: many(rateLimits),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  user: one(apiUsers, {
    fields: [apiKeys.userId],
    references: [apiUsers.id],
  }),
  requestLogs: many(requestLogs),
}));

export const requestLogsRelations = relations(requestLogs, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [requestLogs.apiKeyId],
    references: [apiKeys.id],
  }),
  user: one(apiUsers, {
    fields: [requestLogs.userId],
    references: [apiUsers.id],
  }),
}));

export const rateLimitsRelations = relations(rateLimits, ({ one }) => ({
  user: one(apiUsers, {
    fields: [rateLimits.userId],
    references: [apiUsers.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertGrantSystemSchema = createInsertSchema(grantSystems).pick({
  name: true,
  type: true,
  apiEndpoint: true,
  isActive: true,
  adapterConfig: true,
});

export const insertFieldMappingSchema = createInsertSchema(fieldMappings).pick({
  systemId: true,
  entityType: true,
  sourceField: true,
  targetField: true,
  transformFunction: true,
  isRequired: true,
});

export const insertApiConfigurationSchema = createInsertSchema(apiConfigurations).pick({
  systemId: true,
  configKey: true,
  configValue: true,
  isSecret: true,
});

// New authentication schemas
export const insertOAuthUserSchema = createInsertSchema(oauthUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiUserSchema = createInsertSchema(apiUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export const insertRequestLogSchema = createInsertSchema(requestLogs).omit({
  id: true,
  timestamp: true,
});

// Registration form schema
export const registrationSchema = z.object({
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  intentOfUse: z.string().min(10, "Please describe your intended use in at least 10 characters"),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGrantSystem = z.infer<typeof insertGrantSystemSchema>;
export type GrantSystem = typeof grantSystems.$inferSelect;

export type InsertFieldMapping = z.infer<typeof insertFieldMappingSchema>;
export type FieldMapping = typeof fieldMappings.$inferSelect;

export type InsertApiConfiguration = z.infer<typeof insertApiConfigurationSchema>;
export type ApiConfiguration = typeof apiConfigurations.$inferSelect;

export type ApiLog = typeof apiLogs.$inferSelect;

// New authentication types
export type OAuthUser = typeof oauthUsers.$inferSelect;
export type UpsertOAuthUser = z.infer<typeof insertOAuthUserSchema>;

export type ApiUser = typeof apiUsers.$inferSelect;
export type InsertApiUser = z.infer<typeof insertApiUserSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type RequestLog = typeof requestLogs.$inferSelect;
export type InsertRequestLog = z.infer<typeof insertRequestLogSchema>;

export type RateLimit = typeof rateLimits.$inferSelect;

export type RegistrationData = z.infer<typeof registrationSchema>;

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
  page: z.number().min(1).optional(),
});

export interface PaginationMeta {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextPage?: number;
  previousPage?: number;
}

export interface PaginatedResponse<T> {
  "@context": string;
  data: T[];
  pagination: PaginationMeta;
}

export type PaginationParams = z.infer<typeof paginationSchema>;
