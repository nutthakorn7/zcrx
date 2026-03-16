import { Hono } from "hono";
import { db } from "../db";
import { projects, findings, scans } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { stringify } from "csv-stringify/sync";

export const reportRoutes = new Hono();

// ═══════════════════════════════════════════════════════════════
// CSV Export
// ═══════════════════════════════════════════════════════════════
reportRoutes.get("/csv", async (c) => {
  const projectId = c.req.query("projectId");
  if (!projectId) return c.json({ error: "projectId is required" }, 400);

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ error: "Project not found" }, 404);

  const allFindings = await db.select().from(findings).where(eq(findings.projectId, projectId)).all();
  const records = allFindings.map((f) => ({
    ID: f.id, Type: f.type, Severity: f.severity.toUpperCase(), Status: f.status,
    Title: f.title, Description: f.description, File: f.filePath || "",
    Line: f.line || "", RuleID: f.ruleId || "", CWE: f.cweId || "", CreatedAt: f.createdAt,
  }));

  const csvString = stringify(records, { header: true });
  c.header("Content-Type", "text/csv");
  c.header("Content-Disposition", `attachment; filename="zcrX-findings-${project.name}.csv"`);
  return c.body(csvString);
});

// ═══════════════════════════════════════════════════════════════
// Premium PDF Generator (Pure PDF spec — Bun-native, zero deps)
// ═══════════════════════════════════════════════════════════════

type RGB = [number, number, number]; // r, g, b (0-1)

const C = {
  brand:    [0.38, 0.35, 0.96] as RGB,
  brandDk:  [0.28, 0.25, 0.80] as RGB,
  black:    [0.10, 0.12, 0.18] as RGB,
  gray:     [0.42, 0.45, 0.51] as RGB,
  grayLt:   [0.62, 0.65, 0.71] as RGB,
  bg:       [0.96, 0.97, 0.98] as RGB,
  white:    [1, 1, 1] as RGB,
  crit:     [0.94, 0.27, 0.27] as RGB,
  high:     [0.98, 0.45, 0.09] as RGB,
  med:      [0.92, 0.70, 0.03] as RGB,
  low:      [0.23, 0.51, 0.96] as RGB,
  green:    [0.13, 0.77, 0.37] as RGB,
  border:   [0.85, 0.87, 0.90] as RGB,
};

