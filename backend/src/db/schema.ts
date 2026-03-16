import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "viewer"] }).notNull().default("admin"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// Projects table
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  repoUrl: text("repo_url"),
  language: text("language"),
  localPath: text("local_path"),
  userId: text("user_id").references(() => users.id),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
  updatedAt: text("updated_at").notNull().default(new Date().toISOString()),
});

// Scans table
export const scans = sqliteTable("scans", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["sast", "sca", "sbom", "dast"] }).notNull(),
  status: text("status", {
    enum: ["pending", "running", "completed", "failed"],
  })
    .notNull()
    .default("pending"),
  findingsCount: integer("findings_count").notNull().default(0),
  critical: integer("critical").notNull().default(0),
  high: integer("high").notNull().default(0),
  medium: integer("medium").notNull().default(0),
  low: integer("low").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: text("started_at").notNull().default(new Date().toISOString()),
  completedAt: text("completed_at"),
});

// Findings table
export const findings = sqliteTable("findings", {
  id: text("id").primaryKey(),
  scanId: text("scan_id")
    .notNull()
    .references(() => scans.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["sast", "sca", "sbom", "dast"] }).notNull(),
  severity: text("severity", {
    enum: ["critical", "high", "medium", "low", "info"],
  }).notNull(),
  status: text("status", {
    enum: ["open", "in_progress", "confirmed", "false_positive", "fixed"],
  })
    .notNull()
    .default("open"),
  assignedTo: text("assigned_to"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  filePath: text("file_path"),
  line: integer("line"),
  code: text("code"),
  ruleId: text("rule_id"),
  cweId: text("cwe_id"),
  recommendation: text("recommendation"),
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// Finding comments
export const findingComments = sqliteTable("finding_comments", {
  id: text("id").primaryKey(),
  findingId: text("finding_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  content: text("content").notNull(),
  action: text("action"),  // e.g. "status_change", "assigned", "comment"
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// Dependencies table (for SCA)
export const dependencies = sqliteTable("dependencies", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  version: text("version").notNull(),
  latestVersion: text("latest_version"),
  license: text("license"),
  vulnerabilities: integer("vulnerabilities").notNull().default(0),
});

// Audit logs
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  action: text("action").notNull(), // e.g. "scan:trigger", "project:delete", "user:role_change"
  target: text("target"),           // e.g. project name, user email
  details: text("details"),         // JSON extra info
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});

// Finding notes
export const findingNotes = sqliteTable("finding_notes", {
  id: text("id").primaryKey(),
  findingId: text("finding_id").notNull(),
  userId: text("user_id").notNull(),
  userEmail: text("user_email").notNull(),
  note: text("note").notNull(),
  tags: text("tags"),               // comma-separated tags
  createdAt: text("created_at").notNull().default(new Date().toISOString()),
});
