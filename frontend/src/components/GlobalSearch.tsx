"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  FolderGit2,
  ShieldAlert,
  ScanSearch,
  ArrowRight,
  Command,
} from "lucide-react";
import { api } from "@/lib/api";

const SEV_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#6b7280",
};

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<any>(null);

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults(null);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.search.query(q);
        setResults(res.data);
        setSelectedIndex(0);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    doSearch(query);
  }, [query, doSearch]);

  // Build flat list of all results for keyboard navigation
  const allItems: { type: string; item: any }[] = [];
  if (results) {
    results.projects?.forEach((p: any) => allItems.push({ type: "project", item: p }));
    results.findings?.forEach((f: any) => allItems.push({ type: "finding", item: f }));
    results.scans?.forEach((s: any) => allItems.push({ type: "scan", item: s }));
  }

  function handleNavigate(entry: { type: string; item: any }) {
    if (entry.type === "project") router.push(`/projects/${entry.item.id}`);
    else if (entry.type === "finding") router.push(`/findings`);
    else if (entry.type === "scan") router.push(`/scans`);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      handleNavigate(allItems[selectedIndex]);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 10,
          border: "1px solid var(--border-color)",
          background: "rgba(255,255,255,0.03)",
          color: "var(--text-muted)",
          fontSize: 13,
          cursor: "pointer",
          width: "100%",
          transition: "all 0.2s",
        }}
      >
        <Search size={14} />
        <span style={{ flex: 1, textAlign: "left" }}>Search...</span>
        <kbd
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: 10,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontFamily: "monospace",
          }}
        >
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
      />

      {/* Command Palette */}
      <div
        style={{
          position: "fixed",
          top: "15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(560px, 90vw)",
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          zIndex: 1001,
          overflow: "hidden",
          animation: "slideDown 0.15s ease-out",
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <Search size={18} color="var(--accent)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, findings, scans..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: 15,
              fontFamily: "inherit",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          )}
          <kbd
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-muted)",
              fontFamily: "monospace",
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: "auto", padding: "8px 0" }}>
          {loading && (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Searching...
            </div>
          )}

          {!loading && !results && query.length < 2 && (
            <div style={{ padding: "24px 18px", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
              Type at least 2 characters to search
            </div>
          )}

          {!loading && results && allItems.length === 0 && (
            <div style={{ padding: "24px 18px", color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
              No results found for &quot;{query}&quot;
            </div>
          )}

          {!loading && results && allItems.length > 0 && (
            <>
              {/* Projects */}
              {results.projects?.length > 0 && (
                <div>
                  <div style={{ padding: "8px 18px 4px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                    Projects ({results.projects.length})
                  </div>
                  {results.projects.map((p: any, i: number) => {
                    const idx = i;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleNavigate({ type: "project", item: p })}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 18px",
                          cursor: "pointer",
                          background: selectedIndex === idx ? "rgba(99,102,241,0.1)" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        <FolderGit2 size={16} color="var(--accent)" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {p.language || "Unknown"} {p.description ? `• ${p.description.slice(0, 60)}` : ""}
                          </div>
                        </div>
                        <ArrowRight size={12} color="var(--text-muted)" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Findings */}
              {results.findings?.length > 0 && (
                <div>
                  <div style={{ padding: "8px 18px 4px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                    Findings ({results.findings.length})
                  </div>
                  {results.findings.map((f: any, i: number) => {
                    const idx = (results.projects?.length || 0) + i;
                    return (
                      <div
                        key={f.id}
                        onClick={() => handleNavigate({ type: "finding", item: f })}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 18px",
                          cursor: "pointer",
                          background: selectedIndex === idx ? "rgba(99,102,241,0.1)" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        <ShieldAlert size={16} color={SEV_COLORS[f.severity] || "#6b7280"} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{f.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            <span style={{ color: SEV_COLORS[f.severity], fontWeight: 600 }}>{f.severity?.toUpperCase()}</span>
                            {f.filePath ? ` • ${f.filePath}` : ""}
                          </div>
                        </div>
                        <ArrowRight size={12} color="var(--text-muted)" />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Scans */}
              {results.scans?.length > 0 && (
                <div>
                  <div style={{ padding: "8px 18px 4px", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                    Scans ({results.scans.length})
                  </div>
                  {results.scans.map((s: any, i: number) => {
                    const idx = (results.projects?.length || 0) + (results.findings?.length || 0) + i;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleNavigate({ type: "scan", item: s })}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 18px",
                          cursor: "pointer",
                          background: selectedIndex === idx ? "rgba(99,102,241,0.1)" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        <ScanSearch size={16} color="var(--accent)" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{s.type.toUpperCase()} Scan</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {s.status} • {s.findingsCount} findings
                          </div>
                        </div>
                        <ArrowRight size={12} color="var(--text-muted)" />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 18px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            gap: 16,
            color: "var(--text-muted)",
            fontSize: 11,
          }}
        >
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
}
