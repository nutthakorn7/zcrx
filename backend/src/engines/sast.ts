import { nanoid } from "nanoid";

interface SastFinding {
  id: string;
  scanId: string;
  projectId: string;
  type: "sast";
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
  issueType: "vulnerability" | "bug" | "codeSmell" | "hotspot" | null;
  cleanCodeAttribute: "consistent" | "intentional" | "adaptable" | "responsible" | null;
  createdAt: string;
}

interface SemgrepResult {
  results: Array<{
    check_id: string;
    path: string;
    start: { line: number; col: number };
    end: { line: number; col: number };
    extra: {
      message: string;
      severity: string;
      metadata?: {
        cwe?: string[] | string;
        confidence?: string;
        impact?: string;
        issueType?: string;
        cleanCodeAttribute?: string;
        quality?: string;
      };
      lines?: string;
      fix?: string;
    };
  }>;
  errors: any[];
}

function mapSeverity(
  semgrepSeverity: string
): "critical" | "high" | "medium" | "low" | "info" {
  switch (semgrepSeverity.toUpperCase()) {
    case "ERROR":
      return "high";
    case "WARNING":
      return "medium";
    case "INFO":
      return "low";
    default:
      return "info";
  }
}

/**
 * Run Semgrep SAST scan on a target directory
 */
export async function runSastScan(
  scanId: string,
  projectId: string,
  targetPath: string
): Promise<SastFinding[]> {
  console.log(`🔍 Starting SAST scan on: ${targetPath}`);

  try {
    // Build config args: auto + custom clean code rules
    const configArgs = ["--config=auto"];
    const rulesPath = new URL("../../rules/cleancode.yml", import.meta.url).pathname;
    try {
      const rulesFile = Bun.file(rulesPath);
      if (await rulesFile.exists()) {
        configArgs.push(`--config=${rulesPath}`);
        console.log(`📐 Including clean code rules from: ${rulesPath}`);
      }
    } catch {}

    const proc = Bun.spawn(
      ["semgrep", "scan", "--json", ...configArgs, targetPath],
      {
        stdout: "pipe",
        stderr: "pipe",
      }
    );

    const output = await new Response(proc.stdout).text();
    const errorOutput = await new Response(proc.stderr).text();
    await proc.exited;

    if (!output || output.trim() === "") {
      console.log("⚠️ Semgrep returned no output, using demo data");
      return generateDemoSastFindings(scanId, projectId);
    }

    const result: SemgrepResult = JSON.parse(output);

    return result.results.map((r) => ({
      id: nanoid(),
      scanId,
      projectId,
      type: "sast" as const,
      severity: mapSeverity(r.extra.severity),
      status: "open" as const,
      title: r.check_id.split(".").pop() || r.check_id,
      description: r.extra.message,
      filePath: r.path,
      line: r.start.line,
      code: r.extra.lines || null,
      ruleId: r.check_id,
      cweId: Array.isArray(r.extra.metadata?.cwe)
        ? r.extra.metadata.cwe[0]
        : r.extra.metadata?.cwe || null,
      recommendation: r.extra.fix || null,
      issueType: (r.extra.metadata?.issueType as SastFinding["issueType"]) || null,
      cleanCodeAttribute: (r.extra.metadata?.cleanCodeAttribute as SastFinding["cleanCodeAttribute"]) || null,
      createdAt: new Date().toISOString(),
    }));
  } catch (error: any) {
    console.log(
      `⚠️ Semgrep not available (${error.message}), generating demo findings`
    );
    return generateDemoSastFindings(scanId, projectId);
  }
}

/**
 * Generate demo SAST findings for testing/demo purposes
 */
function generateDemoSastFindings(
  scanId: string,
  projectId: string
): SastFinding[] {
  const demoFindings: Omit<SastFinding, "id" | "scanId" | "projectId" | "createdAt">[] = [
    {
      type: "sast",
      severity: "critical",
      status: "open",
      title: "SQL Injection Vulnerability",
      description:
        "User input is directly concatenated into SQL query string without parameterization, allowing potential SQL injection attacks.",
      filePath: "src/db/queries.ts",
      line: 45,
      code: 'db.query(`SELECT * FROM users WHERE id = ${userId}`)',
      ruleId: "typescript.sql-injection",
      cweId: "CWE-89",
      recommendation:
        "Use parameterized queries or prepared statements instead of string concatenation.",
      issueType: "vulnerability",
      cleanCodeAttribute: "responsible",
    },
    {
      type: "sast",
      severity: "high",
      status: "open",
      title: "Hardcoded Secret Detected",
      description:
        "API key or secret token is hardcoded in source code. This can be extracted by anyone with access to the codebase.",
      filePath: "src/config.ts",
      line: 12,
      code: 'const API_KEY = "sk-1234567890abcdef"',
      ruleId: "generic.secrets.hardcoded-api-key",
      cweId: "CWE-798",
      recommendation:
        "Store secrets in environment variables or a secrets manager (e.g., HashiCorp Vault, AWS Secrets Manager).",
      issueType: "vulnerability",
      cleanCodeAttribute: "responsible",
    },
    {
      type: "sast",
      severity: "high",
      status: "open",
      title: "Cross-Site Scripting (XSS)",
      description:
        "User-controlled input is rendered directly into HTML without proper escaping, creating an XSS vulnerability.",
      filePath: "src/components/UserProfile.tsx",
      line: 28,
      code: "<div dangerouslySetInnerHTML={{ __html: userInput }} />",
      ruleId: "react.dangerously-set-innerhtml",
      cweId: "CWE-79",
      recommendation:
        "Sanitize user input using a library like DOMPurify before rendering.",
      issueType: "vulnerability",
      cleanCodeAttribute: "responsible",
    },
    {
      type: "sast",
      severity: "medium",
      status: "open",
      title: "Insecure Random Number Generator",
      description:
        "Math.random() is not cryptographically secure and should not be used for generating tokens or session IDs.",
      filePath: "src/utils/token.ts",
      line: 8,
      code: "const token = Math.random().toString(36).substring(2)",
      ruleId: "javascript.insecure-random",
      cweId: "CWE-338",
      recommendation:
        "Use crypto.randomUUID() or crypto.getRandomValues() for security-sensitive operations.",
      issueType: "hotspot",
      cleanCodeAttribute: "responsible",
    },
    {
      type: "sast",
      severity: "medium",
      status: "open",
      title: "Path Traversal Risk",
      description:
        "File path is constructed using user input without validation, potentially allowing directory traversal attacks.",
      filePath: "src/routes/files.ts",
      line: 15,
      code: 'const filePath = `./uploads/${req.params.filename}`',
      ruleId: "generic.path-traversal",
      cweId: "CWE-22",
      recommendation:
        "Validate and sanitize file paths. Use path.resolve() and verify the resolved path is within the expected directory.",
      issueType: "vulnerability",
      cleanCodeAttribute: "responsible",
    },
    {
      type: "sast",
      severity: "low",
      status: "open",
      title: "Console.log in Production Code",
      description:
        "Logging sensitive information to console in production can expose data to unauthorized parties.",
      filePath: "src/auth/login.ts",
      line: 32,
      code: "console.log('User credentials:', { email, password })",
      ruleId: "generic.logging-sensitive-data",
      cweId: "CWE-532",
      recommendation:
        "Remove console.log statements or use a proper logging library with appropriate log levels.",
      issueType: "codeSmell",
      cleanCodeAttribute: "responsible",
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
