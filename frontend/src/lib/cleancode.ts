/**
 * Clean Code Attribute Mapping
 * SonarQube 10+ taxonomy for tagging findings
 *
 * Clean Code Attributes:
 *   - Consistent: follows consistent patterns
 *   - Intentional: code is clear about intent
 *   - Adaptable: code can be easily changed
 *   - Responsible: handles resources/security properly
 *
 * Software Quality Impacts:
 *   - Security: vulnerability exploitability
 *   - Reliability: bug/crash risk
 *   - Maintainability: technical debt cost
 */

export type CleanCodeAttribute = "consistent" | "intentional" | "adaptable" | "responsible";
export type SoftwareQuality = "security" | "reliability" | "maintainability";

export interface CleanCodeTag {
  attribute: CleanCodeAttribute;
  quality: SoftwareQuality;
  attributeLabel: string;
  qualityLabel: string;
  attributeIcon: string;
  qualityIcon: string;
  attributeColor: string;
  qualityColor: string;
}

const ATTRIBUTE_CONFIG: Record<CleanCodeAttribute, { label: string; icon: string; color: string }> = {
  consistent:  { label: "Consistent",  icon: "📐", color: "#8b5cf6" },
  intentional: { label: "Intentional", icon: "🎯", color: "#3b82f6" },
  adaptable:   { label: "Adaptable",   icon: "🔄", color: "#22c55e" },
  responsible: { label: "Responsible", icon: "🛡️", color: "#f97316" },
};

const QUALITY_CONFIG: Record<SoftwareQuality, { label: string; icon: string; color: string }> = {
  security:        { label: "Security",        icon: "🔒", color: "#ef4444" },
  reliability:     { label: "Reliability",     icon: "⚡", color: "#f97316" },
  maintainability: { label: "Maintainability", icon: "🔧", color: "#eab308" },
};

/**
 * Map CWE/rule to Clean Code attributes
 * Based on SonarQube's classification logic
 */
const CWE_MAPPING: Record<string, { attribute: CleanCodeAttribute; quality: SoftwareQuality }> = {
  // Security vulnerabilities → Responsible + Security
  "CWE-89":   { attribute: "responsible", quality: "security" },     // SQL Injection
  "CWE-79":   { attribute: "responsible", quality: "security" },     // XSS
  "CWE-798":  { attribute: "responsible", quality: "security" },     // Hardcoded Credentials
  "CWE-918":  { attribute: "responsible", quality: "security" },     // SSRF
  "CWE-307":  { attribute: "responsible", quality: "security" },     // Brute Force
  "CWE-614":  { attribute: "responsible", quality: "security" },     // Insecure Cookie
  "CWE-1321": { attribute: "responsible", quality: "security" },     // Prototype Pollution
  "CWE-1333": { attribute: "responsible", quality: "reliability" },  // ReDoS

  // Bugs → various attributes + Reliability
  "CWE-362":  { attribute: "responsible", quality: "reliability" },  // Race Condition
  "CWE-476":  { attribute: "intentional", quality: "reliability" },  // Null Deref

  // Code smells → Maintainability
  "CWE-532":  { attribute: "intentional", quality: "maintainability" }, // Info Exposure through Log
  "CWE-1164": { attribute: "intentional", quality: "maintainability" }, // Incomplete TODO
  "S1192":    { attribute: "consistent",  quality: "maintainability" }, // Duplicated Code
};

/**
 * Get Clean Code tag for a finding based on its CWE/ruleId and issueType
 */
export function getCleanCodeTag(finding: {
  cweId?: string | null;
  ruleId?: string;
  issueType?: string;
  severity?: string;
}): CleanCodeTag {
  // Try CWE mapping first
  const key = finding.cweId || finding.ruleId || "";
  const mapping = CWE_MAPPING[key];

  if (mapping) {
    const attr = ATTRIBUTE_CONFIG[mapping.attribute];
    const qual = QUALITY_CONFIG[mapping.quality];
    return {
      attribute: mapping.attribute,
      quality: mapping.quality,
      attributeLabel: attr.label,
      qualityLabel: qual.label,
      attributeIcon: attr.icon,
      qualityIcon: qual.icon,
      attributeColor: attr.color,
      qualityColor: qual.color,
    };
  }

  // Fallback based on issue type
  const issueType = finding.issueType || "vulnerability";
  let attribute: CleanCodeAttribute = "responsible";
  let quality: SoftwareQuality = "security";

  if (issueType === "bug") {
    attribute = "intentional";
    quality = "reliability";
  } else if (issueType === "codeSmell") {
    attribute = "consistent";
    quality = "maintainability";
  } else if (issueType === "hotspot") {
    attribute = "responsible";
    quality = "security";
  }

  const attr = ATTRIBUTE_CONFIG[attribute];
  const qual = QUALITY_CONFIG[quality];
  return {
    attribute,
    quality,
    attributeLabel: attr.label,
    qualityLabel: qual.label,
    attributeIcon: attr.icon,
    qualityIcon: qual.icon,
    attributeColor: attr.color,
    qualityColor: qual.color,
  };
}

export { ATTRIBUTE_CONFIG, QUALITY_CONFIG };
