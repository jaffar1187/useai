import { existsSync, readFileSync, writeFileSync, unlinkSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DAEMON_URL, DAEMON_PID_FILE, DAEMON_LOG_FILE } from "@devness/useai-storage/paths";

export interface DaemonStatus {
  running: boolean;
  pid?: number;
  /** Uptime in seconds */
  uptimeSeconds?: number;
  activeSessions?: number;
  version?: string;
  url: string;
}

export async function getDaemonStatus(): Promise<DaemonStatus> {
  try {
    const res = await fetch(`${DAEMON_URL}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const json = await res.json() as {
        uptime_seconds?: number;
        active_sessions?: number;
        version?: string;
      };
      const pid = readPid();
      return {
        running: true,
        url: DAEMON_URL,
        ...(pid !== undefined && { pid }),
        ...(json.uptime_seconds !== undefined && { uptimeSeconds: json.uptime_seconds }),
        ...(json.active_sessions !== undefined && { activeSessions: json.active_sessions }),
        ...(json.version !== undefined && { version: json.version }),
      };
    }
  } catch { /* not running */ }
  return { running: false, url: DAEMON_URL };
}

export function readPid(): number | undefined {
  try {
    if (!existsSync(DAEMON_PID_FILE)) return undefined;
    return parseInt(readFileSync(DAEMON_PID_FILE, "utf-8").trim(), 10);
  } catch {
    return undefined;
  }
}

/** Resolve the daemon entry point (app.js) from the @devness/useai-daemon package */
function resolveDaemonEntry(): string {
  try {
    // Try resolving from the workspace
    const daemonPkg = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../daemon/dist/app.js",
    );
    if (existsSync(daemonPkg)) return daemonPkg;
  } catch { /* ignore */ }

  // Fallback: try require.resolve style
  try {
    const pkgPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../../node_modules/@devness/useai-daemon/dist/app.js",
    );
    if (existsSync(pkgPath)) return pkgPath;
  } catch { /* ignore */ }

  throw new Error("Could not find daemon entry point. Run 'pnpm build' first.");
}

export function startDaemonProcess(): void {
  const entry = resolveDaemonEntry();
  const logFd = openSync(DAEMON_LOG_FILE, "a");
  const child = spawn("node", [entry], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: { ...process.env },
  });
  child.unref();
  if (child.pid) {
    writeFileSync(DAEMON_PID_FILE, String(child.pid), "utf-8");
  }
}

export function stopDaemonProcess(): boolean {
  const pid = readPid();
  if (!pid) return false;
  try {
    process.kill(pid, "SIGTERM");
    if (existsSync(DAEMON_PID_FILE)) unlinkSync(DAEMON_PID_FILE);
    return true;
  } catch {
    if (existsSync(DAEMON_PID_FILE)) unlinkSync(DAEMON_PID_FILE);
    return false;
  }
}

export function getDaemonLogPath(): string {
  return DAEMON_LOG_FILE;
}
