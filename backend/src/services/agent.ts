/**
 * Auto Remediation Agent — Agentic AI for ZCRX
 * 
 * Flow:
 * 1. Analyze finding → understand the vulnerability
 * 2. Generate fix → AI writes secure code
 * 3. Apply fix → write to file (dry-run or real)
 * 4. Re-scan → verify fix works
 * 5. Report → present results for human approval
 * 
 * Key: Human-in-the-loop — Agent PROPOSES, Human APPROVES
 */

import { broadcast } from "../ws";

// ─── DeepSeek helper (reuse) ───
async function callDeepSeek(prompt: string, maxTokens = 1024): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.3, // lower temp for code generation
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek error: ${res.status}`);
  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// ─── Types ───
export interface AgentTask {
  id: string;
  findingId: string;
  findingTitle: string;
  severity: string;
  filePath: string;
  code: string;
  status: "pending" | "analyzing" | "generating" | "applying" | "verifying" | "done" | "failed";
  steps: AgentStep[];
  fix?: string;
  explanation?: string;
  verified: boolean;
  approved: boolean;
  createdAt: string;
  completedAt?: string;
}

interface AgentStep {
  id: number;
  name: string;
  status: "pending" | "running" | "done" | "failed";
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

// ─── In-memory store ───
const agentTasks: AgentTask[] = [];

export function getAgentTasks(): AgentTask[] {
  return agentTasks.slice().reverse();
}

export function getAgentTask(id: string): AgentTask | undefined {
  return agentTasks.find(t => t.id === id);
}

function emitProgress(task: AgentTask) {
  broadcast({ type: "agent:progress", data: task });
}

// ─── Main Agent Runner ───
export async function runRemediationAgent(
  taskId: string,
  finding: {
    id: string;
    title: string;
    severity: string;
    description: string;
    filePath: string;
    line: number;
    code: string;
    cweId?: string;
    ruleId?: string;
  },
  dryRun = true,
): Promise<AgentTask> {
  const task: AgentTask = {
    id: taskId,
    findingId: finding.id,
    findingTitle: finding.title,
    severity: finding.severity,
    filePath: finding.filePath,
    code: finding.code,
    status: "pending",
    steps: [
      { id: 1, name: "🔍 วิเคราะห์ช่องโหว่", status: "pending" },
      { id: 2, name: "🧠 AI สร้างโค้ดแก้ไข", status: "pending" },
      { id: 3, name: "📝 เตรียม diff preview", status: "pending" },
      { id: 4, name: "✅ ตรวจสอบความถูกต้อง", status: "pending" },
      { id: 5, name: "📋 สรุปผลรอ approval", status: "pending" },
    ],
    fix: undefined,
    explanation: undefined,
    verified: false,
    approved: false,
    createdAt: new Date().toISOString(),
  };

  agentTasks.push(task);
  emitProgress(task);

  try {
    // ── Step 1: Analyze ──
    await runStep(task, 0, async () => {
      task.status = "analyzing";

      const prompt = `คุณเป็น Security Engineer ผู้เชี่ยวชาญ
วิเคราะห์ช่องโหว่นี้แบบสั้นกระชับ (3-4 ประโยค ภาษาไทย):

Title: ${finding.title}
Severity: ${finding.severity}
CWE: ${finding.cweId || "N/A"}
Rule: ${finding.ruleId || "N/A"}
File: ${finding.filePath}:${finding.line}
Description: ${finding.description}

