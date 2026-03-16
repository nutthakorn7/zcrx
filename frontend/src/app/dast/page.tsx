"use client";
import { useEffect, useState } from "react";
import {
  Globe, ExternalLink, Clock, Calendar, TrendingUp, Plus, Trash2,
  Play, Pause, Sparkles, Save, FileCode, Loader2, Copy, Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { mapToOwasp } from "@/lib/owasp";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6", info: "#6b7280",
};

const CRON_OPTIONS = [
  { value: "hourly", label: "Every Hour", desc: "Runs once per hour" },
  { value: "daily", label: "Daily", desc: "Runs once per day" },
  { value: "weekly", label: "Weekly", desc: "Runs once per week" },
];

const TMPL_OPTS = [
  { id: "cves", label: "CVEs" }, { id: "misconfigurations", label: "Misconfigs" },
  { id: "exposed-panels", label: "Panels" }, { id: "default-logins", label: "Default Logins" },
  { id: "exposures", label: "Exposures" }, { id: "technologies", label: "Tech Detect" },
];

const AI_PROMPTS = [
  "Check for exposed .env files", "Detect open directory listing",
  "Find exposed phpinfo page", "Check for default admin credentials",
  "Detect WordPress version disclosure", "Check for missing security headers",
];

type Tab = "report" | "schedules" | "templates";

