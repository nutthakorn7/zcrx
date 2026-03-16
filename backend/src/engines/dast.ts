import { nanoid } from "nanoid";
import { spawnSync, spawn } from "child_process";
import { mkdirSync, existsSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";
import { broadcast } from "../ws";

// Resolve nuclei binary path — prefer local tools/ binary
const LOCAL_NUCLEI = join(import.meta.dir, "../../tools/nuclei.exe");
const NUCLEI_BIN = existsSync(LOCAL_NUCLEI) ? LOCAL_NUCLEI : "nuclei";

interface DastFinding {
  id: string;
  scanId: string;
  projectId: string;
  type: "dast";
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

// Nuclei severity → our severity mapping
const SEVERITY_MAP: Record<string, DastFinding["severity"]> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  info: "info",
  unknown: "info",
};

/**
 * Check if Nuclei is installed
 */
function isNucleiInstalled(): boolean {
  try {
    const result = spawnSync(NUCLEI_BIN, ["-version"], {
      timeout: 5000,
      encoding: "utf-8",
      shell: true,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * DAST Engine — Nuclei-based Dynamic Application Security Testing
 * 
 * Uses ProjectDiscovery's Nuclei with 6,800+ community templates.
 * Falls back to custom HTTP checks if Nuclei is not installed.
 */
export interface DastOptions {
  templates?: string[];
  crawl?: boolean;
  authHeaders?: Record<string, string>;
  authCookies?: string;
  customTemplatePath?: string;
}

export async function runDastScan(
  scanId: string,
  projectId: string,
  targetUrl: string,
  options?: DastOptions
): Promise<DastFinding[]> {
  const now = new Date().toISOString();

  // Normalize URL
  let url = targetUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  console.log(`🌐 DAST scan starting for: ${url}`);
  broadcast({ type: "dast:progress", data: { scanId, message: `Starting DAST scan for ${url}`, phase: "init" } });

  if (isNucleiInstalled()) {
    console.log(`🔬 Nuclei detected — running Nuclei scan...`);
    broadcast({ type: "dast:progress", data: { scanId, message: "Nuclei detected, launching scanner...", phase: "nuclei" } });
    return runNucleiScan(scanId, projectId, url, now, options);
  } else {
    console.log(`⚠️ Nuclei not found — falling back to built-in HTTP checks`);
    broadcast({ type: "dast:progress", data: { scanId, message: "Nuclei not found, using built-in checks...", phase: "fallback" } });
    return runFallbackScan(scanId, projectId, url, now);
  }
}

/**
 * Nuclei-based scan — runs nuclei subprocess and parses JSON output
 */
async function runNucleiScan(
  scanId: string,
  projectId: string,
  url: string,
  now: string,
  options?: DastOptions
): Promise<DastFinding[]> {
  const findings: DastFinding[] = [];
  const tmpDir = join(import.meta.dir, "../../tmp");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const outputFile = join(tmpDir, `nuclei-${scanId}.json`);

  try {
    // Run Nuclei with JSONL output
    // -u: target URL
    // -jsonl: JSON Lines output
    // -severity: scan for all severities
    // -stats: show progress
    // -silent: minimal console output
    // -timeout: per-request timeout
    // -bulk-size: concurrent requests
    // -rate-limit: max requests per second
    // Build CLI args
    const args = [
      "-u", url,
      "-jsonl",
      "-o", outputFile,
      "-severity", "critical,high,medium,low,info",
      "-timeout", "10",
      "-bulk-size", "25",
      "-rate-limit", "50",
      "-silent",
      "-no-color",
    ];

    // Crawl mode — discover more pages
    if (options?.crawl) {
      args.push("-headless");
      broadcast({ type: "dast:progress", data: { scanId, message: "Crawl mode enabled (headless)", phase: "crawl" } });
    }

    // Template filtering
    if (options?.templates && options.templates.length > 0) {
      args.push("-tags", options.templates.join(","));
    }

    // Custom template path
    if (options?.customTemplatePath) {
      args.push("-t", options.customTemplatePath);
    }

    // Auth headers
    if (options?.authHeaders) {
      for (const [key, value] of Object.entries(options.authHeaders)) {
        args.push("-H", `${key}: ${value}`);
      }
    }

    // Auth cookies
    if (options?.authCookies) {
      args.push("-H", `Cookie: ${options.authCookies}`);
    }

    const templateDesc = options?.templates?.length ? options.templates.join(", ") : "all";
    broadcast({ type: "dast:progress", data: { scanId, message: `Running Nuclei (${templateDesc} templates)...`, phase: "scanning" } });

    // Use spawn for live output streaming
    const nucleiFindings = await new Promise<DastFinding[]>((resolve) => {
      const child = spawn(NUCLEI_BIN, args, {
        shell: true,
        cwd: tmpDir,
      });

      let lineCount = 0;
      child.stderr?.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          broadcast({ type: "dast:live", data: { scanId, output: msg } });
        }
      });

      child.stdout?.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          lineCount++;
          broadcast({ type: "dast:live", data: { scanId, output: msg, lineCount } });
        }
      });

      child.on("close", () => {
        const localFindings: DastFinding[] = [];
        if (existsSync(outputFile)) {
          const rawOutput = readFileSync(outputFile, "utf-8");
          const lines = rawOutput.trim().split("\n").filter(Boolean);
          for (const line of lines) {
            try {
              const r = JSON.parse(line);
              const finding = nucleiResultToFinding(r, scanId, projectId, now);
              if (finding) localFindings.push(finding);
            } catch {}
          }
          try { unlinkSync(outputFile); } catch {}
        }
        resolve(localFindings);
      });

      // Timeout fallback
      setTimeout(() => {
        try { child.kill(); } catch {}
      }, 300000);
    });

    console.log(`🔬 Nuclei scan completed: ${nucleiFindings.length} findings`);
    broadcast({ type: "dast:progress", data: { scanId, message: `Nuclei scan completed: ${nucleiFindings.length} findings`, phase: "done", findingsCount: nucleiFindings.length } });
    return nucleiFindings;
  } catch (error: any) {
    console.error(`🔬 Nuclei error:`, error.message);
    return [makeFinding(scanId, projectId, now, {
      severity: "info",
      title: "Nuclei scan encountered an error",
      description: `Nuclei scan failed: ${error.message}`,
      ruleId: "NUCLEI-ERR",
      cweId: null,
      recommendation: "Check Nuclei installation and try again.",
      code: error.message,
    })];
  }
}

