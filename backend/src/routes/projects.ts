import { Hono } from "hono";
import { db } from "../db";
import { projects, scans, findings } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { cloneRepo, detectLanguage } from "../engines/git";
import { requireAdmin } from "../middleware/auth";

export const projectRoutes = new Hono();

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  repoUrl: z.string().url().optional(),
  language: z.string().optional(),
});

async function enhanceProjectWithMetrics(project: any) {
  // Get latest scan
  const latestScan = await db
    .select()
    .from(scans)
    .where(eq(scans.projectId, project.id))
    .orderBy(desc(scans.startedAt))
    .limit(1)
    .get();

  const projectFindings = await db
    .select()
    .from(findings)
    .where(eq(findings.projectId, project.id))
    .all();

  const counts = {
     critical: projectFindings.filter(f => f.severity === "critical" && f.status === "open").length,
     high: projectFindings.filter(f => f.severity === "high" && f.status === "open").length,
     medium: projectFindings.filter(f => f.severity === "medium" && f.status === "open").length,
     low: projectFindings.filter(f => f.severity === "low" && f.status === "open").length,
  };

  return {
    ...project,
    lastScanAt: latestScan?.completedAt || latestScan?.startedAt || null,
    status: latestScan?.status || null,
    critical: counts.critical,
    high: counts.high,
    medium: counts.medium,
    low: counts.low,
  };
}

// List all projects
projectRoutes.get("/", async (c) => {
  const allProjects = await db.select().from(projects).all();
  
  // Attach metrics to each project
  const enrichedProjects = await Promise.all(
    allProjects.map(p => enhanceProjectWithMetrics(p))
  );

  return c.json({ data: enrichedProjects });
});

// Get single project
projectRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }
  
  const enrichedProject = await enhanceProjectWithMetrics(project);
  return c.json({ data: enrichedProject });
});

// Create project
projectRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const now = new Date().toISOString();
  const projectId = nanoid();
  let localPath: string | null = null;
  let language = parsed.data.language ?? null;

  // Clone repo if URL provided
  if (parsed.data.repoUrl) {
    try {
      localPath = await cloneRepo(parsed.data.repoUrl, projectId);
      if (!language) {
        language = detectLanguage(localPath);
      }
    } catch (error: any) {
      return c.json({ error: `Failed to clone repository: ${error.message}` }, 400);
    }
  }

  const newProject = {
    id: projectId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    repoUrl: parsed.data.repoUrl ?? null,
    language,
    localPath,
    userId: c.req.header("x-user-id") || null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(projects).values(newProject);
  return c.json({ data: newProject }, 201);
});

// Update project
projectRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .get();

  if (!existing) {
    return c.json({ error: "Project not found" }, 404);
  }

  await db
    .update(projects)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, id));

  return c.json({ data: { ...existing, ...body } });
});

// Delete project (admin only)
projectRoutes.delete("/:id", requireAdmin(), async (c) => {
  const id = c.req.param("id");
  await db.delete(projects).where(eq(projects.id, id));
  return c.json({ message: "Deleted" });
});

// Archive project (admin only)
projectRoutes.patch("/:id/archive", requireAdmin(), async (c) => {
  const id = c.req.param("id");
  await db.update(projects).set({ updatedAt: "ARCHIVED" }).where(eq(projects.id, id));
  return c.json({ message: "Archived" });
});

// Unarchive project (admin only)
projectRoutes.patch("/:id/unarchive", requireAdmin(), async (c) => {
  const id = c.req.param("id");
  await db.update(projects).set({ updatedAt: new Date().toISOString() }).where(eq(projects.id, id));
  return c.json({ message: "Unarchived" });
});
