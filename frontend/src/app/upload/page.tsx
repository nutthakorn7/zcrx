"use client";
import { useState, useRef } from "react";
import {
  Upload, FileArchive, Loader2, CheckCircle, AlertTriangle,
  Shield, Package, Code2, X,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [scanTypes, setScanTypes] = useState(["sast", "sca"]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f?.name.endsWith(".zip")) setFile(f);
    else setError("รองรับเฉพาะไฟล์ .zip เท่านั้น");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  function toggleType(t: string) {
    setScanTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function upload() {
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    setResult(null);
    setProgress("📦 กำลังอัพโหลด...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectName", projectName || file.name.replace(".zip", ""));
      formData.append("scanTypes", scanTypes.join(","));

      setProgress("🔍 กำลัง extract และ scan...");

      const res = await fetch(`${API}/api/upload/scan`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");

      setResult(json.data);
      setProgress("");
    } catch (e: any) {
      setError(e.message);
      setProgress("");
    } finally {
      setUploading(false);
    }
  }

  const sevColors: Record<string, string> = {
    critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#3b82f6",
  };

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>

      <div className="page-header">
        <h2>
          <Upload size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "#22c55e" }} />
          Upload & Scan
        </h2>
        <p>อัพโหลดซอร์สโค้ด (.zip) → Auto Scan (SAST + SCA + SBOM)</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: Upload Form */}
        <div className="card" style={{ padding: 24 }}>
          {/* Drop Zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? "#22c55e" : file ? "#22c55e" : "var(--border-color)"}`,
              borderRadius: 16, padding: 40, textAlign: "center", cursor: "pointer",
              background: dragOver ? "rgba(34,197,94,0.06)" : file ? "rgba(34,197,94,0.04)" : "transparent",
              transition: "all 0.3s", marginBottom: 16,
            }}
          >
            <input ref={inputRef} type="file" accept=".zip" onChange={handleFile} hidden />
            {file ? (
              <div>
                <FileArchive size={36} style={{ color: "#22c55e", marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                <button onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
                  style={{ marginTop: 8, fontSize: 11, padding: "4px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={10} /> เปลี่ยนไฟล์
                </button>
              </div>
            ) : (
              <div>
                <Upload size={36} style={{ color: "var(--text-muted)", marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>ลากไฟล์ .zip วางที่นี่</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>หรือคลิกเพื่อเลือกไฟล์ (สูงสุด 100MB)</div>
              </div>
            )}
          </div>

          {/* Project Name */}
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="ชื่อ Project (ไม่ใส่จะใช้ชื่อไฟล์)"
            className="input"
            style={{ marginBottom: 12, width: "100%", fontSize: 13, padding: "10px 12px" }}
          />

          {/* Scan Types */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[
              { id: "sast", label: "SAST", icon: <Code2 size={14} />, color: "#3b82f6" },
              { id: "sca", label: "SCA", icon: <Package size={14} />, color: "#22c55e" },
              { id: "sbom", label: "SBOM", icon: <Shield size={14} />, color: "#a855f7" },
            ].map(t => (
              <button key={t.id} onClick={() => toggleType(t.id)} style={{
                flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 12, fontWeight: 700,
                fontFamily: "inherit", cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 6, transition: "all 0.2s",
                border: scanTypes.includes(t.id) ? `2px solid ${t.color}` : "2px solid var(--border-color)",
                background: scanTypes.includes(t.id) ? `${t.color}15` : "transparent",
                color: scanTypes.includes(t.id) ? t.color : "var(--text-muted)",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Upload Button */}
          <button onClick={upload} disabled={!file || uploading || scanTypes.length === 0}
            className="btn btn-primary" style={{ width: "100%", fontSize: 14, padding: "12px 0" }}>
            {uploading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> {progress}</>
              : <>🚀 อัพโหลดและ Scan</>}
          </button>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertTriangle size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> {error}
            </div>
          )}
        </div>

        {/* Right: Results */}
        <div className="card" style={{ padding: 24 }}>
          {!result ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, color: "var(--text-muted)" }}>
              <FileArchive size={40} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>อัพโหลดไฟล์แล้วผลจะแสดงที่นี่</p>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <CheckCircle size={20} color="#22c55e" />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Scan เสร็จแล้ว!</h3>
              </div>

              {/* Summary */}
              <div style={{
                padding: 16, borderRadius: 12, marginBottom: 16,
                background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(99,102,241,0.06))",
                border: "1px solid rgba(34,197,94,0.15)",
              }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>โปรเจค</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{result.projectName}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div>📁 ไฟล์: <strong>{result.fileName}</strong></div>
                  <div>📊 ขนาด: <strong>{(result.fileSize / 1024 / 1024).toFixed(1)} MB</strong></div>
                  <div>🔍 Findings: <strong style={{ color: result.totalFindings > 0 ? "#ef4444" : "#22c55e" }}>{result.totalFindings}</strong></div>
                  {result.sbom && <div>📦 Components: <strong>{result.sbom.components}</strong></div>}
                </div>
              </div>

              {/* Scan Results */}
              {result.scanResults?.map((sr: any, i: number) => (
                <div key={i} style={{
                  padding: 12, borderRadius: 10, marginBottom: 8,
                  border: "1px solid var(--border-color)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
                      {sr.type === "sast" ? "🔬" : "📦"} {sr.type}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 700,
                      background: sr.error ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                      color: sr.error ? "#ef4444" : "#22c55e",
                    }}>
                      {sr.error ? "FAILED" : `${sr.findings} findings`}
                    </span>
                  </div>
                  {!sr.error && (
                    <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
                      {Object.entries({ critical: sr.critical, high: sr.high, medium: sr.medium, low: sr.low })
                        .filter(([, v]) => (v as number) > 0)
                        .map(([sev, count]) => (
                          <span key={sev} style={{ color: sevColors[sev], fontWeight: 700 }}>
                            {(count as number)} {sev.toUpperCase()}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Links */}
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <a href={`/findings`} className="btn btn-primary" style={{ flex: 1, textAlign: "center", fontSize: 12, textDecoration: "none" }}>
                  ดู Findings ทั้งหมด →
                </a>
                <button onClick={() => { setFile(null); setResult(null); }}
                  className="btn" style={{ flex: 1, fontSize: 12, background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                  อัพโหลดใหม่
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
