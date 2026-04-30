import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const isWindows = process.platform === "win32";

const KNOWN_NPX_PATHS = isWindows
  ? []
  : [
      "/usr/local/bin/npx",
      "/opt/homebrew/bin/npx",
      join(homedir(), ".nvm", "current", "bin", "npx"),
      join(homedir(), ".volta", "bin", "npx"),
      join(homedir(), ".bun", "bin", "npx"),
    ];

/**
 * Resolve the absolute path to npx.
 *
 * launchd and systemd do not inherit the user's interactive PATH, so we must
 * resolve the binary to a full path at install time and bake it into the
 * service definition.
 */
export function resolveNpxPath(): string {
  const whichCmd = isWindows ? "where npx.cmd" : "which npx";
  try {
    const result = execSync(whichCmd, {
      stdio: ["pipe", "pipe", "ignore"],
      encoding: "utf-8",
    }).trim();
    if (result) return result.split("\n")[0]!.trim();
  } catch { /* not found */ }

  if (isWindows) {
    try {
      const result = execSync("where npx", {
        stdio: ["pipe", "pipe", "ignore"],
        encoding: "utf-8",
      }).trim();
      if (result) {
        const first = result.split("\n")[0]!.trim();
        if (!first.toLowerCase().endsWith(".cmd")) {
          const cmdPath = first + ".cmd";
          if (existsSync(cmdPath)) return cmdPath;
        }
        return first;
      }
    } catch { /* not found */ }
  }

  // Login-shell fallback picks up nvm/volta shims that aren't on the
  // non-interactive PATH.
  const shell = process.env["SHELL"];
  if (!isWindows && shell) {
    try {
      const result = execSync(`${shell} -lc "which npx"`, {
        stdio: ["pipe", "pipe", "ignore"],
        encoding: "utf-8",
      }).trim();
      if (result) return result;
    } catch { /* not found */ }
  }

  for (const p of KNOWN_NPX_PATHS) {
    if (existsSync(p)) return p;
  }

  throw new Error(
    "Could not find npx. Ensure Node.js is installed and npx is on your PATH.",
  );
}

/**
 * Build a colon-separated PATH that covers common Node install locations.
 * Used as the EnvironmentVariables.PATH for launchd/systemd so that npx can
 * find the active node binary at run time.
 */
export function buildServicePath(): string {
  const home = homedir();
  const dirs = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    "/bin",
    join(home, ".nvm", "current", "bin"),
    join(home, ".volta", "bin"),
    join(home, ".bun", "bin"),
  ];

  try {
    const npx = resolveNpxPath();
    const npxDir = npx.substring(0, npx.lastIndexOf("/"));
    if (npxDir && !dirs.includes(npxDir)) dirs.unshift(npxDir);
  } catch { /* ignore — caller already failed if npx is missing */ }

  return dirs.filter((d) => existsSync(d)).join(":");
}
