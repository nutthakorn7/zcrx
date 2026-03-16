// zcrX Shared Types — ใช้ร่วมกันระหว่าง Frontend & Backend

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type ScanType = "sast" | "sca" | "sbom" | "dast";
export type ScanStatus = "pending" | "running" | "completed" | "failed";
export type FindingStatus = "open" | "confirmed" | "false_positive" | "fixed";

export interface Project {
  id: string;
  name: string;
  description?: string;
  repoUrl?: string;
  language?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Scan {
  id: string;
  projectId: string;
  type: ScanType;
  status: ScanStatus;
  findingsCount: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  startedAt: string;
  completedAt?: string;
}

export interface Finding {
  id: string;
  scanId: string;
  projectId: string;
  type: ScanType;
  severity: Severity;
  status: FindingStatus;
  title: string;
  description: string;
  filePath?: string;
  line?: number;
  code?: string;
  ruleId?: string;
  cweId?: string;
  recommendation?: string;
  createdAt: string;
}

export interface Dependency {
  id: string;
  projectId: string;
  name: string;
  version: string;
  latestVersion?: string;
  license?: string;
  vulnerabilities: number;
}

export interface DashboardStats {
  totalProjects: number;
  totalScans: number;
  totalFindings: number;
  openFindings: number;
  bySeverity: Record<Severity, number>;
  recentScans: Scan[];
}
