"use client";
import { useEffect, useState } from "react";
import { Sparkles, Save, Trash2, FileCode, Loader2, Copy, Check, Plus } from "lucide-react";
import { api } from "@/lib/api";
import Link from "next/link";

export default function TemplateEditorPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editor state
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { loadTemplates(); }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await api.dast.templates.list();
      setTemplates(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function generateWithAI() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const res = await api.dast.templates.generate(aiPrompt);
      if (res.data) {
        setContent(res.data.content);
        setName(res.data.name);
      }
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  }

  async function saveTemplate() {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await api.dast.templates.create({ name, content });
      setName(""); setContent(""); setAiPrompt(""); setEditingId(null);
      loadTemplates();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    try {
      await api.dast.templates.delete(id);
      loadTemplates();
    } catch (e) { console.error(e); }
  }

  function editTemplate(t: any) {
    setEditingId(t.id);
    setName(t.name);
    setContent(t.content);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function newTemplate() {
    setEditingId(null);
    setName("");
    setContent(`id: custom-check
info:
  name: Custom Security Check
  author: zcrx
  severity: medium
  description: Custom security check template
  tags: custom

http:
  - method: GET
    path:
      - "{{BaseURL}}/"
    matchers-condition: and
    matchers:
      - type: status
        status:
          - 200
      - type: word
        words:
          - "pattern_to_match"
`);
    setAiPrompt("");
  }

  const AI_PROMPT_EXAMPLES = [
    "Check for exposed .env files",
    "Detect open directory listing",
    "Find exposed phpinfo page",
    "Check for default admin credentials",
    "Detect WordPress version disclosure",
    "Check for missing security headers",
  ];

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>
            <FileCode size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
            Template Editor
          </h2>
          <p>Create and manage custom Nuclei scan templates with AI assistance</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" onClick={newTemplate} style={{ gap: 6 }}>
            <Plus size={16} /> New Template
          </button>
          <Link href="/dast" className="btn btn-secondary" style={{ textDecoration: "none" }}>
            ← DAST Report
          </Link>
        </div>
      </div>

      {/* AI Generation Panel */}
      <div className="card" style={{
        marginBottom: 20,
        background: "linear-gradient(135deg, rgba(168,85,247,0.06), rgba(59,130,246,0.06))",
        border: "1px solid rgba(168,85,247,0.2)",
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} style={{ color: "#a855f7" }} /> AI Template Generator
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          Describe what you want to check and DeepSeek AI will generate a Nuclei template for you
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateWithAI()}
            placeholder="e.g. Check if server exposes .git directory..."
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 8,
              border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
              color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
            }}
          />
          <button
            className="btn btn-primary"
            onClick={generateWithAI}
            disabled={generating || !aiPrompt.trim()}
            style={{ gap: 6, background: "linear-gradient(135deg, #a855f7, #6366f1)", minWidth: 140 }}
          >
            {generating ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating...</>
            ) : (
              <><Sparkles size={14} /> Generate</>
            )}
          </button>
        </div>

        {/* Quick prompt suggestions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {AI_PROMPT_EXAMPLES.map((p) => (
            <button
              key={p}
              onClick={() => { setAiPrompt(p); }}
              style={{
                padding: "4px 10px", borderRadius: 12, fontSize: 11,
                border: "1px solid rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.06)",
                color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.15)"; e.currentTarget.style.color = "#a855f7"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(168,85,247,0.06)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* YAML Editor */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>
            {editingId ? `Editing: ${name}` : "Template Editor"}
          </h3>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn btn-secondary"
              onClick={() => copyToClipboard(content)}
              style={{ padding: "4px 10px", fontSize: 11 }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* Template Name */}
        <div style={{ marginBottom: 10 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Template name..."
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8,
              border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
              color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit", fontWeight: 600,
            }}
          />
        </div>

        {/* YAML Code Editor */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="# Nuclei YAML template..."
          spellCheck={false}
          style={{
            width: "100%", minHeight: 320, padding: "14px 16px", borderRadius: 8,
            border: "1px solid var(--border-color)",
            background: "rgba(0,0,0,0.4)", color: "#a5f3fc",
            fontSize: 12, fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace",
            lineHeight: 1.6, resize: "vertical",
            tabSize: 2,
          }}
          onKeyDown={(e) => {
            // Tab support in textarea
            if (e.key === "Tab") {
              e.preventDefault();
              const start = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const val = content;
              setContent(val.substring(0, start) + "  " + val.substring(end));
              setTimeout(() => {
                e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
              }, 0);
            }
          }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            className="btn btn-primary"
            onClick={saveTemplate}
            disabled={saving || !name.trim() || !content.trim()}
            style={{ gap: 6 }}
          >
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Template"}
          </button>
          {(name || content) && (
            <button className="btn btn-secondary" onClick={() => { setName(""); setContent(""); setEditingId(null); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Saved Templates */}
      <div className="card">
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
          Saved Templates ({templates.length})
        </h3>
        {loading ? (
          <div className="animate-pulse" style={{ height: 100 }} />
        ) : templates.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <FileCode style={{ width: 40, height: 40, opacity: 0.3 }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No templates yet. Use AI or create one manually.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.map((t: any) => (
              <div key={t.id} style={{
                padding: 12, borderRadius: 8,
                background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Created {new Date(t.createdAt).toLocaleString()}
                    {t.createdBy && ` by ${t.createdBy}`}
                  </div>
                  <pre style={{
                    fontSize: 10, color: "#6ee7b7", marginTop: 6, maxHeight: 60,
                    overflow: "hidden", opacity: 0.7, lineHeight: 1.4,
                    whiteSpace: "pre-wrap",
                  }}>
                    {t.content.slice(0, 200)}...
                  </pre>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-secondary" onClick={() => editTemplate(t)} style={{ padding: "5px 10px", fontSize: 11 }}>
                    Edit
                  </button>
                  <button className="btn btn-secondary" onClick={() => copyToClipboard(t.content)} style={{ padding: "5px 10px", fontSize: 11 }}>
                    <Copy size={12} />
                  </button>
                  <button className="btn btn-secondary" onClick={() => deleteTemplate(t.id)} style={{ padding: "5px 10px", fontSize: 11, color: "var(--critical)" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
