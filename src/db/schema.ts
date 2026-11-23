import { boolean, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const civicReports = pgTable("civic_reports", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 120 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 40 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("reported"),
  priority: varchar("priority", { length: 16 }).notNull().default("medium"),
  address: varchar("address", { length: 240 }).notNull(),
  locality: varchar("locality", { length: 80 }).notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  imageUrl: text("image_url").notNull(),
  reporterName: varchar("reporter_name", { length: 100 }).notNull().default("Alex Morgan"),
  reporterEmail: varchar("reporter_email", { length: 160 }).notNull().default("alex@civicfix.demo"),
  isMine: boolean("is_mine").notNull().default(false),
  upvotes: integer("upvotes").notNull().default(0),
  reporterId: integer("reporter_id"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const civicUpdates = pgTable("civic_updates", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => civicReports.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  authorName: varchar("author_name", { length: 100 }).notNull().default("BBMP Community Team"),
  status: varchar("status", { length: 24 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const civicPreferences = pgTable("civic_preferences", {
  id: varchar("id", { length: 40 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull().default("Alex Morgan"),
  email: varchar("email", { length: 160 }).notNull().default("alex@civicfix.demo"),
  neighborhood: varchar("neighborhood", { length: 80 }).notNull().default("Koramangala"),
  notifications: boolean("notifications").notNull().default(true),
  following: jsonb("following").$type<number[]>().notNull().default([]),
  voted: jsonb("voted").$type<number[]>().notNull().default([]),
});

export const civicUsers = pgTable("civic_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 16 }).notNull().default("citizen"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const civicSessions = pgTable("civic_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => civicUsers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
