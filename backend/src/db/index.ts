import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

// Ensure data directory exists
const dataDir = join(import.meta.dir, "../../data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, "zcrx.db");
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const db = drizzle(sqlite, { schema });

// Initialize tables
export async function initDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      repo_url TEXT,
      language TEXT,
      local_path TEXT,
      user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('sast', 'sca', 'sbom', 'dast')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
      findings_count INTEGER NOT NULL DEFAULT 0,
      critical INTEGER NOT NULL DEFAULT 0,
      high INTEGER NOT NULL DEFAULT 0,
      medium INTEGER NOT NULL DEFAULT 0,
      low INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('sast', 'sca', 'sbom', 'dast')),
      severity TEXT NOT NULL CHECK(severity IN ('critical', 'high', 'medium', 'low', 'info')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'confirmed', 'false_positive', 'fixed')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      file_path TEXT,
      line INTEGER,
      code TEXT,
      rule_id TEXT,
      cwe_id TEXT,
      recommendation TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dependencies (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      latest_version TEXT,
      license TEXT,
      vulnerabilities INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finding_notes (
      id TEXT PRIMARY KEY,
      finding_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      note TEXT NOT NULL,
      tags TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finding_comments (
      id TEXT PRIMARY KEY,
      finding_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      content TEXT NOT NULL,
      action TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add role column to existing DBs
  try {
    sqlite.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'");
    console.log("  Migration: added role column to users table");
  } catch {
    // Column already exists — ignore
  }

  // Migration: add assigned_to column to findings
  try {
    sqlite.exec("ALTER TABLE findings ADD COLUMN assigned_to TEXT");
    console.log("  Migration: added assigned_to column to findings table");
  } catch {
    // Column already exists — ignore
  }

  // Migration: add in_progress to findings status CHECK constraint
  try {
    // SQLite doesn't support ALTER COLUMN — recreate table
    const tableInfo = sqlite.query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='findings'"
    ).get() as any;
    if (tableInfo?.sql && !tableInfo.sql.includes('in_progress')) {
      // Check if old table has assigned_to
      const cols = sqlite.query("PRAGMA table_info(findings)").all() as any[];
      const hasAssigned = cols.some((col: any) => col.name === 'assigned_to');
      const baseCols = "id, scan_id, project_id, type, severity, status, title, description, file_path, line, code, rule_id, cwe_id, recommendation, created_at";
      const allCols = hasAssigned ? `${baseCols}, assigned_to` : baseCols;

      sqlite.exec(`
        ALTER TABLE findings RENAME TO findings_old;
        CREATE TABLE findings (
          id TEXT PRIMARY KEY,
          scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          type TEXT NOT NULL CHECK(type IN ('sast', 'sca', 'sbom', 'dast')),
          severity TEXT NOT NULL CHECK(severity IN ('critical', 'high', 'medium', 'low', 'info')),
          status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'confirmed', 'false_positive', 'fixed')),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          file_path TEXT,
          line INTEGER,
          code TEXT,
          rule_id TEXT,
          cwe_id TEXT,
          recommendation TEXT,
          assigned_to TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO findings (${allCols}) SELECT ${allCols} FROM findings_old;
        DROP TABLE findings_old;
      `);
      console.log("  Migration: added in_progress status to findings table");
    }
  } catch (e: any) {
    console.log("  Migration warning (findings in_progress):", e.message);
  }

  // Auto-seed admin user if no users exist
  const userCount = sqlite.query("SELECT COUNT(*) as count FROM users").get() as any;
  if (userCount?.count === 0) {
    const { nanoid } = await import("nanoid");
    const id = nanoid();
    const hash = await Bun.password.hash("admin123", { algorithm: "bcrypt", cost: 10 });
    sqlite.run(
      "INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, "admin@zcrx.io", "Admin", hash, "admin", new Date().toISOString()]
    );
    console.log("  Default admin created: admin@zcrx.io / admin123");
  }

  console.log("  Database initialized (persistent: data/zcrx.db)");
}