export default function DastHubPage() {
  const [tab, setTab] = useState<Tab>("report");

  // ── Report state ──
  const [findings, setFindings] = useState<any[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSev, setFilterSev] = useState("");

  // ── Schedules state ──
  const [schedules, setSchedules] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [showSchedForm, setShowSchedForm] = useState(false);
  const [schedLoading, setSchedLoading] = useState(true);
  const [fProjectId, setFProjectId] = useState("");
  const [fUrl, setFUrl] = useState("");
  const [fCron, setFCron] = useState("daily");
  const [fTmpls, setFTmpls] = useState<string[]>([]);
  const [fCrawl, setFCrawl] = useState(false);

  // ── Templates state ──
  const [templates, setTemplates] = useState<any[]>([]);
  const [tmplLoading, setTmplLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tmplName, setTmplName] = useState("");
  const [tmplContent, setTmplContent] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  useEffect(() => { loadReport(); loadSchedules(); loadTemplates(); }, []);

  async function loadReport() {
    setLoading(true);
    try {
      const [f, s, t] = await Promise.all([
        api.findings.list({ type: "dast" }), api.scans.list(), api.dast.trends(),
      ]);
      setFindings(f.data || []);
      setScans((s.data || []).filter((sc: any) => sc.type === "dast"));
      setTrends(t.data || []);
    } catch {} finally { setLoading(false); }
  }

  async function loadSchedules() {
    setSchedLoading(true);
    try {
      const [s, p] = await Promise.all([api.dast.schedules.list(), api.projects.list()]);
      setSchedules(s.data || []);
      setProjects(p.data || []);
    } catch {} finally { setSchedLoading(false); }
  }

  async function loadTemplates() {
    setTmplLoading(true);
    try {
      const res = await api.dast.templates.list();
      setTemplates(res.data || []);
    } catch {} finally { setTmplLoading(false); }
  }

  async function createSchedule() {
    if (!fProjectId || !fUrl) return;
    await api.dast.schedules.create({ projectId: fProjectId, targetUrl: fUrl, cron: fCron, templates: fTmpls, crawl: fCrawl });
    setShowSchedForm(false); setFProjectId(""); setFUrl(""); setFCron("daily"); setFTmpls([]); setFCrawl(false);
    loadSchedules();
  }

  async function toggleSched(id: string, enabled: boolean) { await api.dast.schedules.update(id, { enabled: !enabled }); loadSchedules(); }
  async function deleteSched(id: string) { if (confirm("Delete?")) { await api.dast.schedules.delete(id); loadSchedules(); } }

  async function generateAI() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try { const r = await api.dast.templates.generate(aiPrompt); if (r.data) { setTmplContent(r.data.content); setTmplName(r.data.name); } } catch {}
    finally { setGenerating(false); }
  }

  async function saveTmpl() {
    if (!tmplName.trim() || !tmplContent.trim()) return;
    setSaving(true);
    try { await api.dast.templates.create({ name: tmplName, content: tmplContent }); setTmplName(""); setTmplContent(""); loadTemplates(); } catch {}
    finally { setSaving(false); }
  }

  async function deleteTmpl(id: string) { if (confirm("Delete?")) { await api.dast.templates.delete(id); loadTemplates(); } }

  function copyClip(text: string) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  const filtered = findings.filter(f => !filterSev || f.severity === filterSev);
  const bySev = { critical: findings.filter(f => f.severity === "critical").length, high: findings.filter(f => f.severity === "high").length, medium: findings.filter(f => f.severity === "medium").length, low: findings.filter(f => f.severity === "low").length, info: findings.filter(f => f.severity === "info").length };

  const inputStyle: any = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
    color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
  };

  const TABS: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "report", label: "Report", icon: Globe, count: findings.length },
    { id: "schedules", label: "Schedules", icon: Calendar, count: schedules.length },
    { id: "templates", label: "Templates", icon: FileCode, count: templates.length },
  ];

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {/* Header */}
      <div className="page-header">
        <h2>
          <Globe size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
          DAST Hub
        </h2>
        <p>Dynamic Application Security Testing — Report, Schedules & Templates</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 10 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit",
                background: active ? "var(--accent)" : "transparent",
                color: active ? "white" : "var(--text-secondary)",
              }}
            >
              <Icon size={15} />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 8, background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)" }}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════ TAB: REPORT ═══════ */}
      {tab === "report" && (
        <>
          {/* Trend Chart */}
          {trends.length > 0 && (
            <div className="card" style={{ marginBottom: 20, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <TrendingUp size={16} style={{ color: "var(--accent)" }} /> Findings Trend
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trends}>
                  <defs>
                    {Object.entries(SEV_COLORS).map(([k, c]) => (
                      <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c} stopOpacity={0.3}/><stop offset="95%" stopColor={c} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} tickFormatter={v => v.slice(5)} />
                  <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.5)" }} />
                  <Tooltip contentStyle={{ background: "rgba(15,15,25,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  {["critical", "high", "medium", "low"].map(k => (
                    <Area key={k} type="monotone" dataKey={k} stroke={SEV_COLORS[k]} fill={`url(#g${k})`} strokeWidth={k === "critical" || k === "high" ? 2 : 1.5} name={k.charAt(0).toUpperCase() + k.slice(1)} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Severity Stats */}
          <div className="stats-grid" style={{ marginBottom: 20 }}>
            {Object.entries(bySev).map(([sev, count]) => (
              <div key={sev} className={`stat-card ${sev}`} onClick={() => setFilterSev(filterSev === sev ? "" : sev)} style={{ cursor: "pointer", opacity: filterSev && filterSev !== sev ? 0.4 : 1 }}>
                <div className="stat-value" style={{ color: SEV_COLORS[sev] }}>{count}</div>
                <div className="stat-label">{sev.charAt(0).toUpperCase() + sev.slice(1)}</div>
              </div>
            ))}
          </div>

          {/* Findings */}
          {loading ? <div className="card animate-pulse" style={{ height: 200 }} /> : filtered.length === 0 ? (
            <div className="card"><div className="empty-state"><Globe style={{ width: 48, height: 48, opacity: 0.3 }} /><h3>No DAST findings</h3><p>Run a DAST scan to see results</p></div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(f => (
                <div key={f.id} className="card" style={{ padding: 14, borderLeft: `3px solid ${SEV_COLORS[f.severity]}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span className={`badge ${f.severity}`} style={{ fontSize: 10 }}>{f.severity.toUpperCase()}</span>
                    <span className="badge info" style={{ fontSize: 10 }}>DAST</span>
                    {(() => { const o = mapToOwasp(f); return o ? <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: `${o.color}15`, color: o.color, fontWeight: 600 }}>{o.icon} {o.id}</span> : null; })()}
                    {f.ruleId && <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>{f.ruleId}</span>}
                  </div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.title}</h4>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 6 }}>{f.description?.slice(0, 200)}</p>
                  {f.filePath && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "4px 8px", borderRadius: 6, background: "rgba(59,130,246,0.05)", marginBottom: 6 }}>
                      <ExternalLink size={10} style={{ color: "var(--accent)" }} />
                      <a href={f.filePath} target="_blank" rel="noopener" style={{ color: "var(--accent)", textDecoration: "none", wordBreak: "break-all" }}>{f.filePath}</a>
                    </div>
                  )}
                  {f.code && <pre style={{ fontSize: 10, padding: "6px 10px", borderRadius: 6, background: "rgba(0,0,0,0.3)", color: "#a5f3fc", overflow: "auto", maxHeight: 80, margin: 0 }}>{f.code}</pre>}
                  <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 10 }}>
                    {f.cweId && <span style={{ color: "var(--text-muted)" }}>🛡 {f.cweId}</span>}
                    {f.recommendation && <span style={{ color: "var(--text-muted)", flex: 1 }}>💡 {f.recommendation.slice(0, 120)}</span>}
                    <span style={{ color: "var(--text-muted)" }}><Clock size={10} /> {new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════ TAB: SCHEDULES ═══════ */}
      {tab === "schedules" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button className="btn btn-primary" onClick={() => setShowSchedForm(!showSchedForm)} style={{ gap: 6 }}><Plus size={16} /> New Schedule</button>
          </div>

          {showSchedForm && (
            <div className="card" style={{ marginBottom: 20, background: "linear-gradient(135deg, rgba(59,130,246,0.05), rgba(99,102,241,0.05))", border: "1px solid rgba(59,130,246,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}><Plus size={14} style={{ display: "inline", marginRight: 6 }} /> Create Schedule</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Project</label>
                  <select value={fProjectId} onChange={e => { setFProjectId(e.target.value); const p = projects.find((p: any) => p.id === e.target.value); if (p?.repoUrl) setFUrl(p.repoUrl); }} style={{ ...inputStyle, cursor: "pointer" }}>
                    <option value="">Select project...</option>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Target URL</label>
                  <input type="text" value={fUrl} onChange={e => setFUrl(e.target.value)} placeholder="https://example.com" style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Frequency</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {CRON_OPTIONS.map(o => (
                    <label key={o.value} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.2s", textAlign: "center", background: fCron === o.value ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${fCron === o.value ? "var(--accent)" : "var(--border-color)"}`, color: fCron === o.value ? "var(--accent)" : "var(--text-secondary)" }}>
                      <input type="radio" name="cron" value={o.value} checked={fCron === o.value} onChange={e => setFCron(e.target.value)} style={{ display: "none" }} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{o.label}</span>
                      <span style={{ fontSize: 9, opacity: 0.6 }}>{o.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {TMPL_OPTS.map(t => (
                  <label key={t.id} style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, cursor: "pointer", background: fTmpls.includes(t.id) ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${fTmpls.includes(t.id) ? "var(--accent)" : "var(--border-color)"}`, color: fTmpls.includes(t.id) ? "var(--accent)" : "var(--text-secondary)" }}>
                    <input type="checkbox" checked={fTmpls.includes(t.id)} onChange={() => setFTmpls(p => p.includes(t.id) ? p.filter(x => x !== t.id) : [...p, t.id])} style={{ display: "none" }} /> {t.label}
                  </label>
                ))}
                <label style={{ padding: "4px 8px", borderRadius: 6, fontSize: 10, cursor: "pointer", background: fCrawl ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${fCrawl ? "rgba(34,197,94,0.3)" : "var(--border-color)"}`, color: fCrawl ? "#22c55e" : "var(--text-secondary)" }}>
                  <input type="checkbox" checked={fCrawl} onChange={() => setFCrawl(!fCrawl)} style={{ display: "none" }} /> 🕷️ Crawl
                </label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={createSchedule} style={{ gap: 6 }}><Calendar size={14} /> Create</button>
                <button className="btn btn-secondary" onClick={() => setShowSchedForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {schedLoading ? <div className="card animate-pulse" style={{ height: 150 }} /> : schedules.length === 0 ? (
            <div className="card"><div className="empty-state"><Calendar style={{ width: 40, height: 40, opacity: 0.3 }} /><h3>No schedules</h3><p>Create a schedule to automate scans</p></div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {schedules.map((s: any) => {
                const proj = projects.find((p: any) => p.id === s.projectId);
                return (
                  <div key={s.id} className="card" style={{ padding: 14, borderLeft: `3px solid ${s.enabled ? "var(--accent)" : "var(--text-muted)"}`, opacity: s.enabled ? 1 : 0.6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <Globe size={13} style={{ color: "var(--accent)" }} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{proj?.name || s.projectId}</span>
                          <span className={`badge ${s.enabled ? "info" : ""}`} style={{ fontSize: 9 }}>{s.enabled ? "Active" : "Paused"}</span>
                          <span className="badge" style={{ fontSize: 9, background: "rgba(99,102,241,0.15)", color: "var(--accent)" }}><Clock size={9} style={{ marginRight: 2 }} />{s.cron}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>🌐 {s.targetUrl}</div>
                        <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                          {s.templates?.map((t: string) => <span key={t} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}>{t}</span>)}
                          {s.crawl && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>🕷️ Crawl</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-secondary" onClick={() => toggleSched(s.id, s.enabled)} style={{ padding: "5px 8px" }}>{s.enabled ? <Pause size={13} /> : <Play size={13} />}</button>
                        <button className="btn btn-secondary" onClick={() => deleteSched(s.id)} style={{ padding: "5px 8px", color: "var(--critical)" }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════ TAB: TEMPLATES ═══════ */}
      {tab === "templates" && (
        <>
          {/* AI Generator */}
          <div className="card" style={{ marginBottom: 16, background: "linear-gradient(135deg, rgba(168,85,247,0.06), rgba(59,130,246,0.06))", border: "1px solid rgba(168,85,247,0.2)" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} style={{ color: "#a855f7" }} /> AI Template Generator
            </h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input type="text" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && generateAI()} placeholder="e.g. Check if server exposes .git directory..." style={{ ...inputStyle, flex: 1 }} />
              <button className="btn btn-primary" onClick={generateAI} disabled={generating || !aiPrompt.trim()} style={{ gap: 6, background: "linear-gradient(135deg, #a855f7, #6366f1)", minWidth: 130 }}>
                {generating ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating...</> : <><Sparkles size={14} /> Generate</>}
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {AI_PROMPTS.map(p => (
                <button key={p} onClick={() => setAiPrompt(p)} style={{ padding: "3px 8px", borderRadius: 10, fontSize: 10, border: "1px solid rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.06)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700 }}>YAML Editor</h3>
              <button className="btn btn-secondary" onClick={() => copyClip(tmplContent)} style={{ padding: "3px 8px", fontSize: 10 }}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
              </button>
            </div>
            <input type="text" value={tmplName} onChange={e => setTmplName(e.target.value)} placeholder="Template name..." style={{ ...inputStyle, marginBottom: 8, fontWeight: 600 }} />
            <textarea value={tmplContent} onChange={e => setTmplContent(e.target.value)} placeholder="# Nuclei YAML template..." spellCheck={false}
              style={{ ...inputStyle, minHeight: 260, fontFamily: "'Fira Code','JetBrains Mono',monospace", fontSize: 12, lineHeight: 1.6, background: "rgba(0,0,0,0.4)", color: "#a5f3fc", resize: "vertical", tabSize: 2 }}
              onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); const s = e.currentTarget.selectionStart; const end = e.currentTarget.selectionEnd; setTmplContent(tmplContent.substring(0, s) + "  " + tmplContent.substring(end)); setTimeout(() => { e.currentTarget.selectionStart = e.currentTarget.selectionEnd = s + 2; }, 0); } }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-primary" onClick={saveTmpl} disabled={saving || !tmplName.trim() || !tmplContent.trim()} style={{ gap: 6 }}>
                {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />} {saving ? "Saving..." : "Save Template"}
              </button>
              {(tmplName || tmplContent) && <button className="btn btn-secondary" onClick={() => { setTmplName(""); setTmplContent(""); }}>Clear</button>}
            </div>
          </div>

          {/* Saved */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Saved Templates ({templates.length})</h3>
            {tmplLoading ? <div className="animate-pulse" style={{ height: 80 }} /> : templates.length === 0 ? (
              <div className="empty-state" style={{ padding: 24 }}><FileCode style={{ width: 36, height: 36, opacity: 0.3 }} /><p style={{ fontSize: 12, color: "var(--text-muted)" }}>No templates yet</p></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {templates.map((t: any) => (
                  <div key={t.id} style={{ padding: 10, borderRadius: 6, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
                      <pre style={{ fontSize: 9, color: "#6ee7b7", marginTop: 4, maxHeight: 40, overflow: "hidden", opacity: 0.7, lineHeight: 1.3, whiteSpace: "pre-wrap" }}>{t.content.slice(0, 150)}...</pre>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-secondary" onClick={() => { setTmplName(t.name); setTmplContent(t.content); }} style={{ padding: "4px 8px", fontSize: 10 }}>Edit</button>
                      <button className="btn btn-secondary" onClick={() => copyClip(t.content)} style={{ padding: "4px 8px", fontSize: 10 }}><Copy size={10} /></button>
                      <button className="btn btn-secondary" onClick={() => deleteTmpl(t.id)} style={{ padding: "4px 8px", fontSize: 10, color: "var(--critical)" }}><Trash2 size={10} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
