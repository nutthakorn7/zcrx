import { Hono } from "hono";
import { z } from "zod";

export const aiRoutes = new Hono();

// ─── DeepSeek API Helper ───
async function callDeepSeek(prompt: string, maxTokens = 1024): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured in the backend environment.");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DeepSeek API Error [${response.status}]: ${errorBody}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ─── Schemas ───
const suggestFixSchema = z.object({
  language: z.string(),
  cwe: z.string().optional(),
  ruleId: z.string().optional(),
  issueType: z.string().optional(),
  title: z.string(),
  description: z.string(),
  filePath: z.string().optional(),
  line: z.number().optional(),
  codeSnippet: z.string(),
});

const summarizeSchema = z.object({
  totalProjects: z.number(),
  totalFindings: z.number(),
  critical: z.number(),
  high: z.number(),
  medium: z.number(),
  low: z.number(),
  customPrompt: z.string().optional(),
});

// ─── Suggest Fix Route ───
aiRoutes.post("/suggest-fix", async (c) => {
  const body = await c.req.json();
  const parsed = suggestFixSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  try {
    const {
      language, cwe, ruleId, issueType,
      title, description, filePath, codeSnippet,
    } = parsed.data;

    const prompt = `You are an expert ${language} security engineer. 
I have a finding in my code:
- Title: ${title}
- Description: ${description}
- Issue Type: ${issueType || "Unknown"}
- CWE: ${cwe || "N/A"}
- Rule ID: ${ruleId || "N/A"}
- File: ${filePath || "Unknown"}

Here is the problematic code snippet:
\`\`\`${language.toLowerCase()}
${codeSnippet}
\`\`\`

Please provide a secure replacement for this code snippet.
Your response MUST be formatted in Markdown.

Use this exact structure:
### Explanation
Briefly explain why the code is vulnerable or has an issue.

### Secure Fix
Provide the corrected code block.

### Diff (Optional but recommended if it clarifies the change)
Show a brief before/after diff if applicable.`;

    const responseText = await callDeepSeek(prompt, 2048);
    return c.json({ suggestion: responseText });
  } catch (error: any) {
    console.error("DeepSeek API Error:", error);
    return c.json(
      { error: "Failed to generate AI fix.", details: error.message },
      500
    );
  }
});

// ─── Summarize Dashboard Route ───
aiRoutes.post("/summarize-dashboard", async (c) => {
  const body = await c.req.json();
  const parsed = summarizeSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }

  try {
    const prompt = parsed.data.customPrompt || `Act as a Chief Information Security Officer (CISO).
Given the following security metrics across all our active repositories, write a VERY concise (exactly 1 paragraph, maximum 3-4 sentences) executive summary evaluating our security posture.
Be professional but direct. Highlight critical and high vulnerabilities if any. Do NOT output Markdown formatting, just plain text.

Metrics:
- Total Projects Scanned: ${parsed.data.totalProjects}
- Total Open Findings: ${parsed.data.totalFindings}
- CRITICAL Vulnerabilities: ${parsed.data.critical}
- HIGH Vulnerabilities: ${parsed.data.high}
- MEDIUM Vulnerabilities: ${parsed.data.medium}
- LOW Vulnerabilities: ${parsed.data.low}`;

    const summary = await callDeepSeek(prompt, 512);
    return c.json({ summary: summary.replace(/^"|"$/g, "") });
  } catch (error: any) {
    console.error("DeepSeek API Error (Summarize):", error);
    // Fallback: generate a rule-based summary when DeepSeek is unavailable
    const { totalProjects, totalFindings, critical, high, medium, low } = parsed.data;
    let summary = "";
    if (critical > 0) {
      summary = `URGENT: Our security posture is critically compromised with ${critical} critical and ${high} high-severity vulnerabilities across ${totalProjects} projects totaling ${totalFindings} open findings. Immediate remediation of critical vulnerabilities is required to prevent potential exploitation. Engineering teams must prioritize patching critical issues within the next 48 hours.`;
    } else if (high > 3) {
      summary = `Our security posture requires significant attention with ${high} high-severity vulnerabilities identified across ${totalProjects} projects. While no critical exploits were detected, the volume of high-risk findings (${totalFindings} total) suggests systemic gaps in secure coding practices. A focused remediation sprint is recommended.`;
    } else if (totalFindings > 0) {
      summary = `Security posture is stable across ${totalProjects} projects with ${totalFindings} total findings, primarily consisting of ${medium} medium and ${low} low-severity issues. No critical vulnerabilities were detected. Continue regular scanning cadence and address medium-priority items in upcoming sprint cycles.`;
    } else {
      summary = `Excellent security posture across all ${totalProjects} projects. No open vulnerabilities detected. Continue maintaining current security practices and scanning schedules.`;
    }
    return c.json({ summary });
  }
});

