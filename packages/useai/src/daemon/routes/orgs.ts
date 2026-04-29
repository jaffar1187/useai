import { Hono } from "hono";
import { apiFetch } from "@devness/useai-cloud";
import { getConfig } from "@devness/useai-storage";

export const orgsRoutes = new Hono();

// GET /api/local/orgs — proxy to cloud API
orgsRoutes.get("/", async (c) => {
  const config = await getConfig();
  if (!config.auth?.token) {
    return c.json([]);
  }
  try {
    const res = await apiFetch("/api/orgs", { token: config.auth.token });
    if (res.ok && res.data) {
      return c.json(res.data);
    }
    return c.json([]);
  } catch {
    return c.json([]);
  }
});
