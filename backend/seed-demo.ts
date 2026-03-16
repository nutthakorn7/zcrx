import { db } from "./src/db";
import { users, projects, scans, findings } from "./src/db/schema";
import { DEMO_PROJECTS, DEMO_SCANS } from "../frontend/src/lib/demo-data";
import { nanoid } from "nanoid";
import { Database } from "bun:sqlite";
import { join } from "path";

async function seed() {
  console.log("Seeding demo projects and scans into the local database...");
  
  try {
    // 0. Patch the database if it's outdated
    const dataDir = join(import.meta.dir, "data");
    const dbPath = join(dataDir, "zcrx.db");
    const sqlite = new Database(dbPath);
    try {
        sqlite.exec("ALTER TABLE projects ADD COLUMN user_id TEXT REFERENCES users(id);");
        console.log("Successfully patched 'projects' table to include user_id.");
    } catch (e: any) {
        // If it fails, the column probably already exists, which is fine!
        if (!e.message.includes("duplicate column name")) {
            console.log("Note on alter table:", e.message);
        }
    }
    // Get the default admin user to assign projects to
    const adminQuery = await db.select().from(users).limit(1);
    const userId = adminQuery.length > 0 ? adminQuery[0].id : null;
    
    if (!userId) {
        console.warn("No user found in the DB. Please start the backend once to initialize the default admin.");
        return;
    }

    // 1. Insert projects
    for (const project of DEMO_PROJECTS) {
      await db.insert(projects).values({
        id: project.id,
        name: project.name,
        description: project.description,
        repoUrl: project.repoUrl,
        language: project.language,
        userId: userId,
        createdAt: project.createdAt,
        updatedAt: project.createdAt,
      }).onConflictDoNothing();
      console.log(`Inserted project: ${project.name}`);
    }

    // 2. Insert mock scans with finding counts
    for (const scan of DEMO_SCANS) {
      await db.insert(scans).values({
        id: scan.id,
        projectId: scan.projectId,
        type: scan.type as any,
        status: scan.status as any,
        findingsCount: scan.findingsCount,
        // Calculate mock severities from the project demo data
        critical: scan.findingsCount > 0 ? Math.floor(scan.findingsCount * 0.1) : 0,
        high: scan.findingsCount > 0 ? Math.floor(scan.findingsCount * 0.2) : 0,
        medium: scan.findingsCount > 0 ? Math.floor(scan.findingsCount * 0.3) : 0,
        low: scan.findingsCount > 0 ? Math.floor(scan.findingsCount * 0.4) : 0,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
      }).onConflictDoNothing();
      console.log(`Inserted scan: ${scan.type} for project ${scan.projectId}`);

      // 3. Mock some findings so the aggregations work
      const findingsToCreate = [];
      const projectData = DEMO_PROJECTS.find(p => p.id === scan.projectId);
      
      if (projectData && (projectData.critical > 0 || projectData.high > 0)) {
        for (let i = 0; i < (projectData.critical || 0); i++) {
            findingsToCreate.push({
                id: nanoid(),
                scanId: scan.id,
                projectId: scan.projectId,
                type: scan.type as any,
                severity: "critical" as any,
                status: "open" as any,
                title: "Mock Critical Finding",
                description: "This is a mock finding generated from demo data.",
            });
        }
        for (let i = 0; i < (projectData.high || 0); i++) {
            findingsToCreate.push({
                id: nanoid(),
                scanId: scan.id,
                projectId: scan.projectId,
                type: scan.type as any,
                severity: "high" as any,
                status: "open" as any,
                title: "Mock High Finding",
                description: "This is a mock finding generated from demo data.",
            });
        }
        for (let i = 0; i < (projectData.medium || 0); i++) {
            findingsToCreate.push({
                id: nanoid(),
                scanId: scan.id,
                projectId: scan.projectId,
                type: scan.type as any,
                severity: "medium" as any,
                status: "open" as any,
                title: "Mock Medium Finding",
                description: "This is a mock finding generated from demo data.",
            });
        }
        for (let i = 0; i < (projectData.low || 0); i++) {
            findingsToCreate.push({
                id: nanoid(),
                scanId: scan.id,
                projectId: scan.projectId,
                type: scan.type as any,
                severity: "low" as any,
                status: "open" as any,
                title: "Mock Low Finding",
                description: "This is a mock finding generated from demo data.",
            });
        }
      }

      if (findingsToCreate.length > 0) {
        // Only insert once per project to avoid ballooning the numbers on every scan
        if (scan.type === "sast") {
          await db.insert(findings).values(findingsToCreate);
        }
      }
    }

    console.log("✅ Seed complete!");
  } catch (e) {
    console.error("Failed to seed:", e);
  }
}

seed();
