import type { Session } from "@devness/useai-types";
import { readSessionsForDateRange, readV1Sessions } from "@devness/useai-storage";

/** Validate and parse start/end ISO query params. Returns null if invalid. */
export function parseTimeRange(start: string | undefined, end: string | undefined): { start: string; end: string } | null {
  if (!start || !end || !start.includes("Z") || !end.includes("Z")) return null;
  return { start, end };
}

/** Read, combine, and filter sessions for a date range (v3 + v1). */
export async function getFilteredSessions(start: string, end: string): Promise<Session[]> {
  const [v3Sessions, v1Sessions] = await Promise.all([
    readSessionsForDateRange(start, end),
    readV1Sessions(),
  ]);

  return [...v3Sessions, ...v1Sessions]
    .filter((s) => s.startedAt <= end && s.endedAt >= start)
    .filter((s) => !!s.endedAt && s.durationMs > 0)
    .filter((s) => !!s.hash && !!s.signature);
}

/** Convert snake_case evaluation to camelCase for API responses. */
export function toCamelEvaluation(ev: NonNullable<Session["evaluation"]>) {
  return {
    promptQuality: ev.prompt_quality,
    ...(ev.prompt_quality_reason && { promptQualityReason: ev.prompt_quality_reason }),
    ...(ev.prompt_quality_ideal && { promptQualityIdeal: ev.prompt_quality_ideal }),
    contextProvided: ev.context_provided,
    ...(ev.context_provided_reason && { contextProvidedReason: ev.context_provided_reason }),
    ...(ev.context_provided_ideal && { contextProvidedIdeal: ev.context_provided_ideal }),
    scopeQuality: ev.scope_quality,
    ...(ev.scope_quality_reason && { scopeQualityReason: ev.scope_quality_reason }),
    ...(ev.scope_quality_ideal && { scopeQualityIdeal: ev.scope_quality_ideal }),
    independenceLevel: ev.independence_level,
    ...(ev.independence_level_reason && { independenceLevelReason: ev.independence_level_reason }),
    ...(ev.independence_level_ideal && { independenceLevelIdeal: ev.independence_level_ideal }),
    taskOutcome: ev.task_outcome,
    ...(ev.task_outcome_reason && { taskOutcomeReason: ev.task_outcome_reason }),
    ...(ev.task_outcome_ideal && { taskOutcomeIdeal: ev.task_outcome_ideal }),
    iterationCount: ev.iteration_count,
    toolsLeveraged: ev.tools_leveraged,
  };
}

/** Enrich milestones with parent session metadata. */
export function toEnrichedMilestones(s: Session) {
  return (s.milestones ?? []).map((m) => ({
    id: m.id,
    promptId: s.promptId,
    title: m.title,
    ...(m.privateTitle && { privateTitle: m.privateTitle }),
    ...(s.project && { project: s.project }),
    category: m.category,
    complexity: m.complexity ?? "medium",
    durationMinutes: Math.round(s.durationMs / 60000),
    languages: s.languages ?? [],
    client: s.client,
    createdAt: s.endedAt,
    published: false,
    publishedAt: null,
    chainHash: s.hash,
  }));
}

export type EnrichedMilestone = ReturnType<typeof toEnrichedMilestones>[number];
