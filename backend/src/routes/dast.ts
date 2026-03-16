import { Hono } from "hono";
import { db } from "../db";
import { scans, findings, projects } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { runDastScan } from "../engines/dast";
import { broadcast } from "../ws";

export const dastRoutes = new Hono();

// ─── AI Auto Scan: one-click full DAST with AI assistance ───
dastRoutes.post("/auto-scan", async (c) => {
  const { url, projectId } = await c.req.json();
  if (!url) return c.json({ error: "URL is required" }, 400);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const scanId = nanoid(12);
  const now = new Date().toISOString();

  // Normalize URL
  let targetUrl = url.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = `https://${targetUrl}`;
  }

  broadcast({ type: "auto-scan:progress", data: { scanId, step: 1, message: "🔍 Analyzing target..." } });

  // ── Step 1: Fingerprint the target ──
  let techInfo = "";
  try {
    const resp = await fetch(targetUrl, { redirect: "follow" });
    const headers: string[] = [];
    resp.headers.forEach((v, k) => headers.push(`${k}: ${v}`));
    const body = await resp.text();
    const bodySnippet = body.slice(0, 2000);

    techInfo = `HTTP Status: ${resp.status}\nHeaders:\n${headers.join("\n")}\nBody snippet:\n${bodySnippet}`;
    broadcast({ type: "auto-scan:progress", data: { scanId, step: 1, message: `✅ Target reachable (${resp.status})` } });
  } catch (e: any) {
    techInfo = `Could not reach target: ${e.message}`;
    broadcast({ type: "auto-scan:progress", data: { scanId, step: 1, message: `⚠️ Target may be unreachable: ${e.message}` } });
  }

  // ── Step 2: AI picks scan strategy ──
  let selectedTags: string[] = [];
  if (apiKey) {
    broadcast({ type: "auto-scan:progress", data: { scanId, step: 2, message: "🤖 AI analyzing tech stack..." } });
    try {
      const aiResp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `You are a security scanning expert. Based on HTTP response data, pick the best Nuclei template tags to scan this target.

Available tags: cves, misconfigurations, exposed-panels, default-logins, exposures, technologies, network, dns, ssl, headless, fuzzing, token-spray, osint

Respond with ONLY a JSON array of tag strings, nothing else. Example: ["cves","misconfigurations","exposures"]
Pick 3-6 most relevant tags based on the detected tech stack.`,
            },
            { role: "user", content: `Target: ${targetUrl}\n\n${techInfo.slice(0, 3000)}` },
          ],
          temperature: 0.2,
          max_tokens: 200,
        }),
      });
      const aiData = await aiResp.json() as any;
      const raw = aiData.choices?.[0]?.message?.content || "[]";
      try {
        selectedTags = JSON.parse(raw.replace(/```json?\n?/gi, "").replace(/```/g, "").trim());
      } catch { selectedTags = ["cves", "misconfigurations", "exposures"]; }

      broadcast({ type: "auto-scan:progress", data: { scanId, step: 2, message: `✅ AI selected: ${selectedTags.join(", ")}` } });
    } catch {
      selectedTags = ["cves", "misconfigurations", "exposures"];
      broadcast({ type: "auto-scan:progress", data: { scanId, step: 2, message: "⚠️ AI unavailable, using default templates" } });
    }
  } else {
    selectedTags = ["cves", "misconfigurations", "exposures", "technologies"];
    broadcast({ type: "auto-scan:progress", data: { scanId, step: 2, message: "ℹ️ No AI key, using default templates" } });
  }

  // ── Step 3: Run Nuclei scan ──
  broadcast({ type: "auto-scan:progress", data: { scanId, step: 3, message: `🚀 Running Nuclei scan (${selectedTags.join(", ")})...` } });

  const pid = projectId || "auto";
  const dastFindings = await runDastScan(scanId, pid, targetUrl, { templates: selectedTags });

  // Save scan record
  try {
    await db.insert(scans).values({
      id: scanId,
      projectId: pid,
      type: "dast",
      status: "completed",
      findingsCount: dastFindings.length,
      critical: dastFindings.filter(f => f.severity === "critical").length,
      high: dastFindings.filter(f => f.severity === "high").length,
      medium: dastFindings.filter(f => f.severity === "medium").length,
      low: dastFindings.filter(f => f.severity === "low").length,
      startedAt: now,
      completedAt: now,
    });

    // Save findings
    for (const f of dastFindings) {
      await db.insert(findings).values({
        id: f.id,
        scanId,
        projectId: pid,
        type: "dast",
        ruleId: f.ruleId,
        severity: f.severity,
        title: f.title,
        description: f.description,
        filePath: f.filePath || targetUrl,
        line: f.line || 0,
        code: f.code || "",
        recommendation: f.recommendation || "",
        cweId: f.cweId || null,
        status: "open",
        createdAt: now,
      });
    }
  } catch (e: any) {
    console.error("DB save error:", e.message);
  }

  broadcast({ type: "auto-scan:progress", data: { scanId, step: 3, message: `✅ Scan complete: ${dastFindings.length} findings` } });

  // ── Step 4: AI summary ──
  let summary = "";
  if (apiKey && dastFindings.length > 0) {
    broadcast({ type: "auto-scan:progress", data: { scanId, step: 4, message: "🤖 AI generating summary..." } });
    try {
      const findingsText = dastFindings.slice(0, 20).map(f =>
        `[${f.severity.toUpperCase()}] ${f.title}: ${f.description?.slice(0, 100)}`
      ).join("\n");

      const aiResp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "You are a security analyst. Summarize DAST scan results in 3-5 bullet points. Be concise and actionable. Use Thai language." },
            { role: "user", content: `Target: ${targetUrl}\nFindings (${dastFindings.length} total):\n${findingsText}` },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });
      const aiData = await aiResp.json() as any;
      summary = aiData.choices?.[0]?.message?.content || "";
    } catch { /* ignore */ }
  } else if (dastFindings.length === 0) {
    summary = "ไม่พบช่องโหว่จากการ scan ครั้งนี้ 🎉";
  }

  broadcast({ type: "auto-scan:progress", data: { scanId, step: 5, message: "✅ Done!" } });

  return c.json({
    data: {
      scanId,
      url: targetUrl,
      tags: selectedTags,
      findingsCount: dastFindings.length,
      findings: dastFindings,
      summary,
    },
  });
});

