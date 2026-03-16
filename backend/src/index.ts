import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initDatabase } from "./db";
import { authMiddleware } from "./middleware/auth";
import { authRoutes } from "./routes/auth";
import { projectRoutes } from "./routes/projects";
import { scanRoutes } from "./routes/scans";
import { findingRoutes } from "./routes/findings";
import { dashboardRoutes } from "./routes/dashboard";
import { sbomRoutes } from "./routes/sbom";
import { reportRoutes } from "./routes/reports";
import { aiRoutes } from "./routes/ai";
import { searchRoutes } from "./routes/search";
import { userRoutes } from "./routes/users";
import { auditRoutes } from "./routes/audit";
import { findingNotesRoutes } from "./routes/findingNotes";
import { exportRoutes } from "./routes/export";
import { findingWorkflowRoutes } from "./routes/findingWorkflow";
import { dastRoutes } from "./routes/dast";
import { notificationRoutes } from "./routes/notifications";
import { agentRoutes } from "./routes/agent";
import { uploadRoutes } from "./routes/upload";
import { addClient, removeClient } from "./ws";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check (public)
app.get("/", (c) =>
  c.json({
    name: "zcrX",
    version: "2.0.0",
    description: "Security Scanning Platform API",
    status: "running",
  })
);

// Auth routes (public)
app.route("/api/auth", authRoutes);

// Auth middleware (protects everything below)
app.use("/api/*", authMiddleware());

// Protected routes
app.route("/api/projects", projectRoutes);
app.route("/api/scans", scanRoutes);
app.route("/api/findings", findingWorkflowRoutes);
app.route("/api/findings", findingRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/sbom", sbomRoutes);
app.route("/api/reports", reportRoutes);
app.route("/api/ai", aiRoutes);
app.route("/api/search", searchRoutes);
app.route("/api/users", userRoutes);
app.route("/api/audit", auditRoutes);
app.route("/api/finding-notes", findingNotesRoutes);
app.route("/api/export", exportRoutes);
app.route("/api/dast", dastRoutes);
app.route("/api/notifications", notificationRoutes);
app.route("/api/agent", agentRoutes);
app.route("/api/upload", uploadRoutes);

// Initialize database
initDatabase();

const port = Number(process.env.PORT) || 8000;
console.log(`
  zcrX Security Platform API v2.0
  Server running at http://localhost:${port}
  WebSocket: ws://localhost:${port}/ws
  Auth: POST /api/auth/register, POST /api/auth/login
  API:  /api/projects, /api/scans, /api/findings, /api/dashboard
`);

export default {
  port,
  fetch(req: Request, server: any) {
    // Handle WebSocket upgrade
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req, server);
  },
  websocket: {
    open(ws: any) {
      addClient(ws);
    },
    close(ws: any) {
      removeClient(ws);
    },
    message(_ws: any, _msg: any) {
      // No incoming messages expected from clients
    },
  },
};
