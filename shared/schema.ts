import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key").unique(),
  rateLimit: integer("rate_limit").default(100),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
