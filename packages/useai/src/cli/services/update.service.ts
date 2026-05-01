import { execSync } from "node:child_process";
import { isAutostartEnabled } from "../../daemon/core/autostart.js";

const PACKAGE_NAME = "@devness/useai";

export interface UpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
}

export function checkForUpdate(): UpdateInfo {
  let latest = "0.0.0";
  try {
    latest = execSync(`npm view ${PACKAGE_NAME} version`, { encoding: "utf-8" }).trim();
  } catch { /* registry unreachable */ }

  const current = getCurrentVersion();
  return { current, latest, hasUpdate: latest !== "0.0.0" && latest !== current };
}

export function getCurrentVersion(): string {
  try {
    return execSync(`npm list ${PACKAGE_NAME} --json 2>/dev/null`, { encoding: "utf-8" })
      .trim()
      .match(/"version":\s*"([^"]+)"/)?.[1] ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

export function runUpdate(): void {
  const wasAutostartEnabled = isAutostartEnabled();

  // Synchronously install the new version. The running Node process keeps
  // executing from memory, so it is safe to overwrite the on-disk binary.
  execSync(`npm install -g ${PACKAGE_NAME}@latest`, { stdio: "inherit" });

  // The autostart launcher pins a specific version (no @latest), so an
  // upgrade must rewrite the launcher with the new version baked in.
  // Spawn the freshly-installed CLI so the launcher gets the new __VERSION__.
  if (wasAutostartEnabled) {
    try {
      execSync("useai daemon autostart install", { stdio: "inherit" });
    } catch {
      // Non-fatal — the global install succeeded; user can run
      // `useai daemon autostart install` manually if this hook fails.
    }
  }

  // Refresh tool MCP configs and instructions text. The MCP entry itself is
  // stable (HTTP URL doesn't change across versions), but the bundled
  // instructions text (the `## UseAI Session Tracking` block in CLAUDE.md,
  // Cursor rules, etc.) is hardcoded in the source and changes between
  // releases — without this refresh, users keep stale instructions in their
  // AI tools indefinitely. Spawned from the freshly-installed CLI so the new
  // instructions text gets written.
  try {
    execSync("useai setup --refresh -y", { stdio: "inherit" });
  } catch {
    // Non-fatal — global install succeeded; user can run
    // `useai setup --refresh -y` manually if this hook fails.
  }
}
