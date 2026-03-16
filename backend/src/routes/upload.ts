import { Hono } from "hono";
import { db } from "../db";
import { scans, findings, projects } from "../db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { runSastScan } from "../engines/sast";
import { runScaScan } from "../engines/sca";
import { generateSbom } from "../engines/sbom";
import { broadcast } from "../ws";
import { mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";

export const uploadRoutes = new Hono();

// ─── Upload ZIP and Scan ───
uploadRoutes.post("/scan", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const projectName = (formData.get("projectName") as string) || "Uploaded Project";
    const scanTypes = ((formData.get("scanTypes") as string) || "sast,sca").split(",").map(s => s.trim());

    if (!file) {
      return c.json({ error: "No file uploaded" }, 400);
    }

    if (!file.name.endsWith(".zip")) {
      return c.json({ error: "Only .zip files are supported" }, 400);
    }

    // Max 100MB
    if (file.size > 100 * 1024 * 1024) {
      return c.json({ error: "File too large (max 100MB)" }, 400);
    }

    // Create / find project
    let project = await db.select().from(projects).where(eq(projects.name, projectName)).get();
    if (!project) {
      const projectId = nanoid();
      await db.insert(projects).values({
        id: projectId,
        name: projectName,
        description: `Uploaded from ${file.name}`,
        repoUrl: `upload://${file.name}`,
        language: "auto",
        createdAt: new Date().toISOString(),
      });
      project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    }

    const projectId = project!.id;

    // Save ZIP to temp dir
    const uploadDir = join(process.cwd(), "data", "uploads");
    const extractDir = join(uploadDir, `upload_${nanoid(8)}`);
    const zipPath = join(uploadDir, `${nanoid(8)}.zip`);

    mkdirSync(uploadDir, { recursive: true });
    mkdirSync(extractDir, { recursive: true });

    // Write file
    const buffer = await file.arrayBuffer();
    await Bun.write(zipPath, buffer);

    // Extract using unzip or tar
    try {
      const unzipProc = Bun.spawn(["tar", "-xf", zipPath, "-C", extractDir], {
        stdout: "pipe", stderr: "pipe",
      });
      await unzipProc.exited;
    } catch {
      // Fallback: try PowerShell Expand-Archive
      try {
        const psProc = Bun.spawn(["powershell", "-Command", `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force`], {
          stdout: "pipe", stderr: "pipe",
        });
        await psProc.exited;
      } catch (e: any) {
        return c.json({ error: `Failed to extract ZIP: ${e.message}` }, 500);
      }
    }

    broadcast({ type: "upload:extracted", data: { projectId, projectName, file: file.name } });

    // Run scans
    const scanResults: any[] = [];
    let totalFindings = 0;

    for (const scanType of scanTypes) {
      if (scanType === "sast" || scanType === "sca") {
        const scanId = nanoid();
        await db.insert(scans).values({
          id: scanId,
          projectId,
          type: scanType as "sast" | "sca",
          status: "running",
          findingsCount: 0,
          critical: 0, high: 0, medium: 0, low: 0,
          startedAt: new Date().toISOString(),
        });

        broadcast({ type: "upload:scanning", data: { scanId, scanType, projectName } });

        let scanFindings: any[] = [];
        try {
          if (scanType === "sast") {
            scanFindings = await runSastScan(scanId, projectId, extractDir);
          } else {
            scanFindings = await runScaScan(scanId, projectId, extractDir);
          }

          // Save findings
          for (const f of scanFindings) {
            await db.insert(findings).values(f);
          }

          const bySev = {
            critical: scanFindings.filter(f => f.severity === "critical").length,
            high: scanFindings.filter(f => f.severity === "high").length,
            medium: scanFindings.filter(f => f.severity === "medium").length,
            low: scanFindings.filter(f => f.severity === "low").length,
          };

          await db.update(scans).set({
            status: "completed",
            findingsCount: scanFindings.length,
            ...bySev,
            completedAt: new Date().toISOString(),
          }).where(eq(scans.id, scanId));

          totalFindings += scanFindings.length;
          scanResults.push({ scanId, type: scanType, findings: scanFindings.length, ...bySev });

        } catch (err: any) {
          await db.update(scans).set({ status: "failed", completedAt: new Date().toISOString() })
            .where(eq(scans.id, scanId));
          scanResults.push({ scanId, type: scanType, error: err.message });
        }
      }
    }

    // Generate SBOM if requested
    let sbom = null;
    if (scanTypes.includes("sbom")) {
      try {
        sbom = await generateSbom(extractDir);
      } catch {}
    }

    // Cleanup
    try {
      rmSync(zipPath, { force: true });
      rmSync(extractDir, { recursive: true, force: true });
    } catch {}

    broadcast({ type: "upload:complete", data: { projectId, projectName, totalFindings, scanResults } });

    return c.json({
      data: {
        projectId,
        projectName,
        fileName: file.name,
        fileSize: file.size,
        totalFindings,
        scanResults,
        sbom: sbom ? { components: sbom.components.length } : null,
      },
    });

  } catch (err: any) {
    console.error("Upload scan error:", err);
    return c.json({ error: err.message }, 500);
  }
});