function e(t: string): string {
  return (t || "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[\r\n\t]+/g, " ");
}
function cut(t: string, n: number): string {
  if (!t) return ""; return t.length > n ? t.slice(0, n - 3) + "..." : t;
}

function sevColor(s: string): RGB {
  if (s === "critical") return C.crit;
  if (s === "high") return C.high;
  if (s === "medium") return C.med;
  if (s === "low") return C.low;
  return C.gray;
}

// Simple PDF content stream builder
function buildStream(
  projectName: string,
  date: string,
  counts: { critical: number; high: number; medium: number; low: number },
  total: number,
  fList: { severity: string; title: string; type: string; filePath: string | null; line: number | null }[],
  aiSummary: string = ""
): string {
  let s = "";
  const W = 595, H = 842, ML = 40, MR = 40;
  const CW = W - ML - MR; // content width = 515

  // Helper functions
  const fill = (c: RGB) => { s += `${c[0]} ${c[1]} ${c[2]} rg\n`; };
  const stroke = (c: RGB) => { s += `${c[0]} ${c[1]} ${c[2]} RG\n`; };
  const rect = (x: number, y: number, w: number, h: number) => { s += `${x} ${y} ${w} ${h} re f\n`; };
  const box = (x: number, y: number, w: number, h: number, c: RGB) => { fill(c); rect(x, y, w, h); };
  const ln = (x1: number, y1: number, x2: number, y2: number, c: RGB, w = 0.5) => {
    s += `${w} w\n`; stroke(c); s += `${x1} ${y1} m ${x2} ${y2} l S\n`;
  };
  const txt = (x: number, y: number, text: string, sz: number, c: RGB, bold = false) => {
    const f = bold ? "/F2" : "/F1";
    s += `BT ${f} ${sz} Tf ${c[0]} ${c[1]} ${c[2]} rg ${x} ${y} Td (${e(text)}) Tj ET\n`;
  };

  // Basic word wrap
  const wrapText = (text: string, maxLen: number): string[] => {
    const words = text.split(" ");
    let lines = [];
    let currentLine = "";
    for (const w of words) {
      if ((currentLine + " " + w).length > maxLen) {
        lines.push(currentLine.trim());
        currentLine = w;
      } else {
        currentLine += " " + w;
      }
    }
    if (currentLine) lines.push(currentLine.trim());
    return lines;
  };

  let Y = H; // cursor starts at the top

  // ─── HEADER BANNER (80px tall) ───
  box(0, H - 80, W, 80, C.brand);
  // Accent stripe at bottom of header
  box(0, H - 80, W, 3, C.brandDk);
  txt(ML, H - 30, "zcrX", 26, C.white, true);
  txt(ML + 68, H - 30, "Security Report", 26, C.white, false);
  txt(ML, H - 50, `Project: ${cut(projectName, 55)}`, 11, [0.82, 0.80, 1]);
  txt(ML, H - 64, `Generated: ${date}`, 9, [0.72, 0.70, 0.95]);
  Y = H - 100;

  // ─── AI EXECUTIVE SUMMARY (IF PROVIDED) ───
  if (aiSummary) {
    // Light background box for the summary section
    const summaryLines = wrapText(aiSummary, 115);
    const summaryHeight = 20 + (summaryLines.length * 13) + 10;
    box(ML, Y - summaryHeight + 16, CW, summaryHeight, [0.95, 0.94, 1]); // light purple bg
    // Left accent bar
    box(ML, Y - summaryHeight + 16, 3, summaryHeight, C.brandDk);

    txt(ML + 10, Y, "AI Executive Summary", 13, C.brandDk, true);
    Y -= 18;
    summaryLines.forEach(line => {
      txt(ML + 10, Y, line, 9, C.black, false);
      Y -= 13;
    });
    Y -= 16; // extra padding
  }

  // ─── METRICS OVERVIEW ───
  txt(ML, Y, "Metrics Overview", 14, C.black, true);
  Y -= 28;

  // 4 severity metric cards
  const cards: { label: string; count: number; color: RGB }[] = [
    { label: "CRITICAL", count: counts.critical, color: C.crit },
    { label: "HIGH",     count: counts.high,     color: C.high },
    { label: "MEDIUM",   count: counts.medium,   color: C.med },
    { label: "LOW",      count: counts.low,      color: C.low },
  ];

  const cw = (CW - 24) / 4; // card width with gaps
  const ch = 52;

  cards.forEach((card, i) => {
    const cx = ML + i * (cw + 8);
    // Card background
    box(cx, Y - ch, cw, ch, C.bg);
    // Top color stripe (3px)
    box(cx, Y, cw, 3, card.color);
    // Count number (centered)
    const numStr = String(card.count);
    const numX = cx + cw / 2 - (numStr.length * 7);
    txt(numX, Y - 28, numStr, 22, card.color, true);
    // Label (centered)
    const lblX = cx + cw / 2 - (card.label.length * 2.5);
    txt(lblX, Y - 44, card.label, 8, C.grayLt, false);
  });
  Y -= ch + 16;

  // Total summary line
  const totalOpen = counts.critical + counts.high + counts.medium + counts.low;
  txt(ML, Y, `Total: ${total} findings  |  Open: ${totalOpen}  |  Resolved: ${total - totalOpen}`, 9, C.gray);
  Y -= 24;

  // ─── RISK LEVEL BAR ───
  let riskText = "LOW RISK"; let riskBg: RGB = C.green;
  if (counts.critical > 0) { riskText = "CRITICAL RISK"; riskBg = C.crit; }
  else if (counts.high > 2) { riskText = "HIGH RISK"; riskBg = C.high; }
  else if (counts.medium > 5) { riskText = "MEDIUM RISK"; riskBg = C.med; }

  box(ML, Y - 18, CW, 22, riskBg);
  txt(ML + 12, Y - 12, `Overall Assessment: ${riskText}`, 10, C.white, true);
  Y -= 46;

  // Separator
  ln(ML, Y, ML + CW, Y, C.border, 1);
  Y -= 20;

  // ─── FINDINGS TABLE ───
  txt(ML, Y, "Open Findings", 15, C.black, true);
  Y -= 22;

  if (fList.length === 0) {
    box(ML, Y - 18, CW, 28, [0.92, 0.98, 0.92]);
    txt(ML + 12, Y - 10, "All clear! No open findings detected.", 11, C.green, true);
    Y -= 48;
  } else {
    // Table header row
    box(ML, Y - 16, CW, 20, C.black);
    txt(ML + 8,   Y - 10, "SEV",   8, C.white, true);
    txt(ML + 70,  Y - 10, "TITLE", 8, C.white, true);
    txt(ML + 340, Y - 10, "FILE",  8, C.white, true);
    txt(ML + 470, Y - 10, "TYPE",  8, C.white, true);
    Y -= 20;

    // Table rows (max 20 to fit page)
    const maxRows = Math.min(fList.length, 20);
    for (let i = 0; i < maxRows; i++) {
      const f = fList[i];
      const rowH = 18;
      const rowY = Y - rowH;

      // Alternating background
      if (i % 2 === 0) box(ML, rowY, CW, rowH, C.bg);

      // Severity badge
      const sc = sevColor(f.severity);
      const sevText = f.severity.toUpperCase().slice(0, 4);
      const badgeW = 36;
      box(ML + 4, rowY + 2, badgeW, 14, sc);
      txt(ML + 8, rowY + 5, sevText, 7, C.white, true);

      // Title
      txt(ML + 70, rowY + 4, cut(f.title, 42), 8, C.black);

      // File
      const fp = f.filePath ? cut(f.filePath, 18) + (f.line ? `:${f.line}` : "") : "N/A";
      txt(ML + 340, rowY + 4, fp, 7, C.gray);

      // Type badge
      txt(ML + 470, rowY + 4, f.type.toUpperCase(), 7, C.brand, true);

      Y -= rowH;
    }

    if (fList.length > maxRows) {
      Y -= 8;
      txt(ML, Y, `+ ${fList.length - maxRows} more findings (export CSV for full data)`, 8, C.grayLt);
      Y -= 14;
    }
  }

  // ─── FOOTER ───
  ln(ML, 48, ML + CW, 48, C.border, 0.5);
  txt(ML, 34, "Generated by zcrX Security Platform  |  Confidential", 7, C.grayLt);
  txt(ML + CW - 80, 34, `Page 1`, 7, C.grayLt);

  return s;
}

function assemblePdf(stream: string): Uint8Array {
  const bytes = new TextEncoder().encode(stream);
  const objs = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj`,
    `4 0 obj\n<< /Length ${bytes.length} >>\nstream\n${stream}endstream\nendobj`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
    `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`,
  ];

  let raw = "%PDF-1.4\n";
  const offs: number[] = [];
  for (const o of objs) { offs.push(raw.length); raw += o + "\n"; }
  const xref = raw.length;
  raw += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offs) raw += `${String(off).padStart(10, "0")} 00000 n \n`;
  raw += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return new TextEncoder().encode(raw);
}

// ═══════════════════════════════════════════════════════════════
// PDF Route
// ═══════════════════════════════════════════════════════════════
reportRoutes.get("/pdf", async (c) => {
  const projectId = c.req.query("projectId");
  if (!projectId) return c.json({ error: "projectId is required" }, 400);

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  if (!project) return c.json({ error: "Project not found" }, 404);

  const allFindings = await db.select().from(findings).where(eq(findings.projectId, projectId)).all();
  const openFindings = allFindings.filter((f) => f.status === "open");
  const counts = {
    critical: openFindings.filter((f) => f.severity === "critical").length,
    high:     openFindings.filter((f) => f.severity === "high").length,
    medium:   openFindings.filter((f) => f.severity === "medium").length,
    low:      openFindings.filter((f) => f.severity === "low").length,
  };

  // Attempt to generate AI Executive Summary via DeepSeek
  let aiSummary = "";
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey) {
    try {
      const prompt = `Act as a Chief Information Security Officer (CISO).
Given the following security metrics for the project "${project.name}", write a VERY concise (max 3 sentences) executive summary of the project's security posture. Focus on critical risks, or praise if clean.

Metrics:
- Total Open Findings: ${openFindings.length}
- CRITICAL Vulnerabilities: ${counts.critical}
- HIGH Vulnerabilities: ${counts.high}
- MEDIUM Vulnerabilities: ${counts.medium}
- LOW Vulnerabilities: ${counts.low}

Do NOT output Markdown. Just plain text.`;

      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 512,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        aiSummary = (data.choices?.[0]?.message?.content?.trim() || "").replace(/^"|"$/g, "");
      }
    } catch (e) {
      console.error("DeepSeek PDF Summary Error:", e);
    }
  }

  // Fallback: generate rule-based summary if AI is unavailable
  if (!aiSummary) {
    if (counts.critical > 0) {
      aiSummary = `URGENT: Project "${project.name}" has ${counts.critical} critical and ${counts.high} high-severity vulnerabilities across ${openFindings.length} open findings. Immediate remediation of critical vulnerabilities is required to prevent potential exploitation. Engineering teams must prioritize patching critical issues within the next 48 hours.`;
    } else if (counts.high > 3) {
      aiSummary = `Project "${project.name}" requires significant attention with ${counts.high} high-severity vulnerabilities. While no critical exploits were detected, the volume of high-risk findings suggests gaps in secure coding practices. A focused remediation sprint is recommended.`;
    } else if (openFindings.length > 0) {
      aiSummary = `Security posture for "${project.name}" is stable with ${openFindings.length} open findings, primarily consisting of ${counts.medium} medium and ${counts.low} low-severity issues. No critical vulnerabilities were detected. Continue regular scanning cadence.`;
    } else {
      aiSummary = `Excellent security posture for "${project.name}". No open vulnerabilities detected. Continue maintaining current security practices and scanning schedules.`;
    }
  }

  const stream = buildStream(
    project.name,
    new Date().toISOString(),
    counts,
    allFindings.length,
    openFindings.map((f) => ({
      severity: f.severity, title: f.title, type: f.type,
      filePath: f.filePath, line: f.line,
    })),
    aiSummary
  );

  const pdfBytes = assemblePdf(stream);
  c.header("Content-Type", "application/pdf");
  c.header("Content-Disposition", `attachment; filename="zcrX-report-${project.name}.pdf"`);
  return c.body(pdfBytes as any);
});
