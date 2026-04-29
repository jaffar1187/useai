import type { Session } from "@devness/useai-types";

/** Session with local-only fields stripped before sending to the cloud. */
export type SanitizedSession = Omit<Session, "prompt">;

/** Per-date sync payload sent to the cloud. */
export interface SyncPayload {
  date: string;
  /** Current consecutive-day streak as of this sync */
  streakDays?: number;
  sessions: SanitizedSession[];
}

export interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
  dates: { date: string; sessions: number }[];
  payload?: unknown;
}
