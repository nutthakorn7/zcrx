"use client";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  FolderGit2,
  ScanSearch,
  ShieldAlert,
  AlertTriangle,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { api } from "@/lib/api";
import { calculateSecurityScore } from "@/lib/score";
import { evaluateQualityGate } from "@/lib/qualitygate";
import { DEMO_PROJECTS } from "@/lib/demo-data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OWASP_TOP_10, getOwaspCoverage } from "@/lib/owasp";

interface DashboardData {
  totalProjects: number;
  totalScans: number;
  totalFindings: number;
  openFindings: number;
  bySeverity: Record<string, number>;
  recentScans: any[];
  trendData: {
    date: string;
    displayDate: string;
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

const DEMO_DATA: DashboardData = {
  totalProjects: 3,
  totalScans: 12,
  totalFindings: 47,
  openFindings: 38,
  bySeverity: { critical: 8, high: 12, medium: 15, low: 12 },
  recentScans: [
    { id: "d1", projectId: "demo1", type: "sast", status: "completed", findingsCount: 12, critical: 3, high: 4, startedAt: new Date().toISOString() },
    { id: "d2", projectId: "demo1", type: "sca", status: "completed", findingsCount: 8, critical: 2, high: 3, startedAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "d3", projectId: "demo2", type: "sbom", status: "completed", findingsCount: 0, critical: 0, high: 0, startedAt: new Date(Date.now() - 7200000).toISOString() },
    { id: "d4", projectId: "demo2", type: "sast", status: "completed", findingsCount: 15, critical: 2, high: 5, startedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: "d5", projectId: "demo3", type: "sca", status: "completed", findingsCount: 12, critical: 1, high: 3, startedAt: new Date(Date.now() - 172800000).toISOString() },
  ],
  trendData: Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toISOString().split("T")[0],
      displayDate: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      critical: Math.floor(Math.random() * 3),
      high: Math.floor(Math.random() * 5),
      medium: Math.floor(Math.random() * 8),
      low: Math.floor(Math.random() * 10),
      info: 0,
    };
  }),
};



