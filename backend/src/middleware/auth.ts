import { Hono } from "hono";
import type { Context, Next } from "hono";

const JWT_SECRET = process.env.JWT_SECRET || "zcrx-secret-key-change-in-production";

/**
 * Auth middleware — verifies JWT token from Authorization header.
 * Skips auth for /api/auth/* and / (health check) routes.
 */
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // Skip auth for public routes only (login + register)
    if (
      path === "/" ||
      path === "/api/auth/login" ||
      path === "/api/auth/register"
    ) {
      return next();
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized — no token provided" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    try {
      // Manually decode and verify JWT
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("Invalid token format");

      const payload = JSON.parse(atob(parts[1]));

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error("Token expired");
      }

      // Store user info in request header for downstream routes
      c.req.raw.headers.set("x-user-id", payload.sub || "");
      c.req.raw.headers.set("x-user-email", payload.email || "");
      c.req.raw.headers.set("x-user-role", payload.role || "viewer");
      return next();
    } catch (error) {
      return c.json({ error: "Unauthorized — invalid token" }, 401);
    }
  };
}

/**
 * Middleware to require admin role for destructive actions.
 */
export function requireAdmin() {
  return async (c: Context, next: Next) => {
    const role = c.req.raw.headers.get("x-user-role");
    if (role !== "admin") {
      return c.json({ error: "Forbidden — admin access required" }, 403);
    }
    return next();
  };
}

export { JWT_SECRET };
