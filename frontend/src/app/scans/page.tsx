"use client";
import { useEffect, useState } from "react";
import {
  ScanSearch,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Filter,
  Download,
} from "lucide-react";
import { api } from "@/lib/api";
import { DEMO_PROJECTS, DEMO_SCANS } from "@/lib/demo-data";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ScansPage() {
  const router = useRouter();
  const [scans, setScans] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    Promise.all([api.scans.list(), api.projects.list()])
      .then(([s, p]) => {
        const realProjects = p.data || [];
        setProjects(realProjects.length > 0 ? realProjects : DEMO_PROJECTS);
        if (s.data && s.data.length > 0) {
          setScans(s.data);
        } else {
          setScans(DEMO_SCANS as any);
          setIsDemo(true);
        }
      })
      .catch(() => {
        setScans(DEMO_SCANS as any);
        setProjects(DEMO_PROJECTS);
        setIsDemo(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const filtered = scans
    .filter((s) => !filterProject || s.projectId === filterProject)
    .filter((s) => !filterType || s.type === filterType)
    .filter((s) => !filterStatus || s.status === filterStatus)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={14} style={{ color: "var(--success)" }} />;
      case "failed": return <XCircle size={14} style={{ color: "var(--critical)" }} />;
      case "running": return <Loader2 size={14} style={{ color: "var(--accent)", animation: "spin 1s linear infinite" }} />;
      default: return <Clock size={14} style={{ color: "var(--text-muted)" }} />;
    }
  };

  const duration = (scan: any) => {
    if (!scan.completedAt) return "—";
    const ms = new Date(scan.completedAt).getTime() - new Date(scan.startedAt).getTime();
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h2>Scans</h2><p>Loading...</p></div>
        <div className="card animate-pulse" style={{ height: 300 }} />
      </div>
    );
  }

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>
            <ScanSearch size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
            Scans
          </h2>
          <p>{scans.length} scans across {projects.length} projects</p>
        </div>
        <a
          href="http://localhost:8000/api/export/scans"
          target="_blank"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--border-color)",
            background: "rgba(255,255,255,0.03)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 600,
            textDecoration: "none",
            cursor: "pointer",
          }}
        >
          <Download size={14} /> Export CSV
        </a>
      </div>

      {isDemo && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: "rgba(99,102,241,0.1)", color: "var(--accent)",
        }}>
          Showing demo data — run scans on your projects to see real results
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 24, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Filter size={16} style={{ color: "var(--text-muted)" }} />
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          style={{
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: 8, padding: "8px 12px", fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: 8, padding: "8px 12px", fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="">All Types</option>
          <option value="sast">SAST</option>
          <option value="sca">SCA</option>
          <option value="sbom">SBOM</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: 8, padding: "8px 12px", fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="failed">Failed</option>
        </select>

        {(filterProject || filterType || filterStatus) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setFilterProject(""); setFilterType(""); setFilterStatus(""); }}
            style={{ fontSize: 12 }}
          >
            Clear Filters
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)" }}>
          Showing {filtered.length} of {scans.length}
        </span>
      </div>

      {/* Scans Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <ScanSearch style={{ width: 48, height: 48, opacity: 0.3 }} />
            <h3>No scans found</h3>
            <p>{scans.length === 0 ? "Run your first scan from the Projects page" : "Try adjusting your filters"}</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Findings</th>
                  <th>Critical</th>
                  <th>High</th>
                  <th>Medium</th>
                  <th>Low</th>
                  <th>Duration</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((scan) => (
                  <tr key={scan.id} onClick={() => router.push(`/projects/${scan.projectId}`)} style={{ cursor: "pointer" }}>
                    <td>
                      <span
                        className={`badge ${scan.status === "completed" ? "fixed" : scan.status === "failed" ? "critical" : "open"}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <StatusIcon status={scan.status} />
                        {scan.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/projects/${scan.projectId}`}
                        style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                      >
                        {projectMap[scan.projectId] || scan.projectId}
                      </Link>
                    </td>
                    <td><span className={`badge ${scan.type}`}>{scan.type.toUpperCase()}</span></td>
                    <td style={{ fontWeight: 600 }}>{scan.findingsCount}</td>
                    <td style={{ color: scan.critical > 0 ? "var(--critical)" : "inherit", fontWeight: scan.critical > 0 ? 700 : 400 }}>
                      {scan.critical}
                    </td>
                    <td style={{ color: scan.high > 0 ? "var(--high)" : "inherit", fontWeight: scan.high > 0 ? 700 : 400 }}>
                      {scan.high}
                    </td>
                    <td style={{ color: scan.medium > 0 ? "var(--medium)" : "inherit" }}>{scan.medium}</td>
                    <td>{scan.low}</td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{duration(scan)}</td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {new Date(scan.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
