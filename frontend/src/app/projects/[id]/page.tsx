"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Zap,
  Code,
  Copy,
  Check,
  GitCompareArrows,
  Globe,
} from "lucide-react";
import { api } from "@/lib/api";
import { calculateSecurityScore } from "@/lib/score";
import { evaluateQualityGate } from "@/lib/qualitygate";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<any>(null);
  const [scans, setScans] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showCIModal, setShowCIModal] = useState(false);
  const [activeCITab, setActiveCITab] = useState<"github" | "gitlab" | "curl">("github");
  const [copied, setCopied] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [compareScans, setCompareScans] = useState<string[]>([]);
  const findingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      const [proj, scn, fnd] = await Promise.all([
        api.projects.get(projectId),
        api.scans.list(projectId),
        api.findings.list({ projectId }),
      ]);
      setProject(proj.data);
      setScans(scn.data);
      setFindings(fnd.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function runScan(type: "sast" | "sca") {
    setScanning(true);
    try {
      await api.scans.trigger({ projectId, type });
      setTimeout(() => {
        loadData();
        setScanning(false);
      }, 3000);
    } catch (e) {
      console.error(e);
      setScanning(false);
    }
  }

  const [dastUrl, setDastUrl] = useState("");
  const [dastTemplates, setDastTemplates] = useState<string[]>([]);
  const [showDastPanel, setShowDastPanel] = useState(false);
  const [dastCrawl, setDastCrawl] = useState(false);
  const [dastAuthHeader, setDastAuthHeader] = useState("");
  const [dastAuthCookies, setDastAuthCookies] = useState("");

  const DAST_TEMPLATE_OPTIONS = [
    { id: "cves", label: "CVEs", desc: "Known vulnerabilities" },
    { id: "misconfigurations", label: "Misconfigs", desc: "Server misconfigurations" },
    { id: "exposed-panels", label: "Panels", desc: "Exposed admin panels" },
    { id: "default-logins", label: "Default Logins", desc: "Default credentials" },
    { id: "exposures", label: "Exposures", desc: "Sensitive data exposure" },
    { id: "technologies", label: "Tech Detection", desc: "Technology fingerprinting" },
  ];

  async function runDastScan() {
    setScanning(true);
    try {
      const targetUrl = dastUrl || project?.repoUrl || "";
      // Parse auth header into key-value
      const authHeaders: Record<string, string> = {};
      if (dastAuthHeader.trim()) {
        const parts = dastAuthHeader.split(":");
        if (parts.length >= 2) {
          authHeaders[parts[0].trim()] = parts.slice(1).join(":").trim();
        }
      }
      await api.scans.trigger({
        projectId,
        type: "dast",
        targetUrl: targetUrl || undefined,
        templates: dastTemplates.length > 0 ? dastTemplates : undefined,
        crawl: dastCrawl || undefined,
        authHeaders: Object.keys(authHeaders).length > 0 ? authHeaders : undefined,
        authCookies: dastAuthCookies || undefined,
      } as any);
      setShowDastPanel(false);
      setTimeout(() => {
        loadData();
        setScanning(false);
      }, 5000);
    } catch (e) {
      console.error(e);
      setScanning(false);
    }
  }

  async function runFullScan() {
    setScanning(true);
    try {
      await Promise.all([
        api.scans.trigger({ projectId, type: "sast" }),
        api.scans.trigger({ projectId, type: "sca" }),
        api.scans.trigger({ projectId, type: "sbom" }),
        api.scans.trigger({ projectId, type: "dast", targetUrl: project?.repoUrl || undefined }),
      ]);
      setTimeout(() => {
        loadData();
        setScanning(false);
      }, 5000);
    } catch (e) {
      console.error(e);
      setScanning(false);
    }
  }

  async function exportReport(format: "csv" | "pdf") {
    try {
      const token = localStorage.getItem("zcrx_token");
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/reports/${format}?projectId=${projectId}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `zcrX-findings-${project.name}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Report export failed:", e);
      alert("Failed to export report.");
    }
  }

  // Auto-poll when scans are running
  useEffect(() => {
    const hasRunning = scans.some((s: any) => s.status === "running");
    if (!hasRunning) return;
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [scans]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>Project not found</h3>
          <Link href="/projects" className="btn btn-primary" style={{ marginTop: 16 }}>
            <ArrowLeft size={16} /> Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={16} style={{ color: "var(--success)" }} />;
      case "failed": return <XCircle size={16} style={{ color: "var(--critical)" }} />;
      case "running": return <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />;
      default: return <Clock size={16} style={{ color: "var(--text-muted)" }} />;
    }
  };

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Back + Header */}
      <Link
        href="/projects"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-secondary)",
          textDecoration: "none",
          fontSize: 14,
          marginBottom: 16,
          transition: "color 0.2s",
        }}
      >
        <ArrowLeft size={16} /> Back to Projects
      </Link>

      <div
        className="page-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <div>
          <h2>{project.name}</h2>
          <p>{project.description || "No description"}</p>
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            {project.repoUrl && (
              <span style={{ fontSize: 12, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span style={{ opacity: 0.5 }}>Repo:</span> {project.repoUrl}
              </span>
            )}
            {project.language && (
              <span className="badge info" style={{ fontSize: 11 }}>{project.language}</span>
            )}
            {project.localPath && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", opacity: 0.6 }}>
                Cloned
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative" }}>
          <button
            className="btn btn-primary"
            onClick={runFullScan}
            disabled={scanning}
          >
            {scanning ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={16} />}
            {scanning ? "Scanning..." : "Full Scan"}
          </button>
          {/* Individual scan dropdown */}
          <div style={{ position: "relative" }}>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  runScan(e.target.value as "sast" | "sca");
                  e.target.value = "";
                }
              }}
              disabled={scanning}
              style={{
                background: "var(--bg-card)", color: "var(--text-secondary)",
                border: "1px solid var(--border-color)", borderRadius: 8,
                padding: "8px 12px", fontSize: 13, fontFamily: "inherit",
                cursor: "pointer", height: "100%",
              }}
            >
              <option value="">Scan individually...</option>
              <option value="sast">SAST only</option>
              <option value="sca">SCA only</option>
              <option value="sbom">SBOM only</option>
            </select>
          </div>
          {/* DAST Scan Button */}
          <button
            className="btn btn-secondary"
            onClick={() => setShowDastPanel(!showDastPanel)}
            disabled={scanning}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Globe size={16} /> DAST
          </button>
          {/* CI/CD Setup Button */}
          <button
            className="btn btn-secondary"
            onClick={() => setShowCIModal(true)}
          >
            <Code size={16} /> CI/CD Setup
          </button>
          {/* Export Dropdown */}
          <div style={{ position: "relative" }}>
            <select
              onChange={(e) => {
                const val = e.target.value as "csv" | "pdf" | "";
                if (val) {
                  exportReport(val);
                  e.target.value = "";
                }
              }}
              style={{
                background: "var(--bg-secondary)", color: "var(--text-primary)",
                border: "1px solid var(--border-color)", borderRadius: 8,
                padding: "8px 12px", fontSize: 13, fontFamily: "inherit",
                cursor: "pointer", height: "100%", fontWeight: 600
              }}
            >
              <option value="">⬇️ Export Report...</option>
              <option value="pdf">📄 Download as PDF</option>
              <option value="csv">📊 Download as CSV</option>
            </select>
          </div>
        </div>
      </div>

      {/* DAST Configuration Panel */}
      {showDastPanel && (
        <div className="card" style={{
          marginBottom: 20,
          background: "linear-gradient(135deg, rgba(59,130,246,0.05), rgba(99,102,241,0.05))",
          border: "1px solid rgba(59,130,246,0.2)",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Globe size={18} style={{ color: "var(--accent)" }} /> DAST Scan Configuration
          </h3>
          {/* Target URL */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
              Target URL
            </label>
            <input
              type="text"
              value={dastUrl}
              onChange={(e) => setDastUrl(e.target.value)}
              placeholder={project?.repoUrl || "https://example.com"}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
                color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
              }}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              Leave empty to use project repo URL: {project?.repoUrl || "(not set)"}
            </span>
          </div>
          {/* Template Selection */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
              Nuclei Templates (empty = all 6,800+ templates)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DAST_TEMPLATE_OPTIONS.map((t) => (
                <label
                  key={t.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                    cursor: "pointer", transition: "all 0.2s",
                    background: dastTemplates.includes(t.id) ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${dastTemplates.includes(t.id) ? "var(--accent)" : "var(--border-color)"}`,
                    color: dastTemplates.includes(t.id) ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={dastTemplates.includes(t.id)}
                    onChange={() => {
                      setDastTemplates((prev) =>
                        prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]
                      );
                    }}
                    style={{ display: "none" }}
                  />
                  <span>{t.label}</span>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>({t.desc})</span>
                </label>
              ))}
            </div>
          </div>
          {/* Advanced Options */}
          <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
            {/* Crawl Mode Toggle */}
            <label style={{
              display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
              padding: "8px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500,
              background: dastCrawl ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${dastCrawl ? "rgba(34,197,94,0.3)" : "var(--border-color)"}`,
              color: dastCrawl ? "#22c55e" : "var(--text-secondary)",
              transition: "all 0.2s",
            }}>
              <input type="checkbox" checked={dastCrawl} onChange={() => setDastCrawl(!dastCrawl)} style={{ display: "none" }} />
              🕷️ Crawl Mode
              <span style={{ fontSize: 10, opacity: 0.6 }}>(headless browser)</span>
            </label>
          </div>
          {/* Authentication */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                🔑 Auth Header <span style={{ fontSize: 10, opacity: 0.5 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={dastAuthHeader}
                onChange={(e) => setDastAuthHeader(e.target.value)}
                placeholder="Authorization: Bearer eyJ..."
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
                  color: "var(--text-primary)", fontSize: 12, fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                🍪 Auth Cookies <span style={{ fontSize: 10, opacity: 0.5 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={dastAuthCookies}
                onChange={(e) => setDastAuthCookies(e.target.value)}
                placeholder="session=abc123; token=xyz"
                style={{
                  width: "100%", padding: "8px 12px", borderRadius: 8,
                  border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
                  color: "var(--text-primary)", fontSize: 12, fontFamily: "inherit",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={runDastScan} disabled={scanning} style={{ gap: 6 }}>
              <Globe size={14} /> {scanning ? "Scanning..." : "Run DAST Scan"}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowDastPanel(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Severity Stats — clickable to filter findings */}
      <div className="stats-grid">
        {[
          { key: "critical", label: "Critical", count: criticalCount, color: "var(--critical)" },
          { key: "high", label: "High", count: highCount, color: "var(--high)" },
          { key: "medium", label: "Medium", count: mediumCount, color: "var(--medium)" },
          { key: "low", label: "Low", count: lowCount, color: "var(--low)" },
        ].map((sev) => (
          <div
            key={sev.key}
            className={`stat-card ${sev.key}`}
            onClick={() => {
              setSeverityFilter(severityFilter === sev.key ? null : sev.key);
              setTimeout(() => findingsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }}
            style={{
              cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.15s",
              outline: severityFilter === sev.key ? `2px solid ${sev.color}` : "none",
              outlineOffset: -2,
              transform: severityFilter === sev.key ? "scale(1.03)" : "none",
            }}
            onMouseEnter={(e) => { if (severityFilter !== sev.key) e.currentTarget.style.transform = "scale(1.02)"; }}
            onMouseLeave={(e) => { if (severityFilter !== sev.key) e.currentTarget.style.transform = "none"; }}
          >
            <div className="stat-label">{sev.label}</div>
            <div className="stat-value" style={{ color: sev.color }}>{sev.count}</div>
          </div>
        ))}
      </div>

      {/* Scan History */}

      {/* Score & Quality Gate */}
      {(() => {
        const sc = calculateSecurityScore({ critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount });
        const qg = evaluateQualityGate({ critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount });
        return (
          <div className="card" style={{ marginBottom: 24, cursor: "pointer" }} onClick={() => findingsRef.current?.scrollIntoView({ behavior: "smooth" })}>
            <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
              {/* Grade */}
              <div style={{
                width: 64, height: 64, borderRadius: 14,
                background: sc.bgColor, color: sc.color,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 28, lineHeight: 1, flexShrink: 0,
              }}>
                {sc.grade}
                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{sc.score}</span>
              </div>

              {/* Quality Gate */}
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  padding: "6px 16px", borderRadius: 8,
                  background: qg.bgColor, color: qg.color,
                  fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6,
                }}>
                  {qg.icon} Quality Gate: {qg.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {qg.passedCount}/{qg.conditions.length} conditions passed
                </div>
              </div>

              {/* 4 Dimensions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
                {[
                  { label: "Security", icon: "🛡", dim: sc.dimensions.security },
                  { label: "Reliability", icon: "🐛", dim: sc.dimensions.reliability },
                  { label: "Maintainability", icon: "🔧", dim: sc.dimensions.maintainability },
                  { label: "Review", icon: "🔍", dim: sc.dimensions.review },
                ].map(({ label, icon, dim }) => (
                  <div key={label} style={{
                    padding: "8px 12px", borderRadius: 8,
                    background: dim.bgColor, textAlign: "center", minWidth: 80,
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: dim.color }}>{dim.grade}</div>
                    <div style={{ fontSize: 10, color: dim.color, fontWeight: 600 }}>{icon} {label}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{dim.count} issues</div>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
                <div>Risk: <span style={{ color: sc.riskColor, fontWeight: 600 }}>{sc.riskLevel}</span></div>
                <div>Fix time: <strong>{sc.remediationEffort}</strong></div>
                <div>{sc.label}</div>
              </div>
            </div>

            {/* QG Conditions detail */}
            {qg.failedCount > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>Failed Conditions:</div>
                {qg.conditions.filter(c => c.status === "failed").map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#ef4444", display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                    ❌ {c.label} (actual: {String(c.actual)})
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Scan History */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Scan History</h3>
          {compareScans.length === 2 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                window.location.href = `/scans/compare?a=${compareScans[0]}&b=${compareScans[1]}`;
              }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <GitCompareArrows size={14} /> Compare Scans
            </button>
          )}
          {compareScans.length > 0 && compareScans.length < 2 && (
            <span style={{ fontSize: 12, color: "var(--accent)" }}>Select 1 more scan to compare</span>
          )}
        </div>
        {scans.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No scans yet. Run your first scan above.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>⬜</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Findings</th>
                  <th>Critical</th>
                  <th>High</th>
                  <th>Medium</th>
                  <th>Started</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id} style={{ cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={compareScans.includes(scan.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (compareScans.length < 2) {
                              setCompareScans([...compareScans, scan.id]);
                            }
                          } else {
                            setCompareScans(compareScans.filter((id) => id !== scan.id));
                          }
                        }}
                        disabled={!compareScans.includes(scan.id) && compareScans.length >= 2}
                        style={{ cursor: "pointer", width: 16, height: 16, accentColor: "var(--accent)" }}
                      />
                    </td>
                    <td style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={() => router.push(`/findings?type=${scan.type}&projectId=${projectId}`)}>
                      {statusIcon(scan.status)}
                      {scan.status}
                    </td>
                    <td><span className={`badge ${scan.type}`}>{scan.type.toUpperCase()}</span></td>
                    <td><strong>{scan.findingsCount}</strong></td>
                    <td style={{ color: scan.critical > 0 ? "var(--critical)" : "inherit", fontWeight: scan.critical > 0 ? 700 : 400 }}>{scan.critical}</td>
                    <td style={{ color: scan.high > 0 ? "var(--high)" : "inherit", fontWeight: scan.high > 0 ? 700 : 400 }}>{scan.high}</td>
                    <td style={{ color: scan.medium > 0 ? "var(--medium)" : "inherit" }}>{scan.medium}</td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{new Date(scan.startedAt).toLocaleString()}</td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{scan.completedAt ? new Date(scan.completedAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="card" ref={findingsRef}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
          <ShieldAlert size={18} style={{ verticalAlign: "middle", marginRight: 8 }} />
          Findings ({severityFilter ? findings.filter(f => f.severity === severityFilter).length : findings.length}){severityFilter && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8, color: "var(--text-muted)" }}>filtered: {severityFilter}</span>}
        </h3>
        {severityFilter && (
          <button className="btn btn-secondary btn-sm" onClick={() => setSeverityFilter(null)} style={{ fontSize: 11 }}>✕ Clear filter</button>
        )}
        </div>
        {findings.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No findings. Run a scan to discover vulnerabilities.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {(severityFilter ? findings.filter(f => f.severity === severityFilter) : findings).map((f) => (
              <div
                key={f.id}
                style={{
                  borderRadius: 8,
                  border: "1px solid var(--border-color)",
                  overflow: "hidden",
                  transition: "border-color 0.2s",
                  borderColor: expandedFindingId === f.id ? "var(--accent)" : "var(--border-color)",
                }}
              >
                {/* Row header — clickable */}
                <div
                  onClick={() => setExpandedFindingId(expandedFindingId === f.id ? null : f.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    cursor: "pointer", transition: "background 0.15s",
                    background: expandedFindingId === f.id ? "rgba(99,102,241,0.05)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (expandedFindingId !== f.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={(e) => { if (expandedFindingId !== f.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{
                    transform: expandedFindingId === f.id ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s", color: "var(--text-muted)", fontSize: 12,
                  }}>▶</span>
                  <span className={`badge ${f.severity}`}>{f.severity}</span>
                  <span className={`badge ${f.type}`}>{f.type.toUpperCase()}</span>
                  <span style={{ fontWeight: 500, fontSize: 13, flex: 1 }}>{f.title}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
                    {f.filePath}{f.line ? `:${f.line}` : ""}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      value={f.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        try {
                          await api.findings.updateStatus(f.id, newStatus);
                          setFindings((prev) =>
                            prev.map((item) =>
                              item.id === f.id ? { ...item, status: newStatus } : item
                            )
                          );
                        } catch (err) { console.error(err); }
                      }}
                      style={{
                        appearance: "none", WebkitAppearance: "none", cursor: "pointer",
                        padding: "3px 22px 3px 8px", borderRadius: 12, border: "none",
                        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                        letterSpacing: "0.5px", outline: "none",
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23ffffff60'/%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat", backgroundPosition: "right 5px center",
                        backgroundColor:
                          f.status === "fixed" ? "rgba(34,197,94,0.15)" :
                          f.status === "false_positive" || f.status === "ignored" ? "rgba(107,114,128,0.15)" :
                          "rgba(249,115,22,0.15)",
                        color:
                          f.status === "fixed" ? "#22c55e" :
                          f.status === "false_positive" || f.status === "ignored" ? "#9ca3af" :
                          "#f97316",
                      }}
                    >
                      <option value="open">🟠 Open</option>
                      <option value="fixed">✅ Fixed</option>
                      <option value="false_positive">⚪ False Positive</option>
                      <option value="ignored">🔇 Ignored</option>
                    </select>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {expandedFindingId === f.id && (
                  <div style={{
                    padding: "12px 14px 14px 38px",
                    borderTop: "1px solid var(--border-color)",
                    background: "rgba(0,0,0,0.15)",
                    fontSize: 13,
                  }}>
                    {f.description && (
                      <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
                        {f.description}
                      </p>
                    )}
                    {f.code && (
                      <pre style={{
                        background: "var(--bg-primary)", padding: 12, borderRadius: 6,
                        fontSize: 12, overflow: "auto", marginBottom: 10,
                        border: "1px solid var(--border-color)", color: "#e5e7eb",
                      }}>{f.code}</pre>
                    )}
                    {f.recommendation && (
                      <div style={{
                        background: "var(--accent-bg)", padding: 10, borderRadius: 6,
                        fontSize: 12, color: "var(--accent-hover)", marginBottom: 10,
                      }}>
                        💡 <strong>Recommendation:</strong> {f.recommendation}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
                      {f.ruleId && <span>Rule: {f.ruleId}</span>}
                      {f.cweId && <span className="badge info" style={{ fontSize: 10 }}>{f.cweId}</span>}
                      {f.filePath && <span>📁 {f.filePath}{f.line ? `:${f.line}` : ""}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CI/CD Integration Generator Modal */}
      {showCIModal && (
        <div className="modal" onClick={() => setShowCIModal(false)}>
          <div className="modal-content" style={{ width: 650, maxWidth: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Code size={20} style={{ color: "var(--accent)" }} /> Integrate zcrX to CI/CD
              </h3>
              <button 
                onClick={() => setShowCIModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 24, lineHeight: 1 }}
              >
                &times;
              </button>
            </div>
            
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
              Automate security scanning directly in your build pipelines. Copy the generated code below. The <strong>Project ID</strong> has been pre-configured for you.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16, borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
              {["github", "gitlab", "curl"].map((tab) => (
                <button
                  key={tab}
                  className={`btn ${activeCITab === tab ? "btn-primary" : "btn-secondary"} btn-sm`}
                  onClick={() => setActiveCITab(tab as any)}
                  style={{ textTransform: "capitalize", padding: "4px 12px" }}
                >
                  {tab === "github" ? "GitHub Actions" : tab === "gitlab" ? "GitLab CI" : "cURL / Jenkins"}
                </button>
              ))}
            </div>

            <div style={{ position: "relative", background: "#0f172a", padding: 16, borderRadius: 8, border: "1px solid var(--border-color)", marginBottom: 16 }}>
              <button
                className="btn btn-secondary btn-sm"
                style={{ position: "absolute", top: 8, right: 8, padding: "4px 8px", background: "rgba(255,255,255,0.1)", border: "none", color: "white" }}
                onClick={() => {
                  let text = "";
                  if (activeCITab === "github") {
                    text = `name: zcrX Security Scan\n\non: [push, pull_request]\n\njobs:\n  security-scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Trigger zcrX SAST Scan\n        run: |\n          curl -X POST http://YOUR_ZCRX_HOST/api/scans \\\n            -H "Content-Type: application/json" \\\n            -H "Authorization: Bearer \${{ secrets.ZCRX_TOKEN }}" \\\n            -d '{"projectId": "${projectId}", "type": "sast"}'`;
                  } else if (activeCITab === "gitlab") {
                    text = `zcrx_security_scan:\n  stage: test\n  image: curlimages/curl:latest\n  script:\n    - echo "Running zcrX SAST Scanner"\n    - curl -X POST http://YOUR_ZCRX_HOST/api/scans -H "Content-Type: application/json" -H "Authorization: Bearer $ZCRX_TOKEN" -d '{"projectId": "${projectId}", "type": "sast"}'`;
                  } else {
                    text = `curl -X POST http://YOUR_ZCRX_HOST/api/scans \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer $ZCRX_TOKEN" \\\n  -d '{"projectId": "${projectId}", "type": "sast"}'`;
                  }
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check size={14} style={{ color: "#4ade80" }} /> : <Copy size={14} />}
                <span style={{ marginLeft: 6 }}>{copied ? "Copied" : "Copy"}</span>
              </button>
              <pre style={{ margin: 0, fontSize: 13, color: "#e2e8f0", overflowX: "auto", whiteSpace: "pre-wrap", paddingTop: 8 }}>
                {activeCITab === "github" && (
`name: zcrX Security Scan

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Trigger zcrX SAST Scan
        run: |
          curl -X POST http://YOUR_ZCRX_HOST/api/scans \\
            -H "Content-Type: application/json" \\
            -H "Authorization: Bearer \${{ secrets.ZCRX_TOKEN }}" \\
            -d '{"projectId": "${projectId}", "type": "sast"}'`
                )}
                {activeCITab === "gitlab" && (
`zcrx_security_scan:
  stage: test
  image: curlimages/curl:latest
  script:
    - echo "Running zcrX SAST Scanner"
    - curl -X POST http://YOUR_ZCRX_HOST/api/scans -H "Content-Type: application/json" -H "Authorization: Bearer $ZCRX_TOKEN" -d '{"projectId": "${projectId}", "type": "sast"}'`
                )}
                {activeCITab === "curl" && (
`curl -X POST http://YOUR_ZCRX_HOST/api/scans \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $ZCRX_TOKEN" \\
  -d '{"projectId": "${projectId}", "type": "sast"}'`
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
