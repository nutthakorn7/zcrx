import { Hono } from "hono";
import { db } from "../db";
import { findings } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

export const findingRoutes = new Hono();

// List findings with optional filters
findingRoutes.get("/", async (c) => {
  const projectId = c.req.query("projectId");
  const severity = c.req.query("severity");
  const status = c.req.query("status");
  const type = c.req.query("type");

  let conditions: any[] = [];

  if (projectId) conditions.push(eq(findings.projectId, projectId));
  if (severity)
    conditions.push(eq(findings.severity, severity as any));
  if (status) conditions.push(eq(findings.status, status as any));
  if (type) conditions.push(eq(findings.type, type as any));

  let result;
  if (conditions.length > 0) {
    result = await db
      .select()
      .from(findings)
      .where(and(...conditions))
      .orderBy(desc(findings.createdAt))
      .all();
  } else {
    result = await db
      .select()
      .from(findings)
      .orderBy(desc(findings.createdAt))
      .all();
  }

  return c.json({ data: result });
});

// Get single finding
findingRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const finding = await db
    .select()
    .from(findings)
    .where(eq(findings.id, id))
    .get();

  if (!finding) {
    return c.json({ error: "Finding not found" }, 404);
  }
  return c.json({ data: finding });
});

// Update finding status (e.g., mark as false_positive or fixed)
findingRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await db
    .select()
    .from(findings)
    .where(eq(findings.id, id))
    .get();

  if (!existing) {
    return c.json({ error: "Finding not found" }, 404);
  }

  const VALID = ["open", "in_progress", "confirmed", "false_positive", "fixed"];
  if (body.status && !VALID.includes(body.status)) {
    return c.json({ error: `Invalid status. Use: ${VALID.join(", ")}` }, 400);
  }

  if (body.status) {
    await db
      .update(findings)
      .set({ status: body.status })
      .where(eq(findings.id, id));
  }

  return c.json({
    data: { ...existing, status: body.status || existing.status },
  });
});
