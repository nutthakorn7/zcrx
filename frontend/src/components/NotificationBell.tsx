"use client";
import { useState, useRef, useEffect } from "react";
import { Bell, ShieldAlert, CheckCircle, Info, X, Wifi, WifiOff } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "critical" | "success" | "info";
  time: string;
  read: boolean;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Connect to WebSocket
  useEffect(() => {
    function connect() {
      try {
        const ws = new WebSocket("ws://localhost:8000/ws");

        ws.onopen = () => {
          setWsConnected(true);
          console.log("🔌 WS connected");
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === "scan:completed") {
              const d = msg.data;
              const hasCritical = d.critical > 0;
              setNotifications(prev => [{
                id: `ws-${Date.now()}`,
                title: hasCritical ? "Critical Vulnerabilities Found" : "Scan Completed",
                message: `${d.scanType.toUpperCase()} scan for "${d.projectName}" found ${d.findingsCount} findings (${d.critical}C ${d.high}H ${d.medium}M ${d.low}L)`,
                type: hasCritical ? "critical" : "success",
                time: "Just now",
                read: false,
              }, ...prev]);
            }

            if (msg.type === "scan:failed") {
              const d = msg.data;
              setNotifications(prev => [{
                id: `ws-${Date.now()}`,
                title: "Scan Failed",
                message: `${d.scanType.toUpperCase()} scan for "${d.projectName}" failed: ${d.error}`,
                type: "critical",
                time: "Just now",
                read: false,
              }, ...prev]);
            }
          } catch {}
        };

        ws.onclose = () => {
          setWsConnected(false);
          console.log("🔌 WS disconnected, reconnecting in 3s...");
          setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };

        wsRef.current = ws;
      } catch {
        setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "critical": return <ShieldAlert size={16} style={{ color: "var(--critical)" }} />;
      case "success": return <CheckCircle size={16} style={{ color: "var(--success)" }} />;
      case "info": return <Info size={16} style={{ color: "var(--accent)" }} />;
      default: return <Info size={16} />;
    }
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="nav-item"
        style={{
          width: "100%",
          border: "none",
          background: isOpen ? "rgba(255,255,255,0.05)" : "transparent",
          cursor: "pointer",
          justifyContent: "flex-start",
          marginBottom: 8,
          position: "relative"
        }}
      >
        <div style={{ position: "relative" }}>
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              background: "var(--critical)",
              borderRadius: "50%",
              boxShadow: "0 0 0 2px var(--bg-secondary)",
              animation: "pulse 2s infinite",
            }} />
          )}
        </div>
        Notifications
        <span style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          {unreadCount > 0 && (
            <span className="badge critical" style={{ fontSize: 10, padding: "2px 6px" }}>
              {unreadCount}
            </span>
          )}
          {wsConnected ? (
            <Wifi size={12} color="#22c55e" />
          ) : (
            <WifiOff size={12} color="#6b7280" />
          )}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div style={{
          position: "absolute",
          bottom: "100%",
          left: 0,
          width: 340,
          background: "var(--bg-card)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
          marginBottom: 12,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid var(--border-color)",
            background: "rgba(255,255,255,0.02)"
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
              Notifications
              {wsConnected && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />}
            </h4>
            <div style={{ display: "flex", gap: 8 }}>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  style={{
                    background: "transparent", border: "none", color: "var(--accent)",
                    fontSize: 12, fontWeight: 500, cursor: "pointer"
                  }}
                >
                  Mark read
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={clearAll}
                  style={{
                    background: "transparent", border: "none", color: "var(--text-muted)",
                    fontSize: 12, fontWeight: 500, cursor: "pointer"
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                {wsConnected ? "🔔 Listening for real-time events..." : "No notifications"}
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div key={n.id} style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  background: n.read ? "transparent" : "rgba(99, 102, 241, 0.05)",
                  display: "flex",
                  gap: 12,
                  transition: "background 0.2s"
                }}>
                  <div style={{ marginTop: 2 }}>
                    {getIcon(n.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 600, color: n.read ? "var(--text-secondary)" : "var(--text-primary)", marginBottom: 4 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 8 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                      {n.time}
                    </div>
                  </div>
                  {!n.read && (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", marginTop: 6 }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
