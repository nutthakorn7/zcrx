"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Trash2, Bot, User, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "สรุปสถานะ security ของระบบ",
  "ช่องโหว่ไหนอันตรายที่สุด?",
  "OWASP Top 10 คืออะไร?",
  "SQL Injection ป้องกันยังไง?",
  "แนะนำวิธีปรับปรุง security",
  "อธิบาย XSS แบบง่ายๆ",
];

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function loadContext() {
    try {
      const stats: any = await api.dashboard.getStats();
      setContext({
        totalFindings: stats.data?.totalFindings || 0,
        critical: stats.data?.critical || 0,
        high: stats.data?.high || 0,
      });
    } catch {}
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res: any = await api.ai.chat({
        message: msg,
        history: [...messages, userMsg],
        context,
      });
      setMessages(prev => [...prev, { role: "assistant", content: res.data || "ไม่สามารถตอบได้" }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "❌ เกิดข้อผิดพลาด กรุณาลองใหม่" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 40px)" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <h2>
          <Bot size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8, color: "#a855f7" }} />
          AI Security Assistant
        </h2>
        <p>ถาม-ตอบเรื่อง Security ของระบบ — ตอบเป็นภาษาไทย</p>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "0 0 16px" }}>
        {messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(99,102,241,0.15))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={36} style={{ color: "#a855f7" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>สวัสดี! ผม AI Security Assistant</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>ถามเรื่อง security ได้เลยครับ</p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 500 }}>
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)} style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 12, fontFamily: "inherit",
                  border: "1px solid rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.06)",
                  color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s",
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, animation: "fadeIn 0.3s ease-out",
                flexDirection: m.role === "user" ? "row-reverse" : "row",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: m.role === "user" ? "var(--accent)" : "linear-gradient(135deg, #a855f7, #6366f1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {m.role === "user" ? <User size={16} color="white" /> : <Bot size={16} color="white" />}
                </div>
                <div style={{
                  maxWidth: "75%", padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.7,
                  background: m.role === "user" ? "var(--accent)" : "rgba(255,255,255,0.04)",
                  color: m.role === "user" ? "white" : "var(--text-primary)",
                  border: m.role === "user" ? "none" : "1px solid var(--border-color)",
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10, animation: "fadeIn 0.3s ease-out" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "linear-gradient(135deg, #a855f7, #6366f1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Bot size={16} color="white" />
                </div>
                <div style={{
                  padding: "10px 14px", borderRadius: 12, fontSize: 13,
                  background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)",
                  display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)",
                }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> กำลังคิด...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div style={{
        flexShrink: 0, padding: "12px 0 0", borderTop: "1px solid var(--border-color)",
        display: "flex", gap: 8, alignItems: "center",
      }}>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} style={{
            padding: 10, borderRadius: 10, border: "1px solid var(--border-color)",
            background: "transparent", color: "var(--text-muted)", cursor: "pointer",
          }}>
            <Trash2 size={16} />
          </button>
        )}
        <input
          type="text" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="ถามเรื่อง security ได้เลย..."
          style={{
            flex: 1, padding: "12px 16px", borderRadius: 12, fontSize: 14, fontFamily: "inherit",
            border: "1px solid var(--border-color)", background: "var(--bg-secondary)",
            color: "var(--text-primary)", outline: "none",
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          style={{
            padding: "12px 20px", borderRadius: 12, border: "none", cursor: "pointer",
            background: loading || !input.trim() ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #a855f7, #6366f1)",
            color: "white", display: "flex", alignItems: "center", gap: 6, fontWeight: 600,
            fontSize: 13, fontFamily: "inherit",
          }}
        >
          <Send size={16} /> ส่ง
        </button>
      </div>
    </div>
  );
}
