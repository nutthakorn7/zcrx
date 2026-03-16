import { Hono } from "hono";
import { sign } from "hono/jwt";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { JWT_SECRET } from "../middleware/auth";

export const authRoutes = new Hono();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Register
authRoutes.post("/register", async (c) => {
  const body = await c.req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  // Check if email already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .get();

  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  // Hash password using Bun's built-in bcrypt
  const passwordHash = await Bun.password.hash(parsed.data.password, {
    algorithm: "bcrypt",
    cost: 10,
  });

  const userId = nanoid();
  const now = new Date().toISOString();

  // First user = admin, subsequent users = viewer
  const existingUsers = await db.select().from(users).all();
  const role = existingUsers.length === 0 ? "admin" : "viewer";

  await db.insert(users).values({
    id: userId,
    email: parsed.data.email,
    name: parsed.data.name,
    passwordHash,
    role,
    createdAt: now,
  });

  // Generate JWT
  const token = await sign(
    {
      sub: userId,
      email: parsed.data.email,
      name: parsed.data.name,
      role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    },
    JWT_SECRET
  );

  return c.json(
    {
      data: {
        token,
        user: { id: userId, email: parsed.data.email, name: parsed.data.name, role },
      },
    },
    201
  );
});

// Login
authRoutes.post("/login", async (c) => {
  const body = await c.req.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .get();

  if (!user) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const valid = await Bun.password.verify(parsed.data.password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    },
    JWT_SECRET
  );

  return c.json({
    data: {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    },
  });
});

// Helper: extract userId from Bearer token (for routes under /api/auth that skip main middleware)
function getUserId(c: any): string | null {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const payload = JSON.parse(atob(auth.replace("Bearer ", "").split(".")[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub || null;
  } catch {
    return null;
  }
}

// Get current user
authRoutes.get("/me", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const user = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({ data: user });
});

// Update profile
authRoutes.patch("/profile", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const { name } = body;

  if (!name || name.length < 1) {
    return c.json({ error: "Name is required" }, 400);
  }

  await db.update(users).set({ name }).where(eq(users.id, userId));
  return c.json({ data: { message: "Profile updated" } });
});

// Change password
authRoutes.patch("/password", async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return c.json({ error: "Both current and new passwords are required" }, 400);
  }

  if (newPassword.length < 6) {
    return c.json({ error: "New password must be at least 6 characters" }, 400);
  }

  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return c.json({ error: "User not found" }, 404);

  const valid = await Bun.password.verify(currentPassword, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Current password is incorrect" }, 401);
  }

  const newHash = await Bun.password.hash(newPassword, { algorithm: "bcrypt", cost: 10 });
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

  return c.json({ data: { message: "Password changed successfully" } });
});
