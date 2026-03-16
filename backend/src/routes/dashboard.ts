import { Hono } from "hono";
import { db } from "../db";
import { projects, scans, findings } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const dashboardRoutes = new Hono();

// Dashboard stats — supports both GET / and GET /stats
const statsHandler = async (c: any) => {
  const allProjects = await db.select().from(projects).all();
  const allScans = await db.select().from(scans).all();
  const allFindings = await db.select().from(findings).all();

  const openFindings = allFindings.filter((f) => f.status === "open");

  const bySeverity = {
    critical: allFindings.filter((f) => f.severity === "critical").length,
    high: allFindings.filter((f) => f.severity === "high").length,
    medium: allFindings.filter((f) => f.severity === "medium").length,
    low: allFindings.filter((f) => f.severity === "low").length,
    info: allFindings.filter((f) => f.severity === "info").length,
  };

  const recentScans = await db
    .select()
    .from(scans)
    .orderBy(desc(scans.startedAt))
    .limit(10)
    .all();

  // Generate 14-day trend data
  const trendData = [];
  const now = new Date();
  
  // Create empty buckets for the last 14 days
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
    const displayDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); // "Mar 15"
    
    // Count findings created on this day
    const dayFindings = allFindings.filter(f => f.createdAt.startsWith(dateStr));
    
    trendData.push({
      date: dateStr,
      displayDate,
      critical: dayFindings.filter(f => f.severity === "critical").length,
      high: dayFindings.filter(f => f.severity === "high").length,
      medium: dayFindings.filter(f => f.severity === "medium").length,
      low: dayFindings.filter(f => f.severity === "low").length,
      info: dayFindings.filter(f => f.severity === "info").length,
    });
  }

  return c.json({
    data: {
      totalProjects: allProjects.length,
      totalScans: allScans.length,
      totalFindings: allFindings.length,
      openFindings: openFindings.length,
      bySeverity,
      recentScans,
      trendData,
    },
  });
};

dashboardRoutes.get("/", statsHandler);
dashboardRoutes.get("/stats", statsHandler);
