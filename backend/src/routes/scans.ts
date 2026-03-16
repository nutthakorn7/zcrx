import { Hono } from "hono";
import { db } from "../db";
import { scans, findings, projects } from "../db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { runSastScan } from "../engines/sast";
import { runScaScan } from "../engines/sca";
import { runDastScan } from "../engines/dast";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth";
import { broadcast } from "../ws";

export const scanRoutes = new Hono();

const createScanSchema = z.object({
  projectId: z.string().min(1),
  type: z.enum(["sast", "sca", "dast"]),
  targetUrl: z.string().optional(),
  templates: z.array(z.string()).optional(),
  crawl: z.boolean().optional(),
  authHeaders: z.record(z.string()).optional(),
  authCookies: z.string().optional(),
  customTemplatePath: z.string().optional(),
});

// List scans (optionally filter by project)
scanRoutes.get("/", async (c) => {
  const projectId = c.req.query("projectId");

  if (projectId) {
    const result = await db
      .select()
      .from(scans)
      .where(eq(scans.projectId, projectId))
      .all();
    return c.json({ data: result });
  }

  const allScans = await db.select().from(scans).all();
  return c.json({ data: allScans });
});

// ═══════════════════════════════════════════════════════════════
// Compare two scans (MUST be before /:id to avoid matching)
// ═══════════════════════════════════════════════════════════════
scanRoutes.get("/compare", async (c) => {
  const scanAId = c.req.query("scanA");
  const scanBId = c.req.query("scanB");

  if (!scanAId || !scanBId) {
    return c.json({ error: "Both scanA and scanB query params are required" }, 400);
  }

  const [scanA, scanB] = await Promise.all([
    db.select().from(scans).where(eq(scans.id, scanAId)).get(),
    db.select().from(scans).where(eq(scans.id, scanBId)).get(),
  ]);

  if (!scanA || !scanB) {
    return c.json({ error: "One or both scans not found" }, 404);
  }

  const [findingsA, findingsB] = await Promise.all([
    db.select().from(findings).where(eq(findings.scanId, scanAId)).all(),
    db.select().from(findings).where(eq(findings.scanId, scanBId)).all(),
  ]);

  const fingerprint = (f: any) => `${f.title}||${f.ruleId || ""}||${f.filePath || ""}`;

  const setA = new Map(findingsA.map((f) => [fingerprint(f), f]));
  const setB = new Map(findingsB.map((f) => [fingerprint(f), f]));

  const newFindings = findingsB.filter((f) => !setA.has(fingerprint(f)));
  const fixedFindings = findingsA.filter((f) => !setB.has(fingerprint(f)));
  const unchangedFindings = findingsB.filter((f) => setA.has(fingerprint(f)));

  return c.json({
    data: {
      scanA,
      scanB,
      newFindings,
      fixedFindings,
      unchangedFindings,
      summary: {
        newCount: newFindings.length,
        fixedCount: fixedFindings.length,
        unchangedCount: unchangedFindings.length,
      },
    },
  });
});

// Get single scan with findings
scanRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const scan = await db.select().from(scans).where(eq(scans.id, id)).get();

  if (!scan) {
    return c.json({ error: "Scan not found" }, 404);
  }

  const scanFindings = await db
    .select()
    .from(findings)
    .where(eq(findings.scanId, id))
    .all();

  return c.json({ data: { ...scan, findings: scanFindings } });
});

// Trigger a new scan (admin only)
scanRoutes.post("/", requireAdmin(), async (c) => {
  const body = await c.req.json();
  const parsed = createScanSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  // Verify project exists
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, parsed.data.projectId))
    .get();

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const scanId = nanoid();
  const now = new Date().toISOString();

  // Create scan record
  await db.insert(scans).values({
    id: scanId,
    projectId: parsed.data.projectId,
    type: parsed.data.type,
    status: "running",
    findingsCount: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    startedAt: now,
  });

  // Return immediately, run scan in background
  const scanRecord = await db
    .select()
    .from(scans)
    .where(eq(scans.id, scanId))
    .get();

  // Run scan asynchronously
  (async () => {
    try {
      let scanFindings: any[] = [];

      if (parsed.data.type === "sast") {
        scanFindings = await runSastScan(
          scanId,
          parsed.data.projectId,
          project.localPath || "."
        );
      } else if (parsed.data.type === "sca") {
        scanFindings = await runScaScan(
          scanId,
          parsed.data.projectId,
          project.localPath || "."
        );
      } else if (parsed.data.type === "dast") {
        const targetUrl = parsed.data.targetUrl || project.repoUrl || `http://${project.name}`;
        scanFindings = await runDastScan(
          scanId,
          parsed.data.projectId,
          targetUrl,
          {
            templates: parsed.data.templates,
            crawl: parsed.data.crawl,
            authHeaders: parsed.data.authHeaders,
            authCookies: parsed.data.authCookies,
            customTemplatePath: parsed.data.customTemplatePath,
          }
        );
      }

      // Insert findings
      if (scanFindings.length > 0) {
        await db.insert(findings).values(scanFindings);
      }

      // Count by severity
      const counts = {
        critical: scanFindings.filter((f) => f.severity === "critical").length,
        high: scanFindings.filter((f) => f.severity === "high").length,
        medium: scanFindings.filter((f) => f.severity === "medium").length,
        low: scanFindings.filter((f) => f.severity === "low").length,
      };

      // Update scan
      await db
        .update(scans)
        .set({
          status: "completed",
          findingsCount: scanFindings.length,
          ...counts,
          completedAt: new Date().toISOString(),
        })
        .where(eq(scans.id, scanId));

      console.log(
        `✅ Scan ${scanId} completed: ${scanFindings.length} findings`
      );

      // Broadcast real-time notification
      broadcast({
        type: "scan:completed",
        data: {
          scanId,
          projectId: parsed.data.projectId,
          projectName: project.name,
          scanType: parsed.data.type,
          findingsCount: scanFindings.length,
          ...counts,
          completedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      await db
        .update(scans)
        .set({
          status: "failed",
          errorMessage: error.message,
          completedAt: new Date().toISOString(),
        })
        .where(eq(scans.id, scanId));

      console.error(`❌ Scan ${scanId} failed:`, error.message);

      // Broadcast failure notification
      broadcast({
        type: "scan:failed",
        data: {
          scanId,
          projectId: parsed.data.projectId,
          projectName: project.name,
          scanType: parsed.data.type,
          error: error.message,
        },
      });
    }
  })();

  return c.json({ data: scanRecord }, 201);
});
