import { Hono } from "hono";
import { getSettings, updateSettings, getLogs, notifyScanComplete } from "../services/notifications";

export const notificationRoutes = new Hono();

// Get notification settings
notificationRoutes.get("/settings", async (c) => {
  return c.json({ data: getSettings() });
});

// Update notification settings
notificationRoutes.patch("/settings", async (c) => {
  const body = await c.req.json();
  const updated = updateSettings(body);
  return c.json({ data: updated });
});

// Get notification logs
notificationRoutes.get("/logs", async (c) => {
  return c.json({ data: getLogs() });
});

// Send test notification
notificationRoutes.post("/test", async (c) => {
  await notifyScanComplete(
    "test_scan",
    "Test Project",
    "dast",
    { critical: 2, high: 3, medium: 5, low: 1, total: 11 },
  );
  return c.json({ message: "Test notification sent" });
});
