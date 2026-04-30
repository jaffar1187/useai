#!/usr/bin/env node
/**
 * publish.mjs — Bump version, build, bundle, and publish @devness/useai.
 *
 * The published tarball is a single npm package containing both the CLI
 * (`useai` bin) and the MCP stdio server entry. Workspace deps
 * (@devness/useai-*) are inlined by tsup via noExternal, so the published
 * package has zero @devness/useai-* runtime dependencies.
 *
 * Usage:
 *   node scripts/publish.mjs patch       # 1.0.0 → 1.0.1
 *   node scripts/publish.mjs minor       # 1.0.0 → 1.1.0
 *   node scripts/publish.mjs major       # 1.0.0 → 2.0.0
 *   node scripts/publish.mjs 1.2.3       # explicit version
 *   node scripts/publish.mjs patch --dry # show what would happen, skip publish
 */

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  cpSync,
  rmSync,
  existsSync,
} from "node:fs";
// (USEAI_CLI_TS path removed — tsup's `define` replaces __VERSION__ at bundle time)
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Paths ────────────────────────────────────────────────────────────────────

const USEAI_DIR     = join(ROOT, "packages/useai");
const USEAI_PKG     = join(USEAI_DIR, "package.json");
const USEAI_DIST    = join(USEAI_DIR, "dist");
const DASHBOARD_DIST = join(ROOT, "packages/dashboard/dist");
const ROOT_README   = join(ROOT, "README.md");
const ROOT_LICENSE  = join(ROOT, "LICENSE");

// ── Helpers ──────────────────────────────────────────────────────────────────

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function bumpVersion(current, bump) {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (bump) {
    case "patch": return `${major}.${minor}.${patch + 1}`;
    case "minor": return `${major}.${minor + 1}.0`;
    case "major": return `${major + 1}.0.0`;
    default:
      if (/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(bump)) return bump;
      console.error(`Invalid bump: "${bump}". Use patch, minor, major, or an explicit semver.`);
      process.exit(1);
  }
}

// ── Args ─────────────────────────────────────────────────────────────────────

const bump = process.argv[2];
const dry  = process.argv.includes("--dry");

if (!bump) {
  console.error("Usage: node scripts/publish.mjs <patch|minor|major|x.y.z> [--dry]");
  process.exit(1);
}

const useaiPkg     = readJson(USEAI_PKG);
const currentVersion = useaiPkg.version;
const nextVersion    = bumpVersion(currentVersion, bump);

console.log(`\n  @devness/useai: ${currentVersion} → ${nextVersion}${dry ? "  (dry run)" : ""}\n`);

// ── 1. Bump version ──────────────────────────────────────────────────────────

console.log("  Bumping version…");
useaiPkg.version = nextVersion;
writeJson(USEAI_PKG, useaiPkg);
console.log(`    ✓ packages/useai/package.json`);
// The CLI's version string is injected at bundle time via tsup's `define`
// (see tsup.config.ts). No source files to keep in sync.

// ── 2. Clean dist ────────────────────────────────────────────────────────────

console.log("\n  Cleaning packages/useai/dist…");
if (existsSync(USEAI_DIST)) rmSync(USEAI_DIST, { recursive: true, force: true });

// ── 3. Build all workspace packages (tsc) ────────────────────────────────────

console.log("\n  Building workspace (turbo)…");
run("pnpm build");

// ── 4. Build dashboard (vite) ────────────────────────────────────────────────
//      Dashboard build is part of `pnpm build` already, but re-run here so
//      we get a fresh, deterministic dist before copying it into the bundle.

console.log("\n  Building dashboard…");
run("pnpm --filter @devness/useai-dashboard run build");

// ── 5. Bundle the CLI (tsup) ─────────────────────────────────────────────────

console.log("\n  Bundling @devness/useai (tsup)…");
run("pnpm --filter @devness/useai run bundle");

// ── 6. Copy dashboard dist into the published package ───────────────────────

console.log("\n  Copying dashboard dist into packages/useai/dist/dashboard/…");
if (!existsSync(DASHBOARD_DIST)) {
  console.error(`    ✗ dashboard dist not found at ${DASHBOARD_DIST}`);
  process.exit(1);
}
cpSync(DASHBOARD_DIST, join(USEAI_DIST, "dashboard"), { recursive: true });
console.log(`    ✓ packages/useai/dist/dashboard/`);

