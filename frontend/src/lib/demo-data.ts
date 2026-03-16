/**
 * Shared demo data used across all pages
 * Single source of truth for demo projects, scans, findings
 */

// ============ DEMO PROJECTS ============
export const DEMO_PROJECTS = [
  {
    id: "demo1",
    name: "web-api",
    repoUrl: "https://github.com/acme/web-api",
    language: "TypeScript",
    description: "REST API backend service",
    lastScanAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    critical: 2,
    high: 3,
    medium: 4,
    low: 3,
  },
  {
    id: "demo2",
    name: "auth-service",
    repoUrl: "https://github.com/acme/auth-service",
    language: "Python",
    description: "Authentication & authorization service",
    lastScanAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    critical: 3,
    high: 4,
    medium: 2,
    low: 1,
  },
  {
    id: "demo3",
    name: "frontend-app",
    repoUrl: "https://github.com/acme/frontend-app",
    language: "JavaScript",
    description: "React frontend application",
    lastScanAt: new Date(Date.now() - 172800000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    critical: 0,
    high: 2,
    medium: 3,
    low: 5,
  },
  {
    id: "demo4",
    name: "payment-gateway",
    repoUrl: "https://github.com/acme/payment-gateway",
    language: "Go",
    description: "Core payment processing engine",
    lastScanAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 120).toISOString(),
    critical: 5,
    high: 12,
    medium: 8,
    low: 2,
  },
  {
    id: "demo5",
    name: "analytics-worker",
    repoUrl: "https://github.com/acme/analytics-worker",
    language: "Rust",
    description: "High-throughput data processing",
    lastScanAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  },
  {
    id: "demo6",
    name: "mobile-bff",
    repoUrl: "https://github.com/acme/mobile-bff",
    language: "TypeScript",
    description: "Backend-for-frontend for iOS/Android",
    lastScanAt: new Date(Date.now() - 14400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    critical: 0,
    high: 3,
    medium: 6,
    low: 10,
  },
  {
    id: "demo7",
    name: "legacy-billing",
    repoUrl: "https://github.com/acme/legacy-billing",
    language: "Java",
    description: "Old monolithic billing system",
    lastScanAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
    critical: 15,
    high: 30,
    medium: 45,
    low: 80,
  },
  {
    id: "demo8",
    name: "marketing-site",
    repoUrl: "https://github.com/acme/marketing-site",
    language: "Vue",
    description: "Public landing pages",
    lastScanAt: undefined, // Not scanned yet
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  },
];

// ============ DEMO SCANS ============
export const DEMO_SCANS = [
  { id: "ds1", projectId: "demo1", type: "sast",  status: "completed", findingsCount: 6, startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3500000).toISOString() },
  { id: "ds2", projectId: "demo1", type: "sca",   status: "completed", findingsCount: 3, startedAt: new Date(Date.now() - 3400000).toISOString(), completedAt: new Date(Date.now() - 3300000).toISOString() },
  { id: "ds3", projectId: "demo2", type: "sast",  status: "completed", findingsCount: 8, startedAt: new Date(Date.now() - 86400000).toISOString(), completedAt: new Date(Date.now() - 86300000).toISOString() },
  { id: "ds4", projectId: "demo2", type: "sca",   status: "completed", findingsCount: 2, startedAt: new Date(Date.now() - 86200000).toISOString(), completedAt: new Date(Date.now() - 86100000).toISOString() },
  { id: "ds5", projectId: "demo3", type: "sast",  status: "completed", findingsCount: 4, startedAt: new Date(Date.now() - 172800000).toISOString(), completedAt: new Date(Date.now() - 172700000).toISOString() },
  { id: "ds6", projectId: "demo3", type: "sbom",  status: "completed", findingsCount: 0, startedAt: new Date(Date.now() - 172600000).toISOString(), completedAt: new Date(Date.now() - 172500000).toISOString() },
  
  // Scans for new demo projects
  { id: "ds7", projectId: "demo4", type: "sast",  status: "completed", findingsCount: 22, startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3500000).toISOString() },
  { id: "ds8", projectId: "demo4", type: "sca",   status: "completed", findingsCount: 5, startedAt: new Date(Date.now() - 3400000).toISOString(), completedAt: new Date(Date.now() - 3300000).toISOString() },
  
  { id: "ds9", projectId: "demo5", type: "sast",  status: "completed", findingsCount: 0, startedAt: new Date(Date.now() - 7200000).toISOString(), completedAt: new Date(Date.now() - 7100000).toISOString() },
  { id: "ds10", projectId: "demo5", type: "sca",  status: "completed", findingsCount: 0, startedAt: new Date(Date.now() - 7000000).toISOString(), completedAt: new Date(Date.now() - 6900000).toISOString() },
  
  { id: "ds11", projectId: "demo6", type: "sast",  status: "completed", findingsCount: 12, startedAt: new Date(Date.now() - 14400000).toISOString(), completedAt: new Date(Date.now() - 14300000).toISOString() },
  { id: "ds12", projectId: "demo6", type: "sca",  status: "completed", findingsCount: 7, startedAt: new Date(Date.now() - 14200000).toISOString(), completedAt: new Date(Date.now() - 14100000).toISOString() },
  { id: "ds13", projectId: "demo6", type: "sbom",  status: "completed", findingsCount: 0, startedAt: new Date(Date.now() - 14000000).toISOString(), completedAt: new Date(Date.now() - 13900000).toISOString() },
  
  { id: "ds14", projectId: "demo7", type: "sast",  status: "completed", findingsCount: 95, startedAt: new Date(Date.now() - 86400000 * 7).toISOString(), completedAt: new Date(Date.now() - 86400000 * 6.9).toISOString() },
  { id: "ds15", projectId: "demo7", type: "sca",  status: "completed", findingsCount: 75, startedAt: new Date(Date.now() - 86400000 * 6.8).toISOString(), completedAt: new Date(Date.now() - 86400000 * 6.7).toISOString() },
];

