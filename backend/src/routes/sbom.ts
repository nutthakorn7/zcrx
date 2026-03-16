import { Hono } from "hono";
import { db } from "../db";
import { scans, projects } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateSbom } from "../engines/sbom";

export const sbomRoutes = new Hono();

// Get SBOM for a scan
sbomRoutes.get("/:scanId", async (c) => {
  const scanId = c.req.param("scanId");

  const scan = await db
    .select()
    .from(scans)
    .where(eq(scans.id, scanId))
    .get();

  if (!scan) {
    return c.json({ error: "Scan not found" }, 404);
  }

  if (scan.type !== "sbom") {
    return c.json({ error: "Not an SBOM scan" }, 400);
  }

  // Get project for path
  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, scan.projectId))
    .get();

  const targetPath = project?.localPath || ".";
  const sbom = await generateSbom(targetPath);

  return c.json({ data: sbom });
});

// Download SBOM as JSON
sbomRoutes.get("/:scanId/download", async (c) => {
  const scanId = c.req.param("scanId");

  const scan = await db
    .select()
    .from(scans)
    .where(eq(scans.id, scanId))
    .get();

  if (!scan) {
    return c.json({ error: "Scan not found" }, 404);
  }

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, scan.projectId))
    .get();

  const targetPath = project?.localPath || ".";
  const sbom = await generateSbom(targetPath);

  c.header("Content-Type", "application/json");
  c.header("Content-Disposition", `attachment; filename="sbom-${scanId}.json"`);
  return c.json(sbom);
});
