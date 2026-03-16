"use client";
import { useState } from "react";
import { Sparkles, Globe, Loader2, CheckCircle2, AlertTriangle, Shield, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { mapToOwasp, OWASP_TOP_10 } from "@/lib/owasp";
import Link from "next/link";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#6b7280",
};

const STEPS = [
  { id: 1, label: "Analyzing target" },
  { id: 2, label: "AI selecting templates" },
  { id: 3, label: "Running scan" },
  { id: 4, label: "AI summarizing" },
  { id: 5, label: "Complete" },
];

export default function AutoScanPage() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepMessages, setStepMessages] = useState<Record<number, string>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function startAutoScan() {
    if (!url.trim()) return;
    setScanning(true);
    setResult(null);
    setError("");
    setCurrentStep(1);
    setStepMessages({ 1: "🔍 Connecting to target..." });

    try {
      // Connect to WebSocket for progress
      const wsUrl = `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace("http", "ws")}/ws`;
      let ws: WebSocket | null = null;
      try {
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "auto-scan:progress") {
              const { step, message } = msg.data;
              setCurrentStep(step);
              setStepMessages(prev => ({ ...prev, [step]: message }));
            }
          } catch {}
        };
      } catch {}

      // Also trigger SAST/SCA/SBOM for projects
      // Call auto-scan API
      const fetchUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/dast/auto-scan`;
      const token = localStorage.getItem("zcrx_token");
      const response = await fetch(fetchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.data);
        setCurrentStep(5);
      }

      // Close WebSocket
      try { ws?.close(); } catch {}
    } catch (e: any) {
      setError(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  const bySeverity = result?.findings?.reduce((acc: any, f: any) => {
    acc[f.severity] = (acc[f.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.2); } 50% { box-shadow: 0 0 40px rgba(99,102,241,0.4); } }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32, paddingTop: 20 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 64, height: 64, borderRadius: 16, marginBottom: 16,
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          boxShadow: "0 8px 32px rgba(99,102,241,0.3)",
        }}>
          <Sparkles size={32} color="white" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
          AI Auto Scanner
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          ใส่ URL แล้ว AI จะทำทุกอย่างให้อัตโนมัติ — วิเคราะห์เป้าหมาย, เลือก templates, scan, สรุปผล
        </p>
      </div>

      {/* URL Input — Big and Simple */}
      <div className="card" style={{
        padding: 24, marginBottom: 24,
        background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))",
        border: "1px solid rgba(99,102,241,0.2)",
        animation: !scanning && !result ? "pulse-glow 3s ease-in-out infinite" : "none",
      }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Globe size={18} style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-muted)", opacity: 0.5,
            }} />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !scanning && startAutoScan()}
              placeholder="example.com"
              disabled={scanning}
              style={{
                width: "100%", padding: "14px 14px 14px 42px", borderRadius: 12,
                border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
                color: "var(--text-primary)", fontSize: 15, fontFamily: "inherit",
                fontWeight: 500,
              }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={startAutoScan}
            disabled={scanning || !url.trim()}
            style={{
              gap: 8, padding: "14px 28px", fontSize: 15, fontWeight: 700,
              background: scanning ? undefined : "linear-gradient(135deg, #6366f1, #a855f7)",
              borderRadius: 12, minWidth: 160,
            }}
          >
            {scanning ? (
              <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Scanning...</>
            ) : (
              <><Sparkles size={18} /> Scan</>
            )}
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      {(scanning || result) && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const isDone = currentStep > step.id;
              const isPending = currentStep < step.id;
              return (
                <div key={step.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  opacity: isPending ? 0.3 : 1, transition: "all 0.3s",
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    background: isDone ? "rgba(34,197,94,0.15)" : isActive ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.05)",
                    border: `2px solid ${isDone ? "#22c55e" : isActive ? "#6366f1" : "var(--border-color)"}`,
                  }}>
                    {isDone ? (
                      <CheckCircle2 size={14} color="#22c55e" />
                    ) : isActive ? (
                      <Loader2 size={14} color="#6366f1" style={{ animation: scanning ? "spin 1s linear infinite" : "none" }} />
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>{step.id}</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: isDone ? "#22c55e" : isActive ? "var(--accent)" : "var(--text-muted)" }}>
                      {step.label}
                    </div>
                    {stepMessages[step.id] && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {stepMessages[step.id]}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ padding: 16, borderLeft: "3px solid var(--critical)", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--critical)" }}>
            <AlertTriangle size={16} /> {error}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary Card */}
          <div className="card" style={{
            padding: 20, marginBottom: 20,
            background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(59,130,246,0.06))",
            border: "1px solid rgba(34,197,94,0.2)",
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Shield size={18} style={{ color: "#22c55e" }} />
              Scan Result — {result.findingsCount} findings
            </h3>

            {/* Severity bars */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {["critical", "high", "medium", "low", "info"].map(sev => (
                <div key={sev} style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: `${SEVERITY_COLORS[sev]}15`, color: SEVERITY_COLORS[sev],
                  border: `1px solid ${SEVERITY_COLORS[sev]}30`,
                }}>
                  {sev}: {bySeverity[sev] || 0}
                </div>
              ))}
            </div>

            {/* AI tags used */}
            {result.tags && (
              <div style={{ marginBottom: 14, fontSize: 12, color: "var(--text-muted)" }}>
                🏷️ AI selected: {result.tags.join(", ")}
              </div>
            )}

            {/* AI Summary */}
            {result.summary && (
              <div style={{
                padding: 14, borderRadius: 8, fontSize: 13, lineHeight: 1.7,
                background: "rgba(0,0,0,0.2)", whiteSpace: "pre-wrap",
                color: "var(--text-secondary)",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", marginBottom: 6 }}>
                  🤖 AI Analysis
                </div>
                {result.summary}
              </div>
            )}
          </div>

          {/* Findings list */}
          {result.findings?.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Findings</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {result.findings.slice(0, 30).map((f: any, i: number) => (
                  <div key={i} style={{
                    padding: 10, borderRadius: 6,
                    background: "rgba(255,255,255,0.02)", borderLeft: `3px solid ${SEVERITY_COLORS[f.severity] || "#6b7280"}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                        background: `${SEVERITY_COLORS[f.severity]}20`, color: SEVERITY_COLORS[f.severity],
                        textTransform: "uppercase",
                      }}>
                        {f.severity}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{f.title}</span>
                      {(() => {
                        const owasp = mapToOwasp(f);
                        return owasp ? (
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${owasp.color}15`, color: owasp.color, fontWeight: 600 }}>
                            {owasp.icon} {owasp.id}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {f.description?.slice(0, 150)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary" onClick={() => { setResult(null); setUrl(""); setCurrentStep(0); setStepMessages({}); }} style={{ gap: 6 }}>
              <Zap size={14} /> Scan Another
            </button>
            <Link href="/dast" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              View Full Report →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