// ── 7. Copy README + LICENSE into the package ───────────────────────────────

console.log("\n  Copying README.md and LICENSE…");
copyFileSync(ROOT_README, join(USEAI_DIR, "README.md"));
copyFileSync(ROOT_LICENSE, join(USEAI_DIR, "LICENSE"));
console.log(`    ✓ packages/useai/README.md`);
console.log(`    ✓ packages/useai/LICENSE`);

// ── 8. Strip workspace devDependencies from the published package.json ──────
//      pnpm publish would rewrite workspace:* to fixed versions and ship them
//      in devDependencies, leaving dangling references to private packages
//      that aren't on npm. devDependencies aren't installed by consumers, but
//      we still strip them to keep the tarball clean.

console.log("\n  Preparing tarball-clean package.json…");
const pkgBackupPath = USEAI_PKG + ".publish-bak";
copyFileSync(USEAI_PKG, pkgBackupPath);

const cleanPkg = readJson(USEAI_PKG);
if (cleanPkg.devDependencies) {
  for (const key of Object.keys(cleanPkg.devDependencies)) {
    if (key.startsWith("@devness/useai-")) {
      delete cleanPkg.devDependencies[key];
    }
  }
  if (Object.keys(cleanPkg.devDependencies).length === 0) {
    delete cleanPkg.devDependencies;
  }
}
writeJson(USEAI_PKG, cleanPkg);
console.log(`    ✓ stripped @devness/useai-* devDeps from package.json`);

// ── 9. Publish ───────────────────────────────────────────────────────────────

let publishError = null;
try {
  if (dry) {
    console.log("\n  Dry run — simulating publish (no upload)…");
    run("pnpm --filter @devness/useai publish --access public --no-git-checks --dry-run");
  } else {
    console.log("\n  Publishing @devness/useai…");
    run("pnpm --filter @devness/useai publish --access public --no-git-checks --provenance");
  }
} catch (err) {
  publishError = err;
} finally {
  // Always restore the original package.json so the workspace dev setup keeps working.
  copyFileSync(pkgBackupPath, USEAI_PKG);
  rmSync(pkgBackupPath);
}

if (publishError) {
  console.error(`\n  ✗ Publish failed: ${publishError.message}`);
  process.exit(1);
}

// ── 10. Verify the tarball is actually fetchable ─────────────────────────────
//      `npm publish` exiting 0 is not a guarantee that the tarball blob
//      landed in npm's storage. We have observed cases where metadata,
//      attestations, and the Sigstore log were all written successfully but
//      the tarball was missing — which silently breaks `npx @devness/useai`
//      for everyone, including the autostart service.

if (!dry) {
  console.log(`\n  Verifying tarball is fetchable…`);
  const tarballUrl = `https://registry.npmjs.org/@devness/useai/-/useai-${nextVersion}.tgz`;

  const start = Date.now();
  const deadlineMs = 90_000;
  let lastStatus = 0;

  while (Date.now() - start < deadlineMs) {
    try {
      const res = await fetch(tarballUrl, { method: "HEAD" });
      lastStatus = res.status;
      if (res.ok) {
        console.log(`    ✓ Tarball available (HTTP 200) after ${Math.round((Date.now() - start) / 1000)}s`);
        console.log(`\n  ✓ Published @devness/useai@${nextVersion}\n`);
        process.exit(0);
      }
    } catch {
      // network blip — keep polling
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  console.error(
    `\n  ✗ Publish reported success but tarball is still unreachable after ${deadlineMs / 1000}s`,
  );
  console.error(`    URL:         ${tarballUrl}`);
  console.error(`    Last status: ${lastStatus || "no response"}`);
  console.error(
    `\n  This is a partial publish — npm wrote the metadata but the tarball blob`,
  );
  console.error(
    `  did not land. Anyone running \`npx @devness/useai@latest\` (including the`,
  );
  console.error(
    `  autostart service) will get HTTP 404 and fail. Do not declare this release`,
  );
  console.error(
    `  successful; bump and republish, or contact npm support if the issue persists.\n`,
  );
  process.exit(1);
}

// ── 11. Done (dry run) ───────────────────────────────────────────────────────

if (dry) {
  console.log(`\n  ✓ Dry run complete. Inspect .publish-tmp/ for the tarball.\n`);
}
