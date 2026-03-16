"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  GitCompareArrows,
  Plus,
  CheckCircle2,
  Minus,
  Loader2,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";

const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

export default function ScanComparePage() {
  const searchParams = useSearchParams();
  const scanAId = searchParams.get("a");
  const scanBId = searchParams.get("b");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"new" | "fixed" | "unchanged">("new");
  const [error, setError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (scanAId && scanBId) {
      api.scans
        .compare(scanAId, scanBId)
        .then((res) => {
          setData(res.data);
          // Fetch AI insight
          setAiLoading(true);
          const { summary, scanA, scanB } = res.data;
          api.ai.summarizeDashboard({
            totalProjects: 1,
            totalFindings: scanB.findingsCount,
            openFindings: scanB.findingsCount,
            critical: scanB.critical,
            high: scanB.high,
            medium: scanB.medium,
            low: scanB.low,
            resolved: 0,
            customPrompt: `You are comparing two security scans. Baseline scan (${scanA.type.toUpperCase()}, ${scanA.startedAt}) had ${scanA.findingsCount} findings (${scanA.critical}C/${scanA.high}H/${scanA.medium}M/${scanA.low}L). Current scan (${scanB.type.toUpperCase()}, ${scanB.startedAt}) has ${scanB.findingsCount} findings (${scanB.critical}C/${scanB.high}H/${scanB.medium}M/${scanB.low}L). Changes: +${summary.newCount} new, -${summary.fixedCount} fixed, ${summary.unchangedCount} unchanged. Write a 2-3 sentence CISO-level analysis of the security trend between these scans. Is security improving or declining? What should the team prioritize?`
          })
            .then((r: any) => setAiInsight(r.summary || r.data?.summary || ""))
            .catch(() => setAiInsight("AI insight unavailable."))
            .finally(() => setAiLoading(false));
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [scanAId, scanBId]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <div className="page-header">
          <h2>Scan Comparison Error</h2>
          <p>{error || "Invalid scan IDs provided."}</p>
        </div>
        <Link href="/" className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const { scanA, scanB, newFindings, fixedFindings, unchangedFindings, summary } = data;
  const activeFindings =
    activeTab === "new" ? newFindings : activeTab === "fixed" ? fixedFindings : unchangedFindings;

  const formatDate = (d: string) => new Date(d).toLocaleString();

  return (
    <div>
      <div className="page-header">
        <h2>
          <GitCompareArrows size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
          Scan Comparison
        </h2>
        <p>Comparing findings between two scans</p>
      </div>

      {/* Scan Info Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Baseline (Before)</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{scanA.type.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(scanA.startedAt)}</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            <span style={{ color: "#ef4444", fontWeight: 600 }}>{scanA.critical}C</span>{" "}
            <span style={{ color: "#f97316", fontWeight: 600 }}>{scanA.high}H</span>{" "}
            <span style={{ color: "#eab308" }}>{scanA.medium}M</span>{" "}
            <span style={{ color: "#3b82f6" }}>{scanA.low}L</span>
          </div>
        </div>

        <div style={{ fontSize: 24, color: "var(--text-muted)" }}>→</div>

        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Current (After)</div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{scanB.type.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(scanB.startedAt)}</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            <span style={{ color: "#ef4444", fontWeight: 600 }}>{scanB.critical}C</span>{" "}
            <span style={{ color: "#f97316", fontWeight: 600 }}>{scanB.high}H</span>{" "}
            <span style={{ color: "#eab308" }}>{scanB.medium}M</span>{" "}
            <span style={{ color: "#3b82f6" }}>{scanB.low}L</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div
          className="stat-card"
          onClick={() => setActiveTab("new")}
          style={{ cursor: "pointer", outline: activeTab === "new" ? "2px solid #ef4444" : "none", outlineOffset: -2 }}
        >
          <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} color="#ef4444" /> New Findings
          </div>
          <div className="stat-value" style={{ color: "#ef4444" }}>+{summary.newCount}</div>
        </div>
        <div
          className="stat-card"
          onClick={() => setActiveTab("fixed")}
          style={{ cursor: "pointer", outline: activeTab === "fixed" ? "2px solid #22c55e" : "none", outlineOffset: -2 }}
        >
          <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={14} color="#22c55e" /> Fixed
          </div>
          <div className="stat-value" style={{ color: "#22c55e" }}>-{summary.fixedCount}</div>
        </div>
        <div
          className="stat-card"
          onClick={() => setActiveTab("unchanged")}
          style={{ cursor: "pointer", outline: activeTab === "unchanged" ? "2px solid var(--text-muted)" : "none", outlineOffset: -2 }}
        >
          <div className="stat-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Minus size={14} /> Unchanged
          </div>
          <div className="stat-value">{summary.unchangedCount}</div>
        </div>
      </div>

      {/* AI Comparison Insight */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))",
          border: "1px solid rgba(99,102,241,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Sparkles size={18} color="#a855f7" />
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, background: "linear-gradient(135deg, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            AI Comparison Insight
          </h3>
        </div>
        {aiLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            Analyzing scan differences...
          </div>
        ) : (
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>
            {aiInsight}
          </p>
        )}
      </div>

      {/* Findings List */}
      <div className="card">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          {activeTab === "new" && `🆕 New Findings (${summary.newCount})`}
          {activeTab === "fixed" && `✅ Fixed Findings (${summary.fixedCount})`}
          {activeTab === "unchanged" && `➖ Unchanged Findings (${summary.unchangedCount})`}
        </h3>

        {activeFindings.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
            {activeTab === "new" && "🎉 No new vulnerabilities introduced!"}
            {activeTab === "fixed" && "No findings were fixed between these scans."}
            {activeTab === "unchanged" && "No common findings between these scans."}
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Title</th>
                  <th>File</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {activeFindings.map((f: any, i: number) => (
                  <tr key={f.id || i}>
                    <td>
                      <span
                        className={`badge badge-${f.severity}`}
                        style={{
                          backgroundColor: SEV_COLORS[f.severity] || "#6b7280",
                          color: "white",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                        }}
                      >
                        {f.severity}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{f.title}</td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {f.filePath || "N/A"}
                      {f.line ? `:${f.line}` : ""}
                    </td>
                    <td>
                      <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: 12 }}>
                        {f.type?.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-secondary" onClick={() => window.history.back()}>
          <ArrowLeft size={14} /> Back to Project
        </button>
      </div>
    </div>
  );
}
