import { readJson, writeJson, SYNC_LOG_FILE } from '@useai/shared';

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  event: 'sync' | 'auto_sync' | 'login' | 'logout' | 'cloud_pull';
  status: 'success' | 'error' | 'info';
  message: string;
  details?: {
    sessions_synced?: number;
    milestones_published?: number;
    dates_synced?: number;
    sessions_corrected?: number;
    sessions_corrupted?: number;
    cloud_sessions?: number;
    merged?: number;
    error?: string;
    [key: string]: unknown;
  };
  /** Exact payload sent to / received from the cloud API — full transparency. */
  payload?: {
    endpoint: string;
    method: string;
    body: unknown;
  };
}

const MAX_ENTRIES = 500;

export function addLogEntry(entry: Omit<SyncLogEntry, 'id' | 'timestamp'>): void {
  const entries = readJson<SyncLogEntry[]>(SYNC_LOG_FILE, []);
  entries.push({
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
  // FIFO trim
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  writeJson(SYNC_LOG_FILE, entries);
}

export function getLogEntries(): SyncLogEntry[] {
  return readJson<SyncLogEntry[]>(SYNC_LOG_FILE, []);
}
