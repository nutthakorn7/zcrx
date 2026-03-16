"use client";
import { useEffect, useState } from "react";
import { ShieldAlert, Filter, FileCode, ChevronRight, Wand2, Loader2, Download } from "lucide-react";
import { api } from "@/lib/api";
import { getCleanCodeTag } from "@/lib/cleancode";
import ReactMarkdown from "react-markdown";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

const DEMO_FINDINGS = [
  // Vulnerabilities — exploitable security flaws
  { id: "df1", severity: "critical", type: "sast", issueType: "vulnerability", title: "SQL Injection in login query", filePath: "src/auth/login.ts", line: 42, status: "open", description: "User input is concatenated directly into SQL query without parameterization.", code: "db.query(`SELECT * FROM users WHERE email = '${email}'`)", recommendation: "Use parameterized queries or an ORM.", ruleId: "CWE-89", cweId: "CWE-89" },
  { id: "df2", severity: "critical", type: "sast", issueType: "vulnerability", title: "Hardcoded JWT secret key", filePath: "src/config.ts", line: 8, status: "open", description: "JWT secret is hardcoded in source code and may be exposed.", code: 'const SECRET = "my-super-secret-key"', recommendation: "Use environment variables for secrets.", ruleId: "CWE-798", cweId: "CWE-798" },
  { id: "df3", severity: "high", type: "sca", issueType: "vulnerability", title: "Prototype Pollution in lodash < 4.17.21", filePath: "package.json", line: 12, status: "open", description: "lodash versions before 4.17.21 are vulnerable to Prototype Pollution.", code: '"lodash": "^4.17.15"', recommendation: "Upgrade lodash to >= 4.17.21.", ruleId: "CVE-2021-23337", cweId: "CWE-1321" },
  { id: "df4", severity: "high", type: "sast", issueType: "vulnerability", title: "Cross-Site Scripting (XSS) via dangerouslySetInnerHTML", filePath: "src/components/Comment.tsx", line: 23, status: "open", description: "User-generated content is rendered using dangerouslySetInnerHTML without sanitization.", code: '<div dangerouslySetInnerHTML={{ __html: comment.body }} />', recommendation: "Sanitize HTML with DOMPurify before rendering.", ruleId: "CWE-79", cweId: "CWE-79" },

  // Bugs — code producing incorrect behavior
  { id: "df5", severity: "high", type: "sast", issueType: "bug", title: "Race condition in session handler", filePath: "src/middleware/session.ts", line: 34, status: "open", description: "Concurrent requests can corrupt session data due to unsynchronized access.", code: "sessions[sessionId] = { ...sessions[sessionId], ...newData }", recommendation: "Use atomic operations or a mutex for session updates.", ruleId: "CWE-362", cweId: "CWE-362" },
  { id: "df6", severity: "medium", type: "sast", issueType: "bug", title: "Null pointer dereference in user lookup", filePath: "src/services/user.ts", line: 15, status: "open", description: "User object accessed without null check after database query.", code: "const name = user.profile.displayName", recommendation: "Add null check: user?.profile?.displayName", ruleId: "CWE-476", cweId: "CWE-476" },

  // Code Smells — maintainability issues / technical debt
  { id: "df7", severity: "low", type: "sast", issueType: "codeSmell", title: "Console.log left in production code", filePath: "src/utils/logger.ts", line: 5, status: "open", description: "Console.log statements in production can leak sensitive information.", code: "console.log('User authenticated:', user.email)", recommendation: "Use a proper logging library with log levels.", ruleId: "CWE-532", cweId: "CWE-532" },
  { id: "df8", severity: "low", type: "sast", issueType: "codeSmell", title: "TODO comment with security implications", filePath: "src/middleware/auth.ts", line: 22, status: "open", description: "A TODO comment suggests incomplete security implementation.", code: "// TODO: add proper token validation", recommendation: "Implement the pending security feature.", ruleId: "CWE-1164", cweId: null },
  { id: "df9", severity: "low", type: "sast", issueType: "codeSmell", title: "Duplicated authentication logic", filePath: "src/routes/admin.ts", line: 8, status: "open", description: "Auth check is copy-pasted across 4 routes instead of using middleware.", code: "if (!req.headers.authorization) return res.status(401).json({})", recommendation: "Extract auth check into reusable middleware.", ruleId: "S1192", cweId: null },

  // Security Hotspots — code needing manual review
  { id: "df10", severity: "medium", type: "sast", issueType: "hotspot", title: "Missing rate limiting on authentication endpoint", filePath: "src/routes/auth.ts", line: 15, status: "open", description: "Login endpoint has no rate limiting, allowing brute force attacks.", code: "router.post('/login', async (req, res) => {", recommendation: "Add rate limiting middleware (e.g., express-rate-limit).", ruleId: "CWE-307", cweId: "CWE-307" },
  { id: "df11", severity: "medium", type: "sast", issueType: "hotspot", title: "Insecure cookie settings", filePath: "src/middleware/session.ts", line: 18, status: "open", description: "Session cookie is missing HttpOnly and Secure flags.", code: "res.cookie('session', token, { path: '/' })", recommendation: "Set httpOnly: true, secure: true, sameSite: 'strict'.", ruleId: "CWE-614", cweId: "CWE-614" },
  { id: "df12", severity: "medium", type: "sca", issueType: "hotspot", title: "axios SSRF vulnerability — needs review", filePath: "package.json", line: 15, status: "open", description: "axios < 1.6.0 may allow Server-Side Request Forgery depending on usage.", code: '"axios": "^1.5.0"', recommendation: "Review usage patterns and upgrade axios to >= 1.6.0.", ruleId: "CVE-2023-45857", cweId: "CWE-918" },
];

