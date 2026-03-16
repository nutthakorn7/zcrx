"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield, Sparkles, Globe, Zap, Lock, Search, BarChart3,
  ChevronRight, Check, Star, ArrowRight, Code2, Cpu, FileCode,
} from "lucide-react";

const FEATURES = [
  { icon: Search, title: "AI Auto Scanner", desc: "ใส่ URL แล้ว AI จัดการทุกอย่างให้ — วิเคราะห์เป้าหมาย เลือก templates scan สรุปผลอัตโนมัติ", color: "#a855f7" },
  { icon: Code2, title: "SAST Analysis", desc: "สแกนซอร์สโค้ดหาช่องโหว่ด้วย Semgrep — SQL Injection, XSS, Hardcoded Secrets", color: "#3b82f6" },
  { icon: Globe, title: "DAST Scanning", desc: "ทดสอบเว็บแอปจากภายนอกด้วย Nuclei 6,800+ templates — CVEs, Misconfigs, Exposed Panels", color: "#22c55e" },
  { icon: BarChart3, title: "SCA & SBOM", desc: "ตรวจสอบ dependencies หาช่องโหว่ที่รู้จัก — สร้าง Software Bill of Materials อัตโนมัติ", color: "#f97316" },
  { icon: Shield, title: "OWASP Top 10", desc: "แมป findings ทุกตัวเข้ากับ OWASP Top 10 (2021) — ครอบคลุม 200+ CWE IDs", color: "#ef4444" },
  { icon: Sparkles, title: "AI-Powered Reports", desc: "DeepSeek AI สรุปผลสแกนเป็นภาษาไทย — แนะนำวิธีแก้ไข Auto-fix ด้วย AI", color: "#ec4899" },
];

const OWASP = [
  { id: "A01", name: "Broken Access Control", icon: "🔓" },
  { id: "A02", name: "Cryptographic Failures", icon: "🔐" },
  { id: "A03", name: "Injection", icon: "💉" },
  { id: "A04", name: "Insecure Design", icon: "📐" },
  { id: "A05", name: "Security Misconfiguration", icon: "⚙️" },
  { id: "A06", name: "Vulnerable Components", icon: "📦" },
  { id: "A07", name: "Auth Failures", icon: "🔑" },
  { id: "A08", name: "Integrity Failures", icon: "🔄" },
  { id: "A09", name: "Logging & Monitoring", icon: "📊" },
  { id: "A10", name: "SSRF", icon: "🌐" },
];

