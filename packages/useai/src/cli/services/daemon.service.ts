import { existsSync, readFileSync, writeFileSync, unlinkSync, openSync } from "node:fs";
import { spawn } from "node:child_process";
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

/**
 * Spawn the daemon as a detached child process.
 *
 * The daemon is just the same `useai` binary running its hidden `daemon-run`
 * subcommand. This avoids needing a separate daemon entry file — `useai`'s
 * tsup bundle already inlines the daemon code, so the same script can play
 * both the CLI role and the long-lived server role.
 */
export function startDaemonProcess(): void {
  const cliScript = process.argv[1];
  if (!cliScript) {
    throw new Error("Cannot resolve useai entry script (process.argv[1] is empty)");
  }
  const logFd = openSync(DAEMON_LOG_FILE, "a");
  const child = spawn(process.execPath, [cliScript, "daemon-run"], {
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
