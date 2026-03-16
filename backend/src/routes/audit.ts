import { Hono } from "hono";
import { db } from "../db";
import { auditLogs } from "../db/schema";
import { desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const auditRoutes = new Hono();

// Helper to log an audit event (call from other routes)
export async function logAudit(
  userId: string,
  userEmail: string,
  action: string,
  target?: string,
  details?: string
) {
  await db.insert(auditLogs).values({
    id: nanoid(),
    userId,
    userEmail,
    action,
    target: target || null,
    details: details || null,
    createdAt: new Date().toISOString(),
  });
}

// List audit logs
auditRoutes.get("/", async (c) => {
  const limit = Number(c.req.query("limit") || "50");
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .all();
  return c.json({ data: logs });
});
