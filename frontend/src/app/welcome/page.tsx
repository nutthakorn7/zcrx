"use client";
import Link from "next/link";
import {
  ShieldCheck,
  ScanSearch,
  Sparkles,
  GitCompareArrows,
  FileText,
  Package,
  BarChart3,
  ArrowRight,
  ChevronRight,
  Zap,
  Lock,
} from "lucide-react";
import { Logo, LogoText } from "@/components/Logo";

const features = [
  {
    icon: ScanSearch,
    title: "Multi-Engine Scanning",
    desc: "SAST, SCA, SBOM & DAST engines detect vulnerabilities across your entire codebase.",
    color: "#6366f1",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Insights",
    desc: "DeepSeek AI generates executive summaries and auto-fix suggestions for every finding.",
    color: "#a855f7",
  },
  {
    icon: BarChart3,
    title: "Security Scoring",
    desc: "SonarQube-style A-F grades across Security, Reliability, Maintainability & Review.",
    color: "#3b82f6",
  },
  {
    icon: GitCompareArrows,
    title: "Historical Comparison",
    desc: "Compare scans side-by-side to track New, Fixed & Unchanged vulnerabilities over time.",
    color: "#22c55e",
  },
  {
    icon: FileText,
    title: "Premium PDF Reports",
    desc: "One-click export with AI summaries embedded directly into professional PDF & CSV reports.",
    color: "#f97316",
  },
  {
    icon: Lock,
    title: "Role-Based Access",
    desc: "Admin & Viewer roles with granular permissions. Only admins can trigger scans.",
    color: "#ef4444",
  },
];

const stats = [
  { value: "14+", label: "Features" },
  { value: "6", label: "Scan Engines" },
  { value: "A-F", label: "Score Grades" },
  { value: "AI", label: "Powered" },
];

export default function WelcomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a1a",
        color: "white",
        overflow: "hidden",
      }}
    >
      {/* Animated gradient orbs */}
      <div
        style={{
          position: "fixed",
          top: -200,
          right: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)",
          filter: "blur(80px)",
          animation: "float 8s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: -300,
          left: -200,
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.12), transparent 70%)",
          filter: "blur(100px)",
          animation: "float 10s ease-in-out infinite reverse",
          pointerEvents: "none",
        }}
      />

      {/* Navigation */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 48px",
          position: "relative",
          zIndex: 10,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={32} />
          <LogoText size={18} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href="/login"
            style={{
              padding: "10px 24px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              transition: "all 0.3s",
            }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            style={{
              padding: "10px 28px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              color: "white",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              transition: "all 0.3s",
              boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
            }}
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          textAlign: "center",
          padding: "80px 24px 60px",
          position: "relative",
          zIndex: 10,
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 20,
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
            fontSize: 13,
            color: "#818cf8",
            fontWeight: 500,
            marginBottom: 24,
          }}
        >
          <Zap size={14} /> AI-Powered Security Platform
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}
        >
          Secure Your Code.{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #6366f1, #a855f7, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Before It Ships.
          </span>
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "rgba(255,255,255,0.6)",
            maxWidth: 600,
            margin: "0 auto 40px",
            lineHeight: 1.6,
          }}
        >
          The open-source security scanning platform with AI-powered insights,
          multi-engine analysis, and enterprise-grade reporting — all in one dashboard.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/register"
            style={{
              padding: "14px 36px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              color: "white",
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 6px 30px rgba(99,102,241,0.35)",
              transition: "all 0.3s",
            }}
          >
            Start Scanning <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            style={{
              padding: "14px 36px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white",
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.3s",
            }}
          >
            Sign In <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <section
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 48,
          padding: "32px 24px",
          position: "relative",
          zIndex: 10,
          flexWrap: "wrap",
        }}
      >
        {stats.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                background: "linear-gradient(135deg, #6366f1, #a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
              {s.label}
            </div>
          </div>
        ))}
      </section>

      {/* Features Grid */}
      <section
        style={{
          maxWidth: 1100,
          margin: "40px auto",
          padding: "0 24px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Everything You Need
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.5)",
            marginBottom: 40,
            fontSize: 15,
          }}
        >
          A complete security scanning toolkit for modern development teams
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                style={{
                  padding: 28,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  transition: "all 0.3s",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${f.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Icon size={22} color={f.color} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          textAlign: "center",
          padding: "80px 24px 60px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            padding: 48,
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))",
            border: "1px solid rgba(99,102,241,0.15)",
          }}
        >
          <ShieldCheck size={40} color="#6366f1" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>
            Ready to Secure Your Code?
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              marginBottom: 28,
              fontSize: 15,
              lineHeight: 1.6,
            }}
          >
            Deploy zcrX today and get instant visibility into your application security posture.
          </p>
          <Link
            href="/register"
            style={{
              padding: "14px 40px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #a855f7)",
              color: "white",
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 6px 30px rgba(99,102,241,0.35)",
            }}
          >
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          textAlign: "center",
          padding: "24px",
          color: "rgba(255,255,255,0.25)",
          fontSize: 12,
          borderTop: "1px solid rgba(255,255,255,0.04)",
          position: "relative",
          zIndex: 10,
        }}
      >
        © 2026 zcrX Security Platform. Built with 💜 for secure software.
      </footer>

      {/* Animations keyframe */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
      `}</style>
    </div>
  );
}