// ─── DAST Trends: findings by date ───
dastRoutes.get("/trends", async (c) => {
  const allFindings = await db
    .select()
    .from(findings)
    .where(eq(findings.type, "dast"))
    .orderBy(desc(findings.createdAt))
    .all();

  // Group by date
  const byDate: Record<string, { critical: number; high: number; medium: number; low: number; info: number }> = {};
  for (const f of allFindings) {
    const date = f.createdAt.split("T")[0];
    if (!byDate[date]) byDate[date] = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    const sev = f.severity as keyof typeof byDate[string];
    if (byDate[date][sev] !== undefined) byDate[date][sev]++;
  }

  const trends = Object.entries(byDate)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return c.json({ data: trends });
});

// ─── DAST vs SAST Comparison ───
dastRoutes.get("/comparison", async (c) => {
  const projectId = c.req.query("projectId");

  let dastFindings = db.select().from(findings).where(eq(findings.type, "dast"));
  let sastFindings = db.select().from(findings).where(eq(findings.type, "sast"));

  // Filter by project if provided
  const allDast = projectId
    ? await db.select().from(findings).where(sql`type = 'dast' AND project_id = ${projectId}`).all()
    : await db.select().from(findings).where(eq(findings.type, "dast")).all();

  const allSast = projectId
    ? await db.select().from(findings).where(sql`type = 'sast' AND project_id = ${projectId}`).all()
    : await db.select().from(findings).where(eq(findings.type, "sast")).all();

  // Group by severity
  const summary = {
    dast: {
      total: allDast.length,
      critical: allDast.filter(f => f.severity === "critical").length,
      high: allDast.filter(f => f.severity === "high").length,
      medium: allDast.filter(f => f.severity === "medium").length,
      low: allDast.filter(f => f.severity === "low").length,
    },
    sast: {
      total: allSast.length,
      critical: allSast.filter(f => f.severity === "critical").length,
      high: allSast.filter(f => f.severity === "high").length,
      medium: allSast.filter(f => f.severity === "medium").length,
      low: allSast.filter(f => f.severity === "low").length,
    },
    overlap: {
      // Find CWE IDs that appear in both
      sharedCWEs: [...new Set(allDast.filter(d => d.cweId).map(d => d.cweId))]
        .filter(cwe => allSast.some(s => s.cweId === cwe)),
    },
  };

  return c.json({ data: summary });
});

