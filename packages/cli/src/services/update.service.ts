import { execSync, spawn } from "node:child_process";

const PACKAGE_NAME = "@devness/useai-cli";

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
  spawn("npm", ["install", "-g", `${PACKAGE_NAME}@latest`], {
    stdio: "inherit",
  });
}
