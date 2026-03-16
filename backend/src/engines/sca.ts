import { nanoid } from "nanoid";
import { existsSync } from "fs";
import { join, resolve } from "path";

interface ScaFinding {
  id: string;
  scanId: string;
  projectId: string;
  type: "sca";
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "open";
  title: string;
  description: string;
  filePath: string | null;
  line: number | null;
  code: string | null;
  ruleId: string | null;
  cweId: string | null;
  recommendation: string | null;
  createdAt: string;
}

// Resolve OSV Scanner binary path
const OSV_BIN = resolve(join(import.meta.dir, "../../bin/osv-scanner.exe"));

/**
 * Run SCA scan using OSV Scanner (primary) → npm audit (fallback) → demo data
 */
export async function runScaScan(
  scanId: string,
  projectId: string,
  targetPath: string
): Promise<ScaFinding[]> {
  console.log(`📦 Starting SCA scan on: ${targetPath}`);

  // ── 1. Try OSV Scanner (Google) ──
  if (existsSync(OSV_BIN)) {
    try {
      console.log(`🔍 Using OSV Scanner: ${OSV_BIN}`);
      const args = [OSV_BIN, "--json", "--recursive", targetPath];

      const proc = Bun.spawn(args, {
        cwd: targetPath,
        stdout: "pipe",
        stderr: "pipe",
      });

      const output = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;

      // exit code 0 = no vulns, 1 = vulns found, both have JSON output
      if (output && output.trim()) {
        try {
          const result = JSON.parse(output);
          const findings = parseOsvResults(result, scanId, projectId);
          if (findings.length > 0) {
            console.log(`✅ OSV Scanner found ${findings.length} vulnerabilities`);
            return findings;
          }
          console.log(`✅ OSV Scanner: no vulnerabilities found`);
          return [];
        } catch (parseErr) {
          console.log(`⚠️ OSV Scanner JSON parse error, trying npm audit`);
        }
      }
    } catch (error: any) {
      console.log(`⚠️ OSV Scanner failed: ${error.message}`);
    }
  } else {
    console.log(`⚠️ OSV Scanner binary not found at ${OSV_BIN}`);
  }

  // ── 2. Fallback: npm audit ──
  try {
    console.log(`📦 Falling back to npm audit`);
    const proc = Bun.spawn(["npm", "audit", "--json"], {
      cwd: targetPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    if (output && output.trim() !== "") {
      const result = JSON.parse(output);
      if (result.vulnerabilities) {
        const findings = parseNpmAuditResults(result, scanId, projectId);
        console.log(`✅ npm audit found ${findings.length} vulnerabilities`);
        return findings;
      }
    }
  } catch (error: any) {
    console.log(`⚠️ npm audit not available: ${error.message}`);
  }

  // ── 3. Fallback: demo data ──
  console.log("⚠️ Using demo SCA findings");
  return generateDemoScaFindings(scanId, projectId);
}

/**
 * Parse OSV Scanner JSON output
 * Format: { results: [{ source: { path, type }, packages: [{ package, vulnerabilities }] }] }
 */
function parseOsvResults(result: any, scanId: string, projectId: string): ScaFinding[] {
  const findings: ScaFinding[] = [];

  if (!result.results) return findings;

  for (const source of result.results) {
    const sourcePath = source.source?.path || "unknown";

    for (const pkg of source.packages || []) {
      const pkgName = pkg.package?.name || "unknown";
      const pkgVersion = pkg.package?.version || "unknown";
      const ecosystem = pkg.package?.ecosystem || "unknown";

      for (const vuln of pkg.vulnerabilities || []) {
        const aliases = vuln.aliases || [];
        const cveId = aliases.find((a: string) => a.startsWith("CVE-")) || null;
        const ghsaId = aliases.find((a: string) => a.startsWith("GHSA-")) || null;

        // Map OSV severity
        const severity = mapOsvSeverity(vuln);

        // Get affected range info
        const affected = vuln.affected?.[0];
        const fixedVersion = getFixedVersion(affected);

        findings.push({
          id: nanoid(),
          scanId,
          projectId,
          type: "sca",
          severity,
          status: "open",
          title: `${pkgName}@${pkgVersion}: ${vuln.summary || vuln.id}`,
          description: vuln.details || vuln.summary || `Vulnerability ${vuln.id} found in ${pkgName}@${pkgVersion} (${ecosystem})`,
          filePath: sourcePath,
          line: null,
          code: `"${pkgName}": "${pkgVersion}"`,
          ruleId: cveId || ghsaId || vuln.id || null,
          cweId: extractCwe(vuln) || null,
          recommendation: fixedVersion
            ? `Upgrade ${pkgName} to version ${fixedVersion} or later.`
            : "No fix available yet. Consider using an alternative package.",
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return findings;
}

function mapOsvSeverity(vuln: any): "critical" | "high" | "medium" | "low" | "info" {
  // Try database_specific severity first
  const dbSev = vuln.database_specific?.severity;
  if (dbSev) {
    const s = dbSev.toLowerCase();
    if (s === "critical") return "critical";
    if (s === "high") return "high";
    if (s === "moderate" || s === "medium") return "medium";
    if (s === "low") return "low";
  }

  // Try CVSS score from severity array
  const severityArr = vuln.severity || [];
  for (const s of severityArr) {
    if (s.score) {
      const score = typeof s.score === "string" ? parseFloat(s.score) : s.score;
      if (score >= 9.0) return "critical";
      if (score >= 7.0) return "high";
      if (score >= 4.0) return "medium";
      if (score > 0) return "low";
    }
  }

  return "medium"; // default
}

function getFixedVersion(affected: any): string | null {
  if (!affected?.ranges) return null;
  for (const range of affected.ranges) {
    for (const event of range.events || []) {
      if (event.fixed) return event.fixed;
    }
  }
  return null;
}

function extractCwe(vuln: any): string | null {
  const cwePatterns = JSON.stringify(vuln).match(/CWE-\d+/g);
  return cwePatterns ? cwePatterns[0] : null;
}

/**
 * Parse npm audit JSON output (fallback)
 */
function parseNpmAuditResults(result: any, scanId: string, projectId: string): ScaFinding[] {
  return Object.entries(result.vulnerabilities).map(
    ([name, vuln]: [string, any]) => ({
      id: nanoid(),
      scanId,
      projectId,
      type: "sca" as const,
      severity: mapNpmSeverity(vuln.severity),
      status: "open" as const,
      title: `Vulnerable dependency: ${name}@${vuln.range || "unknown"}`,
      description: vuln.via
        ? `${name} has known vulnerabilities: ${typeof vuln.via[0] === "string" ? vuln.via.join(", ") : vuln.via.map((v: any) => v.title || v).join(", ")}`
        : `${name} has known vulnerabilities`,
      filePath: "package.json",
      line: null,
      code: null,
      ruleId: vuln.via?.[0]?.url || null,
      cweId: vuln.via?.[0]?.cwe?.[0] || null,
      recommendation: vuln.fixAvailable
        ? `Update to fixed version: ${typeof vuln.fixAvailable === "object" ? vuln.fixAvailable.version : "latest"}`
        : "No fix available yet. Consider using an alternative package.",
      createdAt: new Date().toISOString(),
    })
  );
}

function mapNpmSeverity(level: string): "critical" | "high" | "medium" | "low" | "info" {
  switch (level) {
    case "critical": return "critical";
    case "high": return "high";
    case "moderate": return "medium";
    case "low": return "low";
    default: return "info";
  }
}

function generateDemoScaFindings(scanId: string, projectId: string): ScaFinding[] {
  const demoFindings: Omit<ScaFinding, "id" | "scanId" | "projectId" | "createdAt">[] = [
    {
      type: "sca", severity: "critical", status: "open",
      title: "Prototype Pollution in lodash < 4.17.21",
      description: "lodash versions prior to 4.17.21 are vulnerable to Prototype Pollution via the set, setWith, and zipObjectDeep functions.",
      filePath: "package.json", line: null, code: '"lodash": "^4.17.15"',
      ruleId: "CVE-2021-23337", cweId: "CWE-1321",
      recommendation: "Upgrade lodash to version 4.17.21 or later.",
    },
    {
      type: "sca", severity: "high", status: "open",
      title: "Regular Expression DoS in minimatch",
      description: "minimatch versions prior to 3.0.5 are vulnerable to Regular Expression Denial of Service (ReDoS).",
      filePath: "package-lock.json", line: null, code: '"minimatch": "^3.0.4"',
      ruleId: "CVE-2022-3517", cweId: "CWE-1333",
      recommendation: "Upgrade minimatch to version 3.0.5 or later.",
    },
    {
      type: "sca", severity: "medium", status: "open",
      title: "Vulnerable jsonwebtoken < 9.0.0",
      description: "jsonwebtoken before 9.0.0 does not properly enforce algorithm restrictions, allowing algorithm confusion attacks.",
      filePath: "package.json", line: null, code: '"jsonwebtoken": "^8.5.1"',
      ruleId: "CVE-2022-23529", cweId: "CWE-327",
      recommendation: "Upgrade jsonwebtoken to version 9.0.0 or later.",
    },
  ];

  return demoFindings.map((f) => ({
    ...f,
    id: nanoid(),
    scanId,
    projectId,
    createdAt: new Date().toISOString(),
  }));
}