/**
 * Convert a Nuclei JSON result to our DastFinding format
 */
function nucleiResultToFinding(
  result: any,
  scanId: string,
  projectId: string,
  now: string
): DastFinding | null {
  if (!result || !result.info) return null;

  const info = result.info;
  const severity = SEVERITY_MAP[info.severity?.toLowerCase()] || "info";

  // Extract CWE if available
  let cweId: string | null = null;
  if (info.classification?.["cwe-id"]) {
    const cweIds = info.classification["cwe-id"];
    cweId = Array.isArray(cweIds) ? cweIds[0] : cweIds;
  }

  // Build recommendation from tags and references
  let recommendation = info.remediation || null;
  if (!recommendation && info.reference && Array.isArray(info.reference)) {
    recommendation = `References: ${info.reference.slice(0, 3).join(", ")}`;
  }

  return {
    id: nanoid(),
    scanId,
    projectId,
    type: "dast",
    severity,
    status: "open",
    title: info.name || result["template-id"] || "Unknown finding",
    description: info.description || `Detected by Nuclei template: ${result["template-id"]}`,
    filePath: result["matched-at"] || result.host || null,
    line: null,
    code: result["matched-at"] || result.curl_command || null,
    ruleId: result["template-id"] || null,
    cweId,
    recommendation,
    createdAt: now,
  };
}

// ═══════════════════════════════════════════════════════════
// Fallback: Built-in HTTP checks (when Nuclei is not installed)
// ═══════════════════════════════════════════════════════════

