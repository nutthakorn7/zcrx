"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  ShieldAlert,
  ScanSearch,
  Package,
  LogOut,
  Settings,
  FileText,
  Users,
  Globe,
  Sparkles,
  Bot,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo, LogoText } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";

const navItems = [
  { href: "/auto-scan", label: "AI Auto Scan", icon: Sparkles },
  { href: "/ai-chat", label: "AI Chat", icon: Bot },
  { href: "/agent", label: "Agent", icon: Sparkles },
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderGit2 },
  { href: "/findings", label: "Findings", icon: ShieldAlert },
  { href: "/scans", label: "Scans", icon: ScanSearch },
  { href: "/sbom", label: "SBOM", icon: Package },
  { href: "/dast", label: "DAST", icon: Globe },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/upload", label: "Upload", icon: Package },
  { href: "/admin", label: "Admin", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Logo size={36} />
        <LogoText size={20} />
      </div>
      <div style={{ padding: "0 12px 12px" }}>
        <GlobalSearch />
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section & Notifications */}
      <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
        <NotificationBell />
        
        {user && (
          <Link
            href="/settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              marginBottom: 8,
              textDecoration: "none",
              color: "inherit",
              borderRadius: 8,
              transition: "background 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent), #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    background: user.role === "admin" ? "rgba(99,102,241,0.2)" : "rgba(107,114,128,0.2)",
                    color: user.role === "admin" ? "#818cf8" : "#9ca3af",
                  }}
                >
                  {user.role}
                </span>
                {user.email}
              </div>
            </div>
          </Link>
        )}
        <button
          className="nav-item"
          onClick={logout}
          style={{
            width: "100%",
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontFamily: "inherit",
            fontSize: 14,
          }}
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