// ─── AI Risk Score ───
aiRoutes.post("/risk-score", async (c) => {
  const body = await c.req.json();
  try {
    const prompt = `คุณเป็น Security Risk Analyst ผู้เชี่ยวชาญ
วิเคราะห์ข้อมูลนี้แล้วให้คะแนนความเสี่ยง 0-100 พร้อมคำอธิบาย

โปรเจค: ${body.projectName || "Unknown"}
ข้อมูล findings:
- Critical: ${body.critical || 0}
- High: ${body.high || 0}
- Medium: ${body.medium || 0}
- Low: ${body.low || 0}
- Total: ${body.total || 0}
- ประเภท: ${body.types?.join(", ") || "N/A"}

ตอบในรูปแบบ JSON เท่านั้น:
{"score": <0-100>, "level": "<critical|high|medium|low>", "summary": "<สรุป 2-3 ประโยคภาษาไทย>", "topRisks": ["<ความเสี่ยงหลัก 1>", "<ความเสี่ยงหลัก 2>", "<ความเสี่ยงหลัก 3>"], "recommendations": ["<แนะนำ 1>", "<แนะนำ 2>"]}`;

    const result = await callDeepSeek(prompt, 512);
    const cleaned = result.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    return c.json({ data: JSON.parse(cleaned) });
  } catch (e: any) {
    // Fallback
    const score = Math.min(100, (body.critical || 0) * 25 + (body.high || 0) * 15 + (body.medium || 0) * 5 + (body.low || 0));
    return c.json({ data: { score, level: score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "medium" : "low", summary: `Risk score ${score}/100`, topRisks: [], recommendations: [] } });
  }
});

// ─── AI Finding Explain ───
aiRoutes.post("/explain", async (c) => {
  const body = await c.req.json();
  try {
    const prompt = `คุณเป็น Application Security Expert
อธิบายช่องโหว่นี้แบบละเอียดเป็นภาษาไทย:

ชื่อ: ${body.title}
Severity: ${body.severity}
CWE: ${body.cweId || "N/A"}
คำอธิบาย: ${body.description}
โค้ดที่มีปัญหา: ${body.code || "N/A"}
ไฟล์: ${body.filePath || "N/A"}

ตอบในรูปแบบ Markdown:
### 🔍 ช่องโหว่นี้คืออะไร
(อธิบาย 2-3 ประโยค)

### ⚠️ ตัวอย่าง Exploit
(แสดงโค้ดตัวอย่างการโจมตี)

### 🛡️ วิธีแก้ไข
(แสดงโค้ดที่ปลอดภัย)

### 📊 ระดับความรุนแรง
(อธิบายทำไมถึง ${body.severity})`;

    const result = await callDeepSeek(prompt, 1024);
    return c.json({ data: result });
  } catch (e: any) {
    return c.json({ data: `### ${body.title}\n\n${body.description}\n\n**Severity:** ${body.severity}\n**CWE:** ${body.cweId || "N/A"}` });
  }
});

// ─── AI Dependency Advisor ───
aiRoutes.post("/dependency-advisor", async (c) => {
  const body = await c.req.json();
  try {
    const deps = (body.components || []).slice(0, 30).map((c: any) => `${c.name}@${c.version} (${c.license || "unknown"})`).join("\n");
    const prompt = `คุณเป็น Software Composition Analyst
วิเคราะห์ dependencies เหล่านี้แล้วแนะนำ:

${deps}

ตอบเป็น JSON:
{"advice": [{"name": "<pkg>", "action": "<update|replace|remove|keep>", "reason": "<เหตุผลภาษาไทย>", "suggestion": "<version หรือ alternative>"}], "summary": "<สรุป 2 ประโยคภาษาไทย>", "healthScore": <0-100>}

ตอบ JSON เท่านั้น ไม่ต้องมี markdown`;

    const result = await callDeepSeek(prompt, 1024);
    const cleaned = result.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    return c.json({ data: JSON.parse(cleaned) });
  } catch (e: any) {
    return c.json({ data: { advice: [], summary: "ไม่สามารถวิเคราะห์ได้", healthScore: 50 } });
  }
});

