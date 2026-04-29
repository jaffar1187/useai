import type { SessionSeal, Milestone } from './api';

// Module-level timestamp cache — avoids repeated new Date(iso).getTime()
const _tsCache = new Map<string, number>();
export function parseTimestamp(iso: string): number {
  let v = _tsCache.get(iso);
  if (v === undefined) {
    v = new Date(iso).getTime();
    _tsCache.set(iso, v);
  }
  return v;
}

export interface ComputedStats {
  totalHours: number;
  totalSessions: number;
  /** Union of all active session intervals (idle-excluded) — real user time where at least 1 session was active (hours) */
  coveredHours: number;
  /** Ratio of total AI time to user time (totalHours / coveredHours). >= 1.0 always. */
  aiMultiplier: number;
  /** Maximum number of sessions running concurrently at any point */
  peakConcurrency: number;
  currentStreak: number;
  filesTouched: number;
  featuresShipped: number;
  bugsFixed: number;
  complexSolved: number;
  totalMilestones: number;
  completionRate: number;
  activeProjects: number;
  byToolClockTime: Record<string, number>;
  byLanguageClockTime: Record<string, number>;
  byTaskTypeClockTime: Record<string, number>;
  byProjectAiTime: Record<string, number>;
  /** Clock-time project breakdown via shared sweep-line */
  byProjectClock: Record<string, number>;
  /** Cumulative session duration breakdowns — no concurrency dedup */
  byAiToolDuration: Record<string, number>;
  byLanguageAiTime: Record<string, number>;
  byTaskTypeAiTime: Record<string, number>;
}

export interface PromptGroup {
  prompt: SessionSeal;
  milestones: Milestone[];
}

/** A conversation is a group of prompts sharing the same connectionId */
export interface ConversationGroup {
  connectionId: string;
  prompts: PromptGroup[];
  /** Aggregate evaluation across all sessions in the conversation */
  aggregateEval: AggregateEvaluation | null;
  aiTime: number;
  totalMilestones: number;
  startedAt: string;
  endedAt: string;
  /** Start time of the most recent session (for display, matches child row times) */
  lastSessionAt: string;
}

export interface AggregateEvaluation {
  promptQuality: number;
  contextProvided: number;
  independenceLevel: number;
  scopeQuality: number;
  toolsLeveraged: number;
  promptCount: number;
}
