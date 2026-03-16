"use client";
import { useEffect, useState } from "react";
import { FolderGit2, Plus, Trash2, Zap, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { calculateSecurityScore } from "@/lib/score";
import { evaluateQualityGate } from "@/lib/qualitygate";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState("");
  const [scanning, setScanning] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const res = await api.projects.list();
      setProjects(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Extract project name from URL automatically
  function extractName(url: string): string {
    try {
      const parts = url.replace(/\.git$/, "").split("/");
      return parts[parts.length - 1] || "my-project";
    } catch {
      return "my-project";
    }
  }

  // One-click: paste URL → create → auto-scan
  async function addProject() {
    if (!repoUrl.trim()) return;
    setCreating(true);
    setCreateStatus("Cloning repository...");
    try {
      const name = extractName(repoUrl);
      const res = await api.projects.create({ name, repoUrl });
      const projectId = res.data.id;

      setCreateStatus("Starting security scan...");

      // Auto-trigger Full Scan
      await Promise.all([
        api.scans.trigger({ projectId, type: "sast" }),
        api.scans.trigger({ projectId, type: "sca" }),
        api.scans.trigger({ projectId, type: "sbom" }),
      ]);

      setShowModal(false);
      setRepoUrl("");
      setCreateStatus("");

      // Navigate to project detail to watch scan progress
      router.push(`/projects/${projectId}`);
    } catch (e: any) {
      setCreateStatus("Failed — check URL and try again");
      console.error(e);
    } finally {
      setCreating(false);
    }
  }

  async function runFullScan(projectId: string) {
    setScanning((s) => ({ ...s, [projectId]: true }));
    try {
      await Promise.all([
        api.scans.trigger({ projectId, type: "sast" }),
        api.scans.trigger({ projectId, type: "sca" }),
        api.scans.trigger({ projectId, type: "sbom" }),
      ]);
      setTimeout(loadProjects, 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setScanning((s) => ({ ...s, [projectId]: false })), 3000);
    }
  }

  async function deleteProject(id: string) {
    if (!confirm("Delete this project and all its scans?")) return;
    try {
      await api.projects.delete(id);
      loadProjects();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2><FolderGit2 size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />Projects</h2>
          <p>Paste a Git URL, we handle everything else</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Add Repository
        </button>
      </div>

      {loading ? (
        <div className="stats-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse" style={{ height: 180 }} />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderGit2 style={{ width: 48, height: 48, opacity: 0.3 }} />
            <h3>No projects yet</h3>
            <p>Add your first repository to start scanning</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => setShowModal(true)}
            >
              <Plus size={18} /> Add Repository
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {projects.map((project) => {
            const sc = calculateSecurityScore({
              critical: project.critical || 0,
              high: project.high || 0,
              medium: project.medium || 0,
              low: project.low || 0,
            });
            const qg = evaluateQualityGate({
              critical: project.critical || 0,
              high: project.high || 0,
              medium: project.medium || 0,
              low: project.low || 0,
            });
            const hasScans = (project.critical || 0) + (project.high || 0) + (project.medium || 0) + (project.low || 0) > 0 || project.lastScanAt;
            return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card"
              style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between",
                padding: "16px 24px", 
                gap: 24,
                textDecoration: "none", 
                color: "inherit", 
                cursor: "pointer",
                transition: "transform 0.2s, border-color 0.2s"
              }}
            >
              {/* 1. Left: Project Info */}
              <div style={{ flex: 1, minWidth: 250 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                    {project.name}
                  </h3>
                  {project.language && (
                    <span className="badge info" style={{ fontSize: 10, padding: "2px 8px" }}>{project.language}</span>
                  )}
                </div>
                {project.repoUrl && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 8 }}>
                    {project.repoUrl}
                  </div>
                )}
                {hasScans && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(project.critical || 0) > 0 && <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>{project.critical} CRIT</span>}
                    {(project.high || 0) > 0 && <span style={{ fontSize: 11, color: "#f97316", fontWeight: 600 }}>{project.high} HIGH</span>}
                    {(project.medium || 0) > 0 && <span style={{ fontSize: 11, color: "#eab308", fontWeight: 600 }}>{project.medium} MED</span>}
                    {(project.low || 0) > 0 && <span style={{ fontSize: 11, color: "#3b82f6" }}>{project.low} LOW</span>}
                  </div>
                )}
              </div>

              {/* 2. Middle: Dimensions */}
              {hasScans && (
                <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                  {[
                    { key: "security", icon: "🛡", dim: sc.dimensions.security, label: "Security" },
                    { key: "reliability", icon: "🐛", dim: sc.dimensions.reliability, label: "Reliability" },
                    { key: "maintainability", icon: "🔧", dim: sc.dimensions.maintainability, label: "Maintainability" },
                    { key: "review", icon: "🔍", dim: sc.dimensions.review, label: "Security Review" },
                  ].map(({ key, icon, dim, label }) => (
                    <div key={key} style={{ textAlign: "center" }} title={label}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: dim.bgColor, color: dim.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 14, margin: "0 auto 4px auto",
                      }}>
                        {dim.grade}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>{icon}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Right: Score & Status */}
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0, minWidth: 300, justifyContent: "flex-end" }}>
                {hasScans ? (
                  <>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                        <span>Quality Gate:</span>
                        <span style={{ 
                          color: qg.status === "passed" ? "#22c55e" : qg.status === "warning" ? "#eab308" : "#ef4444",
                          display: "flex", alignItems: "center", gap: 4
                        }}>
                          {qg.icon} {qg.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Overall Score: {sc.score}/100
                      </div>
                    </div>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: sc.bgColor, color: sc.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 24, lineHeight: 1,
                    }}>
                      {sc.grade}
                    </div>
                  </>
                ) : (
                  <div style={{
                    padding: "8px 16px", borderRadius: 8,
                    background: "rgba(107,114,128,0.1)", color: "var(--text-muted)",
                    fontSize: 12, fontWeight: 600,
                  }}>
                    Not Scanned Yet
                  </div>
                )}
                
                {/* 4. Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); runFullScan(project.id); }}
                      disabled={scanning[project.id]}
                      style={{ padding: "6px 12px" }}
                    >
                      {scanning[project.id] ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Zap size={14} />}
                      {scanning[project.id] ? "Scanning..." : "Scan"}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteProject(project.id); }}
                      title="Delete project"
                      style={{ padding: "6px 8px" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.8 }}>
                    {project.lastScanAt ? `Scanned ${new Date(project.lastScanAt).toLocaleDateString()}` : `Created ${new Date(project.createdAt).toLocaleDateString()}`}
                  </span>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}

      {/* Simplified Modal — just paste a URL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !creating && setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
            <h3 style={{ marginBottom: 8 }}>Add Repository</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
              Paste a Git URL — we'll clone, detect, and scan automatically
            </p>

            <input
              className="input"
              placeholder="https://github.com/user/repo.git"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addProject()}
              autoFocus
              disabled={creating}
              style={{ fontSize: 16, padding: "14px 18px", textAlign: "center" }}
            />

            {createStatus && (
              <p style={{
                marginTop: 12, fontSize: 13,
                color: createStatus.includes("Failed") ? "var(--critical)" : "var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                {!createStatus.includes("Failed") && (
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                )}
                {createStatus}
              </p>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={creating}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={addProject} disabled={creating || !repoUrl.trim()}>
                {creating ? (
                  <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Working...</>
                ) : (
                  <><Zap size={16} /> Scan</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