export default function FindingsPage() {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [aiFixes, setAiFixes] = useState<Record<string, string>>({});
  const [generatingFix, setGeneratingFix] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadFindings();
  }, [filters]);

  async function loadFindings() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filters.severity) params.severity = filters.severity;
      if (filters.type) params.type = filters.type;
      if (filters.status) params.status = filters.status;
      const res = await api.findings.list(
        Object.keys(params).length > 0 ? params : undefined
      );
      if (res.data && res.data.length > 0) {
        let data = res.data;
        if (filters.issueType) {
          data = data.filter((f: any) => f.issueType === filters.issueType);
        }
        setFindings(data);
        setIsDemo(false);
      } else if (!filters.severity && !filters.type && !filters.status && !filters.issueType) {
        setFindings(DEMO_FINDINGS);
        setIsDemo(true);
      } else if (isDemo) {
        let demo = DEMO_FINDINGS as any[];
        if (filters.severity) demo = demo.filter(f => f.severity === filters.severity);
        if (filters.type) demo = demo.filter(f => f.type === filters.type);
        if (filters.status) demo = demo.filter(f => f.status === filters.status);
        if (filters.issueType) demo = demo.filter(f => f.issueType === filters.issueType);
        setFindings(demo);
      } else {
        setFindings([]);
      }
    } catch (e) {
      console.error(e);
      if (!filters.severity && !filters.type && !filters.status && !filters.issueType) {
        setFindings(DEMO_FINDINGS);
        setIsDemo(true);
      } else if (isDemo) {
        let demo = DEMO_FINDINGS as any[];
        if (filters.severity) demo = demo.filter(f => f.severity === filters.severity);
        if (filters.type) demo = demo.filter(f => f.type === filters.type);
        if (filters.status) demo = demo.filter(f => f.status === filters.status);
        if (filters.issueType) demo = demo.filter(f => f.issueType === filters.issueType);
        setFindings(demo);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await api.findings.updateStatus(id, status);
      loadFindings();
    } catch (e) {
      console.error(e);
    }
  }

  async function generateAiFix(finding: any) {
    setGeneratingFix((prev) => ({ ...prev, [finding.id]: true }));
    try {
      const res = await fetch("http://localhost:8000/api/ai/suggest-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: finding.language || "TypeScript", // Fallback to TS if unknown
          title: finding.title,
          description: finding.description,
          issueType: finding.issueType,
          cwe: finding.cweId,
          ruleId: finding.ruleId,
          filePath: finding.filePath,
          codeSnippet: finding.code || "Code snippet not available",
        }),
      });
      
      const data = await res.json();
      if (data.suggestion) {
        setAiFixes((prev) => ({ ...prev, [finding.id]: data.suggestion }));
      } else {
        setAiFixes((prev) => ({ ...prev, [finding.id]: "⚠️ Could not generate fix: " + (data.error || "Unknown error") }));
      }
    } catch (e) {
      console.error("AI fix generation failed", e);
      setAiFixes((prev) => ({ ...prev, [finding.id]: "⚠️ Network error while generating AI fix." }));
    } finally {
      setGeneratingFix((prev) => ({ ...prev, [finding.id]: false }));
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2><ShieldAlert size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />Findings</h2>
          <p>All security vulnerabilities across your projects</p>
        </div>
        <a
          href="http://localhost:8000/api/export/findings"
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
            transition: "all 0.2s",
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
          Showing demo findings — run scans on your projects to see real vulnerabilities
        </div>
      )}

      {/* Filters */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Filter size={16} style={{ color: "var(--text-muted)" }} />
        <select
          className="input"
          style={{ width: "auto", minWidth: 140 }}
          value={filters.severity || ""}
          onChange={(e) =>
            setFilters({ ...filters, severity: e.target.value })
          }
        >
          <option value="">All Severities</option>
          {SEVERITY_ORDER.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <select
          className="input"
          style={{ width: "auto", minWidth: 120 }}
          value={filters.type || ""}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="sast">SAST</option>
          <option value="sca">SCA</option>
        </select>
        <select
          className="input"
          style={{ width: "auto", minWidth: 140 }}
          value={filters.issueType || ""}
          onChange={(e) => setFilters({ ...filters, issueType: e.target.value })}
        >
          <option value="">All Categories</option>
          <option value="vulnerability">🛡 Vulnerability</option>
          <option value="bug">🐛 Bug</option>
          <option value="codeSmell">🔧 Code Smell</option>
          <option value="hotspot">🔍 Hotspot</option>
        </select>
        <select
          className="input"
          style={{ width: "auto", minWidth: 120 }}
          value={filters.status || ""}
          onChange={(e) =>
            setFilters({ ...filters, status: e.target.value })
          }
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="confirmed">Confirmed</option>
          <option value="false_positive">False Positive</option>
          <option value="fixed">Fixed</option>
        </select>
        {Object.values(filters).some(Boolean) && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setFilters({})}
          >
            Clear
          </button>
        )}
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 13 }}>
          {findings.length} findings
        </span>
      </div>

      {/* Findings List */}
      {loading ? (
        <div>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card animate-pulse"
              style={{ height: 80, marginBottom: 12 }}
            />
          ))}
        </div>
      ) : findings.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ShieldAlert style={{ width: 48, height: 48, opacity: 0.3 }} />
            <h3>No findings found</h3>
            <p>Run a scan on one of your projects to discover vulnerabilities</p>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {findings.map((f) => (
            <div
              key={f.id}
              className="card"
              style={{ cursor: "pointer", padding: "16px 20px" }}
              onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <ChevronRight
                  size={16}
                  style={{
                    transform: expandedId === f.id ? "rotate(90deg)" : "none",
                    transition: "transform 0.2s",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                  }}
                />
                <span className={`badge ${f.severity}`}>{f.severity}</span>
                <span className={`badge ${f.type}`}>{f.type.toUpperCase()}</span>
                {f.issueType && (
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 10,
                    background: f.issueType === "vulnerability" ? "rgba(239,68,68,0.1)" :
                               f.issueType === "bug" ? "rgba(249,115,22,0.1)" :
                               f.issueType === "codeSmell" ? "rgba(234,179,8,0.1)" :
                               "rgba(59,130,246,0.1)",
                    color: f.issueType === "vulnerability" ? "#ef4444" :
                           f.issueType === "bug" ? "#f97316" :
                           f.issueType === "codeSmell" ? "#eab308" :
                           "#3b82f6",
                    fontWeight: 600,
                  }}>
                    {f.issueType === "vulnerability" ? "🛡 Vuln" :
                     f.issueType === "bug" ? "🐛 Bug" :
                     f.issueType === "codeSmell" ? "🔧 Smell" :
                     "🔍 Hotspot"}
                  </span>
                )}
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>
                  {f.title}
                </span>
                {f.filePath && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: "var(--text-muted)",
                      fontSize: 12,
                    }}
                  >
                    <FileCode size={14} />
                    {f.filePath}
                    {f.line && `:${f.line}`}
                  </span>
                )}
                <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                  <select
                    value={f.status}
                    onChange={(e) => {
                      if (isDemo) {
                        // Update locally for demo mode
                        setFindings((prev) =>
                          prev.map((item) =>
                            item.id === f.id ? { ...item, status: e.target.value } : item
                          )
                        );
                      } else {
                        updateStatus(f.id, e.target.value);
                      }
                    }}
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      cursor: "pointer",
                      padding: "3px 24px 3px 10px",
                      borderRadius: 12,
                      border: "none",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      outline: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23ffffff80'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 6px center",
                      backgroundColor:
                        f.status === "open" ? "rgba(249,115,22,0.15)" :
                        f.status === "fixed" ? "rgba(34,197,94,0.15)" :
                        f.status === "false_positive" ? "rgba(107,114,128,0.15)" :
                        f.status === "ignored" ? "rgba(107,114,128,0.15)" :
                        "rgba(249,115,22,0.15)",
                      color:
                        f.status === "open" ? "#f97316" :
                        f.status === "fixed" ? "#22c55e" :
                        f.status === "false_positive" ? "#9ca3af" :
                        f.status === "ignored" ? "#9ca3af" :
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

              {/* Expanded details */}
              {expandedId === f.id && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid var(--border-color)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Clean Code Tags */}
                  {(() => {
                    const cc = getCleanCodeTag(f);
                    return (
                      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                        <span style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 6,
                          background: `${cc.attributeColor}18`, color: cc.attributeColor,
                          fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                        }}>
                          {cc.attributeIcon} Clean Code: {cc.attributeLabel}
                        </span>
                        <span style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 6,
                          background: `${cc.qualityColor}18`, color: cc.qualityColor,
                          fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                        }}>
                          {cc.qualityIcon} Quality: {cc.qualityLabel}
                        </span>
                      </div>
                    );
                  })()}
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: 14,
                      marginBottom: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    {f.description}
                  </p>

                  {f.code && (
                    <pre
                      style={{
                        background: "var(--bg-primary)",
                        padding: 16,
                        borderRadius: 8,
                        fontSize: 13,
                        overflow: "auto",
                        marginBottom: 12,
                        border: "1px solid var(--border-color)",
                        color: "#e5e7eb",
                      }}
                    >
                      {f.code}
                    </pre>
                  )}

                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ 
                        background: "linear-gradient(135deg, #a855f7, #6366f1)", 
                        border: "none",
                        color: "white" 
                      }}
                      onClick={() => generateAiFix(f)}
                      disabled={generatingFix[f.id]}
                    >
                      {generatingFix[f.id] ? (
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <Wand2 size={14} />
                      )}
                      <span style={{ marginLeft: 6 }}>
                        {generatingFix[f.id] ? "Generating Fix..." : "✨ AI Auto-Fix"}
                      </span>
                    </button>
                  </div>

                  {aiFixes[f.id] && (
                    <div style={{
                      background: "rgba(168, 85, 247, 0.05)",
                      border: "1px solid rgba(168, 85, 247, 0.2)",
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 16,
                      color: "var(--text-primary)"
                    }}>
                      <div className="markdown-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
                        <ReactMarkdown>{aiFixes[f.id]}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {f.recommendation && (
                    <div
                      style={{
                        background: "var(--accent-bg)",
                        padding: 12,
                        borderRadius: 8,
                        fontSize: 13,
                        color: "var(--accent-hover)",
                        marginBottom: 12,
                      }}
                    >
                      💡 <strong>Standard Recommendation:</strong> {f.recommendation}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {f.ruleId && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Rule: {f.ruleId}
                      </span>
                    )}
                    {f.cweId && (
                      <span className="badge info" style={{ fontSize: 11 }}>
                        {f.cweId}
                      </span>
                    )}
                    <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                      {f.status === "open" && (
                        <>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => updateStatus(f.id, "false_positive")}
                          >
                            Mark False Positive
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => updateStatus(f.id, "fixed")}
                          >
                            Mark Fixed
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
