import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://localhost:8080/api/v1";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Required for HttpOnly cookies to be sent
});

// Interceptor removed: Browser handles HttpOnly cookies automatically when withCredentials: true is set.

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      sessionStorage.removeItem("auth_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

// ─── Authentication ──────────────────────────────────────
export const login = (credentials: any) => api.post("/login", credentials).then((r) => r.data);
export const logout = () => api.post("/logout").then((r) => r.data);

// ─── Nodes ───────────────────────────────────────────────
export const fetchNodes = () => api.get("/nodes").then((r) => r.data);
export const getNode = (id: string) => api.get(`/nodes/${id}`).then((r) => r.data);
export const createNode = (data: any) => api.post("/nodes", data).then((r) => r.data);
export const updateNode = (id: string, data: any) => api.put(`/nodes/${id}`, data).then((r) => r.data);
export const deleteNode = (id: string) => api.delete(`/nodes/${id}`).then((r) => r.data);

// ─── Schemas ─────────────────────────────────────────────
export const fetchSchemas = () => api.get("/schemas").then((r) => r.data);
export const getSchema = (id: string) => api.get(`/schemas/${id}`).then((r) => r.data);
export const createSchema = (data: any) => api.post("/schemas", data).then((r) => r.data);
export const updateSchema = (id: string, data: any) => api.put(`/schemas/${id}`, data).then((r) => r.data);
export const deleteSchema = (id: string) => api.delete(`/schemas/${id}`).then((r) => r.data);

// ─── Networks ────────────────────────────────────────────
export const fetchNetworks = () => api.get("/networks").then((r) => r.data);
export const getNetwork = (id: string) => api.get(`/networks/${id}`).then((r) => r.data);
export const createNetwork = (data: any) => api.post("/networks", data).then((r) => r.data);
export const updateNetwork = (id: string, data: any) => api.put(`/networks/${id}`, data).then((r) => r.data);
export const deleteNetwork = (id: string) => api.delete(`/networks/${id}`).then((r) => r.data);
export const testSourceConnection = (id: string) => api.post(`/networks/${id}/test-source`).then((r) => r.data);
export const testTargetConnection = (id: string) => api.post(`/networks/${id}/test-target`).then((r) => r.data);
export const testNetworkAdhoc = (data: any) => api.post(`/networks/test-adhoc`, data).then((r) => r.data);

// ─── Jobs ────────────────────────────────────────────────
export const fetchJobs = () => api.get("/jobs").then((r) => r.data);
export const getJob = (id: string) => api.get(`/jobs/${id}`).then((r) => r.data);
export const createJob = (data: { name: string; source_node: string; target_node: string; job_type?: string; network_id?: number; schema_id?: number }) =>
  api.post("/jobs", data).then((r) => r.data);
export const deleteJob = (id: string) => api.delete(`/jobs/${id}`).then((r) => r.data);
export const startJob = (id: string) => api.post(`/jobs/${id}/start`).then((r) => r.data);
export const abortJob = (id: string) => api.post(`/jobs/${id}/abort`).then((r) => r.data);
export const resetJob = (id: string) => api.post(`/jobs/${id}/reset`).then((r) => r.data);

// ─── Credentials ──────────────────────────────────────────
export const fetchCredentials = () => api.get("/credentials").then((r) => r.data);
export const createCredential = (data: any) => api.post("/credentials", data).then((r) => r.data);
export const updateCredential = (id: string, data: any) => api.put(`/credentials/${id}`, data).then((r) => r.data);
export const deleteCredential = (id: string) => api.delete(`/credentials/${id}`).then((r) => r.data);

// ─── Logs ────────────────────────────────────────────────
export const fetchLogs = (limit = 100) => api.get(`/logs?limit=${limit}`).then((r) => r.data);

// ─── Users & Roles ───────────────────────────────────────
export const fetchUsers = () => api.get("/users").then((r) => r.data);
export const createUser = (data: any) => api.post("/users", data).then((r) => r.data);
export const updateUser = (id: string, data: any) => api.put(`/users/${id}`, data).then((r) => r.data);
export const deleteUser = (id: string) => api.delete(`/users/${id}`).then((r) => r.data);

export const fetchSessions = () => {
  // Mocking sessions since backend doesn't have it yet
  return Promise.resolve({
    data: [
      { id: "sess_8f92a1b3", ip: "127.0.0.1", agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", status: "Active", started: "Just now" },
      { id: "sess_2a1b3c4d", ip: "192.168.1.10", agent: "PostmanRuntime/7.29.0", status: "Active", started: "5 mins ago" },
    ],
    total: 2
  });
};

export const fetchGroups = () => api.get("/groups").then((r) => r.data);
export const createGroup = (data: any) => api.post("/groups", data).then((r) => r.data);
export const updateGroup = (id: string, data: any) => api.put(`/groups/${id}`, data).then((r) => r.data);
export const deleteGroup = (id: string) => api.delete(`/groups/${id}`).then((r) => r.data);

export const fetchRoles = () => api.get("/roles").then((r) => r.data);
export const createRole = (data: any) => api.post("/roles", data).then((r) => r.data);
export const updateRole = (id: string, data: any) => api.put(`/roles/${id}`, data).then((r) => r.data);
export const deleteRole = (id: string) => api.delete(`/roles/${id}`).then((r) => r.data);

export const fetchPolicies = () => api.get("/policies").then((r) => r.data);
export const createPolicy = (data: any) => api.post("/policies", data).then((r) => r.data);
export const updatePolicy = (id: string, data: any) => api.put(`/policies/${id}`, data).then((r) => r.data);
export const deletePolicy = (id: string) => api.delete(`/policies/${id}`).then((r) => r.data);

// ─── Stats ───────────────────────────────────────────────
export const fetchMetrics = (range = "24h") => api.get(`/stats/metrics?range=${range}`).then((r) => r.data);
export const fetchVolumeHistory = (range = "24h") => api.get(`/stats/volume?range=${range}`).then((r) => r.data);

// ─── System / Master ──────────────────────────────────────
export const fetchSystemSettings = () => api.get("/system/settings").then((r) => r.data);
export const updateSystemSettings = (data: any) => api.put("/system/settings", data).then((r) => r.data);
export const runRemoteInstall = (data: any) => api.post("/system/remote-install", data).then((r) => r.data);
export const sendTestNotification = (data: any) => api.post("/system/notifications/test", data).then((r) => r.data);
export const simulateTraffic = () => api.post("/system/demo/simulate").then((r) => r.data);
export const resetDatabase = () => api.post("/system/demo/reset").then((r) => r.data);
export const runHostMigration = (data: any) => api.post("/system/host-migration", data).then((r) => r.data);
export const testAuthWS = (data: any) => api.post("/system/authws/test", data).then((r) => r.data);

// ─── DB Console ──────────────────────────────────────────
export const fetchDBConsoleSources = () => api.get("/system/db-console/sources").then((r) => r.data);
export const executeDBQuery = (query: string, connection_ref: string = "internal") => api.post("/system/db-console/query", { query, connection_ref }).then((r) => r.data);

export default api;
