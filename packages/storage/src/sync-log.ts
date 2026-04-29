import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SYNC_LOG_FILE } from "./paths.js";

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  event: "sync" | "auto_sync" | "login" | "logout";
  status: "success" | "error" | "info";
  message: string;
  details?: Record<string, unknown>;
  payload?: {
    method: string;
    endpoint: string;
    body: unknown;
  };
}

const MAX_ENTRIES = 500;

function readSyncLog(): SyncLogEntry[] {
  try {
    const raw = readFileSync(SYNC_LOG_FILE, "utf-8");
    return JSON.parse(raw) as SyncLogEntry[];
  } catch {
    return [];
  }
}

function writeSyncLog(entries: SyncLogEntry[]): void {
  mkdirSync(dirname(SYNC_LOG_FILE), { recursive: true });
  writeFileSync(SYNC_LOG_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export function addSyncLogEntry(
  entry: Omit<SyncLogEntry, "id" | "timestamp">,
): void {
  const entries = readSyncLog();
  entries.push({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  writeSyncLog(entries);
}

export function getSyncLogEntries(): SyncLogEntry[] {
  return readSyncLog();
}
