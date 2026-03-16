"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Bot, Play, CheckCircle, XCircle, Loader2, Copy, Check,
  Shield, AlertTriangle, Clock, Sparkles,
} from "lucide-react";

interface AgentTask {
  id: string;
  findingTitle: string;
  severity: string;
  filePath: string;
  code: string;
  status: string;
  steps: { id: number; name: string; status: string; detail?: string }[];
  fix?: string;
  explanation?: string;
  verified: boolean;
  approved: boolean;
  createdAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AgentPage() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [selected, setSelected] = useState<AgentTask | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Demo finding for quick test
  const [demoForm, setDemoForm] = useState({
    title: "SQL Injection in login query",
    severity: "critical",
    description: "User input is directly concatenated into SQL query without sanitization",
    filePath: "src/auth/login.ts",
    line: 42,
    code: `const query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
const result = db.execute(query);`,
    cweId: "CWE-89",
    ruleId: "sql-injection",
  });

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/agent/tasks`);
      const json = await res.json();
      setTasks(json.data || []);
      if (selected) {
        const updated = (json.data || []).find((t: AgentTask) => t.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch {}
  }, [selected]);

  useEffect(() => {
    fetchTasks();
    const iv = setInterval(fetchTasks, 2000);
    return () => clearInterval(iv);
  }, [fetchTasks]);

  async function startAgent() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/agent/remediate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoForm),
      });
      const json = await res.json();
      setTimeout(fetchTasks, 500);
    } catch {}
    setLoading(false);
  }

  async function approve(id: string) {
    await fetch(`${API}/api/agent/tasks/${id}/approve`, { method: "POST" });
    fetchTasks();
  }

  async function reject(id: string) {
    await fetch(`${API}/api/agent/tasks/${id}/reject`, { method: "POST" });
    fetchTasks();
  }

  function copyFix() {
    if (selected?.fix) {
      navigator.clipboard.writeText(selected.fix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const sevColors: Record<string, string> = {
    critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6",
  };

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>

      <div className="page-header">
        <h2>
          <Bot size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "#a855f7" }} />
          Auto Remediation Agent
        </h2>
        <p>Agentic AI — วิเคราะห์ช่องโหว่ → สร้าง fix → ตรวจสอบ → รอ approval</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: Input + Task List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* New Task Form */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
              <Sparkles size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6, color: "#a855f7" }} />
              ส่ง Finding ให้ Agent แก้
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input value={demoForm.title} onChange={e => setDemoForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Title" className="input" style={{ fontSize: 12, padding: "8px 10px" }} />
              <select value={demoForm.severity} onChange={e => setDemoForm(p => ({ ...p, severity: e.target.value }))}
                className="input" style={{ fontSize: 12, padding: "8px 10px" }}>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <input value={demoForm.filePath} onChange={e => setDemoForm(p => ({ ...p, filePath: e.target.value }))}
              placeholder="File path" className="input" style={{ fontSize: 12, padding: "8px 10px", marginBottom: 8, width: "100%" }} />
            <textarea value={demoForm.code} onChange={e => setDemoForm(p => ({ ...p, code: e.target.value }))}
              placeholder="Vulnerable code..." className="input" rows={3}
              style={{ fontSize: 11, padding: "8px 10px", marginBottom: 10, width: "100%", fontFamily: "monospace", resize: "vertical" }} />
            <button onClick={startAgent} disabled={loading} className="btn btn-primary" style={{ width: "100%", fontSize: 13 }}>
              {loading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Agent กำลังเริ่ม...</>
                : <><Play size={14} /> 🤖 เริ่ม Agent</>}
            </button>
          </div>

          {/* Task List */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>📋 Agent Tasks ({tasks.length})</h3>
            {tasks.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>ยังไม่มี task — กดปุ่มด้านบนเพื่อเริ่ม</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {tasks.map(t => (
                  <div key={t.id} onClick={() => setSelected(t)} style={{
                    padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: selected?.id === t.id ? "1px solid var(--accent)" : "1px solid var(--border-color)",
                    background: selected?.id === t.id ? "rgba(99,102,241,0.08)" : "transparent",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{t.findingTitle.slice(0, 40)}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 6, fontWeight: 700, color: "white",
                        background: t.status === "done" ? (t.approved ? "#22c55e" : "#3b82f6")
                          : t.status === "failed" ? "#ef4444" : "#a855f7",
                      }}>
                        {t.status === "done" ? (t.approved ? "APPROVED" : "READY") : t.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>{t.filePath}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Task Detail */}
        <div className="card" style={{ padding: 20, minHeight: 400 }}>
          {!selected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", fontSize: 13 }}>
              เลือก task จากรายการซ้าย
            </div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>{selected.findingTitle}</h3>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    <span style={{ color: sevColors[selected.severity], fontWeight: 700 }}>{selected.severity.toUpperCase()}</span> • {selected.filePath}
                  </div>
                </div>
                {selected.status === "done" && !selected.approved && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => approve(selected.id)} className="btn" style={{
                      background: "#22c55e", color: "white", fontSize: 11, padding: "6px 12px",
                    }}>
                      <CheckCircle size={12} /> Approve
                    </button>
                    <button onClick={() => reject(selected.id)} className="btn" style={{
                      background: "#ef4444", color: "white", fontSize: 11, padding: "6px 12px",
                    }}>
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Stepper */}
              <div style={{ marginBottom: 20 }}>
                {selected.steps.map((step, i) => (
                  <div key={step.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: step.status === "done" ? "#22c55e"
                        : step.status === "running" ? "#a855f7"
                        : step.status === "failed" ? "#ef4444" : "rgba(255,255,255,0.06)",
                      fontSize: 11, fontWeight: 700, color: step.status === "pending" ? "var(--text-muted)" : "white",
                    }}>
                      {step.status === "running" ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                        : step.status === "done" ? <Check size={12} />
                        : step.status === "failed" ? <XCircle size={12} />
                        : step.id}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600,
                        color: step.status === "running" ? "#a855f7" : step.status === "done" ? "var(--text-primary)" : "var(--text-muted)",
                      }}>
                        {step.name}
                      </div>
                      {step.detail && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{step.detail}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Explanation */}
              {selected.explanation && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#f59e0b" }}>
                    <AlertTriangle size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    การวิเคราะห์
                  </h4>
                  <div style={{
                    fontSize: 12, lineHeight: 1.6, padding: "10px 12px", borderRadius: 8,
                    background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
                    whiteSpace: "pre-wrap",
                  }}>
                    {selected.explanation}
                  </div>
                </div>
              )}

              {/* Diff Preview */}
              {selected.fix && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>
                      <Shield size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                      โค้ดที่แก้ไข (Copy ไปใช้ได้เลย)
                    </h4>
                    <button onClick={copyFix} className="btn" style={{
                      fontSize: 10, padding: "4px 10px", background: copied ? "#22c55e" : "var(--bg-secondary)",
                      color: copied ? "white" : "var(--text-secondary)",
                    }}>
                      {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy</>}
                    </button>
                  </div>
                  {/* Original code */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>❌ โค้ดเดิม (มีช่องโหว่):</div>
                    <pre style={{
                      fontSize: 11, padding: "10px 12px", borderRadius: 8, overflow: "auto",
                      background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                      fontFamily: "monospace", whiteSpace: "pre-wrap",
                    }}>
                      {selected.code}
                    </pre>
                  </div>
                  {/* Fixed code */}
                  <div>
                    <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 600, marginBottom: 4 }}>✅ โค้ดใหม่ (แก้ไขแล้ว):</div>
                    <pre style={{
                      fontSize: 11, padding: "10px 12px", borderRadius: 8, overflow: "auto",
                      background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
                      fontFamily: "monospace", whiteSpace: "pre-wrap",
                    }}>
                      {selected.fix}
                    </pre>
                  </div>
                  {/* Verification badge */}
                  <div style={{
                    marginTop: 12, padding: "8px 12px", borderRadius: 8, fontSize: 12,
                    display: "flex", alignItems: "center", gap: 6,
                    background: selected.verified ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                    border: `1px solid ${selected.verified ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                  }}>
                    {selected.verified ? (
                      <><CheckCircle size={14} color="#22c55e" /> <span style={{ color: "#22c55e", fontWeight: 600 }}>AI ตรวจสอบแล้ว — Fix ปลอดภัย</span></>
                    ) : (
                      <><AlertTriangle size={14} color="#f59e0b" /> <span style={{ color: "#f59e0b", fontWeight: 600 }}>ต้อง review เพิ่มเติม</span></>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