export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [allFindings, setAllFindings] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.dashboard.getStats(), api.projects.list(), api.findings.list()])
      .then(([statsRes, projRes, findingsRes]) => {
        const d = statsRes.data;
        if (d && (d.totalProjects > 0 || d.totalScans > 0)) {
          setData(d);
          setProjects(projRes.data || []);
          setAllFindings(findingsRes.data || []);
          // Real data: call AI API
          triggerAI(d, false);
        } else {
          setData(DEMO_DATA);
          setProjects(DEMO_PROJECTS);
          setIsDemo(true);
          // Demo mode: use static summary
          triggerAI(DEMO_DATA, true);
        }
      })
      .catch(() => {
        setData(DEMO_DATA);
        setProjects(DEMO_PROJECTS);
        setIsDemo(true);
        triggerAI(DEMO_DATA, true);
      })
      .finally(() => setLoading(false));

    function triggerAI(stats: any, isDemoMode: boolean) {
      if (isDemoMode) {
        setAiSummary("Our current security posture requires immediate attention. With 8 critical and 12 high-severity vulnerabilities across 3 projects, we face significant exposure to potential exploits. Prioritize remediation of critical findings in web-api and auth-service repositories, and enforce stricter quality gates to prevent regression.");
        return;
      }
      setAiLoading(true);
      // Map dashboard stats to the flat schema the backend expects
      const payload = {
        totalProjects: stats.totalProjects || 0,
        totalFindings: stats.totalFindings || 0,
        critical: stats.bySeverity?.critical || 0,
        high: stats.bySeverity?.high || 0,
        medium: stats.bySeverity?.medium || 0,
        low: stats.bySeverity?.low || 0,
      };
      api.ai.summarizeDashboard(payload)
        .then(res => setAiSummary(res.summary))
        .catch(err => {
          console.error("AI Summary Error:", err);
          setAiSummary("⚠️ AI Summarization is temporarily unavailable. Please ensure the backend is running and the Gemini API Key is configured.");
        })
        .finally(() => setAiLoading(false));
    }
  }, []); 

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Security overview at a glance</p>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="stat-card animate-pulse" style={{ height: 100 }} />
          ))}
        </div>
      </div>
    );
  }

  const severityData = data
    ? Object.entries(data.bySeverity)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const barData = data
    ? [
        { name: "Critical", count: data.bySeverity.critical, fill: SEVERITY_COLORS.critical },
        { name: "High", count: data.bySeverity.high, fill: SEVERITY_COLORS.high },
        { name: "Medium", count: data.bySeverity.medium, fill: SEVERITY_COLORS.medium },
        { name: "Low", count: data.bySeverity.low, fill: SEVERITY_COLORS.low },
      ]
    : [];

  const clickableCard = {
    cursor: "pointer",
    textDecoration: "none",
    color: "inherit",
  };

  return (
    <div>
      <div className="page-header">
        <h2><LayoutDashboard size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />Dashboard</h2>
        <p>Security overview of all your projects</p>
      </div>

      {isDemo && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: "rgba(99,102,241,0.1)", color: "var(--accent)",
        }}>
          Showing demo data — add a repository and run scans to see real results
        </div>
      )}

      {/* AI Summary Card */}
      {(aiSummary || aiLoading) && (
        <div className="card" style={{
          marginBottom: 24,
          background: "linear-gradient(135deg, rgba(99,102,241,0.05), rgba(168,85,247,0.05))",
          border: "1px solid rgba(168,85,247,0.2)",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Subtle animated glow */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2s infinite linear"
          }} />
          <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, marginBottom: 12, color: "var(--accent)" }}>
            <Sparkles size={18} /> Executive Summary
          </h3>
          {aiLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14 }}>
              <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              AI is analyzing your security posture...
            </div>
          ) : (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
              {aiSummary}
            </p>
          )}
        </div>
      )}

      {/* Security Trends Area Chart */}
      {data?.trendData && data.trendData.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>
            Security Trends Over Time (14 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEVERITY_COLORS.critical} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={SEVERITY_COLORS.critical} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEVERITY_COLORS.high} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={SEVERITY_COLORS.high} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEVERITY_COLORS.medium} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={SEVERITY_COLORS.medium} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SEVERITY_COLORS.low} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={SEVERITY_COLORS.low} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="displayDate" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid var(--border-color)",
                  borderRadius: 12,
                  color: "#f9fafb",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                }}
                itemStyle={{ fontSize: 13, fontWeight: 500 }}
                labelStyle={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}
              />
              <Area type="monotone" dataKey="critical" name="Critical" stackId="1" stroke={SEVERITY_COLORS.critical} strokeWidth={2} fill="url(#colorCritical)" />
              <Area type="monotone" dataKey="high" name="High" stackId="1" stroke={SEVERITY_COLORS.high} strokeWidth={2} fill="url(#colorHigh)" />
              <Area type="monotone" dataKey="medium" name="Medium" stackId="1" stroke={SEVERITY_COLORS.medium} strokeWidth={2} fill="url(#colorMedium)" />
              <Area type="monotone" dataKey="low" name="Low" stackId="1" stroke={SEVERITY_COLORS.low} strokeWidth={2} fill="url(#colorLow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* SonarQube-style Overview Report Header */}
      <div className="card" style={{ marginBottom: 24, padding: "24px 16px" }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 24, display: "flex", justifyContent: "space-between" }}>
          <span>Platform Overview</span>
          <span style={{ fontSize: 13, fontWeight: 400 }}>{projects.length} projects</span>
        </h3>
        
        {(() => {
          const totalMetrics = {
            critical: projects.reduce((sum, p) => sum + (p.critical || 0), 0),
            high: projects.reduce((sum, p) => sum + (p.high || 0), 0),
            medium: projects.reduce((sum, p) => sum + (p.medium || 0), 0),
            low: projects.reduce((sum, p) => sum + (p.low || 0), 0),
          };
          const globalScore = calculateSecurityScore(totalMetrics);
          
          return (
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              {/* Size */}
              <div style={{ textAlign: "center", flex: 1, minWidth: 120 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Size</h4>
                <div style={{ 
                  width: 72, height: 72, borderRadius: "50%", background: "#3b82f6", color: "white", 
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, margin: "0 auto" 
                }}>
                  {projects.length > 5 ? "L" : projects.length > 2 ? "M" : "S"}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{data?.totalScans || 0}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>total scans</div>
                </div>
              </div>

              {/* Reliability */}
              <div style={{ textAlign: "center", flex: 1, minWidth: 120, borderLeft: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Reliability</h4>
                <div style={{ 
                  width: 72, height: 72, borderRadius: "50%", background: globalScore.dimensions.reliability.bgColor, color: globalScore.dimensions.reliability.color, 
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, margin: "0 auto" 
                }}>
                  {globalScore.dimensions.reliability.grade}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{globalScore.dimensions.reliability.count}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>🐛 bugs</div>
                </div>
              </div>

              {/* Security */}
              <div style={{ textAlign: "center", flex: 1, minWidth: 120, borderLeft: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Security</h4>
                <div style={{ 
                  width: 72, height: 72, borderRadius: "50%", background: globalScore.dimensions.security.bgColor, color: globalScore.dimensions.security.color, 
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, margin: "0 auto" 
                }}>
                  {globalScore.dimensions.security.grade}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{globalScore.dimensions.security.count}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>🛡 vulnerabilities</div>
                </div>
              </div>

              {/* Maintainability */}
              <div style={{ textAlign: "center", flex: 1, minWidth: 120, borderLeft: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Maintainability</h4>
                <div style={{ 
                  width: 72, height: 72, borderRadius: "50%", background: globalScore.dimensions.maintainability.bgColor, color: globalScore.dimensions.maintainability.color, 
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, margin: "0 auto" 
                }}>
                  {globalScore.dimensions.maintainability.grade}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{globalScore.dimensions.maintainability.count}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>🔧 code smells</div>
                </div>
              </div>

              {/* Review / Hotspots */}
              <div style={{ textAlign: "center", flex: 1, minWidth: 120, borderLeft: "1px solid var(--border-color)" }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Security Review</h4>
                <div style={{ 
                  width: 72, height: 72, borderRadius: "50%", background: globalScore.dimensions.review.bgColor, color: globalScore.dimensions.review.color, 
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, margin: "0 auto" 
                }}>
                  {globalScore.dimensions.review.grade}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{globalScore.dimensions.review.count}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>🔍 hotspots</div>
                </div>
              </div>

            </div>
          );
        })()}
      </div>

      {/* Quality Gate Summary */}
      {projects.length > 0 && (() => {
        const qgResults = projects.map((p: any) => ({
          name: p.name,
          qg: evaluateQualityGate({ critical: p.critical || 0, high: p.high || 0, medium: p.medium || 0, low: p.low || 0 }),
        }));
        const passed = qgResults.filter(r => r.qg.status === "passed").length;
        const warning = qgResults.filter(r => r.qg.status === "warning").length;
        const failed = qgResults.filter(r => r.qg.status === "failed").length;
        const total = qgResults.length;
        return (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Quality Gate Overview</h3>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              {/* Bar */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: "rgba(255,255,255,0.05)" }}>
                  {passed > 0 && <div style={{ width: `${(passed / total) * 100}%`, background: "#22c55e" }} />}
                  {warning > 0 && <div style={{ width: `${(warning / total) * 100}%`, background: "#eab308" }} />}
                  {failed > 0 && <div style={{ width: `${(failed / total) * 100}%`, background: "#ef4444" }} />}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>✅ {passed} Passed</span>
                  {warning > 0 && <span style={{ color: "#eab308", fontWeight: 600 }}>⚠️ {warning} Warning</span>}
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>❌ {failed} Failed</span>
                </div>
              </div>
              {/* Per-project badges */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {qgResults.map(r => (
                  <span key={r.name} style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 6,
                    background: r.qg.bgColor, color: r.qg.color, fontWeight: 600,
                  }}>
                    {r.qg.icon} {r.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Charts — clickable to findings */}
      <div className="grid-2">
        <Link href="/findings" className="card" style={{ ...clickableCard, display: "block" }}>
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>
            Findings by Severity
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(75,85,99,0.3)" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "1px solid rgba(75,85,99,0.4)",
                  borderRadius: 8,
                  color: "#f9fafb",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Link>

        <Link href="/findings" className="card" style={{ ...clickableCard, display: "block" }}>
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>
            Severity Distribution
          </h3>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {severityData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={SEVERITY_COLORS[entry.name] || "#6b7280"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1f2937",
                    border: "1px solid rgba(75,85,99,0.4)",
                    borderRadius: 8,
                    color: "#f9fafb",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <ShieldCheck style={{ width: 48, height: 48, opacity: 0.3 }} />
              <h3>No findings yet</h3>
              <p>Run your first scan to see results</p>
            </div>
          )}
        </Link>
      </div>

      {/* New Charts Row: Radar + Scan Activity */}
      <div className="grid-2">
        {/* Radar Chart — Security Posture */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>
            🎯 Security Posture Radar
          </h3>
          {(() => {
            const totalMetrics = {
              critical: projects.reduce((sum: number, p: any) => sum + (p.critical || 0), 0),
              high: projects.reduce((sum: number, p: any) => sum + (p.high || 0), 0),
              medium: projects.reduce((sum: number, p: any) => sum + (p.medium || 0), 0),
              low: projects.reduce((sum: number, p: any) => sum + (p.low || 0), 0),
            };
            const maxVal = Math.max(totalMetrics.critical, totalMetrics.high, totalMetrics.medium, totalMetrics.low, 1);
            const sc = calculateSecurityScore(totalMetrics);
            const radarData = [
              { dimension: "Reliability", score: sc.dimensions.reliability.grade === "A" ? 95 : sc.dimensions.reliability.grade === "B" ? 75 : sc.dimensions.reliability.grade === "C" ? 55 : sc.dimensions.reliability.grade === "D" ? 35 : 15, fullMark: 100 },
              { dimension: "Security", score: sc.dimensions.security.grade === "A" ? 95 : sc.dimensions.security.grade === "B" ? 75 : sc.dimensions.security.grade === "C" ? 55 : sc.dimensions.security.grade === "D" ? 35 : 15, fullMark: 100 },
              { dimension: "Code Quality", score: sc.dimensions.maintainability.grade === "A" ? 95 : sc.dimensions.maintainability.grade === "B" ? 75 : sc.dimensions.maintainability.grade === "C" ? 55 : sc.dimensions.maintainability.grade === "D" ? 35 : 15, fullMark: 100 },
              { dimension: "Review", score: sc.dimensions.review.grade === "A" ? 95 : sc.dimensions.review.grade === "B" ? 75 : sc.dimensions.review.grade === "C" ? 55 : sc.dimensions.review.grade === "D" ? 35 : 15, fullMark: 100 },
              { dimension: "Coverage", score: Math.max(20, 100 - (maxVal * 3)), fullMark: 100 },
            ];
            return (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="dimension" stroke="var(--text-muted)" fontSize={11} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            );
          })()}
        </div>

        {/* Scan Activity Line Chart */}
        <div className="card">
          <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>
            📈 Finding Resolution Trend
          </h3>
          {data?.trendData && data.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="displayDate" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0f172a",
                    border: "1px solid var(--border-color)",
                    borderRadius: 12,
                    color: "#f9fafb",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Critical" />
                <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="High" />
                <Line type="monotone" dataKey="medium" stroke="#eab308" strokeWidth={1.5} dot={false} name="Medium" />
                <Line type="monotone" dataKey="low" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Low" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Projects</h3>
          <Link href="/projects" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>
            View all
          </Link>
        </div>
        <div className="table-container" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)", fontSize: 13 }}>
                <th style={{ padding: "12px 16px", fontWeight: 600 }}>Project</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Reliability</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Security</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Maintainability</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Review</th>
                <th style={{ padding: "12px 16px", fontWeight: 600, textAlign: "center" }}>Quality Gate</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 10).map((proj: any) => {
                const sc = calculateSecurityScore({ critical: proj.critical || 0, high: proj.high || 0, medium: proj.medium || 0, low: proj.low || 0 });
                const qg = evaluateQualityGate({ critical: proj.critical || 0, high: proj.high || 0, medium: proj.medium || 0, low: proj.low || 0 });
                const totalIssues = (proj.critical || 0) + (proj.high || 0) + (proj.medium || 0) + (proj.low || 0);
                const sizeBadge = totalIssues > 20 ? "L" : totalIssues > 5 ? "M" : "S";
                const sizeColor = totalIssues > 20 ? "#60a5fa" : totalIssues > 5 ? "#9ca3af" : "#d1d5db";

                return (
                  <tr key={proj.id} onClick={() => router.push(`/projects/${proj.id}`)} style={{ cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "16px", display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: sizeColor, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {sizeBadge}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--accent)" }}>{proj.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{proj.language || "Unknown"}</div>
                      </div>
                    </td>
                    {[
                      { dim: sc.dimensions.reliability, icon: "🐛" },
                      { dim: sc.dimensions.security, icon: "🛡" },
                      { dim: sc.dimensions.maintainability, icon: "🔧" },
                      { dim: sc.dimensions.review, icon: "🔍" },
                    ].map((col, i) => (
                      <td key={i} style={{ padding: "16px", textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: col.dim.bgColor, color: col.dim.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
                            {col.dim.grade}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 4, alignItems: "center" }}>
                            <span>{col.icon}</span> <span>{col.dim.count}</span>
                          </div>
                        </div>
                      </td>
                    ))}
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "middle" }}>
                      <div style={{ display: "inline-flex", padding: "4px 10px", borderRadius: 12, background: qg.bgColor, color: qg.color, fontSize: 12, fontWeight: 700, alignItems: "center", gap: 4 }}>
                        {qg.icon} {qg.status.toUpperCase()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Scans — rows clickable to project detail */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Recent Scans</h3>
          <Link href="/scans" style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>
            View all
          </Link>
        </div>
        {data?.recentScans && data.recentScans.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Findings</th>
                  <th>Critical</th>
                  <th>High</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {data.recentScans.map((scan: any) => (
                  <tr
                    key={scan.id}
                    onClick={() => router.push(`/projects/${scan.projectId}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <span className={`badge ${scan.type}`}>
                        {scan.type.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${scan.status === "completed" ? "fixed" : "open"}`}
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td>{scan.findingsCount}</td>
                    <td style={{ color: scan.critical > 0 ? "#ef4444" : "inherit" }}>
                      {scan.critical}
                    </td>
                    <td style={{ color: scan.high > 0 ? "#f97316" : "inherit" }}>
                      {scan.high}
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      {new Date(scan.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <ScanSearch style={{ width: 48, height: 48, opacity: 0.3 }} />
            <h3>No scans yet</h3>
            <p>Create a project and run your first security scan</p>
          </div>
        )}
      </div>

      {/* OWASP Top 10 Coverage */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          🛡️ OWASP Top 10 Coverage
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {OWASP_TOP_10.map((cat) => {
            const count = allFindings.filter((f: any) => {
              const cwe = f.cweId?.toUpperCase() || "";
              const text = `${f.title || ""} ${f.description || ""} ${f.ruleId || ""}`.toLowerCase();
              return cat.cwes.includes(cwe) || cat.keywords.some(kw => text.includes(kw));
            }).length;
            const maxCount = Math.max(1, ...OWASP_TOP_10.map(() => 10));
            return (
              <div key={cat.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                borderRadius: 8, background: count > 0 ? `${cat.color}08` : "rgba(255,255,255,0.02)",
                border: `1px solid ${count > 0 ? `${cat.color}30` : "var(--border-color)"}`,
              }}>
                <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: count > 0 ? cat.color : "var(--text-muted)", marginBottom: 3 }}>
                    {cat.id}: {cat.name}
                  </div>
                  <div style={{
                    height: 4, borderRadius: 2, background: "rgba(255,255,255,0.05)", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 2, background: cat.color,
                      width: `${Math.min(100, (count / maxCount) * 100)}%`,
                      transition: "width 0.5s",
                    }} />
                  </div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, minWidth: 24, textAlign: "right",
                  color: count > 0 ? cat.color : "var(--text-muted)",
                }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
