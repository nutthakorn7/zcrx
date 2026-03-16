import { Hono } from "hono";
import { db } from "../db";
import { findingNotes } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const findingNotesRoutes = new Hono();

// Get notes for a finding
findingNotesRoutes.get("/:findingId", async (c) => {
  const findingId = c.req.param("findingId") as string;
  const notes = await db
    .select()
    .from(findingNotes)
    .where(eq(findingNotes.findingId, findingId))
    .orderBy(desc(findingNotes.createdAt))
    .all();
  return c.json({ data: notes });
});

// Add a note to a finding
findingNotesRoutes.post("/:findingId", async (c) => {
  const findingId = c.req.param("findingId") as string;
  const userId = c.req.raw.headers.get("x-user-id") || "";
  const userEmail = c.req.raw.headers.get("x-user-email") || "";
  const { note, tags } = await c.req.json();

  if (!note || note.trim().length === 0) {
    return c.json({ error: "Note content is required" }, 400);
  }

  const entry = {
    id: nanoid(),
    findingId,
    userId,
    userEmail,
    note: note.trim(),
    tags: tags || null,
    createdAt: new Date().toISOString(),
  };

  await db.insert(findingNotes).values(entry);
  return c.json({ data: entry }, 201);
});

// Delete a note
findingNotesRoutes.delete("/:findingId/:noteId", async (c) => {
  const noteId = c.req.param("noteId") as string;
  await db.delete(findingNotes).where(eq(findingNotes.id, noteId));
  return c.json({ message: "Note deleted" });
});
