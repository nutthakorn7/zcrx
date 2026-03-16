"use client";
import { useEffect, useState } from "react";
import { Package, Download, Search, Filter, List, Network, ChevronRight, ChevronDown, Folder, Box } from "lucide-react";
import { api } from "@/lib/api";
import { DEMO_PROJECTS, DEMO_SBOM_COMPONENTS } from "@/lib/demo-data";

interface SbomComponent {
  name: string;
  version: string;
  type: string;
  license?: string;
  purl?: string;
  projectName?: string;
}

// Use shared demo SBOM data, map to SbomComponent interface
const DEMO_COMPONENTS: SbomComponent[] = DEMO_SBOM_COMPONENTS.map((c) => ({
  name: c.name,
  version: c.version,
  type: c.type,
  license: c.license,
  purl: `pkg:${c.type}/${c.name}@${c.version}`,
  projectName: c.projectName,
}));

export default function SbomPage() {
  const [allScans, setAllScans] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [components, setComponents] = useState<SbomComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDemo, setIsDemo] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "tree">("tree");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [scansRes, projRes] = await Promise.all([api.scans.list(), api.projects.list()]);
      const realProjects = projRes.data || [];
      const sbomScans = scansRes.data.filter((s: any) => s.type === "sbom" && s.status === "completed");
      setAllScans(sbomScans);

      // Always prefer real projects for the dropdown
      if (realProjects.length > 0) {
        setProjects(realProjects);
      } else {
        setProjects(DEMO_PROJECTS);
      }

      if (sbomScans.length > 0) {
        // Load all SBOM components from all scans concurrently
        const projectMap = Object.fromEntries(realProjects.map((p: any) => [p.id, p.name]));
        
        try {
          const sbomPromises = sbomScans.map(scan => api.sbom.get(scan.id).then(res => ({ scan, res })));
          const sbomResults = await Promise.all(sbomPromises);
          
          const allComps: SbomComponent[] = sbomResults.flatMap(({ scan, res }) => {
            return (res.data.components || []).map((c: any) => ({
              ...c,
              projectName: projectMap[scan.projectId] || scan.projectId,
              projectId: scan.projectId,
            }));
          });
          
          if (allComps.length > 0) {
            setComponents(allComps);
            setIsDemo(false);
          } else {
            setComponents(DEMO_COMPONENTS);
            setIsDemo(true);
          }
        } catch (e) {
          console.error("Failed to load SBOMs concurrently", e);
          setComponents(DEMO_COMPONENTS);
          setIsDemo(true);
        }
      } else {
        // No SBOM scans yet
        if (realProjects.length > 0) {
          // Map demo components to the first real project so the UI doesn't look broken/disconnected
          setComponents(DEMO_COMPONENTS.map(c => ({
            ...c,
            projectName: realProjects[0].name,
            projectId: realProjects[0].id
          })));
        } else {
          setComponents(DEMO_COMPONENTS);
        }
        setIsDemo(true);
      }
    } catch {
      setComponents(DEMO_COMPONENTS);
      setProjects(DEMO_PROJECTS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }

  // Filter by project + search
  const filtered = components
    .filter((c) => !selectedProject || c.projectName === selectedProject)
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.license || "").toLowerCase().includes(search.toLowerCase())
    );

  const licenseGroups = filtered.reduce<Record<string, number>>((acc, c) => {
    const lic = c.license || "Unknown";
    acc[lic] = (acc[lic] || 0) + 1;
    return acc;
  }, {});

  // Unique project names for filter based on the actual projects array
  const projectNames = [...new Set(projects.map((p) => p.name).filter(Boolean))];

  // Grouping for Tree View: Project -> Type -> Components
  const treeData = filtered.reduce<Record<string, Record<string, SbomComponent[]>>>((acc, c) => {
    const proj = c.projectName || "Unknown Project";
    const type = c.type || "Unknown Type";
    if (!acc[proj]) acc[proj] = {};
    if (!acc[proj][type]) acc[proj][type] = [];
    acc[proj][type].push(c);
    return acc;
  }, {});

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    Object.keys(treeData).forEach(proj => {
      allIds.add(`proj-${proj}`);
      Object.keys(treeData[proj]).forEach(type => {
        allIds.add(`type-${proj}-${type}`);
      });
    });
    setExpandedNodes(allIds);
  };

  const collapseAll = () => setExpandedNodes(new Set());

  return (
    <div>
      <div className="page-header">
        <h2><Package size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />Software Bill of Materials</h2>
        <p>Complete inventory of all software components and dependencies</p>
      </div>

      {isDemo && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: "rgba(99,102,241,0.1)", color: "var(--accent)",
        }}>
          Showing demo data — run an SBOM scan on a project to see real components
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card accent">
          <div className="stat-label">Total Components</div>
          <div className="stat-value">{filtered.length}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Licenses</div>
          <div className="stat-value">{Object.keys(licenseGroups).length}</div>
        </div>
        <div className="stat-card low">
          <div className="stat-label">Projects</div>
          <div className="stat-value">{projectNames.length}</div>
        </div>
      </div>

      {loading ? (
        <div className="card animate-pulse" style={{ height: 200 }} />
      ) : (
        <>
          {/* Search + Project Filter + Actions */}
          <div
            className="card"
            style={{
              marginBottom: 16,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Filter size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{
                background: "var(--bg-card)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: 8, padding: "8px 12px", fontSize: 13,
                fontFamily: "inherit",
              }}
            >
              <option value="">All Projects</option>
              {projectNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              className="input"
              placeholder="Search components or licenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 150 }}
            />
            {selectedProject && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedProject("")}
                style={{ fontSize: 12 }}
              >
                Clear Filter
              </button>
            )}
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {filtered.length} components
            </span>
          </div>

          {/* License Summary */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>License Distribution</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {Object.entries(licenseGroups)
                .sort((a, b) => b[1] - a[1])
                .map(([license, count]) => (
                  <span
                    key={license}
                    className="badge info"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSearch(license)}
                  >
                    {license}: {count}
                  </span>
                ))}
            </div>
          </div>

          {/* Component List */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Components</h3>
              
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {viewMode === "tree" && (
                  <div style={{ display: "flex", gap: 8, marginRight: 8, paddingRight: 16, borderRight: "1px solid var(--border-color)" }}>
                    <button className="btn btn-secondary btn-sm" onClick={expandAll} style={{ fontSize: 12 }}>Expand All</button>
                    <button className="btn btn-secondary btn-sm" onClick={collapseAll} style={{ fontSize: 12 }}>Collapse All</button>
                  </div>
                )}
                <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: 4 }}>
                  <button
                    onClick={() => setViewMode("tree")}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer",
                      background: viewMode === "tree" ? "var(--bg-card)" : "transparent",
                      color: viewMode === "tree" ? "var(--accent)" : "var(--text-secondary)",
                      boxShadow: viewMode === "tree" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                    }}
                  >
                    <Network size={14} /> Tree
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer",
                      background: viewMode === "table" ? "var(--bg-card)" : "transparent",
                      color: viewMode === "table" ? "var(--accent)" : "var(--text-secondary)",
                      boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
                    }}
                  >
                    <List size={14} /> Table
                  </button>
                </div>
              </div>
            </div>

            {viewMode === "table" ? (
              <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Version</th>
                    <th>Project</th>
                    <th>Type</th>
                    <th>License</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((comp, i) => (
                    <tr key={i} style={{ cursor: "pointer" }}>
                      <td style={{ fontWeight: 600 }}>
                        <a
                          href={`https://www.npmjs.com/package/${comp.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--accent)", textDecoration: "none" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {comp.name}
                        </a>
                      </td>
                      <td>
                        <span className="badge info">{comp.version}</span>
                      </td>
                      <td>
                        <span
                          style={{ fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}
                          onClick={(e) => { e.stopPropagation(); setSelectedProject(comp.projectName || ""); }}
                        >
                          {comp.projectName || "—"}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{comp.type}</td>
                      <td>
                        <span
                          className={`badge ${comp.license === "MIT" ? "fixed" : comp.license === "Apache-2.0" ? "sast" : "info"}`}
                        >
                          {comp.license || "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.keys(treeData).length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>No components found.</div>
                ) : (
                  Object.entries(treeData).map(([projectName, types]) => {
                    const projId = `proj-${projectName}`;
                    const isProjExpanded = expandedNodes.has(projId);
                    const projCompCount = Object.values(types).reduce((sum, list) => sum + list.length, 0);

                    return (
                      <div key={projId} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border-color)", overflow: "hidden" }}>
                        {/* Project Header */}
                        <div 
                          onClick={() => toggleNode(projId)}
                          style={{ display: "flex", alignItems: "center", padding: "12px 16px", cursor: "pointer", background: isProjExpanded ? "rgba(255,255,255,0.04)" : "transparent", transition: "background 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                          onMouseLeave={e => e.currentTarget.style.background = isProjExpanded ? "rgba(255,255,255,0.04)" : "transparent"}
                        >
                          <span style={{ marginRight: 8, color: "var(--text-muted)" }}>
                            {isProjExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </span>
                          <Folder size={18} style={{ marginRight: 12, color: "var(--accent)" }} />
                          <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{projectName}</span>
                          <span className="badge" style={{ background: "rgba(255,255,255,0.1)", color: "var(--text-secondary)" }}>{projCompCount} components</span>
                        </div>

                        {/* Types -> Components */}
                        {isProjExpanded && (
                          <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid var(--border-color)" }}>
                            {Object.entries(types).map(([type, comps]) => {
                              const typeId = `type-${projectName}-${type}`;
                              const isTypeExpanded = expandedNodes.has(typeId);

                              return (
                                <div key={typeId}>
                                  {/* Type Header */}
                                  <div 
                                    onClick={() => toggleNode(typeId)}
                                    style={{ display: "flex", alignItems: "center", padding: "10px 16px 10px 48px", cursor: "pointer", borderBottom: isTypeExpanded ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                  >
                                    <span style={{ marginRight: 8, color: "var(--text-muted)" }}>
                                      {isTypeExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </span>
                                    <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-secondary)", flex: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}>{type} Ecosystem</span>
                                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{comps.length} items</span>
                                  </div>

                                  {/* Components List */}
                                  {isTypeExpanded && (
                                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "8px 16px 8px 80px", display: "flex", flexDirection: "column", gap: 4 }}>
                                      {comps.map((comp, idx) => (
                                        <div key={idx} style={{ display: "flex", alignItems: "center", padding: "6px 8px", borderRadius: 6, fontSize: 13 }}>
                                          <Box size={14} style={{ marginRight: 12, color: "var(--text-muted)" }} />
                                          <a href={`https://www.npmjs.com/package/${comp.name}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-primary)", textDecoration: "none", fontWeight: 500, marginRight: 12 }} onClick={e => e.stopPropagation()}>
                                            {comp.name}
                                          </a>
                                          <span className="badge info" style={{ marginRight: "auto", fontSize: 11 }}>v{comp.version}</span>
                                          <span className={`badge ${comp.license === "MIT" ? "fixed" : comp.license === "Apache-2.0" ? "sast" : "info"}`} style={{ fontSize: 11 }}>
                                            {comp.license || "Unknown"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