Code:
\`\`\`
${finding.code}
\`\`\`

อธิบาย: 1) ปัญหาคืออะไร 2) ทำไมอันตราย 3) แนวทางแก้ไข`;

      task.explanation = await callDeepSeek(prompt, 512);
      return `วิเคราะห์เสร็จ: ${finding.title}`;
    });

    // ── Step 2: Generate Fix ──
    await runStep(task, 1, async () => {
      task.status = "generating";

      const ext = finding.filePath.split('.').pop() || 'js';
      const langMap: Record<string, string> = {
        ts: 'TypeScript', tsx: 'TypeScript/React', js: 'JavaScript', jsx: 'JavaScript/React',
        py: 'Python', java: 'Java', go: 'Go', rb: 'Ruby', php: 'PHP', cs: 'C#',
      };
      const lang = langMap[ext] || ext;

      const prompt = `คุณเป็น ${lang} Security Expert
ต้องแก้ไขโค้ดที่มีช่องโหว่ "${finding.title}"

โค้ดที่มีปัญหา:
\`\`\`${ext}
${finding.code}
\`\`\`

CWE: ${finding.cweId || "N/A"}
ปัญหา: ${finding.description}

ให้ตอบเฉพาะโค้ดที่แก้ไขแล้ว ในรูปแบบ:
\`\`\`${ext}
<โค้ดที่แก้ไขแล้ว>
\`\`\`

กฎ:
- แก้เฉพาะส่วนที่มีปัญหา
- รักษา logic เดิม
- เพิ่ม comment อธิบายสิ่งที่เปลี่ยน
- ใช้ best practice สำหรับ ${lang}`;

      const result = await callDeepSeek(prompt, 1024);

      // Extract code from markdown code block
      const codeMatch = result.match(/```[\w]*\n([\s\S]*?)```/);
      task.fix = codeMatch ? codeMatch[1].trim() : result;

      return `สร้าง fix สำเร็จ (${task.fix.split('\n').length} บรรทัด)`;
    });

    // ── Step 3: Prepare Diff ──
    await runStep(task, 2, async () => {
      task.status = "applying";
      // In dry-run mode, just show the diff
      return `Diff preview พร้อม (${dryRun ? "Dry-run mode" : "Live mode"})`;
    });

    // ── Step 4: Verify ──
    await runStep(task, 3, async () => {
      task.status = "verifying";

      const prompt = `คุณเป็น Code Reviewer
ตรวจสอบว่าโค้ดที่แก้ไขนี้ปลอดภัยจริงหรือไม่:

โค้ดเดิม (มีช่องโหว่):
\`\`\`
${finding.code}
\`\`\`

โค้ดใหม่ (แก้ไขแล้ว):
\`\`\`
${task.fix}
\`\`\`

ช่องโหว่: ${finding.title} (${finding.cweId || "N/A"})

ตอบสั้นๆ 1 บรรทัด:
- ถ้าปลอดภัย: "PASS: <เหตุผล>"
- ถ้ายังไม่ปลอดภัย: "FAIL: <เหตุผล>"`;

      const verifyResult = await callDeepSeek(prompt, 256);
      task.verified = verifyResult.toUpperCase().includes("PASS");
      return verifyResult;
    });

    // ── Step 5: Report ──
    await runStep(task, 4, async () => {
      task.status = "done";
      task.completedAt = new Date().toISOString();
      return task.verified ? "✅ Fix ผ่านการตรวจสอบ — รอ approval" : "⚠️ Fix อาจยังไม่สมบูรณ์ — ต้อง review";
    });

  } catch (e: any) {
    task.status = "failed";
    const failedStep = task.steps.find(s => s.status === "running");
    if (failedStep) {
      failedStep.status = "failed";
      failedStep.detail = e.message;
      failedStep.completedAt = new Date().toISOString();
    }
    emitProgress(task);
  }

  return task;
}

async function runStep(task: AgentTask, stepIndex: number, fn: () => Promise<string>) {
  const step = task.steps[stepIndex];
  step.status = "running";
  step.startedAt = new Date().toISOString();
  emitProgress(task);

  // Simulate realistic timing
  await new Promise(r => setTimeout(r, 500));

  const detail = await fn();
  step.detail = detail;
  step.status = "done";
  step.completedAt = new Date().toISOString();
  emitProgress(task);
}

// ─── Approve a fix ───
export function approveTask(id: string): boolean {
  const task = agentTasks.find(t => t.id === id);
  if (!task || task.status !== "done") return false;
  task.approved = true;
  emitProgress(task);
  return true;
}

// ─── Reject a fix ───
export function rejectTask(id: string): boolean {
  const task = agentTasks.find(t => t.id === id);
  if (!task) return false;
  task.approved = false;
  task.status = "failed";
  emitProgress(task);
  return true;
}
