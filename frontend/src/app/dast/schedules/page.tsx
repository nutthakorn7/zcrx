"use client";
import { useEffect, useState } from "react";
import { Calendar, Plus, Trash2, Globe, Clock, Play, Pause, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";

const CRON_OPTIONS = [
  { value: "hourly", label: "Every Hour", desc: "Runs once per hour" },
  { value: "daily", label: "Daily", desc: "Runs once per day at midnight" },
  { value: "weekly", label: "Weekly", desc: "Runs once per week on Monday" },
];

const TEMPLATE_OPTIONS = [
  { id: "cves", label: "CVEs" },
  { id: "misconfigurations", label: "Misconfigs" },
  { id: "exposed-panels", label: "Panels" },
  { id: "default-logins", label: "Default Logins" },
  { id: "exposures", label: "Exposures" },
  { id: "technologies", label: "Tech Detect" },
];

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formProjectId, setFormProjectId] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formCron, setFormCron] = useState("daily");
  const [formTemplates, setFormTemplates] = useState<string[]>([]);
  const [formCrawl, setFormCrawl] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        api.dast.schedules.list(),
        api.projects.list(),
      ]);
      setSchedules(s.data || []);
      setProjects(p.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function createSchedule() {
    if (!formProjectId || !formUrl) return;
    try {
      await api.dast.schedules.create({
        projectId: formProjectId,
        targetUrl: formUrl,
        cron: formCron,
        templates: formTemplates,
        crawl: formCrawl,
      });
      setShowForm(false);
      setFormProjectId(""); setFormUrl(""); setFormCron("daily");
      setFormTemplates([]); setFormCrawl(false);
      loadData();
    } catch (e) { console.error(e); }
  }

  async function toggleSchedule(id: string, enabled: boolean) {
    try {
      await api.dast.schedules.update(id, { enabled: !enabled });
      loadData();
    } catch (e) { console.error(e); }
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Delete this schedule?")) return;
    try {
      await api.dast.schedules.delete(id);
      loadData();
    } catch (e) { console.error(e); }
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
    color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
  };

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>
            <Calendar size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
            Scan Scheduler
          </h2>
          <p>Schedule automated DAST scans for your projects</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ gap: 6 }}>
          <Plus size={16} /> New Schedule
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card" style={{
          marginBottom: 20,
          background: "linear-gradient(135deg, rgba(59,130,246,0.05), rgba(99,102,241,0.05))",
          border: "1px solid rgba(59,130,246,0.2)",
        }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
            <Plus size={16} style={{ display: "inline", marginRight: 6 }} /> Create Schedule
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Project */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                Project
              </label>
              <select
                value={formProjectId}
                onChange={(e) => {
                  setFormProjectId(e.target.value);
                  const proj = projects.find((p: any) => p.id === e.target.value);
                  if (proj?.repoUrl) setFormUrl(proj.repoUrl);
                }}
                style={{ ...inputStyle, cursor: "pointer" } as any}
              >
                <option value="">Select project...</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Target URL */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                Target URL
              </label>
              <input
                type="text"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://example.com"
                style={inputStyle as any}
              />
            </div>
          </div>

          {/* Frequency */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
              Frequency
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {CRON_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 4, padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                    transition: "all 0.2s", textAlign: "center",
                    background: formCron === opt.value ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${formCron === opt.value ? "var(--accent)" : "var(--border-color)"}`,
                    color: formCron === opt.value ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  <input
                    type="radio"
                    name="cron"
                    value={opt.value}
                    checked={formCron === opt.value}
                    onChange={(e) => setFormCron(e.target.value)}
                    style={{ display: "none" }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
                  <span style={{ fontSize: 10, opacity: 0.6 }}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
              Templates (empty = all)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TEMPLATE_OPTIONS.map((t) => (
                <label
                  key={t.id}
                  style={{
                    padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                    cursor: "pointer", transition: "all 0.2s",
                    background: formTemplates.includes(t.id) ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${formTemplates.includes(t.id) ? "var(--accent)" : "var(--border-color)"}`,
                    color: formTemplates.includes(t.id) ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formTemplates.includes(t.id)}
                    onChange={() => setFormTemplates(prev =>
                      prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]
                    )}
                    style={{ display: "none" }}
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Crawl toggle */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
              padding: "6px 12px", borderRadius: 8, fontSize: 12,
              background: formCrawl ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${formCrawl ? "rgba(34,197,94,0.3)" : "var(--border-color)"}`,
              color: formCrawl ? "#22c55e" : "var(--text-secondary)",
            }}>
              <input type="checkbox" checked={formCrawl} onChange={() => setFormCrawl(!formCrawl)} style={{ display: "none" }} />
              🕷️ Enable Crawl Mode
            </label>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={createSchedule} style={{ gap: 6 }}>
              <Calendar size={14} /> Create Schedule
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Schedules List */}
      {loading ? (
        <div className="card animate-pulse" style={{ height: 200 }} />
      ) : schedules.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Calendar style={{ width: 48, height: 48, opacity: 0.3 }} />
            <h3>No scheduled scans</h3>
            <p>Create a schedule to automate DAST scans</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 12, gap: 6 }}>
              <Plus size={16} /> Create First Schedule
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {schedules.map((s: any) => {
            const project = projects.find((p: any) => p.id === s.projectId);
            return (
              <div key={s.id} className="card" style={{
                padding: 16,
                borderLeft: `3px solid ${s.enabled ? "var(--accent)" : "var(--text-muted)"}`,
                opacity: s.enabled ? 1 : 0.6,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <Globe size={14} style={{ color: "var(--accent)" }} />
                      <span style={{ fontSize: 14, fontWeight: 600 }}>
                        {project?.name || s.projectId}
                      </span>
                      <span className={`badge ${s.enabled ? "info" : ""}`} style={{ fontSize: 10 }}>
                        {s.enabled ? "Active" : "Paused"}
                      </span>
                      <span className="badge" style={{ fontSize: 10, background: "rgba(99,102,241,0.15)", color: "var(--accent)" }}>
                        <Clock size={10} style={{ marginRight: 3 }} />{s.cron}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
                      🌐 {s.targetUrl}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {s.templates?.length > 0 ? s.templates.map((t: string) => (
                        <span key={t} style={{
                          fontSize: 10, padding: "2px 6px", borderRadius: 4,
                          background: "rgba(99,102,241,0.1)", color: "var(--accent)",
                        }}>
                          {t}
                        </span>
                      )) : (
                        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>All templates</span>
                      )}
                      {s.crawl && (
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                          🕷️ Crawl
                        </span>
                      )}
                    </div>
                    {s.lastRun && (
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6 }}>
                        Last run: {new Date(s.lastRun).toLocaleString()}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => toggleSchedule(s.id, s.enabled)}
                      style={{ padding: "6px 10px", fontSize: 11 }}
                      title={s.enabled ? "Pause" : "Resume"}
                    >
                      {s.enabled ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => deleteSchedule(s.id)}
                      style={{ padding: "6px 10px", fontSize: 11, color: "var(--critical)" }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
