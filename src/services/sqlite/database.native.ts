import * as SQLite from "expo-sqlite";
import type { StemmLocalDatabase } from "@/services/sqlite/types";

let db: SQLite.SQLiteDatabase | null = null;

export async function openStemmDatabase(): Promise<StemmLocalDatabase> {
  if (db) return db as unknown as StemmLocalDatabase;
  db = await SQLite.openDatabaseAsync("stemm_lab.db");
  await migrate(db);
  return db as unknown as StemmLocalDatabase;
}

async function migrate(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS attempts_local (
      id TEXT PRIMARY KEY NOT NULL,
      activity_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      sync_status TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      kind TEXT NOT NULL,
      attempt_id TEXT,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      retries INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS media_queue (
      id TEXT PRIMARY KEY NOT NULL,
      attempt_id TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      content_type TEXT,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      progress REAL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_team ON attempts_local(team_id);
    CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_queue(status);
  `);
}