// ─── AI Executive Report ───
aiRoutes.post("/executive-report", async (c) => {
  const body = await c.req.json();
  try {
    const prompt = `คุณเป็น CISO ที่เขียนรายงานให้ผู้บริหาร
เขียนรายงานสรุปสถานะความปลอดภัยเป็นภาษาไทย สำหรับ Management ที่ไม่ใช่ technical

ข้อมูล:
- โปรเจค: ${body.projectName || "ทุกโปรเจค"}
- Findings ทั้งหมด: ${body.total || 0}
- Critical: ${body.critical || 0}
- High: ${body.high || 0}
- Medium: ${body.medium || 0}
- Low: ${body.low || 0}
- ประเภทสแกน: ${body.scanTypes?.join(", ") || "SAST, SCA, DAST"}
- Top findings: ${body.topFindings?.map((f: any) => f.title).join(", ") || "N/A"}

เขียนรายงานในรูปแบบ Markdown:
## 📊 สรุปผู้บริหาร
(สรุป 3-4 ประโยค สถานะภาพรวม)

## 🔴 ประเด็นสำคัญ
(bullet points ปัญหาหลัก)

## ✅ สิ่งที่ดำเนินการแล้ว
(bullet points)

## 📋 แผนดำเนินการ
(ลำดับความสำคัญ + timeline แนะนำ)

## 💰 ผลกระทบทางธุรกิจ
(risk ที่อาจเกิดขึ้น ถ้าไม่แก้ไข)`;

    const result = await callDeepSeek(prompt, 1500);
    return c.json({ data: result });
  } catch (e: any) {
    return c.json({ data: `## สรุปผู้บริหาร\n\nพบ ${body.total || 0} findings (${body.critical || 0} critical, ${body.high || 0} high)` });
  }
});

// ─── AI Prioritize ───
aiRoutes.post("/prioritize", async (c) => {
  const body = await c.req.json();
  try {
    const findingsList = (body.findings || []).slice(0, 20).map((f: any, i: number) =>
      `${i + 1}. [${f.severity}] ${f.title} (CWE: ${f.cweId || "N/A"}, File: ${f.filePath || "N/A"})`
    ).join("\n");

    const prompt = `คุณเป็น Security Engineer ที่ต้องจัดลำดับการแก้ไขช่องโหว่
จัดลำดับ findings เหล่านี้ตาม business impact (แก้อันไหนก่อน):

${findingsList}

ตอบเป็น JSON:
{"prioritized": [{"index": <ลำดับเดิม>, "priority": <1=แก้ก่อนสุด>, "reason": "<เหตุผลสั้นๆ ภาษาไทย>", "effort": "<quick-fix|medium|complex>"}], "summary": "<สรุปภาษาไทย 2 ประโยค>"}

ตอบ JSON เท่านั้น`;

    const result = await callDeepSeek(prompt, 1024);
    const cleaned = result.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    return c.json({ data: JSON.parse(cleaned) });
  } catch (e: any) {
    return c.json({ data: { prioritized: [], summary: "ไม่สามารถจัดลำดับได้" } });
  }
});

// ─── AI Chat Assistant ───
aiRoutes.post("/chat", async (c) => {
  const body = await c.req.json();
  try {
    const context = body.context ? `
บริบทของระบบ:
- โปรเจค: ${body.context.projectName || "N/A"}
- Findings: ${body.context.totalFindings || 0} (Critical: ${body.context.critical || 0}, High: ${body.context.high || 0})
- เครื่องมือ: SAST (Semgrep), SCA (OSV Scanner), DAST (Nuclei), SBOM (cdxgen)
- Top issues: ${body.context.topIssues?.join(", ") || "N/A"}
` : "";

    const history = (body.history || []).slice(-6).map((m: any) =>
      `${m.role === "user" ? "User" : "AI"}: ${m.content}`
    ).join("\n");

    const prompt = `คุณเป็น AI Security Assistant ของแพลตฟอร์ม ZCRX
ตอบเป็นภาษาไทย กระชับ ใช้ Markdown ได้
ถ้ามีโค้ดให้ใส่ code block
${context}
${history ? `ประวัติสนทนา:\n${history}\n` : ""}
คำถามล่าสุด: ${body.message}`;

    const result = await callDeepSeek(prompt, 1024);
    return c.json({ data: result });
  } catch (e: any) {
    return c.json({ data: "ขออภัย ไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" });
  }
});
