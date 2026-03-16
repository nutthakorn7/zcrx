const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("zcrx_token");
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    // Token expired or invalid
    if (typeof window !== "undefined") {
      localStorage.removeItem("zcrx_token");
      localStorage.removeItem("zcrx_user");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: (body: { email: string; password: string }) =>
      fetchApi<{ data: { token: string; user: any } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    register: (body: { email: string; password: string; name: string }) =>
      fetchApi<{ data: { token: string; user: any } }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    me: () => fetchApi<{ data: any }>("/api/auth/me"),
  },
  dashboard: {
    getStats: () => fetchApi<{ data: any }>("/api/dashboard"),
  },
  projects: {
    list: () => fetchApi<{ data: any[] }>("/api/projects"),
    get: (id: string) => fetchApi<{ data: any }>(`/api/projects/${id}`),
    create: (body: { name: string; description?: string; repoUrl?: string; language?: string }) =>
      fetchApi<{ data: any }>("/api/projects", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    delete: (id: string) =>
      fetchApi<{ message: string }>(`/api/projects/${id}`, { method: "DELETE" }),
    archive: (id: string) =>
      fetchApi(`/api/projects/${id}/archive`, { method: "PATCH" }),
    unarchive: (id: string) =>
      fetchApi(`/api/projects/${id}/unarchive`, { method: "PATCH" }),
  },
  scans: {
    list: (projectId?: string) =>
      fetchApi<{ data: any[] }>(
        projectId ? `/api/scans?projectId=${projectId}` : "/api/scans"
      ),
    get: (id: string) => fetchApi<{ data: any }>(`/api/scans/${id}`),
    trigger: (body: { projectId: string; type: string; targetUrl?: string; templates?: string[] }) =>
      fetchApi<{ data: any }>("/api/scans", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    compare: (scanA: string, scanB: string) =>
      fetchApi<{ data: any }>(`/api/scans/compare?scanA=${scanA}&scanB=${scanB}`),
  },
  findings: {
    list: (params?: Record<string, string>) => {
      const query = params
        ? "?" + new URLSearchParams(params).toString()
        : "";
      return fetchApi<{ data: any[] }>(`/api/findings${query}`);
    },
    get: (id: string) => fetchApi<{ data: any }>(`/api/findings/${id}`),
    updateStatus: (id: string, status: string) =>
      fetchApi<{ data: any }>(`/api/findings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    changeStatus: (id: string, status: string) =>
      fetchApi(`/api/findings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    assign: (id: string, assignedTo: string) =>
      fetchApi(`/api/findings/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assignedTo }),
      }),
    getComments: (id: string) =>
      fetchApi<{ data: any[] }>(`/api/findings/${id}/comments`),
    addComment: (id: string, content: string) =>
      fetchApi(`/api/findings/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    getAssignableUsers: () =>
      fetchApi<{ data: any[] }>("/api/findings/assignable-users"),
  },
  sbom: {
    get: (scanId: string) =>
      fetchApi<{ data: any }>(`/api/sbom/${scanId}`),
  },
  ai: {
    summarizeDashboard: (stats: any) =>
      fetchApi<{ summary: string }>("/api/ai/summarize-dashboard", {
        method: "POST",
        body: JSON.stringify(stats),
      }),
  },
  search: {
    query: (q: string) =>
      fetchApi<{ data: any }>(`/api/search?q=${encodeURIComponent(q)}`),
  },
  users: {
    list: () => fetchApi<{ data: any[] }>("/api/users"),
    changeRole: (id: string, role: string) =>
      fetchApi(`/api/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    delete: (id: string) =>
      fetchApi(`/api/users/${id}`, { method: "DELETE" }),
  },
  dast: {
    trends: () => fetchApi<{ data: any[] }>("/api/dast/trends"),
    comparison: (projectId?: string) =>
      fetchApi<{ data: any }>(`/api/dast/comparison${projectId ? `?projectId=${projectId}` : ""}`),
    schedules: {
      list: () => fetchApi<{ data: any[] }>("/api/dast/schedules"),
      create: (body: any) =>
        fetchApi("/api/dast/schedules", { method: "POST", body: JSON.stringify(body) }),
      update: (id: string, body: any) =>
        fetchApi(`/api/dast/schedules/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
      delete: (id: string) =>
        fetchApi(`/api/dast/schedules/${id}`, { method: "DELETE" }),
    },
    templates: {
      list: () => fetchApi<{ data: any[] }>("/api/dast/templates"),
      create: (body: { name: string; content: string }) =>
        fetchApi("/api/dast/templates", { method: "POST", body: JSON.stringify(body) }),
      delete: (id: string) =>
        fetchApi(`/api/dast/templates/${id}`, { method: "DELETE" }),
      generate: (prompt: string) =>
        fetchApi<{ data: { content: string; name: string } }>("/api/dast/templates/generate", {
          method: "POST", body: JSON.stringify({ prompt }),
        }),
    },
  },
  notifications: {
    getSettings: () => fetchApi<{ data: any }>("/api/notifications/settings"),
    updateSettings: (body: any) =>
      fetchApi("/api/notifications/settings", { method: "PATCH", body: JSON.stringify(body) }),
    getLogs: () => fetchApi<{ data: any[] }>("/api/notifications/logs"),
    sendTest: () => fetchApi("/api/notifications/test", { method: "POST" }),
  },
  ai: {
    riskScore: (body: any) => fetchApi("/api/ai/risk-score", { method: "POST", body: JSON.stringify(body) }),
    explain: (body: any) => fetchApi("/api/ai/explain", { method: "POST", body: JSON.stringify(body) }),
    dependencyAdvisor: (body: any) => fetchApi("/api/ai/dependency-advisor", { method: "POST", body: JSON.stringify(body) }),
    executiveReport: (body: any) => fetchApi("/api/ai/executive-report", { method: "POST", body: JSON.stringify(body) }),
    prioritize: (body: any) => fetchApi("/api/ai/prioritize", { method: "POST", body: JSON.stringify(body) }),
    chat: (body: any) => fetchApi("/api/ai/chat", { method: "POST", body: JSON.stringify(body) }),
  },
};
