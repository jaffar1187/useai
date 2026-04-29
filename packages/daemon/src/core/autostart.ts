import { existsSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";

const HOME = homedir();

// ---------------------------------------------------------------------------
// macOS — launchd
// ---------------------------------------------------------------------------

const LAUNCHD_LABEL = "dev.useai.daemon";
const LAUNCHD_PLIST_PATH = join(HOME, "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);

function launchdPlist(nodePath: string, daemonBin: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LAUNCHD_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${daemonBin}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>${join(HOME, ".useai", "daemon.log")}</string>
  <key>StandardErrorPath</key>
  <string>${join(HOME, ".useai", "daemon.log")}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
  </dict>
</dict>
</plist>
`;
}

// ---------------------------------------------------------------------------
// Linux — systemd user unit
// ---------------------------------------------------------------------------

const SYSTEMD_UNIT_NAME = "useai-daemon.service";
const SYSTEMD_UNIT_PATH = join(HOME, ".config", "systemd", "user", SYSTEMD_UNIT_NAME);

function systemdUnit(nodePath: string, daemonBin: string): string {
  return `[Unit]
Description=useai daemon
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${daemonBin}
Restart=on-failure
StandardOutput=append:${join(HOME, ".useai", "daemon.log")}
StandardError=append:${join(HOME, ".useai", "daemon.log")}
Environment=PATH=/usr/local/bin:/usr/bin:/bin

[Install]
WantedBy=default.target
`;
}

// ---------------------------------------------------------------------------
// Resolve paths
// ---------------------------------------------------------------------------

function resolveNodePath(): string {
  return process.execPath;
}

function resolveDaemonBin(): string {
  // Resolve the bin relative to this module's location at runtime
  try {
    const url = new URL(import.meta.url);
    const thisFile = url.pathname;
    // dist/autostart.js → dist/app.js
    return join(dirname(thisFile), "app.js");
  } catch {
    return "useai-daemon";
  }
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

export function installAutostart(): void {
  const platform = getAutostartPlatform();
  if (!platform) throw new Error(`Autostart not supported on ${process.platform}`);

  const nodePath = resolveNodePath();
  const daemonBin = resolveDaemonBin();

  if (platform === "darwin") {
    mkdirSync(dirname(LAUNCHD_PLIST_PATH), { recursive: true });
    writeFileSync(LAUNCHD_PLIST_PATH, launchdPlist(nodePath, daemonBin), "utf-8");
    try {
      execSync(`launchctl load -w "${LAUNCHD_PLIST_PATH}"`, { stdio: "ignore" });
    } catch { /* plist written, load failed — daemon will start on next login */ }
    return;
  }

  if (platform === "linux") {
    mkdirSync(dirname(SYSTEMD_UNIT_PATH), { recursive: true });
    writeFileSync(SYSTEMD_UNIT_PATH, systemdUnit(nodePath, daemonBin), "utf-8");
    try {
      execSync("systemctl --user daemon-reload", { stdio: "ignore" });
      execSync(`systemctl --user enable ${SYSTEMD_UNIT_NAME}`, { stdio: "ignore" });
    } catch { /* unit file written, enable failed */ }
  }
}

export function uninstallAutostart(): void {
  const platform = getAutostartPlatform();

  if (platform === "darwin" && existsSync(LAUNCHD_PLIST_PATH)) {
    try {
      execSync(`launchctl unload -w "${LAUNCHD_PLIST_PATH}"`, { stdio: "ignore" });
    } catch { /* ignore */ }
    unlinkSync(LAUNCHD_PLIST_PATH);
    return;
  }

  if (platform === "linux" && existsSync(SYSTEMD_UNIT_PATH)) {
    try {
      execSync(`systemctl --user disable ${SYSTEMD_UNIT_NAME}`, { stdio: "ignore" });
      execSync("systemctl --user daemon-reload", { stdio: "ignore" });
    } catch { /* ignore */ }
    unlinkSync(SYSTEMD_UNIT_PATH);
  }
}

export function isAutostartEnabled(): boolean {
  const platform = getAutostartPlatform();
  if (platform === "darwin") return existsSync(LAUNCHD_PLIST_PATH);
  if (platform === "linux") return existsSync(SYSTEMD_UNIT_PATH);
  return false;
}
