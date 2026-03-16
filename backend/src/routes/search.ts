import { Hono } from "hono";
import { db } from "../db";
import { findings, projects } from "../db/schema";
import { desc } from "drizzle-orm";

export const searchRoutes = new Hono();

// ─── Global Search ───
searchRoutes.get("/", async (c) => {
  const q = (c.req.query("q") || "").toLowerCase().trim();
  if (!q || q.length < 2) return c.json({ data: { projects: [], findings: [] } });

  const allProjects = await db.select().from(projects).all();
  const allFindings = await db.select().from(findings).orderBy(desc(findings.createdAt)).all();

  const matchedProjects = allProjects
    .filter(p => p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q))
    .slice(0, 5);

  const matchedFindings = allFindings
    .filter(f =>
      (f.title || "").toLowerCase().includes(q) ||
      (f.description || "").toLowerCase().includes(q) ||
      (f.ruleId || "").toLowerCase().includes(q) ||
      (f.cweId || "").toLowerCase().includes(q)
    )
    .slice(0, 10);

  return c.json({ data: { projects: matchedProjects, findings: matchedFindings } });
});