const STATS = [
  { value: "6,800+", label: "Nuclei Templates" },
  { value: "200+", label: "CWE Mappings" },
  { value: "10", label: "OWASP Categories" },
  { value: "AI", label: "Powered by DeepSeek" },
];

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div style={{ background: "#0a0a14", color: "#e2e8f0", minHeight: "100vh", overflow: "hidden" }}>
      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        @keyframes glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .land-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; border-radius: 12px; font-size: 15px; font-weight: 700; border: none; cursor: pointer; transition: all 0.3s; text-decoration: none; font-family: inherit; }
        .land-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.4); }
        .land-section { max-width: 1100px; margin: 0 auto; padding: 80px 24px; }
        .feat-card { padding: 24px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); transition: all 0.3s; }
        .feat-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(99,102,241,0.3); transform: translateY(-4px); }
      `}</style>

      {/* ═══ NAV ═══ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
        background: scrollY > 50 ? "rgba(10,10,20,0.9)" : "transparent",
        backdropFilter: scrollY > 50 ? "blur(12px)" : "none",
        borderBottom: scrollY > 50 ? "1px solid rgba(255,255,255,0.06)" : "none",
        transition: "all 0.3s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={20} color="white" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
            ZCR<span style={{ color: "#6366f1" }}>X</span>
          </span>
        </div>
        <Link href="/login" className="land-btn" style={{
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          color: "white", padding: "10px 24px", fontSize: 13,
        }}>
          เข้าสู่ระบบ <ArrowRight size={14} />
        </Link>
      </nav>

      {/* ═══ HERO ═══ */}
      <section style={{
        position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "120px 24px 80px",
      }}>
        {/* Animated gradient orbs */}
        <div style={{ position: "absolute", top: "10%", left: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)", animation: "glow 4s ease-in-out infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "15%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)", animation: "glow 5s ease-in-out infinite 1s", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, animation: "slideUp 0.8s ease-out" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px",
            borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 24,
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818cf8",
          }}>
            <Sparkles size={14} /> AI-Powered Security Platform
          </div>

          <h1 style={{
            fontSize: 56, fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: -1.5,
            background: "linear-gradient(135deg, #ffffff, #818cf8, #a855f7, #ffffff)",
            backgroundSize: "300% 300%", animation: "gradient 6s ease infinite",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Security Scanning<br />Made Intelligent
          </h1>

          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 36, maxWidth: 550, margin: "0 auto 36px" }}>
            แพลตฟอร์มสแกนความปลอดภัยครบวงจร — SAST, DAST, SCA, SBOM
            <br />พร้อม AI ที่วิเคราะห์และสรุปผลให้อัตโนมัติ
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/auto-scan" className="land-btn" style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              color: "white", fontSize: 16,
            }}>
              <Sparkles size={18} /> เริ่ม Scan ฟรี
            </Link>
            <Link href="/login" className="land-btn" style={{
              background: "rgba(255,255,255,0.06)", color: "white",
              border: "1px solid rgba(255,255,255,0.1)", fontSize: 16,
            }}>
              เข้าสู่ระบบ <ChevronRight size={16} />
            </Link>
          </div>

          {/* Stats bar */}
          <div style={{
            display: "flex", gap: 24, justifyContent: "center", marginTop: 56,
            padding: "20px 32px", borderRadius: 16,
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
          }}>
            {STATS.map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#818cf8" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section className="land-section">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
            ทุกอย่างที่ต้องการ <span style={{ color: "#818cf8" }}>ในที่เดียว</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}>ครอบคลุมทุกมิติของ Application Security</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="feat-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                  background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={22} color={f.color} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="land-section" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
            วิธีใช้ <span style={{ color: "#a855f7" }}>ง่ายสุดๆ</span>
          </h2>
        </div>

        <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
          {[
            { step: "1", title: "ใส่ URL", desc: "พิมพ์ URL เป้าหมาย", icon: Globe, color: "#3b82f6" },
            { step: "2", title: "AI วิเคราะห์", desc: "AI เลือก templates ที่เหมาะ", icon: Cpu, color: "#a855f7" },
            { step: "3", title: "ดูผลลัพธ์", desc: "AI สรุปรายงานภาษาไทย", icon: BarChart3, color: "#22c55e" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} style={{ flex: 1, maxWidth: 280, textAlign: "center" }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20, margin: "0 auto 16px",
                  background: `linear-gradient(135deg, ${s.color}20, ${s.color}08)`,
                  border: `2px solid ${s.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "float 3s ease-in-out infinite", animationDelay: `${i * 0.5}s`,
                }}>
                  <Icon size={32} color={s.color} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: s.color, marginBottom: 4 }}>STEP {s.step}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══ OWASP TOP 10 ═══ */}
      <section className="land-section">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12 }}>
            🛡️ OWASP Top 10 <span style={{ color: "#ef4444" }}>Coverage</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>ครอบคลุมทุก category ของ OWASP Top 10 (2021)</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {OWASP.map((o, i) => (
            <div key={o.id} className="feat-card" style={{ textAlign: "center", padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{o.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#818cf8", marginBottom: 4 }}>{o.id}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{o.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="land-section" style={{ textAlign: "center" }}>
        <div style={{
          padding: "56px 40px", borderRadius: 24,
          background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))",
          border: "1px solid rgba(99,102,241,0.2)",
        }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
            พร้อมสแกนความปลอดภัยแล้ว?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginBottom: 28 }}>
            เริ่มใช้งาน ZCRX วันนี้ — ฟรี ไม่ต้องตั้งค่าอะไร
          </p>
          <Link href="/auto-scan" className="land-btn" style={{
            background: "linear-gradient(135deg, #6366f1, #a855f7)",
            color: "white", fontSize: 17, padding: "16px 40px",
          }}>
            <Sparkles size={20} /> เริ่ม Scan เลย
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{
        padding: "32px 24px", textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        color: "rgba(255,255,255,0.3)", fontSize: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <Shield size={16} color="#6366f1" />
          <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>ZCRX</span>
        </div>
        © 2026 ZCRX — AI-Powered Application Security Platform
      </footer>
    </div>
  );
}
