import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  runRemediationAgent,
  getAgentTasks,
  getAgentTask,
  approveTask,
  rejectTask,
} from "../services/agent";

export const agentRoutes = new Hono();

// List all agent tasks
agentRoutes.get("/tasks", async (c) => {
  return c.json({ data: getAgentTasks() });
});

// Get a specific task
agentRoutes.get("/tasks/:id", async (c) => {
  const task = getAgentTask(c.req.param("id"));
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json({ data: task });
});

// Run remediation agent on a finding
agentRoutes.post("/remediate", async (c) => {
  const body = await c.req.json();
  const taskId = `agent_${nanoid(10)}`;

  // Run agent in background (non-blocking)
  runRemediationAgent(taskId, {
    id: body.findingId || nanoid(),
    title: body.title || "Unknown vulnerability",
    severity: body.severity || "medium",
    description: body.description || "",
    filePath: body.filePath || "unknown",
    line: body.line || 0,
    code: body.code || "",
    cweId: body.cweId,
    ruleId: body.ruleId,
  }, body.dryRun !== false); // default dry-run mode

  return c.json({ taskId, message: "Agent started" });
});

// Approve a fix
agentRoutes.post("/tasks/:id/approve", async (c) => {
  const ok = approveTask(c.req.param("id"));
  return c.json({ success: ok });
});

// Reject a fix
agentRoutes.post("/tasks/:id/reject", async (c) => {
  const ok = rejectTask(c.req.param("id"));
  return c.json({ success: ok });
});
