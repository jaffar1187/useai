import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "node:fs";
import { dirname } from "node:path";

const START_MARKER = "<!-- useai:start -->";
const END_MARKER = "<!-- useai:end -->";

// Cursor rule files (.mdc) need YAML frontmatter to be auto-attached on every
// turn. Without `alwaysApply: true`, Cursor treats the rule as agent-decided
// and may skip it — meaning useai_start would not fire reliably.
const CURSOR_RULE_FRONTMATTER =
  "---\ndescription: useai session tracking rules\nalwaysApply: true\n---\n\n";

// VS Code Copilot custom-instruction files (*.instructions.md) use an
// `applyTo` glob in YAML frontmatter to decide when to attach. With no
// frontmatter the file is not auto-attached at all; `applyTo: '**'` makes the
// rule active for every chat regardless of what file is open. The `**` value
// is quoted because YAML treats it as a special token unquoted.
const VSCODE_INSTRUCTIONS_FRONTMATTER =
  "---\napplyTo: '**'\ndescription: useai session tracking rules\n---\n\n";

export const INSTRUCTIONS_TEXT = [
  "## UseAI Session Tracking",
  "",
  "---",
  "",
  "⚠️ **MASTER CHECKLIST — THESE ARE NON-NEGOTIABLE** ⚠️",
  "",
  "**BEFORE every response, confirm ALL of these:**",
  "",
  "  ⚠️ **THERE IS NO \"TOO SMALL\" EXCEPTION. EVER.** ⚠️",
  "     - One-liners? → Track them.",
  "     - Quick questions? → Track them.",
  "     - Clarifications? → Track them.",
  "     - Follow-ups? → Track them.",
  "     - Yes, even \"what's 2+2?\" → Track it. (If it's real user text, it gets tracked.)",
  "",
  "  1. **useai_start**: Did this turn contain real user text? If YES, did you call `useai_start` FIRST (before ANY tools or text)?",
  "  2. **useai_heartbeat**: Are you continuing work WITHOUT calling `useai_start` or `useai_end` in this turn? (Multi-turn session, same task.) If YES, call `useai_heartbeat`. Also: every 10 tool calls OR every 4 minutes.",
  "  3. **useai_end**: Did you call `useai_start` in this response? If YES, `useai_end` MUST be your LAST tool call. Reserve last 5 tool calls for it.",
  "  4. **SUBAGENTS (CRITICAL)**: Are you spawning ANY subagents (Task tool, researcher, explorer, etc.)? IF YES:",
  "     - STOP. Do NOT proceed.",
  "     - Go read Rule 4 — ALL OF IT.",
  "     - You MUST COPY the ENTIRE `SUBAGENT_INSTRUCTIONS_TEMPLATE` block (between `=== START` and `=== END`) VERBATIM into the subagent prompt.",
  "     - DO NOT paraphrase. DO NOT summarize. DO NOT omit ANY rules.",
  "     - This is NOT optional. This is NOT \"something the subagent already knows.\"",
  "     - FAILURE MODE: If you skip this, subagents run COMPLETELY UNTRACKED. No data. No chain. Silent failure.",
  "",
  "---",
  "",
  "### Rule 1 — useai_start (beginning of response)",
  "**BEFORE EVERY RESPONSE — answer this question first:**",
  '> "Does this turn contain any text written by the real human user?"',
  "> - YES → call `useai_start` as the VERY FIRST thing, before any tool call or text output.",
  "> - NO (only task-notifications, system reminders, plan approvals, hook feedback) → skip `useai_start`.",
  "",
  'This check must happen on EVERY turn, including short follow-up questions, one-liners, and any message that arrives after a task-notification or after a previous session was sealed. There is no "continuation" state — every real user message is a new session.',
  "",
  "**Common failure pattern to avoid:** task-notification turns interrupt the flow → next real user message arrives → `useai_start` gets skipped because it feels like a continuation. It is NOT a continuation. Call `useai_start`.",
  "",
  "  1. **Always call it** when the turn contains actual user-authored text — **NO EXCEPTIONS**. Not for one-liners. Not for quick questions. Not for clarifications. Not for follow-ups. \"Too small\" is NOT a valid reason. **EVERY real user message = NEW session = useai_start + useai_end.",
  "  2. **Never call it** on turns that contain only system reminders, hook feedback, plan approval clicks, or other automated/system-generated content (NOT real user text).",
  "  3. **Interrupted/resumed prompt**: If `useai_start` was called but `useai_end` was never reached (prompt interrupted mid-response), call `useai_heartbeat` instead of `useai_start` to resume — do NOT open a new nested session. If the follow-up message is clearly a new unrelated task, call `useai_end` to close the previous session first, then call `useai_start` for the new one.",
  "  4. **Tool call blocked or rejected**: If the user denies/blocks a tool call and you continue the response, call `useai_heartbeat` immediately before proceeding — the rejection does not end the session, so the keep-alive must be sent manually.",
  "  5. Generate a short `title` (generic, no project names) and a detailed `private_title` from the user's prompt.",
  "  6. **task_type values**: coding, debugging, testing, planning, reviewing, documenting, learning, deployment, devops, research, migration, design, data, security, configuration, code_review, investigation, infrastructure, analysis, ops, setup, refactoring, other",
  "",
  "⚠️ **SUBAGENT PRE-REMINDER (Rule 4):** If you will spawn ANY subagents during this session (Task tool, researcher, explorer, etc.), STOP and read Rule 4 NOW. You MUST paste the ENTIRE `SUBAGENT_INSTRUCTIONS_TEMPLATE` block into EVERY subagent prompt. This is NOT optional. This is NOT \"something the subagent already knows\". Subagent contexts DO NOT inherit these rules automatically. If you skip this, subagent work is COMPLETELY UNTRACKED.",
  "",
  "### Rule 2 — useai_heartbeat (mid-response keep-alive)",
  "  1. Call `useai_heartbeat` at the start of every response where you are **not** calling `useai_start` or `useai_end`.",
  "  2. **Exception**: if `useai_end` was already called and no new `useai_start` has been called since (no active session), skip `useai_heartbeat` entirely — this includes task-notification turns that arrive after a session is sealed.",
  '  3. **While actively working**: also call `useai_heartbeat` after every **10 tool calls** (Read/Grep/Bash/etc.) OR every **4 minutes** — whichever comes first. After every tool call batch, explicitly state your current count (e.g. "Tool count: 7/10") before proceeding — this prevents losing count during dense file-read loops. Reset count to 0 after each heartbeat. Gaps longer than 5 minutes are counted as idle time.',
  "",
  "### Rule 3 — useai_end (end of response)",
  "Call `useai_end` at the end of every response where `useai_start` was called. **A response that called `useai_start` is invalid until `useai_end` succeeds.** **Before sending any final message, verify whether this turn called `useai_start`; if yes, `useai_end` must be the last tool call.** **Write all response text and summaries BEFORE calling `useai_end` — never write any text after the `useai_end` call. It must be the absolute last action in the response.** **Reserve your last 5 tool calls exclusively for this — once you reach that budget, stop all other work and call `useai_end` immediately.** Provide:",
  "  1. `languages` used, `files_touched_count`",
  "  2. `milestones`: array of objects each with `title` (generic — no project/file names), `category`, and optional `private_title` (detailed).",
  '     Example: `[{"title": "Implemented auth flow", "private_title": "Added OAuth2 to UserService in acme-api", "category": "feature"}]`',
  '     **Milestone quality**: only log milestones for actual deliverables — code shipped, bugs fixed, decisions made, or findings that change the plan. Do NOT log: investigations that confirm existing behavior (e.g. "verified X works correctly"), bug discoveries without a fix (identifying a bug is investigation, not a deliverable), or code reviews with no resulting changes. If a session was pure research/review with no actionable outcome, use an empty milestones array.',
  "  3. `evaluation` object: prompt_quality (1-5), context_provided (1-5), task_outcome, iteration_count, independence_level (1-5), scope_quality (1-5), tools_leveraged count. `iteration_count` tracks how many times the user has prompted for the same task — start at 1, and increment only when the user follows up or repeats a prompt on the same task. Reset to 1 when the user starts a new unrelated task. Include a `*_reason` for every scored field.",
  "  4. **calibrated framework**: provide `*_ideal` fields for every metric that is not 5/5 — this is mandatory, not optional. Only omit `*_ideal` when the score is exactly 5.",
  "",
  "---",
  "",
  "### ⚠️ CRITICAL: Rule 4 — SUBAGENT SESSION TRACKING (DO NOT SKIP — EVER)",
  "",
  "**IF YOU SPAWN A SUBAGENT (e.g., using Task tool, subagent, researcher, etc.), YOU MUST PASTE THE ENTIRE `SUBAGENT_INSTRUCTIONS_TEMPLATE` BLOCK BELOW INTO THE SUBAGENT PROMPT. DO NOT PARAPHRASE. DO NOT SUMMARIZE. DO NOT OMIT ANY RULES. THIS IS NOT OPTIONAL.**",
  "",
  "**What happens if you skip this?** Subagents run completely UNTRACKED. No `useai_start`. No `useai_heartbeat`. No `useai_end`. No chain. No data. This is a SILENT FAILURE — the parent session tracks normally, but subagent work vanishes into the void.",
  "",
  "**CHECKLIST before spawning any subagent:**",
  "  1. Did you include the ENTIRE template below in the subagent prompt?",
  "  2. Did you NOT modify/paraphrase/summarize it?",
  "  3. Are you NOT passing your parent `prompt_id` to the subagent?",
  "",
  "**=== START: SUBAGENT_INSTRUCTIONS_TEMPLATE (COPY THIS ENTIRE BLOCK VERBATIM) ===**",
  "",
  "## UseAI Subagent Session Tracking (NON-NEGOTIABLE)",
  "",
  "You are a SUBAGENT. You MUST track your own independent session. Follow THESE rules EXACTLY:",
  "",
  "### Subagent Rule S1 — Call useai_start FIRST",
  "**BEFORE doing ANYTHING ELSE** — before any Glob, Read, Grep, Bash, or other tool — before ANY text output:",
  "  - Call `useai_start` as the **VERY FIRST TOOL CALL**",
  "  - Do NOT pass a `prompt_id` (you get your own independent session)",
  "  - Capture the `prompt_id` returned — you will use it for ALL subsequent `useai_heartbeat` and `useai_end` calls",
  "",
  "### Subagent Rule S2 — useai_heartbeat cadence",
  "Call `useai_heartbeat` when:",
  "  1. You are continuing work but NOT calling `useai_start` or `useai_end`",
  "  2. After every **10 tool calls** (Read/Grep/Bash/etc.) OR every **4 minutes** — WHICHEVER COMES FIRST",
  "  3. If a tool call is blocked/rejected and you continue working",
  "",
  "**After every tool call batch, EXPLICITLY STATE your current count:**",
  '  Example: "Tool count: 7/10" before proceeding',
  "  Reset to 0 after each heartbeat.",
  "",
  "### Subagent Rule S3 — useai_end MUST be your LAST action",
  "**useai_end is NOT optional. It is MANDATORY.**",
  "",
  "**RESERVE YOUR LAST 5 TOOL CALLS EXCLUSIVELY FOR `useai_end`.** Once you reach that budget, STOP ALL OTHER WORK and call `useai_end` immediately. Never let context exhaustion prevent the session from being sealed.",
  "",
  "**BEFORE calling `useai_end`:**",
  "  - Write ALL output, summaries, findings, text FIRST",
  "  - `useai_end` MUST be the ABSOLUTE LAST action in your response",
  "  - NEVER write any text after calling `useai_end`",
  "",
  "**useai_end REQUIRED payload:**",
  "  - `languages`: Array of programming languages used (e.g., `[\"typescript\", \"python\"]`)",
  "  - `files_touched_count`: Number of files created or modified",
  "  - `milestones`: Array of objects — ONLY for ACTUAL DELIVERABLES (code shipped, bugs fixed, decisions made, findings that change the plan). DO NOT log: investigations that confirm existing behavior, bug discoveries without a fix, code reviews with no changes. Empty array `[]` is OK for pure research.",
  '    Each milestone: `{ title: "short generic description", category: "feature|bugfix|refactor|setup|deployment|fix|testing|documentation|config|performance|cleanup|chore|security|migration|design|devops|other", privateTitle?: "detailed with project/file names" }`',
  "  - `evaluation`: Object with:",
  "    - `prompt_quality`: 1-5 score, `prompt_quality_reason` explanation",
  "    - `context_provided`: 1-5 score, `context_provided_reason` explanation",
  "    - `task_outcome`: \"completed\" | \"partial\" | \"abandoned\" | \"blocked\"",
  "    - `task_outcome_reason`: explanation",
  "    - `iteration_count`: 1 (increment ONLY if same task repeated)",
  "    - `independence_level`: 1-5 score, `independence_level_reason` explanation",
  "    - `scope_quality`: 1-5 score, `scope_quality_reason` explanation",
  "    - `tools_leveraged`: count of tools used",
  "    - `*_ideal`: For EVERY score that is NOT 5/5, provide a `*_ideal` field explaining what would make it 5/5. This is MANDATORY, not optional.",
  "",
  "### Subagent Rule S4 — Do NOT share parent prompt_id",
  "  - Each subagent gets its OWN `prompt_id` from its own `useai_start` call",
  "  - NEVER use the parent session's `prompt_id`",
  "  - This causes tracking collisions and data loss",
  "",
  "### Subagent Rule S5 — Long-running commands",
  "If a command will run longer than 4 minutes (builds, test suites, deployments, sleeps):",
  "  - Break it into ≤4-minute chunks",
  "  - Call `useai_heartbeat` between each chunk",
  "  - Gaps over 5 minutes without a heartbeat are counted as idle time",
  "",
  "### Subagent Rule S6 — Interrupted/resumed",
  "If you are interrupted mid-response and resume on the SAME task:",
  "  - Call `useai_heartbeat` at the TOP of your resumed response (NOT `useai_start`)",
  "  - Use your existing `prompt_id`",
  "",
  "If the new task is clearly UNRELATED to your previous work:",
  "  - First call `useai_end` to close the previous session properly",
  "  - Then call `useai_start` for the new task",
  "",
  "**=== END: SUBAGENT_INSTRUCTIONS_TEMPLATE ===**",
  "",
  "**AGAIN, TO EMPHASIZE:** When spawning a subagent, you MUST include the ENTIRE block between `=== START` and `=== END` above. Do NOT be clever. Do NOT think \"the subagent already knows this\". It does NOT. The subagent context does NOT automatically inherit these instructions. YOU MUST PASTE THEM. EVERY. SINGLE. TIME."
].join("\n");

