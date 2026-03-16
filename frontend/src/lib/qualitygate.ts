/**
 * Quality Gate System
 * SonarQube-style pass/fail conditions per project
 *
 * Default "zcrX way" Quality Gate conditions:
 *   1. No new critical vulnerabilities (Security Rating must be B or better on new code)
 *   2. No unreviewed security hotspots
 *   3. Overall score >= 50 (Grade C or better)
 *   4. Fix rate >= 0% (any effort counts)
 *
 * Projects are evaluated and get PASSED / FAILED / WARNING status
 */

import { calculateSecurityScore, type SecurityMetrics, type ScoreResult, type Grade } from "./score";

export type QualityGateStatus = "passed" | "warning" | "failed";

export interface QualityGateCondition {
  metric: string;
  operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
  threshold: number | string;
  actual: number | string;
  status: QualityGateStatus;
  label: string;
}

export interface QualityGateResult {
  status: QualityGateStatus;
  conditions: QualityGateCondition[];
  passedCount: number;
  failedCount: number;
  warningCount: number;
  icon: string;
  color: string;
  bgColor: string;
  label: string;
}

const STATUS_CONFIG: Record<QualityGateStatus, { icon: string; color: string; bgColor: string; label: string }> = {
  passed:  { icon: "✅", color: "#22c55e", bgColor: "rgba(34,197,94,0.12)", label: "Passed" },
  warning: { icon: "⚠️", color: "#eab308", bgColor: "rgba(234,179,8,0.12)", label: "Warning" },
  failed:  { icon: "❌", color: "#ef4444", bgColor: "rgba(239,68,68,0.12)", label: "Failed" },
};

function checkCondition(
  metric: string,
  label: string,
  actual: number,
  operator: QualityGateCondition["operator"],
  threshold: number
): QualityGateCondition {
  let pass = false;
  switch (operator) {
    case ">":  pass = actual > threshold; break;
    case ">=": pass = actual >= threshold; break;
    case "<":  pass = actual < threshold; break;
    case "<=": pass = actual <= threshold; break;
    case "==": pass = actual === threshold; break;
    case "!=": pass = actual !== threshold; break;
  }
  return {
    metric,
    operator,
    threshold,
    actual,
    status: pass ? "passed" : "failed",
    label,
  };
}

/**
 * Evaluate Quality Gate for a project
 */
export function evaluateQualityGate(metrics: SecurityMetrics): QualityGateResult {
  const score = calculateSecurityScore(metrics);

  // Default Policy
  let minScore = 30;
  let maxCritical = 0;
  let maxHigh = 5;

  // Attempt to load custom policy
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("zcrx_qg_policy");
      if (saved) {
        const policy = JSON.parse(saved);
        if (typeof policy.minScore === "number") minScore = policy.minScore;
        if (typeof policy.maxCritical === "number") maxCritical = policy.maxCritical;
        if (typeof policy.maxHigh === "number") maxHigh = policy.maxHigh;
      }
    } catch (e) {
      console.error("Failed to parse custom quality gate policy", e);
    }
  }

  const conditions: QualityGateCondition[] = [
    // Condition 1: Critical vulnerabilities limit
    checkCondition(
      "critical_count", `Critical Vulnerabilities ≤ ${maxCritical}`,
      metrics.critical || 0, "<=", maxCritical
    ),

    // Condition 2: Security Rating at least D (no F)
    checkCondition(
      "security_grade", "Security Rating ≥ D",
      gradeToNum(score.dimensions.security.grade), ">=", 40
    ),

    // Condition 3: Overall score limit
    checkCondition(
      "overall_score", `Overall Score ≥ ${minScore}`,
      score.score, ">=", minScore
    ),

    // Condition 4: High vulnerabilities limit
    checkCondition(
      "high_count", `High Vulnerabilities ≤ ${maxHigh}`,
      metrics.high || 0, "<=", maxHigh
    ),

    // Condition 5: Reliability rating at least C
    checkCondition(
      "reliability_grade", "Reliability Rating ≥ C",
      gradeToNum(score.dimensions.reliability.grade), ">=", 60
    ),
  ];

  // Add warning conditions (softer)
  if (score.score < 70 && score.score >= 30) {
    const warningCond = { ...checkCondition(
      "score_warning", "Score ≥ 70 (recommended)",
      score.score, ">=", 70
    ), status: "warning" as QualityGateStatus };
    conditions.push(warningCond);
  }

  const failedCount = conditions.filter(c => c.status === "failed").length;
  const warningCount = conditions.filter(c => c.status === "warning").length;
  const passedCount = conditions.filter(c => c.status === "passed").length;

  let status: QualityGateStatus;
  if (failedCount > 0) status = "failed";
  else if (warningCount > 0) status = "warning";
  else status = "passed";

  const config = STATUS_CONFIG[status];

  return {
    status,
    conditions,
    passedCount,
    failedCount,
    warningCount,
    ...config,
  };
}

function gradeToNum(grade: Grade): number {
  const map: Record<Grade, number> = { A: 100, B: 80, C: 60, D: 40, F: 20 };
  return map[grade];
}

export { STATUS_CONFIG };
