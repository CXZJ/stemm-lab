import { newId } from "@/lib/id";
import { openStemmDatabase } from "@/services/sqlite/database";

export type LocalSyncKind = "attempt" | "media" | "leaderboard";

export interface LocalSyncRow {
  id: string;
  kind: LocalSyncKind;
  attemptId: string | null;
  payload: string;
  status: string;
  retries: number;
  lastError: string | null;
  createdAt: number;
}

export async function enqueueSyncItem(input: {
  kind: LocalSyncKind;
  attemptId?: string;
  payload: Record<string, unknown>;
}): Promise<string> {
  const db = await openStemmDatabase();
  const id = await newId();
  await db.runAsync(
    `INSERT INTO sync_queue (id, kind, attempt_id, payload, status, retries, created_at)
     VALUES (?, ?, ?, ?, 'pending', 0, ?)`,
    [id, input.kind, input.attemptId ?? null, JSON.stringify(input.payload), Date.now()],
  );
  return id;
}

export async function dequeueNextPending(): Promise<LocalSyncRow | null> {
  const db = await openStemmDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    kind: string;
    attempt_id: string | null;
    payload: string;
    status: string;
    retries: number;
    last_error: string | null;
    created_at: number;
  }>(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1`,
  );
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind as LocalSyncKind,
    attemptId: row.attempt_id,
    payload: row.payload,
    status: row.status,
    retries: row.retries,
    lastError: row.last_error,
    createdAt: row.created_at,
  };
}

export async function markSyncDone(id: string): Promise<void> {
  const db = await openStemmDatabase();
  await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [id]);
}

export async function getSyncRow(id: string): Promise<LocalSyncRow | null> {
  const db = await openStemmDatabase();
  const row = await db.getFirstAsync<{
    id: string;
    kind: string;
    attempt_id: string | null;
    payload: string;
    status: string;
    retries: number;
    last_error: string | null;
    created_at: number;
  }>(`SELECT * FROM sync_queue WHERE id = ?`, [id]);
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind as LocalSyncKind,
    attemptId: row.attempt_id,
    payload: row.payload,
    status: row.status,
    retries: row.retries,
    lastError: row.last_error,
    createdAt: row.created_at,
  };
}

export async function markSyncFailed(id: string, err: string): Promise<void> {
  const db = await openStemmDatabase();
  const row = await db.getFirstAsync<{ retries: number }>(
    "SELECT retries FROM sync_queue WHERE id = ?",
    [id],
  );
  const retries = (row?.retries ?? 0) + 1;
  const status = retries < 8 ? "pending" : "failed";
  await db.runAsync(
    `UPDATE sync_queue SET status = ?, last_error = ?, retries = ? WHERE id = ?`,
    [status, err.slice(0, 500), retries, id],
  );
}

export async function listSyncQueue(): Promise<LocalSyncRow[]> {
  const db = await openStemmDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    kind: string;
    attempt_id: string | null;
    payload: string;
    status: string;
    retries: number;
    last_error: string | null;
    created_at: number;
  }>(`SELECT * FROM sync_queue ORDER BY created_at DESC LIMIT 200`);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as LocalSyncKind,
    attemptId: row.attempt_id,
    payload: row.payload,
    status: row.status,
    retries: row.retries,
    lastError: row.last_error,
    createdAt: row.created_at,
  }));
}

export async function enqueueMediaUpload(row: {
  id: string;
  attemptId: string;
  localUri: string;
  storagePath: string;
  contentType: string;
  kind: string;
}): Promise<void> {
  const db = await openStemmDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO media_queue (id, attempt_id, local_uri, storage_path, content_type, kind, status, progress, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
    [
      row.id,
      row.attemptId,
      row.localUri,
      row.storagePath,
      row.contentType,
      row.kind,
      Date.now(),
    ],
  );
}

export async function listPendingMedia(): Promise<
  {
    id: string;
    attemptId: string;
    localUri: string;
    storagePath: string;
    contentType: string;
    kind: string;
  }[]
> {
  const db = await openStemmDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    attempt_id: string;
    local_uri: string;
    storage_path: string;
    content_type: string | null;
    kind: string;
  }>(
    `SELECT id, attempt_id, local_uri, storage_path, content_type, kind FROM media_queue WHERE status = 'pending' ORDER BY created_at ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    attemptId: r.attempt_id,
    localUri: r.local_uri,
    storagePath: r.storage_path,
    contentType: r.content_type ?? "application/octet-stream",
    kind: r.kind,
  }));
}

export async function markMediaDone(id: string): Promise<void> {
  const db = await openStemmDatabase();
  await db.runAsync("DELETE FROM media_queue WHERE id = ?", [id]);
}

export async function updateMediaProgress(id: string, progress: number): Promise<void> {
  const db = await openStemmDatabase();
  await db.runAsync("UPDATE media_queue SET progress = ? WHERE id = ?", [progress, id]);
}
