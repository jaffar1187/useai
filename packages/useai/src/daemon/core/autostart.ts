import { existsSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { DAEMON_PORT, DAEMON_LOG_FILE } from "@devness/useai-storage/paths";
import { resolveNpxPath, buildServicePath } from "./resolve-npx.js";

const HOME = homedir();

// ---------------------------------------------------------------------------
// macOS — launchd
// ---------------------------------------------------------------------------

const LAUNCHD_LABEL = "dev.useai.daemon";
const LAUNCHD_PLIST_PATH = join(HOME, "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);

function launchdDomain(): string {
  try {
    const uid = execSync("id -u", { encoding: "utf-8" }).trim();
    return `gui/${uid}`;
  } catch {
    return `gui/${process.getuid?.() ?? 501}`;
  }
}

function launchdServiceTarget(): string {
  return `${launchdDomain()}/${LAUNCHD_LABEL}`;
}

function launchdPlist(npxPath: string, servicePath: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${npxPath}</string>
    <string>-y</string>
    <string>--prefer-online</string>
    <string>@devness/useai@latest</string>
    <string>daemon-run</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>ExitTimeOut</key>
  <integer>10</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>${DAEMON_LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${DAEMON_LOG_FILE}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${servicePath}</string>
    <key>USEAI_PORT</key>
    <string>${DAEMON_PORT}</string>
  </dict>
</dict>
</plist>
`;
}

function installMacos(): void {
  const npxPath = resolveNpxPath();
  const servicePath = buildServicePath();
  const target = launchdServiceTarget();
  const domain = launchdDomain();

  mkdirSync(dirname(LAUNCHD_PLIST_PATH), { recursive: true });
  writeFileSync(LAUNCHD_PLIST_PATH, launchdPlist(npxPath, servicePath), "utf-8");

  // Bootout first so a re-install picks up plist changes (idempotent).
  try { execSync(`launchctl bootout ${target} 2>/dev/null`, { stdio: "ignore" }); } catch { /* ignore */ }

  // Clear any disabled state from a prior crash-loop throttle.
  try { execSync(`launchctl enable ${target}`, { stdio: "ignore" }); } catch { /* ignore */ }

  execSync(`launchctl bootstrap ${domain} "${LAUNCHD_PLIST_PATH}"`, { stdio: "ignore" });
}

function uninstallMacos(): void {
  const target = launchdServiceTarget();
  try { execSync(`launchctl bootout ${target} 2>/dev/null`, { stdio: "ignore" }); } catch { /* ignore */ }
  try { if (existsSync(LAUNCHD_PLIST_PATH)) unlinkSync(LAUNCHD_PLIST_PATH); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Linux — systemd user unit
// ---------------------------------------------------------------------------

const SYSTEMD_UNIT_NAME = "useai-daemon.service";
const SYSTEMD_UNIT_PATH = join(HOME, ".config", "systemd", "user", SYSTEMD_UNIT_NAME);

function systemdUnit(npxPath: string, servicePath: string): string {
  return `[Unit]
Description=useai daemon
After=network.target
StartLimitBurst=5
StartLimitIntervalSec=60

[Service]
Type=simple
ExecStart=${npxPath} -y --prefer-online @devness/useai@latest daemon-run
Restart=on-failure
RestartSec=10
StandardOutput=append:${DAEMON_LOG_FILE}
StandardError=append:${DAEMON_LOG_FILE}
Environment=PATH=${servicePath}
Environment=USEAI_PORT=${DAEMON_PORT}

[Install]
WantedBy=default.target
`;
}

function installLinux(): void {
  const npxPath = resolveNpxPath();
  const servicePath = buildServicePath();

  mkdirSync(dirname(SYSTEMD_UNIT_PATH), { recursive: true });
  writeFileSync(SYSTEMD_UNIT_PATH, systemdUnit(npxPath, servicePath), "utf-8");

  try { execSync(`systemctl --user reset-failed ${SYSTEMD_UNIT_NAME}`, { stdio: "ignore" }); } catch { /* ignore */ }
  execSync("systemctl --user daemon-reload", { stdio: "ignore" });
  execSync(`systemctl --user enable --now ${SYSTEMD_UNIT_NAME}`, { stdio: "ignore" });
}

function uninstallLinux(): void {
  try { execSync(`systemctl --user disable --now ${SYSTEMD_UNIT_NAME}`, { stdio: "ignore" }); } catch { /* ignore */ }
  try { if (existsSync(SYSTEMD_UNIT_PATH)) unlinkSync(SYSTEMD_UNIT_PATH); } catch { /* ignore */ }
  try { execSync("systemctl --user daemon-reload", { stdio: "ignore" }); } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type AutostartPlatform = "darwin" | "linux";

export function getAutostartPlatform(): AutostartPlatform | null {
  if (process.platform === "darwin") return "darwin";
  if (process.platform === "linux") return "linux";
  return null;
}

/**
 * Install (and start) the autostart service for the current platform.
 *
 * On macOS this writes a launchd plist to `~/Library/LaunchAgents/` and
 * bootstraps it so the daemon starts immediately and on every login.
 * On Linux this writes a systemd user unit to `~/.config/systemd/user/`
 * and runs `enable --now` to start and persist it.
 *
 * Idempotent: re-running re-applies the latest plist/unit content.
 */
export function installAutostart(): void {
  const platform = getAutostartPlatform();
  if (!platform) throw new Error(`Autostart not supported on ${process.platform}`);

  if (platform === "darwin") {
    installMacos();
    return;
  }

  if (platform === "linux") {
    installLinux();
  }
}

export function uninstallAutostart(): void {
  const platform = getAutostartPlatform();
  if (platform === "darwin") {
    uninstallMacos();
    return;
  }
  if (platform === "linux") {
    uninstallLinux();
  }
}

export function isAutostartEnabled(): boolean {
  const platform = getAutostartPlatform();
  if (platform === "darwin") return existsSync(LAUNCHD_PLIST_PATH);
  if (platform === "linux") return existsSync(SYSTEMD_UNIT_PATH);
  return false;
}
