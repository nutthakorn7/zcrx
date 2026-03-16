import { Hono } from "hono";
import { db } from "../db";
import { findings, findingComments, users } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const findingWorkflowRoutes = new Hono();

const VALID_STATUSES = ["open", "in_progress", "confirmed", "false_positive", "fixed"];

// ─── Get users list for assignment dropdown (MUST be before /:id routes!) ───
findingWorkflowRoutes.get("/assignable-users", async (c) => {
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .all();
  return c.json({ data: allUsers });
});

// ─── Change finding status ───
findingWorkflowRoutes.patch("/:id/status", async (c) => {
  try {
    const id = c.req.param("id") as string;
    const userId = c.req.raw.headers.get("x-user-id") || "";
    const userName = c.req.raw.headers.get("x-user-name") || "Unknown";
    const { status } = await c.req.json();

    if (!VALID_STATUSES.includes(status)) {
      return c.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, 400);
    }

    const finding = await db.select().from(findings).where(eq(findings.id, id)).get();
    if (!finding) return c.json({ error: "Finding not found" }, 404);

    const oldStatus = finding.status;
    await db.update(findings).set({ status }).where(eq(findings.id, id));

    // Auto-comment for status change
    try {
      await db.insert(findingComments).values({
        id: nanoid(),
        findingId: id,
        userId,
        userName,
        content: `Changed status from **${oldStatus}** to **${status}**`,
        action: "status_change",
        createdAt: new Date().toISOString(),
      });
    } catch {}

    return c.json({ message: `Status updated to ${status}` });
  } catch (err: any) {
    return c.json({ error: err.message || "Internal server error", stack: err.stack }, 500);
  }
});

// ─── Assign finding to user ───
findingWorkflowRoutes.patch("/:id/assign", async (c) => {
  const id = c.req.param("id") as string;
  const userId = c.req.raw.headers.get("x-user-id") || "";
  const userName = c.req.raw.headers.get("x-user-name") || "Unknown";
  const { assignedTo } = await c.req.json();

  const finding = await db.select().from(findings).where(eq(findings.id, id)).get();
  if (!finding) return c.json({ error: "Finding not found" }, 404);

  // Look up assigned user name
  let assignedName = assignedTo;
  if (assignedTo) {
    const assignedUser = await db.select().from(users).where(eq(users.id, assignedTo)).get();
    assignedName = assignedUser?.name || assignedTo;
  }

  await db.update(findings).set({ assignedTo: assignedTo || null }).where(eq(findings.id, id));

  // Auto-comment for assignment
  const content = assignedTo
    ? `Assigned to **${assignedName}**`
    : "Unassigned finding";

  try {
    await db.insert(findingComments).values({
      id: nanoid(),
      findingId: id,
      userId,
      userName,
      content,
      action: "assigned",
      createdAt: new Date().toISOString(),
    });
  } catch {}

  return c.json({ message: assignedTo ? `Assigned to ${assignedName}` : "Unassigned" });
});

// ─── Add comment to finding ───
findingWorkflowRoutes.post("/:id/comments", async (c) => {
  const findingId = c.req.param("id") as string;
  const userId = c.req.raw.headers.get("x-user-id") || "";
  const userName = c.req.raw.headers.get("x-user-name") || "Unknown";
  const { content } = await c.req.json();

  if (!content || content.trim().length === 0) {
    return c.json({ error: "Comment content is required" }, 400);
  }

  const comment = {
    id: nanoid(),
    findingId,
    userId,
    userName,
    content: content.trim(),
    action: "comment",
    createdAt: new Date().toISOString(),
  };

  await db.insert(findingComments).values(comment);
  return c.json({ data: comment }, 201);
});

// ─── Get comments for a finding ───
findingWorkflowRoutes.get("/:id/comments", async (c) => {
  const findingId = c.req.param("id") as string;
  const comments = await db
    .select()
    .from(findingComments)
    .where(eq(findingComments.findingId, findingId))
    .orderBy(desc(findingComments.createdAt))
    .all();
  return c.json({ data: comments });
});
