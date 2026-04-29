import { homedir } from "node:os";
import { join } from "node:path";

const HOME = homedir();

export const USEAI_DIR = join(HOME, ".useai");
export const DATA_DIR = join(USEAI_DIR, "data");
export const SEALED_DIR = join(DATA_DIR, "sealed");
export const CONFIG_FILE = join(USEAI_DIR, "config.json");
export const KEYSTORE_FILE = join(USEAI_DIR, "keystore.json");
export const DAEMON_PID_FILE = join(USEAI_DIR, "daemon.pid");
export const DAEMON_LOG_FILE = join(USEAI_DIR, "daemon.log");
export const SYNC_LOG_FILE = join(USEAI_DIR, "sync-log.json");

export const DAEMON_PORT = Number(process.env["USEAI_PORT"] ?? 19200);
export const DAEMON_HOST = process.env["USEAI_HOST"] ?? "127.0.0.1";
export const DAEMON_PROTOCOL = process.env["USEAI_PROTOCOL"] ?? "http";
export const DAEMON_URL = `${DAEMON_PROTOCOL}://${DAEMON_HOST}:${DAEMON_PORT}`;
