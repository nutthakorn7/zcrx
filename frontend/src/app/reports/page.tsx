"use client";
import { useEffect, useState } from "react";
import { FileText, Download, ShieldAlert, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";
import { evaluateQualityGate } from "@/lib/qualitygate";

export default function ReportsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await api.projects.list();
      const data = res.data || [];
      setProjects(data);

      // Generate AI summary for reports overview
      if (data.length > 0) {
        const totals = data.reduce(
          (acc: any, p: any) => ({
            critical: acc.critical + (p.critical || 0),
            high: acc.high + (p.high || 0),
            medium: acc.medium + (p.medium || 0),
            low: acc.low + (p.low || 0),
          }),
          { critical: 0, high: 0, medium: 0, low: 0 }
        );
        const totalFindings = totals.critical + totals.high + totals.medium + totals.low;

        setAiLoading(true);
        api.ai
          .summarizeDashboard({
            totalProjects: data.length,
            totalFindings,
            ...totals,
          })
          .then((res) => setAiSummary(res.summary))
          .catch(() =>
            setAiSummary(
              `Security overview across ${data.length} projects: ${totals.critical} critical, ${totals.high} high, ${totals.medium} medium, and ${totals.low} low-severity findings detected. ${
                totals.critical > 0
                  ? "Immediate action is required to remediate critical vulnerabilities."
                  : "No critical issues found — continue regular scanning."
              }`
            )
          )
          .finally(() => setAiLoading(false));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const exportReport = async (projectId: string, projectName: string, format: "csv" | "pdf") => {
    try {
      const token = localStorage.getItem("zcrx_token");
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/export/${format === "pdf" ? "pdf" : "findings"}?projectId=${projectId}`;

      if (format === "pdf") {
        // Open PDF report in new tab for printing
        window.open(url, "_blank");
        return;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `zcrX-report-${projectName}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Report export failed:", e);
      alert("Failed to export report.");
    }
  };

  // Totals for the summary bar
  const totals = projects.reduce(
    (acc, p) => ({
      critical: acc.critical + (p.critical || 0),
      high: acc.high + (p.high || 0),
      medium: acc.medium + (p.medium || 0),
      low: acc.low + (p.low || 0),
    }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>
            <FileText size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
            Reports
          </h2>
          <p>Generate and download security reports for your projects</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--accent)" }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ShieldAlert style={{ width: 48, height: 48, opacity: 0.3 }} />
            <h3>No scan data available</h3>
            <p>Add projects and run scans to generate reports.</p>
            <Link href="/projects" className="btn btn-primary" style={{ marginTop: 16 }}>
              Go to Projects
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* AI Executive Summary */}
          {(aiSummary || aiLoading) && (
            <div
              className="card"
              style={{
                marginBottom: 24,
                background: "linear-gradient(135deg, rgba(99,102,241,0.05), rgba(168,85,247,0.05))",
                border: "1px solid rgba(168,85,247,0.2)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s infinite linear",
                }}
              />
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--accent)" }}>
                <Sparkles size={18} /> AI Report Summary
              </h3>
              {aiLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14 }}>
                  <span
                    style={{
                      display: "inline-block", width: 14, height: 14,
                      border: "2px solid var(--accent)", borderTopColor: "transparent",
                      borderRadius: "50%", animation: "spin 1s linear infinite",
                    }}
                  />
                  AI is analyzing your security reports...
                </div>
              ) : (
                <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-secondary)", margin: 0 }}>{aiSummary}</p>
              )}
            </div>
          )}

          {/* Severity Summary Bar */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: "Critical", count: totals.critical, color: "var(--critical)" },
              { label: "High", count: totals.high, color: "var(--high)" },
              { label: "Medium", count: totals.medium, color: "var(--medium)" },
              { label: "Low", count: totals.low, color: "var(--low)" },
            ].map((sev) => (
              <div key={sev.label} className={`stat-card ${sev.label.toLowerCase()}`}>
                <div className="stat-label">{sev.label}</div>
                <div className="stat-value" style={{ color: sev.color }}>{sev.count}</div>
              </div>
            ))}
          </div>

          {/* Projects Table */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
              Project Reports ({projects.length})
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Critical</th>
                    <th>High</th>
                    <th>Quality Gate</th>
                    <th>Last Scanned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const hasScans =
                      (project.critical || 0) + (project.high || 0) + (project.medium || 0) + (project.low || 0) > 0 ||
                      project.lastScanAt;
                    const qg = evaluateQualityGate({
                      critical: project.critical || 0,
                      high: project.high || 0,
                      medium: project.medium || 0,
                      low: project.low || 0,
                    });

                    return (
                      <tr key={project.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{project.name}</div>
                          {project.repoUrl && (
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{project.repoUrl}</div>
                          )}
                        </td>
                        <td
                          style={{
                            color: (project.critical || 0) > 0 ? "#ef4444" : "var(--text-muted)",
                            fontWeight: (project.critical || 0) > 0 ? 700 : 400,
                            fontSize: 15,
                          }}
                        >
                          {project.critical || 0}
                        </td>
                        <td
                          style={{
                            color: (project.high || 0) > 0 ? "#f97316" : "var(--text-muted)",
                            fontWeight: (project.high || 0) > 0 ? 700 : 400,
                            fontSize: 15,
                          }}
                        >
                          {project.high || 0}
                        </td>
                        <td>
                          {hasScans ? (
                            <span
                              style={{
                                color: qg.status === "passed" ? "#22c55e" : qg.status === "warning" ? "#eab308" : "#ef4444",
                                display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 500,
                              }}
                            >
                              {qg.icon} {qg.label}
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No scan data</span>
                          )}
                        </td>
                        <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                          {project.lastScanAt ? new Date(project.lastScanAt).toLocaleString() : "—"}
                        </td>
                        <td>
                          {hasScans ? (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => exportReport(project.id, project.name, "pdf")}
                                title="Download PDF format"
                              >
                                <Download size={14} /> PDF
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => exportReport(project.id, project.name, "csv")}
                                title="Download CSV format"
                              >
                                <Download size={14} /> CSV
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Data pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
