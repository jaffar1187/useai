import { Hono } from "hono";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { UpdateInfo } from "@devness/useai-types";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const execFileAsync = promisify(execFile);

export const updateRoutes = new Hono();

updateRoutes.get("/", async (c) => {
  try {
    const { stdout } = await execFileAsync("npm", ["view", "@devness/useai-cli", "version"]);
    const latestVersion = stdout.trim();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pkg = require(resolve(__dirname, "../../package.json")) as { version: string };
    const currentVersion = pkg.version ?? "0.1.0";
    const hasUpdate = latestVersion !== currentVersion;
    const info: UpdateInfo = { currentVersion, latestVersion, hasUpdate };
    return c.json({ ok: true, data: info });
  } catch {
    return c.json({ ok: false, error: "Failed to check for updates" }, 500);
  }
});