// ─── DAST Scan Schedules (in-memory for simplicity) ───
interface Schedule {
  id: string;
  projectId: string;
  targetUrl: string;
  cron: string; // "daily" | "weekly" | "hourly"
  templates: string[];
  crawl: boolean;
  enabled: boolean;
  lastRun: string | null;
  createdAt: string;
}

const schedules: Schedule[] = [];

dastRoutes.get("/schedules", async (c) => {
  return c.json({ data: schedules });
});

dastRoutes.post("/schedules", async (c) => {
  const body = await c.req.json();
  const schedule: Schedule = {
    id: `sched_${Date.now()}`,
    projectId: body.projectId,
    targetUrl: body.targetUrl,
    cron: body.cron || "daily",
    templates: body.templates || [],
    crawl: body.crawl || false,
    enabled: true,
    lastRun: null,
    createdAt: new Date().toISOString(),
  };
  schedules.push(schedule);
  return c.json({ data: schedule }, 201);
});

dastRoutes.patch("/schedules/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return c.json({ error: "Schedule not found" }, 404);

  if (body.enabled !== undefined) schedule.enabled = body.enabled;
  if (body.cron) schedule.cron = body.cron;
  if (body.templates) schedule.templates = body.templates;
  if (body.crawl !== undefined) schedule.crawl = body.crawl;
  if (body.targetUrl) schedule.targetUrl = body.targetUrl;

  return c.json({ data: schedule });
});

dastRoutes.delete("/schedules/:id", async (c) => {
  const id = c.req.param("id");
  const idx = schedules.findIndex(s => s.id === id);
  if (idx === -1) return c.json({ error: "Schedule not found" }, 404);
  schedules.splice(idx, 1);
  return c.json({ message: "Schedule deleted" });
});

// ─── Custom Nuclei Templates ───
interface CustomTemplate {
  id: string;
  name: string;
  content: string; // YAML template content
  createdBy: string;
  createdAt: string;
}

const customTemplates: CustomTemplate[] = [];

dastRoutes.get("/templates", async (c) => {
  return c.json({ data: customTemplates });
});

dastRoutes.post("/templates", async (c) => {
  const body = await c.req.json();
  const userId = c.req.raw.headers.get("x-user-id") || "unknown";

  const template: CustomTemplate = {
    id: `tmpl_${Date.now()}`,
    name: body.name,
    content: body.content,
    createdBy: userId,
    createdAt: new Date().toISOString(),
  };
  customTemplates.push(template);
  return c.json({ data: template }, 201);
});

dastRoutes.delete("/templates/:id", async (c) => {
  const id = c.req.param("id");
  const idx = customTemplates.findIndex(t => t.id === id);
  if (idx === -1) return c.json({ error: "Template not found" }, 404);
  customTemplates.splice(idx, 1);
  return c.json({ message: "Template deleted" });
});

// ─── AI-Powered Template Generation (DeepSeek) ───
dastRoutes.post("/templates/generate", async (c) => {
  const { prompt } = await c.req.json();
  if (!prompt) return c.json({ error: "Prompt is required" }, 400);

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return c.json({ error: "DEEPSEEK_API_KEY not configured" }, 500);

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are a Nuclei template expert. Generate valid Nuclei YAML templates based on user descriptions.

Rules:
- Output ONLY the YAML template, no markdown fences, no explanations
- Use proper Nuclei v3 template format
- Include: id, info (name, author, severity, description, tags), and appropriate request matchers
- Use realistic matchers (status, word, regex, dsl)
- Set appropriate severity (critical, high, medium, low, info)

Example template structure:
id: example-check
info:
  name: Example Security Check
  author: zcrx
  severity: medium
  description: Checks for example vulnerability
  tags: example,security

http:
  - method: GET
    path:
      - "{{BaseURL}}/path"
    matchers-condition: and
    matchers:
      - type: status
        status:
          - 200
      - type: word
        words:
          - "sensitive_pattern"`,
          },
          {
            role: "user",
            content: `Create a Nuclei template for: ${prompt}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    const data = await response.json() as any;
    let content = data.choices?.[0]?.message?.content || "";

    // Clean up — remove markdown fences if AI added them
    content = content.replace(/```ya?ml\n?/gi, "").replace(/```\n?/g, "").trim();

    // Auto-generate a name from the template id or prompt
    const idMatch = content.match(/^id:\s*(.+)$/m);
    const name = idMatch ? idMatch[1].trim() : prompt.slice(0, 50);

    return c.json({ data: { content, name } });
  } catch (error: any) {
    return c.json({ error: `AI generation failed: ${error.message}` }, 500);
  }
});
