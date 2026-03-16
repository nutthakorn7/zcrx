/**
 * Multi-dimensional Security Scoring System
 * Inspired by SonarQube's methodology
 *
 * SonarQube 4 dimensions:
 *   1. Security (Vulnerabilities) — exploitable security flaws
 *   2. Reliability (Bugs) — code producing incorrect behavior
 *   3. Maintainability (Code Smells) — technical debt
 *   4. Security Review (Hotspots) — code needing manual review
 *
 * Each dimension gets its own A-F grade based on worst-case severity
 * Combined into an overall Security Score (0-100) + grade (A-F)
 */

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface IssueTypeCounts {
  vulnerability: number;
  bug: number;
  codeSmell: number;
  hotspot: number;
}

export interface SecurityMetrics {
  // By severity
  critical?: number;
  high?: number;
  medium?: number;
  low?: number;
  info?: number;

  // By issue type (SonarQube-style)
  byType?: IssueTypeCounts;

  // Fix tracking
  totalFindings?: number;
  fixedFindings?: number;
}

export interface DimensionRating {
  grade: Grade;
  count: number;
  color: string;
  bgColor: string;
  label: string;
}

export interface ScoreResult {
  // Overall
  score: number;
  grade: Grade;
  color: string;
  bgColor: string;
  label: string;

  // 4 SonarQube-style dimension ratings
  dimensions: {
    security: DimensionRating;     // Vulnerabilities
    reliability: DimensionRating;  // Bugs
    maintainability: DimensionRating; // Code Smells
    review: DimensionRating;       // Security Hotspots
  };

  // Risk assessment
  riskLevel: "Critical" | "High" | "Medium" | "Low" | "None";
  riskColor: string;

  // Remediation
  remediationEffort: string;
  remediationMinutes: number;

  // Fix rate
  fixRate: number;

  // Counts
  breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

const GRADE_CONFIG: Record<Grade, { color: string; bgColor: string; label: string }> = {
  A: { color: "#22c55e", bgColor: "rgba(34,197,94,0.12)", label: "Excellent" },
  B: { color: "#3b82f6", bgColor: "rgba(59,130,246,0.12)", label: "Good" },
  C: { color: "#eab308", bgColor: "rgba(234,179,8,0.12)", label: "Fair" },
  D: { color: "#f97316", bgColor: "rgba(249,115,22,0.12)", label: "Poor" },
  F: { color: "#ef4444", bgColor: "rgba(239,68,68,0.12)", label: "Critical" },
};

/**
 * SonarQube-style grade: based on worst severity present
 * A = 0 issues, B = only low/info, C = has medium, D = has high, F = has critical
 */
function gradeFromSeverity(critical: number, high: number, medium: number, low: number): Grade {
  if (critical > 0) return "F";
  if (high > 0) return "D";
  if (medium > 0) return "C";
  if (low > 0) return "B";
  return "A";
}

/**
 * Get dimension rating from count
 * Simple: 0 = A, 1-2 = B, 3-5 = C, 6-10 = D, 11+ = F
 */
function ratingFromCount(count: number): Grade {
  if (count === 0) return "A";
  if (count <= 2) return "B";
  if (count <= 5) return "C";
  if (count <= 10) return "D";
  return "F";
}

function makeDimensionRating(grade: Grade, count: number): DimensionRating {
  const config = GRADE_CONFIG[grade];
  return { grade, count, ...config };
}

/**
 * Quantity-weighted Score (0-100)
 */
function getQuantityScore(m: SecurityMetrics): number {
  const c = m.critical || 0;
  const h = m.high || 0;
  const med = m.medium || 0;
  const l = m.low || 0;

  let score = 100;
  score -= c * 15;
  score -= h * 7;
  score -= med * 3;
  score -= l * 1;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Remediation Effort
 */
function getRemediationEffort(m: SecurityMetrics): { effort: string; minutes: number } {
  const minutes =
    (m.critical || 0) * 60 +
    (m.high || 0) * 30 +
    (m.medium || 0) * 15 +
    (m.low || 0) * 5;

  if (minutes === 0) return { effort: "0m", minutes: 0 };
  if (minutes < 60) return { effort: `${minutes}m`, minutes };
  if (minutes < 480) return { effort: `${Math.round(minutes / 60)}h`, minutes };
  return { effort: `${Math.round(minutes / 480)}d`, minutes };
}

/**
 * Risk Level
 */
function getRiskLevel(m: SecurityMetrics): { level: ScoreResult["riskLevel"]; color: string } {
  const c = m.critical || 0;
  const h = m.high || 0;
  if (c >= 3 || (c >= 1 && h >= 3)) return { level: "Critical", color: "#ef4444" };
  if (c >= 1 || h >= 3) return { level: "High", color: "#f97316" };
  if (h >= 1 || (m.medium || 0) >= 5) return { level: "Medium", color: "#eab308" };
  if ((m.medium || 0) > 0 || (m.low || 0) > 0) return { level: "Low", color: "#3b82f6" };
  return { level: "None", color: "#22c55e" };
}

/**
 * Main scoring function
 */
export function calculateSecurityScore(metrics: SecurityMetrics): ScoreResult {
  const m = {
    critical: metrics.critical || 0,
    high: metrics.high || 0,
    medium: metrics.medium || 0,
    low: metrics.low || 0,
    info: metrics.info || 0,
  };

  // Issue type counts (default: distribute based on finding type heuristics)
  const types = metrics.byType || {
    vulnerability: Math.ceil((m.critical + m.high) * 0.7 + m.medium * 0.3),
    bug: Math.ceil((m.critical + m.high) * 0.2 + m.medium * 0.3),
    codeSmell: Math.ceil(m.medium * 0.4 + m.low * 0.7),
    hotspot: Math.ceil((m.critical + m.high) * 0.1 + m.medium * 0.2 + m.low * 0.3),
  };

  // 4 dimension ratings
  const securityGrade = gradeFromSeverity(m.critical, m.high, Math.floor(m.medium * 0.5), 0);
  const dimensions = {
    security: makeDimensionRating(securityGrade, types.vulnerability),
    reliability: makeDimensionRating(ratingFromCount(types.bug), types.bug),
    maintainability: makeDimensionRating(ratingFromCount(types.codeSmell), types.codeSmell),
    review: makeDimensionRating(ratingFromCount(types.hotspot), types.hotspot),
  };

  // Quantity score
  const quantityScore = getQuantityScore(m);

  // Combined grade: 40% worst-case + 60% quantity
  const gradeToNum: Record<Grade, number> = { A: 100, B: 80, C: 60, D: 40, F: 20 };
  const combined = gradeToNum[securityGrade] * 0.4 + quantityScore * 0.6;
  let grade: Grade;
  if (combined >= 90) grade = "A";
  else if (combined >= 70) grade = "B";
  else if (combined >= 50) grade = "C";
  else if (combined >= 30) grade = "D";
  else grade = "F";

  const config = GRADE_CONFIG[grade];
  const score = Math.round(combined);

  const { effort, minutes } = getRemediationEffort(m);
  const { level, color: riskColor } = getRiskLevel(m);

  const total = metrics.totalFindings || (m.critical + m.high + m.medium + m.low + m.info);
  const fixed = metrics.fixedFindings || 0;
  const fixRate = total > 0 ? Math.round((fixed / total) * 100) : 100;

  return {
    score,
    grade,
    color: config.color,
    bgColor: config.bgColor,
    label: config.label,
    dimensions,
    riskLevel: level,
    riskColor,
    remediationEffort: effort,
    remediationMinutes: minutes,
    fixRate,
    breakdown: m,
  };
}
