import { z } from "zod";

export const TaskTypeSchema = z.enum([
  "coding",
  "debugging",
  "testing",
  "planning",
  "reviewing",
  "documenting",
  "learning",
  "deployment",
  "devops",
  "research",
  "migration",
  "design",
  "data",
  "security",
  "configuration",
  "code_review",
  "investigation",
  "infrastructure",
  "analysis",
  "ops",
  "setup",
  "refactoring",
  "other",
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const MilestoneCategorySchema = z.enum([
  "feature",
  "bugfix",
  "refactor",
  "setup",
  "deployment",
  "fix",
  "testing",
  "documentation",
  "config",
  "performance",
  "cleanup",
  "chore",
  "security",
  "migration",
  "design",
  "devops",
  "other",
]);
export type MilestoneCategory = z.infer<typeof MilestoneCategorySchema>;

export const ComplexitySchema = z.enum(["simple", "medium", "complex"]);
export type Complexity = z.infer<typeof ComplexitySchema>;

export interface SessionEvaluation {
  prompt_quality: number;
  prompt_quality_reason?: string;
  prompt_quality_ideal?: string;
  context_provided: number;
  context_provided_reason?: string;
  context_provided_ideal?: string;
  scope_quality: number;
  scope_quality_reason?: string;
  scope_quality_ideal?: string;
  independence_level: number;
  independence_level_reason?: string;
  independence_level_ideal?: string;

  task_outcome: "completed" | "partial" | "abandoned" | "blocked";
  task_outcome_reason?: string;
  task_outcome_ideal?: string;
  iteration_count: number;
  tools_leveraged: number;
}

export interface SessionScore {
  overall: number;
  components: Record<string, number>;
  framework: string;
}

export interface Milestone {
  id: string;
  title: string;
  privateTitle?: string;
  category: string;
  complexity?: string;
}

export interface Session {
  promptId: string;
  connectionId: string;
  client: string;
  taskType: string;
  title: string;
  privateTitle?: string;
  project?: string;
  model?: string;
  prompt?: string;
  promptImages?: Array<{ type: "image"; description: string }>;
  promptImageCount?: number;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  /** Active time segments as [isoStart, isoEnd] pairs. Gaps between segments were idle (>5min heartbeat gap). */
  activeSegments?: [string, string][];
  score?: SessionScore;
  milestones: Milestone[];
  languages?: string[];
  filesTouchedCount?: number;
  evaluation?: SessionEvaluation;
  prevHash: string;
  hash: string;
  signature: string;
  /** Cloud seal verification signature, set asynchronously after session is sealed. */
  sealVerification?: string;
}