/**
 * Inject instructions into a file using marker blocks (append method)
 * or create a new file (create method).
 */
export function injectInstructions(
  filePath: string,
  method: "append" | "create",
): void {
  mkdirSync(dirname(filePath), { recursive: true });

  if (method === "create") {
    // Per-tool frontmatter: Cursor's .mdc and VS Code's *.instructions.md
    // both need YAML frontmatter to be applied on every turn. All other
    // create-method targets (Cline's useai.md, Roo's useai.md) are written
    // as plain markdown — those tools auto-load anything in their rules dir.
    let body: string;
    if (filePath.endsWith(".mdc")) {
      body = CURSOR_RULE_FRONTMATTER + INSTRUCTIONS_TEXT + "\n";
    } else if (filePath.endsWith(".instructions.md")) {
      body = VSCODE_INSTRUCTIONS_FRONTMATTER + INSTRUCTIONS_TEXT + "\n";
    } else {
      body = INSTRUCTIONS_TEXT + "\n";
    }
    writeFileSync(filePath, body, "utf-8");
    return;
  }

  // append: insert/update marker block in existing file
  const block = `${START_MARKER}\n${INSTRUCTIONS_TEXT}\n${END_MARKER}`;

  if (!existsSync(filePath)) {
    writeFileSync(filePath, block + "\n", "utf-8");
    return;
  }

  const existing = readFileSync(filePath, "utf-8");

  // Update existing block if present
  if (existing.includes(START_MARKER)) {
    const markerRegex = new RegExp(
      `${escapeRegex(START_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}`,
    );
    writeFileSync(filePath, existing.replace(markerRegex, block), "utf-8");
    return;
  }

  // Append new block
  const separator =
    existing && !existing.endsWith("\n") ? "\n\n" : existing ? "\n" : "";
  writeFileSync(filePath, existing + separator + block + "\n", "utf-8");
}

/**
 * Remove injected instructions from a file.
 */
export function removeInstructions(
  filePath: string,
  method: "append" | "create",
): void {
  if (!existsSync(filePath)) return;

  if (method === "create") {
    unlinkSync(filePath);
    return;
  }

  const existing = readFileSync(filePath, "utf-8");
  const markerRegex = new RegExp(
    `\\n?${escapeRegex(START_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}\\n?`,
  );
  const cleaned = existing.replace(markerRegex, "").trim();

  if (!cleaned) {
    unlinkSync(filePath);
  } else {
    writeFileSync(filePath, cleaned + "\n", "utf-8");
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
