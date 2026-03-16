"use client";
import { useState, useEffect } from "react";
import { Settings, User, Lock, Check, AlertCircle, ShieldAlert, Mail, Bell, Send, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Custom Quality Gate Policy state
  const [qgPolicy, setQgPolicy] = useState({ minScore: 30, maxCritical: 0, maxHigh: 5 });
  const [qgMsg, setQgMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [saving, setSaving] = useState(false);

  // Sync name from user context when it loads
  useEffect(() => {
    if (user?.name) setName(user.name);
    // Load custom QG policy
    const savedQgPolicy = localStorage.getItem("zcrx_qg_policy");
    if (savedQgPolicy) {
      try {
        setQgPolicy(JSON.parse(savedQgPolicy));
      } catch (e) {
        console.error("Failed to parse saved QG policy");
      }
    }
  }, [user]);

  async function updateProfile() {
    setSaving(true);
    setProfileMsg(null);
    try {
      const token = localStorage.getItem("zcrx_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
        const userData = JSON.parse(localStorage.getItem("zcrx_user") || "{}");
        localStorage.setItem("zcrx_user", JSON.stringify({ ...userData, name }));
      } else {
        const data = await res.json();
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("zcrx_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPasswordMsg({ type: "success", text: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setPasswordMsg({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  function saveQgPolicy() {
    setSaving(true);
    setQgMsg(null);
    try {
      localStorage.setItem("zcrx_qg_policy", JSON.stringify(qgPolicy));
      setQgMsg({ type: "success", text: "Quality Gate policy saved. It will apply to all dashboards immediately." });
    } catch {
      setQgMsg({ type: "error", text: "Failed to save policy to local storage." });
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div>
      <div className="page-header">
        <h2>
          <Settings size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
          Settings
        </h2>
        <p>Manage your account and preferences</p>
      </div>

      <div className="grid-2">
        {/* Profile */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <User size={18} /> Profile
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              style={{ ...inputStyle, opacity: 0.5, background: "rgba(255,255,255,0.02)" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {profileMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
              background: profileMsg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: profileMsg.type === "success" ? "#22c55e" : "#ef4444",
            }}>
              {profileMsg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              {profileMsg.text}
            </div>
          )}

          <button className="btn btn-primary" onClick={updateProfile} disabled={saving}>
            Save Changes
          </button>
        </div>

        {/* Quality Gate Policies */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldAlert size={18} /> Quality Gate Policies
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.5 }}>
            Projects that fail these thresholds will be marked as FAILED in the dashboard and project reports.
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Max Critical Vulnerabilities</label>
            <input
              type="number"
              min={0}
              value={qgPolicy.maxCritical}
              onChange={(e) => setQgPolicy({ ...qgPolicy, maxCritical: parseInt(e.target.value) || 0 })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Max High Vulnerabilities</label>
            <input
              type="number"
              min={0}
              value={qgPolicy.maxHigh}
              onChange={(e) => setQgPolicy({ ...qgPolicy, maxHigh: parseInt(e.target.value) || 0 })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Min Overall Score (0-100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={qgPolicy.minScore}
              onChange={(e) => setQgPolicy({ ...qgPolicy, minScore: parseInt(e.target.value) || 0 })}
              style={inputStyle}
            />
          </div>

          {qgMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
              background: qgMsg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: qgMsg.type === "success" ? "#22c55e" : "#ef4444",
            }}>
              {qgMsg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              {qgMsg.text}
            </div>
          )}

          <button className="btn btn-primary" onClick={saveQgPolicy} disabled={saving}>
            Save Policies
          </button>
        </div>

        {/* Password */}
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={18} /> Change Password
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Current Password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
          </div>

          {passwordMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13,
              display: "flex", alignItems: "center", gap: 8,
              background: passwordMsg.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
              color: passwordMsg.type === "success" ? "#22c55e" : "#ef4444",
            }}>
              {passwordMsg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              {passwordMsg.text}
            </div>
          )}

          <button className="btn btn-primary" onClick={changePassword} disabled={saving || !currentPassword || !newPassword}>
            Change Password
          </button>
        </div>
      </div>

      {/* ─── Email Notifications ─── */}
      <EmailNotificationSettings />
    </div>
  );
}

function EmailNotificationSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([api.notifications.getSettings(), api.notifications.getLogs()]);
      setSettings(s.data);
      setLogs(l.data || []);
    } catch {} finally { setLoading(false); }
  }

  async function save(updates: any) {
    setSaving(true);
    try {
      const res: any = await api.notifications.updateSettings(updates);
      setSettings(res.data);
    } catch {} finally { setSaving(false); }
  }

  async function sendTest() {
    setTesting(true);
    try { await api.notifications.sendTest(); load(); } catch {}
    finally { setTesting(false); }
  }

  function addRecipient() {
    if (!newEmail.trim() || !newEmail.includes("@")) return;
    const updated = [...(settings?.recipients || []), newEmail.trim()];
    save({ recipients: updated });
    setNewEmail("");
  }

  function removeRecipient(email: string) {
    const updated = (settings?.recipients || []).filter((e: string) => e !== email);
    save({ recipients: updated });
  }

  const inputStyle: any = {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
    color: "var(--text-primary)", fontSize: 13, fontFamily: "inherit",
  };

  if (loading) return <div className="card animate-pulse" style={{ height: 200, marginTop: 20 }} />;
  if (!settings) return null;

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <Mail size={18} style={{ color: "var(--accent)" }} /> Email Notifications
        </h3>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
          padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: settings.enabled ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${settings.enabled ? "rgba(34,197,94,0.3)" : "var(--border-color)"}`,
          color: settings.enabled ? "#22c55e" : "var(--text-muted)",
        }}>
          <input type="checkbox" checked={settings.enabled} onChange={() => save({ enabled: !settings.enabled })} style={{ display: "none" }} />
          <Bell size={14} /> {settings.enabled ? "Enabled" : "Disabled"}
        </label>
      </div>

      {/* Recipients */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
          📧 Recipients
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && addRecipient()} placeholder="team@company.com" style={{ ...inputStyle, flex: 1 }} />
          <button className="btn btn-primary" onClick={addRecipient} style={{ padding: "8px 14px" }}><Plus size={14} /></button>
        </div>
        {settings.recipients?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {settings.recipients.map((email: string) => (
              <span key={email} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: 6, fontSize: 12,
                background: "rgba(99,102,241,0.1)", color: "var(--accent)",
                border: "1px solid rgba(99,102,241,0.2)",
              }}>
                {email}
                <Trash2 size={10} style={{ cursor: "pointer", color: "var(--critical)" }} onClick={() => removeRecipient(email)} />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Triggers */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
          🔔 Notify When
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { key: "onCritical", label: "🔴 Critical Findings", color: "#ef4444" },
            { key: "onHigh", label: "🟠 High Findings", color: "#f97316" },
            { key: "onScanComplete", label: "✅ Scan Complete", color: "#22c55e" },
          ].map(t => (
            <label key={t.key} style={{
              display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
              padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500,
              background: settings[t.key] ? `${t.color}10` : "rgba(255,255,255,0.03)",
              border: `1px solid ${settings[t.key] ? `${t.color}30` : "var(--border-color)"}`,
              color: settings[t.key] ? t.color : "var(--text-muted)",
            }}>
              <input type="checkbox" checked={settings[t.key]} onChange={() => save({ [t.key]: !settings[t.key] })} style={{ display: "none" }} />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* SMTP Config */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
          📬 SMTP / Email Provider
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input type="text" placeholder="SMTP Host" value={settings.smtpHost} onChange={e => save({ smtpHost: e.target.value })} style={inputStyle} />
          <input type="number" placeholder="Port (587)" value={settings.smtpPort} onChange={e => save({ smtpPort: parseInt(e.target.value) || 587 })} style={inputStyle} />
          <input type="text" placeholder="Username" value={settings.smtpUser} onChange={e => save({ smtpUser: e.target.value })} style={inputStyle} />
          <input type="password" placeholder="Password" value={settings.smtpPass} onChange={e => save({ smtpPass: e.target.value })} style={inputStyle} />
        </div>
        <input type="email" placeholder="From email (noreply@zcrx.app)" value={settings.fromEmail} onChange={e => save({ fromEmail: e.target.value })} style={{ ...inputStyle, marginTop: 8 }} />
      </div>

      {/* Test Button */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={sendTest} disabled={testing} style={{ gap: 6 }}>
          <Send size={14} /> {testing ? "Sending..." : "Send Test Notification"}
        </button>
      </div>

      {/* Notification Log */}
      {logs.length > 0 && (
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>
            📋 Recent Notifications
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
            {logs.slice(0, 10).map((log: any) => (
              <div key={log.id} style={{
                padding: 8, borderRadius: 6, fontSize: 11,
                background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <span style={{
                    padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, marginRight: 6,
                    background: log.status === "sent" ? "rgba(34,197,94,0.15)" : log.status === "failed" ? "rgba(239,68,68,0.15)" : "rgba(234,179,8,0.15)",
                    color: log.status === "sent" ? "#22c55e" : log.status === "failed" ? "#ef4444" : "#eab308",
                  }}>
                    {log.status.toUpperCase()}
                  </span>
                  {log.message}
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
