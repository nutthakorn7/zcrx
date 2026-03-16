"use client";
import { useEffect, useState } from "react";
import { Users, Shield, ShieldOff, Trash2, Crown } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      const res = await api.users.list();
      setUsers(res.data);
    } catch (e: any) {
      setError(e.message || "Access denied");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleRoleChange(id: string, newRole: string) {
    try {
      await api.users.changeRole(id, newRole);
      loadUsers();
    } catch (e: any) {
      alert(e.message || "Failed to change role");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;
    try {
      await api.users.delete(id);
      loadUsers();
    } catch (e: any) {
      alert(e.message || "Failed to delete user");
    }
  }

  if (loading) return <div style={{ padding: 32, color: "var(--text-muted)" }}>Loading...</div>;
  if (error) return <div style={{ padding: 32, color: "var(--critical)" }}>⛔ {error}</div>;

  return (
    <div>
      <div className="page-header">
        <h2>
          <Users size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
          User Management
        </h2>
        <p>Manage user roles and access (Admin only)</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: u.role === "admin" ? "linear-gradient(135deg, #6366f1, #a855f7)" : "linear-gradient(135deg, #6b7280, #9ca3af)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 13,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                      {u.id === currentUser?.id && (
                        <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600 }}>(you)</span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{u.email}</td>
                  <td>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background: u.role === "admin" ? "rgba(99,102,241,0.15)" : "rgba(107,114,128,0.15)",
                        color: u.role === "admin" ? "#818cf8" : "#9ca3af",
                      }}
                    >
                      {u.role === "admin" && <Crown size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />}
                      {u.role}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {u.id !== currentUser?.id && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleRoleChange(u.id, u.role === "admin" ? "viewer" : "admin")}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "1px solid var(--border-color)",
                            background: "transparent",
                            color: u.role === "admin" ? "#f97316" : "#22c55e",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {u.role === "admin" ? <ShieldOff size={12} /> : <Shield size={12} />}
                          {u.role === "admin" ? "Demote" : "Promote"}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "1px solid rgba(239,68,68,0.3)",
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
