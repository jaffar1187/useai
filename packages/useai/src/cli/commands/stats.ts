import type { Command } from "commander";
import { getStats, getTimeWindow } from "../services/stats.service.js";
import pc from "picocolors";
import {
  header,
  label,
  formatDuration,
  dim,
  table,
  fail,
} from "../utils/display.js";

function formatSeconds(sec: number): string {
  if (sec > 0 && sec < 30) return "<1m";
  return formatDuration(sec * 1000);
}

function formatRating(score: number): string {
  const s = score.toFixed(1);
  if (score >= 4) return pc.green(`${s}/5`);
  if (score >= 3) return pc.yellow(`${s}/5`);
  return pc.red(`${s}/5`);
}

export function registerStats(program: Command): void {
  program
    .command("stats")
    .description("Show prompts statistics")
    .option(
      "-s, --scale <scale>",
      "Time scale: day, week, month, or rolling like 7d, 30d",
      "week",
    )
    .action(async (opts: { scale: string }) => {
      const { start, end, label: windowLabel } = getTimeWindow(opts.scale);

      let stats;
      try {
        stats = await getStats(start, end);
      } catch (err) {
        fail(`Failed to fetch stats: ${(err as Error).message}`);
        process.exit(1);
      }

      header(`Stats (${windowLabel})`);
      label("Clock time", formatDuration(stats.coveredHours * 3600000));
      label("AI time", formatDuration(stats.totalHours * 3600000));
      label("Multiplier", `${stats.aiMultiplier.toFixed(2)}x`);
      label("Milestones", String(stats.totalMilestones));
      label("Features", String(stats.featuresShipped));
      label("Bugs fixed", String(stats.bugsFixed));
      label(
        "Streak",
        `${stats.currentStreak} day${stats.currentStreak !== 1 ? "s" : ""}`,
      );
      console.log();
      dim("Details:");
      label("Prompts", String(stats.totalSessions));

      if (stats.evaluation) {
        console.log();
        dim("Evaluation averages:");
        label("Prompt quality", formatRating(stats.evaluation.promptQuality));
        label("Context", formatRating(stats.evaluation.contextProvided));
        label("Scope", formatRating(stats.evaluation.scopeQuality));
        label("Independence", formatRating(stats.evaluation.independenceLevel));
      }

      if (Object.keys(stats.byProjectAiTime).length > 0) {
        console.log();
        dim("By project:");
        const MAX_PROJECTS = 6;
        const projectEntries = Object.entries(stats.byProjectClock)
          .filter(([key]) => key !== "other")
          .sort((a, b) => b[1] - a[1]);
        const visible = projectEntries.slice(0, MAX_PROJECTS);
        const overflowClock =
          projectEntries.slice(MAX_PROJECTS).reduce((s, [, v]) => s + v, 0) +
          (stats.byProjectClock["other"] ?? 0);
        const overflowAI =
          projectEntries
            .slice(MAX_PROJECTS)
            .reduce((s, [k]) => s + (stats.byProjectAiTime[k] ?? 0), 0) +
          (stats.byProjectAiTime["other"] ?? 0);
        const rows = visible.map(([k, v]) => [
          k,
          formatSeconds(v),
          formatSeconds(stats.byProjectAiTime[k] ?? 0),
        ]);
        if (overflowClock > 0 || overflowAI > 0) {
          rows.push([
            "other",
            formatSeconds(overflowClock),
            formatSeconds(overflowAI),
          ]);
        }
        table(["Project", "clock", "ai"], rows);
      }

      const { simple, medium, complex } = stats.complexity;
      if (simple + medium + complex > 0) {
        console.log();
        dim("Milestone complexity:");
        const total = simple + medium + complex;
        label("simple", `${simple} (${Math.round((simple / total) * 100)}%)`);
        label("medium", `${medium} (${Math.round((medium / total) * 100)}%)`);
        label(
          "complex",
          `${complex} (${Math.round((complex / total) * 100)}%)`,
        );
      }

      if (Object.keys(stats.byToolClockTime).length > 0) {
        console.log();
        dim("By tool:");
        const rows = Object.entries(stats.byToolClockTime)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => [
            k,
            formatSeconds(v),
            formatSeconds(stats.byAiToolDuration[k] ?? 0),
          ]);
        table(["Tool", "clock", "ai"], rows);
      }

      if (Object.keys(stats.byLanguageClockTime).length > 0) {
        console.log();
        dim("By language:");
        const MAX_LANGS = 6;
        const langEntries = Object.entries(stats.byLanguageClockTime)
          .filter(([key]) => key !== "other")
          .sort((a, b) => b[1] - a[1]);
        const visibleLangs = langEntries.slice(0, MAX_LANGS);
        const langOverflowClock =
          langEntries.slice(MAX_LANGS).reduce((s, [, v]) => s + v, 0) +
          (stats.byLanguageClockTime["other"] ?? 0);
        const langOverflowAI =
          langEntries
            .slice(MAX_LANGS)
            .reduce((s, [k]) => s + (stats.byLanguageAiTime[k] ?? 0), 0) +
          (stats.byLanguageAiTime["other"] ?? 0);
        const langRows = visibleLangs.map(([k, v]) => [
          k,
          formatSeconds(v),
          formatSeconds(stats.byLanguageAiTime[k] ?? 0),
        ]);
        if (langOverflowClock > 0 || langOverflowAI > 0) {
          langRows.push([
            "other",
            formatSeconds(langOverflowClock),
            formatSeconds(langOverflowAI),
          ]);
        }
        table(["Language", "clock", "ai"], langRows);
      }

      if (Object.keys(stats.byTaskTypeClockTime).length > 0) {
        console.log();
        dim("By task type:");
        const rows = Object.entries(stats.byTaskTypeClockTime)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => [
            k.replace(/_/g, "-"),
            formatSeconds(v),
            formatSeconds(stats.byTaskTypeAiTime[k] ?? 0),
          ]);
        table(["Type", "clock", "ai"], rows);
      }
      console.log();
    });
}
