"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { Menu, X } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/register", "/welcome", "/landing"];

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      {isPublic ? (
        children
      ) : (
        <div className="app-layout">
          <button
            className="mobile-menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div
            className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
            onClick={() => setSidebarOpen(false)}
          />
          <div className={sidebarOpen ? "sidebar-open-wrapper" : ""}>
            <Sidebar />
          </div>
          <main className="main-content">{children}</main>
          {sidebarOpen && (
            <style>{`.sidebar { transform: translateX(0) !important; }`}</style>
          )}
        </div>
      )}
    </AuthProvider>
  );
}
