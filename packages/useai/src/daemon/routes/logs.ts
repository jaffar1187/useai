import { Hono } from "hono";
import { getSyncLogEntries } from "@devness/useai-storage";

export const logsRoutes = new Hono();

logsRoutes.get("/", (c) => {
  const entries = getSyncLogEntries();
  return c.json(entries);
});
