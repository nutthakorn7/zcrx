/**
 * OWASP Top 10 (2021) — mapping from CWE IDs and keywords to OWASP categories.
 * Used across dashboard, findings, reports, and DAST scanning.
 */

export const OWASP_TOP_10 = [
  {
    id: "A01",
    name: "Broken Access Control",
    color: "#ef4444",
    icon: "🔓",
    cwes: ["CWE-22", "CWE-23", "CWE-35", "CWE-59", "CWE-200", "CWE-201", "CWE-219", "CWE-264", "CWE-275", "CWE-276", "CWE-284", "CWE-285", "CWE-352", "CWE-359", "CWE-377", "CWE-402", "CWE-425", "CWE-441", "CWE-497", "CWE-538", "CWE-540", "CWE-548", "CWE-552", "CWE-566", "CWE-601", "CWE-639", "CWE-651", "CWE-668", "CWE-706", "CWE-862", "CWE-863", "CWE-913", "CWE-922", "CWE-1275"],
    keywords: ["access control", "unauthorized", "privilege", "path traversal", "directory traversal", "idor", "csrf", "cors"],
  },
  {
    id: "A02",
    name: "Cryptographic Failures",
    color: "#f97316",
    icon: "🔐",
    cwes: ["CWE-261", "CWE-296", "CWE-310", "CWE-319", "CWE-321", "CWE-322", "CWE-323", "CWE-324", "CWE-325", "CWE-326", "CWE-327", "CWE-328", "CWE-329", "CWE-330", "CWE-331", "CWE-335", "CWE-336", "CWE-337", "CWE-338", "CWE-340", "CWE-347", "CWE-523", "CWE-720", "CWE-757", "CWE-759", "CWE-760", "CWE-780", "CWE-818", "CWE-916"],
    keywords: ["crypto", "encryption", "ssl", "tls", "certificate", "hash", "cleartext", "plaintext", "weak cipher"],
  },
  {
    id: "A03",
    name: "Injection",
    color: "#dc2626",
    icon: "💉",
    cwes: ["CWE-20", "CWE-74", "CWE-75", "CWE-77", "CWE-78", "CWE-79", "CWE-80", "CWE-83", "CWE-87", "CWE-88", "CWE-89", "CWE-90", "CWE-91", "CWE-93", "CWE-94", "CWE-95", "CWE-96", "CWE-97", "CWE-98", "CWE-99", "CWE-100", "CWE-113", "CWE-116", "CWE-138", "CWE-184", "CWE-470", "CWE-471", "CWE-564", "CWE-610", "CWE-643", "CWE-644", "CWE-652", "CWE-917"],
    keywords: ["injection", "xss", "sql injection", "command injection", "code injection", "ldap", "xpath", "ssti"],
  },
  {
    id: "A04",
    name: "Insecure Design",
    color: "#a855f7",
    icon: "📐",
    cwes: ["CWE-73", "CWE-183", "CWE-209", "CWE-213", "CWE-235", "CWE-256", "CWE-257", "CWE-266", "CWE-269", "CWE-280", "CWE-311", "CWE-312", "CWE-313", "CWE-316", "CWE-419", "CWE-430", "CWE-434", "CWE-444", "CWE-451", "CWE-472", "CWE-501", "CWE-522", "CWE-525", "CWE-539", "CWE-579", "CWE-598", "CWE-602", "CWE-642", "CWE-646", "CWE-650", "CWE-653", "CWE-656", "CWE-657", "CWE-799", "CWE-807", "CWE-840", "CWE-841", "CWE-927", "CWE-1021", "CWE-1173"],
    keywords: ["insecure design", "business logic", "threat model"],
  },
  {
    id: "A05",
    name: "Security Misconfiguration",
    color: "#eab308",
    icon: "⚙️",
    cwes: ["CWE-2", "CWE-11", "CWE-13", "CWE-15", "CWE-16", "CWE-260", "CWE-315", "CWE-520", "CWE-526", "CWE-537", "CWE-541", "CWE-547", "CWE-611", "CWE-614", "CWE-756", "CWE-776", "CWE-942", "CWE-1004", "CWE-1032", "CWE-1174"],
    keywords: ["misconfiguration", "default", "debug", "stack trace", "error message", "verbose error", "directory listing", "exposed", "unnecessary", "missing header", "security header"],
  },
  {
    id: "A06",
    name: "Vulnerable Components",
    color: "#f59e0b",
    icon: "📦",
    cwes: ["CWE-937", "CWE-1035", "CWE-1104"],
    keywords: ["vulnerable component", "outdated", "dependency", "library", "package", "version", "cve-", "known vulnerability"],
  },
  {
    id: "A07",
    name: "Auth Failures",
    color: "#ec4899",
    icon: "🔑",
    cwes: ["CWE-255", "CWE-259", "CWE-287", "CWE-288", "CWE-290", "CWE-294", "CWE-295", "CWE-297", "CWE-300", "CWE-302", "CWE-304", "CWE-306", "CWE-307", "CWE-346", "CWE-384", "CWE-521", "CWE-613", "CWE-620", "CWE-640", "CWE-798", "CWE-940", "CWE-1216"],
    keywords: ["authentication", "login", "password", "credential", "session", "brute force", "default login", "weak password"],
  },
  {
    id: "A08",
    name: "Integrity Failures",
    color: "#6366f1",
    icon: "🔄",
    cwes: ["CWE-345", "CWE-353", "CWE-426", "CWE-494", "CWE-502", "CWE-565", "CWE-784", "CWE-829", "CWE-830", "CWE-915"],
    keywords: ["deserialization", "integrity", "ci/cd", "pipeline", "supply chain", "unsigned"],
  },
  {
    id: "A09",
    name: "Logging & Monitoring",
    color: "#14b8a6",
    icon: "📊",
    cwes: ["CWE-117", "CWE-223", "CWE-532", "CWE-778"],
    keywords: ["logging", "monitoring", "audit", "log injection", "insufficient logging"],
  },
  {
    id: "A10",
    name: "SSRF",
    color: "#8b5cf6",
    icon: "🌐",
    cwes: ["CWE-918"],
    keywords: ["ssrf", "server-side request forgery", "request forgery"],
  },
];

/**
 * Map a finding to its OWASP Top 10 category.
 * Checks CWE ID first, then falls back to keyword matching.
 */
export function mapToOwasp(finding: { cweId?: string | null; title?: string; description?: string; ruleId?: string }): typeof OWASP_TOP_10[0] | null {
  const cwe = finding.cweId?.toUpperCase() || "";
  const text = `${finding.title || ""} ${finding.description || ""} ${finding.ruleId || ""}`.toLowerCase();

  // 1. Match by CWE ID
  for (const cat of OWASP_TOP_10) {
    if (cwe && cat.cwes.includes(cwe)) return cat;
  }

  // 2. Match by keywords
  for (const cat of OWASP_TOP_10) {
    if (cat.keywords.some(kw => text.includes(kw))) return cat;
  }

  return null;
}

/**
 * Map multiple findings to OWASP Top 10 coverage summary
 */
export function getOwaspCoverage(findingsList: any[]): { category: typeof OWASP_TOP_10[0]; count: number; findings: any[] }[] {
  return OWASP_TOP_10.map(cat => {
    const matched = findingsList.filter(f => mapToOwasp(f)?.id === cat.id);
    return { category: cat, count: matched.length, findings: matched };
  });
}
