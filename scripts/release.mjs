#!/usr/bin/env node
/**
 * release.mjs — Bump version, commit, tag, push. CI publishes from the tag.
 *
 * Usage:
 *   node scripts/release.mjs patch       # 1.0.1 → 1.0.2
 *   node scripts/release.mjs minor       # 1.0.1 → 1.1.0
 *   node scripts/release.mjs major       # 1.0.1 → 2.0.0
 *   node scripts/release.mjs 1.2.3       # explicit version
 *
 * Requires a clean working tree. If you have pending changes (e.g. UI edits),
 * commit and push them first — release.mjs only bumps the version.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const USEAI_PKG = join(ROOT, "packages/useai/package.json");

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function capture(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf-8" }).trim();
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

const bump = process.argv[2];
if (!bump) {
  console.error("Usage: node scripts/release.mjs <patch|minor|major|x.y.z>");
  process.exit(1);
}

// ── Pre-flight checks ────────────────────────────────────────────────────────

const branch = capture("git rev-parse --abbrev-ref HEAD");
if (branch !== "main") {
  console.error(`✗ Releases must be cut from main. You're on "${branch}".`);
  process.exit(1);
}

const dirty = capture("git status --porcelain");
if (dirty) {
  console.error("✗ Working tree has uncommitted changes:");
  console.error(dirty.split("\n").map((l) => "  " + l).join("\n"));
  console.error("\nCommit and push them before running release.");
  process.exit(1);
}

// Make sure we're up to date with origin so we don't release stale code.
console.log("\n  Fetching origin…");
run("git fetch origin main --tags");
const local  = capture("git rev-parse main");
const remote = capture("git rev-parse origin/main");
if (local !== remote) {
  console.error(`✗ Local main is not in sync with origin/main.`);
  console.error(`  local:  ${local.slice(0, 8)}`);
  console.error(`  remote: ${remote.slice(0, 8)}`);
  console.error("\nPull or push to sync, then re-run.");
  process.exit(1);
}

// ── Bump ─────────────────────────────────────────────────────────────────────

const pkg = JSON.parse(readFileSync(USEAI_PKG, "utf-8"));
const currentVersion = pkg.version;
const nextVersion = bumpVersion(currentVersion, bump);

console.log(`\n  @devness/useai: ${currentVersion} → ${nextVersion}\n`);

pkg.version = nextVersion;
writeFileSync(USEAI_PKG, JSON.stringify(pkg, null, 2) + "\n");
console.log(`  ✓ bumped packages/useai/package.json`);

// Keep pnpm-lock.yaml in sync (it tracks workspace package versions).
console.log("\n  Updating pnpm-lock.yaml…");
run("pnpm install --lockfile-only --silent");

// ── Commit, tag, push ────────────────────────────────────────────────────────

console.log("\n  Committing release…");
run(`git add packages/useai/package.json pnpm-lock.yaml`);
run(`git commit -m "release: v${nextVersion}"`);

console.log(`\n  Tagging v${nextVersion}…`);
run(`git tag -a v${nextVersion} -m "v${nextVersion}"`);

console.log("\n  Pushing to origin…");
run("git push origin main --follow-tags");

console.log(`\n  ✓ Tagged v${nextVersion} and pushed.`);
console.log(`    CI is publishing to npm with provenance now.\n`);

// ── Auto-watch the publish workflow ──────────────────────────────────────────
// `gh run watch` requires a run ID, not a workflow filter, so resolve the
// latest run for publish.yml and hand it over. Falls back to printing a
// copy-pasteable command if `gh` isn't installed or the run isn't visible yet.

function hasGh() {
  try {
    execSync("which gh", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const watchHint = `gh run watch $(gh run list --workflow=publish.yml --limit 1 --json databaseId --jq '.[0].databaseId')`;

if (!hasGh()) {
  console.log(`  Install the GitHub CLI (gh) to watch the run live, or check:`);
  console.log(`    https://github.com/devness-com/useai/actions\n`);
  process.exit(0);
}

// Wait briefly for GitHub to register the new run after the tag push.
console.log("  Waiting for the workflow run to register…");
let runId = "";
const deadline = Date.now() + 30_000;
while (Date.now() < deadline) {
  try {
    const out = execSync(
      `gh run list --workflow=publish.yml --limit 1 --json databaseId,headBranch --jq '.[0] | select(.headBranch == "v${nextVersion}") | .databaseId'`,
      { cwd: ROOT, encoding: "utf-8" },
    ).trim();
    if (out) { runId = out; break; }
  } catch { /* retry */ }
  execSync("sleep 2");
}

if (!runId) {
  console.log(`\n  Couldn't find the run for v${nextVersion} yet. Try:`);
  console.log(`    ${watchHint}\n`);
  process.exit(0);
}

console.log(`\n  Watching run ${runId} (Ctrl+C to detach — workflow keeps running):\n`);
try {
  run(`gh run watch ${runId} --exit-status`);
} catch {
  console.error(`\n  ✗ Workflow failed. Inspect logs:`);
  console.error(`    gh run view ${runId} --log-failed\n`);
  process.exit(1);
}