async function runFallbackScan(
  scanId: string,
  projectId: string,
  url: string,
  now: string
): Promise<DastFinding[]> {
  const findings: DastFinding[] = [];

  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    const headers = response.headers;
    const body = await response.text();

    // Check 1: HTTPS
    if (url.startsWith("http://")) {
      findings.push(makeFinding(scanId, projectId, now, {
        severity: "high",
        title: "Application served over HTTP (no TLS/SSL)",
        description: "The application does not enforce HTTPS.",
        ruleId: "DAST-001",
        cweId: "CWE-319",
        recommendation: "Enable HTTPS with a valid TLS certificate.",
        code: `URL: ${url} (Protocol: HTTP)`,
      }));
    }

    // Check 2: Security Headers
    const headerChecks = [
      { header: "strict-transport-security", title: "Missing HSTS header", severity: "high" as const, ruleId: "DAST-002", cweId: "CWE-523", recommendation: "Add Strict-Transport-Security header." },
      { header: "x-content-type-options", title: "Missing X-Content-Type-Options", severity: "medium" as const, ruleId: "DAST-003", cweId: "CWE-16", recommendation: "Add X-Content-Type-Options: nosniff." },
      { header: "x-frame-options", title: "Missing X-Frame-Options (Clickjacking)", severity: "medium" as const, ruleId: "DAST-004", cweId: "CWE-1021", recommendation: "Add X-Frame-Options: DENY." },
      { header: "content-security-policy", title: "Missing Content-Security-Policy", severity: "medium" as const, ruleId: "DAST-005", cweId: "CWE-693", recommendation: "Implement a Content-Security-Policy." },
      { header: "referrer-policy", title: "Missing Referrer-Policy", severity: "low" as const, ruleId: "DAST-007", cweId: "CWE-200", recommendation: "Add Referrer-Policy header." },
      { header: "permissions-policy", title: "Missing Permissions-Policy", severity: "low" as const, ruleId: "DAST-008", cweId: "CWE-16", recommendation: "Add Permissions-Policy header." },
    ];

    for (const check of headerChecks) {
      if (!headers.get(check.header)) {
        findings.push(makeFinding(scanId, projectId, now, {
          severity: check.severity,
          title: check.title,
          description: `Missing '${check.header}' header from ${url}`,
          ruleId: check.ruleId,
          cweId: check.cweId,
          recommendation: check.recommendation,
          code: `${check.header} = (not set)`,
        }));
      }
    }

    // Check 3: Server disclosure
    const server = headers.get("server");
    if (server && /\d/.test(server)) {
      findings.push(makeFinding(scanId, projectId, now, {
        severity: "low",
        title: "Server version disclosed",
        description: `Server header: "${server}"`,
        ruleId: "DAST-009",
        cweId: "CWE-200",
        recommendation: "Remove version from Server header.",
        code: `Server: ${server}`,
      }));
    }

    const poweredBy = headers.get("x-powered-by");
    if (poweredBy) {
      findings.push(makeFinding(scanId, projectId, now, {
        severity: "low",
        title: "X-Powered-By disclosed",
        description: `X-Powered-By: "${poweredBy}"`,
        ruleId: "DAST-010",
        cweId: "CWE-200",
        recommendation: "Remove X-Powered-By header.",
        code: `X-Powered-By: ${poweredBy}`,
      }));
    }

    // Check 4: Cookie security
    const cookies = headers.getSetCookie?.() || [];
    for (const cookie of cookies) {
      const cookieName = cookie.split("=")[0];
      if (!cookie.toLowerCase().includes("httponly")) {
        findings.push(makeFinding(scanId, projectId, now, {
          severity: "medium", title: `Cookie '${cookieName}' missing HttpOnly`,
          description: "Cookie accessible by JavaScript.", ruleId: "DAST-011", cweId: "CWE-1004",
          recommendation: `Set HttpOnly on '${cookieName}'.`, code: `Set-Cookie: ${cookie.slice(0, 80)}`,
        }));
      }
      if (!cookie.toLowerCase().includes("secure")) {
        findings.push(makeFinding(scanId, projectId, now, {
          severity: "medium", title: `Cookie '${cookieName}' missing Secure flag`,
          description: "Cookie sent over unencrypted connections.", ruleId: "DAST-012", cweId: "CWE-614",
          recommendation: `Set Secure on '${cookieName}'.`, code: `Set-Cookie: ${cookie.slice(0, 80)}`,
        }));
      }
    }

    // Check 5: CSRF
    const formCount = (body.match(/<form/gi) || []).length;
    const csrfCount = (body.match(/csrf|_token|authenticity_token/gi) || []).length;
    if (formCount > 0 && csrfCount === 0) {
      findings.push(makeFinding(scanId, projectId, now, {
        severity: "high", title: "Forms without CSRF protection",
        description: `${formCount} form(s) without CSRF tokens.`, ruleId: "DAST-014", cweId: "CWE-352",
        recommendation: "Add CSRF tokens to forms.", code: `Forms: ${formCount}, CSRF tokens: ${csrfCount}`,
      }));
    }

    // Check 6: Sensitive paths
    const sensitivePaths = [
      { path: "/.env", name: "Environment file" },
      { path: "/.git/HEAD", name: "Git repository" },
      { path: "/wp-admin", name: "WordPress admin" },
    ];
    for (const sp of sensitivePaths) {
      try {
        const r = await fetch(`${url}${sp.path}`, { redirect: "manual", signal: AbortSignal.timeout(3000) });
        if (r.status === 200) {
          findings.push(makeFinding(scanId, projectId, now, {
            severity: "critical", title: `${sp.name} exposed at ${sp.path}`,
            description: `${sp.path} returned 200 OK.`, ruleId: "DAST-015", cweId: "CWE-538",
            recommendation: `Block access to ${sp.path}.`, code: `GET ${url}${sp.path} → HTTP ${r.status}`,
          }));
        }
      } catch {}
    }

    console.log(`🌐 Fallback DAST scan completed: ${findings.length} findings`);
  } catch (error: any) {
    console.error(`🌐 DAST scan error:`, error.message);
    findings.push(makeFinding(scanId, projectId, now, {
      severity: "info", title: "Target unreachable",
      description: `Could not connect to ${url}: ${error.message}`, ruleId: "DAST-000", cweId: null,
      recommendation: "Verify the target URL.", code: `Error: ${error.message}`,
    }));
  }

  return findings;
}

function makeFinding(
  scanId: string,
  projectId: string,
  now: string,
  opts: {
    severity: DastFinding["severity"];
    title: string;
    description: string;
    ruleId: string;
    cweId: string | null;
    recommendation: string;
    code: string;
  }
): DastFinding {
  return {
    id: nanoid(), scanId, projectId, type: "dast", severity: opts.severity,
    status: "open", title: opts.title, description: opts.description,
    filePath: null, line: null, code: opts.code, ruleId: opts.ruleId,
    cweId: opts.cweId, recommendation: opts.recommendation, createdAt: now,
  };
}
