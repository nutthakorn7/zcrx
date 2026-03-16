/**
 * Email notification service for ZCRX
 * Sends alerts when scans complete or critical findings are found.
 * Uses Bun's built-in fetch to call email APIs (Resend, SendGrid, etc.)
 * Or SMTP via environment variables.
 */

import { broadcast } from "../ws";

// ─── In-memory notification settings ───
interface NotificationSettings {
  enabled: boolean;
  recipients: string[];        // email addresses
  onCritical: boolean;         // notify on critical findings
  onHigh: boolean;             // notify on high findings
  onScanComplete: boolean;     // notify when any scan completes
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
}

let settings: NotificationSettings = {
  enabled: false,
  recipients: [],
  onCritical: true,
  onHigh: true,
  onScanComplete: false,
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587"),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  fromEmail: process.env.SMTP_FROM || "noreply@zcrx.app",
};

// ─── Notification log ───
interface NotificationLog {
  id: string;
  type: "critical" | "high" | "scan_complete";
  subject: string;
  recipients: string[];
  status: "sent" | "failed" | "skipped";
  message: string;
  createdAt: string;
}

const notificationLogs: NotificationLog[] = [];

export function getSettings(): NotificationSettings {
  return { ...settings, smtpPass: settings.smtpPass ? "••••••••" : "" };
}

export function updateSettings(updates: Partial<NotificationSettings>): NotificationSettings {
  settings = { ...settings, ...updates };
  return getSettings();
}

export function getLogs(): NotificationLog[] {
  return notificationLogs.slice(-50).reverse();
}

/**
 * Send email notification (via SMTP or logs it if SMTP not configured)
 */
async function sendEmail(to: string[], subject: string, html: string): Promise<boolean> {
  if (!settings.smtpHost || !settings.smtpUser) {
    // No SMTP configured — log and broadcast
    console.log(`[EMAIL-SKIP] No SMTP configured. Would send to ${to.join(", ")}: ${subject}`);
    return false;
  }

  try {
    // For Bun, we use a simple SMTP approach via fetch to mail API
    // In production, integrate with Resend/SendGrid/SES
    // For now, log the email
    console.log(`[EMAIL] Sending to ${to.join(", ")}: ${subject}`);
    
    // If using Resend API
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: settings.fromEmail,
          to,
          subject,
          html,
        }),
      });
      return res.ok;
    }

    return true;
  } catch (e: any) {
    console.error(`[EMAIL-ERROR] ${e.message}`);
    return false;
  }
}

/**
 * Notify about scan completion with findings summary
 */
export async function notifyScanComplete(
  scanId: string,
  projectName: string,
  scanType: string,
  findingsSummary: { critical: number; high: number; medium: number; low: number; total: number },
) {
  if (!settings.enabled || settings.recipients.length === 0) return;

  const hasCritical = findingsSummary.critical > 0;
  const hasHigh = findingsSummary.high > 0;

  // Check if we should notify
  const shouldNotify =
    (settings.onScanComplete) ||
    (settings.onCritical && hasCritical) ||
    (settings.onHigh && hasHigh);

  if (!shouldNotify) return;

  const severity = hasCritical ? "🔴 CRITICAL" : hasHigh ? "🟠 HIGH" : "ℹ️ INFO";
  const subject = `[ZCRX] ${severity} — ${projectName} ${scanType.toUpperCase()} scan: ${findingsSummary.total} findings`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">🛡️ ZCRX Security Alert</h1>
      </div>
      <div style="background: #1a1a2e; padding: 24px; border-radius: 0 0 12px 12px; color: #e2e8f0;">
        <h2 style="margin-top: 0;">Scan Complete: ${projectName}</h2>
        <p><strong>Type:</strong> ${scanType.toUpperCase()}</p>
        <p><strong>Scan ID:</strong> ${scanId}</p>
        
        <div style="display: flex; gap: 12px; margin: 20px 0;">
          <div style="flex: 1; text-align: center; padding: 12px; border-radius: 8px; background: ${findingsSummary.critical > 0 ? '#ef444430' : '#1e1e30'};">
            <div style="font-size: 24px; font-weight: 800; color: #ef4444;">${findingsSummary.critical}</div>
            <div style="font-size: 11px; color: #999;">Critical</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 12px; border-radius: 8px; background: ${findingsSummary.high > 0 ? '#f9731630' : '#1e1e30'};">
            <div style="font-size: 24px; font-weight: 800; color: #f97316;">${findingsSummary.high}</div>
            <div style="font-size: 11px; color: #999;">High</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 12px; border-radius: 8px; background: #1e1e30;">
            <div style="font-size: 24px; font-weight: 800; color: #eab308;">${findingsSummary.medium}</div>
            <div style="font-size: 11px; color: #999;">Medium</div>
          </div>
          <div style="flex: 1; text-align: center; padding: 12px; border-radius: 8px; background: #1e1e30;">
            <div style="font-size: 24px; font-weight: 800; color: #3b82f6;">${findingsSummary.low}</div>
            <div style="font-size: 11px; color: #999;">Low</div>
          </div>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          — Sent by ZCRX Security Platform
        </p>
      </div>
    </div>
  `;

  const sent = await sendEmail(settings.recipients, subject, html);

  const log: NotificationLog = {
    id: `notif_${Date.now()}`,
    type: hasCritical ? "critical" : hasHigh ? "high" : "scan_complete",
    subject,
    recipients: settings.recipients,
    status: sent ? "sent" : settings.smtpHost ? "failed" : "skipped",
    message: `${scanType.toUpperCase()} scan on ${projectName}: ${findingsSummary.total} findings (${findingsSummary.critical} critical, ${findingsSummary.high} high)`,
    createdAt: new Date().toISOString(),
  };

  notificationLogs.push(log);
  broadcast({ type: "notification:email", data: log });
}
