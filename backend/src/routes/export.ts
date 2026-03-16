import { Hono } from "hono";
import { db } from "../db";
import { findings, scans, projects } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const exportRoutes = new Hono();

// ─── Export Findings as CSV ───
exportRoutes.get("/findings", async (c) => {
  const projectId = c.req.query("projectId");

  let query = db.select().from(findings).orderBy(desc(findings.createdAt));
  let allFindings: any[];

  if (projectId) {
    allFindings = await db
      .select()
      .from(findings)
      .where(eq(findings.projectId, projectId))
      .orderBy(desc(findings.createdAt))
      .all();
  } else {
    allFindings = await db
      .select()
      .from(findings)
      .orderBy(desc(findings.createdAt))
      .all();
  }

  const headers = [
    "ID",
    "Severity",
    "Status",
    "Title",
    "Description",
    "Type",
    "File Path",
    "Line",
    "Rule ID",
    "CWE ID",
    "Recommendation",
    "Created At",
  ];

  const rows = allFindings.map((f) =>
    [
      f.id,
      f.severity,
      f.status,
      `"${(f.title || "").replace(/"/g, '""')}"`,
      `"${(f.description || "").replace(/"/g, '""').slice(0, 200)}"`,
      f.type,
      f.filePath || "",
      f.line || "",
      f.ruleId || "",
      f.cweId || "",
      `"${(f.recommendation || "").replace(/"/g, '""').slice(0, 200)}"`,
      f.createdAt,
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zcrx-findings-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});

// ─── Export Scans as CSV ───
exportRoutes.get("/scans", async (c) => {
  const projectId = c.req.query("projectId");

  let allScans: any[];
  if (projectId) {
    allScans = await db
      .select()
      .from(scans)
      .where(eq(scans.projectId, projectId))
      .orderBy(desc(scans.startedAt))
      .all();
  } else {
    allScans = await db
      .select()
      .from(scans)
      .orderBy(desc(scans.startedAt))
      .all();
  }

  const headers = [
    "ID",
    "Project ID",
    "Type",
    "Status",
    "Findings Count",
    "Critical",
    "High",
    "Medium",
    "Low",
    "Started At",
    "Completed At",
  ];

  const rows = allScans.map((s) =>
    [
      s.id,
      s.projectId,
      s.type,
      s.status,
      s.findingsCount,
      s.critical,
      s.high,
      s.medium,
      s.low,
      s.startedAt,
      s.completedAt || "",
    ].join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zcrx-scans-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});

// ─── Export as PDF-ready HTML Report ───
exportRoutes.get("/pdf", async (c) => {
  const projectId = c.req.query("projectId");

  let allFindings: any[];
  let projectName = "All Projects";

  if (projectId) {
    allFindings = await db.select().from(findings).where(eq(findings.projectId, projectId)).orderBy(desc(findings.createdAt)).all();
    const proj = await db.select().from(projects).where(eq(projects.id, projectId)).get();
    if (proj) projectName = proj.name;
  } else {
    allFindings = await db.select().from(findings).orderBy(desc(findings.createdAt)).all();
  }

  const bySeverity = {
    critical: allFindings.filter(f => f.severity === "critical").length,
    high: allFindings.filter(f => f.severity === "high").length,
    medium: allFindings.filter(f => f.severity === "medium").length,
    low: allFindings.filter(f => f.severity === "low").length,
    info: allFindings.filter(f => f.severity === "info").length,
  };

  const byType = {
    sast: allFindings.filter(f => f.type === "sast").length,
    sca: allFindings.filter(f => f.type === "sca").length,
    dast: allFindings.filter(f => f.type === "dast").length,
  };

  const sevColors: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#6b7280" };

  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const findingsHtml = allFindings.slice(0, 100).map((f, i) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 12px; font-size: 12px;">${i + 1}</td>
      <td style="padding: 8px 12px;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; color: white; background: ${sevColors[f.severity] || "#6b7280"};">
          ${(f.severity || "info").toUpperCase()}
        </span>
      </td>
      <td style="padding: 8px 12px; font-size: 12px; font-weight: 600;">${f.title || ""}</td>
      <td style="padding: 8px 12px; font-size: 11px; color: #64748b;">${(f.type || "").toUpperCase()}</td>
      <td style="padding: 8px 12px; font-size: 11px; color: #64748b;">${f.cweId || "-"}</td>
      <td style="padding: 8px 12px; font-size: 10px; color: #94a3b8; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${f.filePath || "-"}</td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ZCRX Security Report — ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background: white; line-height: 1.6; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } @page { margin: 0.5in; size: A4; } }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #6366f1; }
    .header h1 { font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
    .header .subtitle { font-size: 14px; color: #64748b; }
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 32px; }
    .stat-card { text-align: center; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; }
    .stat-card .value { font-size: 28px; font-weight: 800; }
    .stat-card .label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 16px; font-weight: 700; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead th { text-align: left; padding: 10px 12px; background: #f8fafc; font-size: 11px; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; }
    .bar { height: 20px; border-radius: 4px; display: inline-block; margin-right: 8px; }
    .footer { text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0; margin-top: 40px; font-size: 11px; color: #94a3b8; }
    .print-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; background: #6366f1; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700; cursor: pointer; margin-bottom: 24px; font-family: inherit; }
    .print-btn:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="no-print" style="text-align: center; margin-bottom: 20px;">
      <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>

    <div class="header">
      <h1>🛡️ ZCRX Security Report</h1>
      <div class="subtitle">${projectName} — ${date}</div>
    </div>

    <!-- Severity Summary -->
    <div class="stats-grid">
      ${Object.entries(bySeverity).map(([sev, count]) => `
        <div class="stat-card">
          <div class="value" style="color: ${sevColors[sev]}">${count}</div>
          <div class="label">${sev}</div>
        </div>
      `).join("")}
    </div>

    <!-- Executive Summary -->
    <div class="section">
      <h2>📊 Executive Summary</h2>
      <p style="font-size: 13px; color: #475569; margin-bottom: 12px;">
        Total <strong>${allFindings.length}</strong> security findings detected across
        <strong>${byType.sast}</strong> SAST, <strong>${byType.sca}</strong> SCA, and <strong>${byType.dast}</strong> DAST analysis.
        ${bySeverity.critical > 0 ? `<span style="color: #ef4444; font-weight: 700;">⚠️ ${bySeverity.critical} critical issues require immediate attention.</span>` : ""}
      </p>

      <!-- Severity bar chart -->
      <div style="margin-top: 12px;">
        ${Object.entries(bySeverity).filter(([,c]) => c > 0).map(([sev, count]) => {
          const max = Math.max(...Object.values(bySeverity), 1);
          return `<div style="display: flex; align-items: center; margin-bottom: 6px;">
            <span style="width: 70px; font-size: 11px; font-weight: 600; color: ${sevColors[sev]}">${sev.toUpperCase()}</span>
            <div class="bar" style="width: ${(count / max) * 100}%; background: ${sevColors[sev]}; min-width: 20px;"></div>
            <span style="font-size: 12px; font-weight: 700;">${count}</span>
          </div>`;
        }).join("")}
      </div>
    </div>

    <!-- Scan Types -->
    <div class="section">
      <h2>🔬 Scan Coverage</h2>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
        <div class="stat-card"><div class="value" style="color: #3b82f6">${byType.sast}</div><div class="label">SAST (Static)</div></div>
        <div class="stat-card"><div class="value" style="color: #22c55e">${byType.sca}</div><div class="label">SCA (Dependencies)</div></div>
        <div class="stat-card"><div class="value" style="color: #a855f7">${byType.dast}</div><div class="label">DAST (Dynamic)</div></div>
      </div>
    </div>

    <!-- Findings Table -->
    <div class="section">
      <h2>📋 Findings Detail (${Math.min(allFindings.length, 100)} of ${allFindings.length})</h2>
      <table>
        <thead>
          <tr><th>#</th><th>Severity</th><th>Title</th><th>Type</th><th>CWE</th><th>Location</th></tr>
        </thead>
        <tbody>
          ${findingsHtml}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Generated by <strong>ZCRX</strong> — AI-Powered Security Platform — ${date}
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});

