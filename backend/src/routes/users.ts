import { Hono } from "hono";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";

export const userRoutes = new Hono();

// List all users (admin only)
userRoutes.get("/", requireAdmin(), async (c) => {
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .all();
  return c.json({ data: allUsers });
});

// Change user role (admin only)
userRoutes.patch("/:id/role", requireAdmin(), async (c) => {
  const id = c.req.param("id") as string;
  const { role } = await c.req.json();

  if (!["admin", "viewer"].includes(role)) {
    return c.json({ error: "Invalid role. Must be 'admin' or 'viewer'" }, 400);
  }

  const user = await db.select().from(users).where(eq(users.id, id)).get();
  if (!user) return c.json({ error: "User not found" }, 404);

  await db.update(users).set({ role }).where(eq(users.id, id));
  return c.json({ message: `Role updated to ${role}` });
});

// Delete user (admin only)
userRoutes.delete("/:id", requireAdmin(), async (c) => {
  const id = c.req.param("id") as string;
  const requesterId = c.req.raw.headers.get("x-user-id");

  if (id === requesterId) {
    return c.json({ error: "Cannot delete your own account" }, 400);
  }

  const user = await db.select().from(users).where(eq(users.id, id)).get();
  if (!user) return c.json({ error: "User not found" }, 404);

  await db.delete(users).where(eq(users.id, id));
  return c.json({ message: "User deleted" });
});