// ============ DEMO SBOM COMPONENTS ============
export const DEMO_SBOM_COMPONENTS = [
  { name: "react", version: "18.2.0", license: "MIT", type: "npm", projectId: "demo1", projectName: "web-api" },
  { name: "express", version: "4.18.2", license: "MIT", type: "npm", projectId: "demo1", projectName: "web-api" },
  { name: "jsonwebtoken", version: "9.0.0", license: "MIT", type: "npm", projectId: "demo1", projectName: "web-api" },
  { name: "lodash", version: "4.17.21", license: "MIT", type: "npm", projectId: "demo1", projectName: "web-api" },
  { name: "axios", version: "1.6.2", license: "MIT", type: "npm", projectId: "demo1", projectName: "web-api" },
  { name: "flask", version: "3.0.0", license: "BSD-3-Clause", type: "pip", projectId: "demo2", projectName: "auth-service" },
  { name: "pyjwt", version: "2.8.0", license: "MIT", type: "pip", projectId: "demo2", projectName: "auth-service" },
  { name: "bcrypt", version: "4.1.2", license: "Apache-2.0", type: "pip", projectId: "demo2", projectName: "auth-service" },
  { name: "sqlalchemy", version: "2.0.23", license: "MIT", type: "pip", projectId: "demo2", projectName: "auth-service" },
  { name: "react", version: "18.2.0", license: "MIT", type: "npm", projectId: "demo3", projectName: "frontend-app" },
  { name: "next", version: "14.0.4", license: "MIT", type: "npm", projectId: "demo3", projectName: "frontend-app" },
  { name: "tailwindcss", version: "3.4.0", license: "MIT", type: "npm", projectId: "demo3", projectName: "frontend-app" },
  { name: "typescript", version: "5.3.3", license: "Apache-2.0", type: "npm", projectId: "demo3", projectName: "frontend-app" },
  { name: "zod", version: "3.22.4", license: "MIT", type: "npm", projectId: "demo3", projectName: "frontend-app" },
];
