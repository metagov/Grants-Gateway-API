import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Re-export the sessions table - this matches the existing sessions in main schema
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const authSessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Re-export the oauth_users table structure matching existing schema
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const authUsers = pgTable("oauth_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof authUsers.$inferInsert;
export type User = typeof authUsers.$inferSelect;
