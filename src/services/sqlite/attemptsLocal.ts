import type { ActivityAttempt } from "@/types/models";
import { openStemmDatabase } from "@/services/sqlite/database";

export async function upsertLocalAttempt(row: {
  id: string;
  activityId: string;
  teamId: string;
  userId: string;
  payload: ActivityAttempt;
  syncStatus: ActivityAttempt["syncStatus"];
}): Promise<void> {
  const db = await openStemmDatabase();
  const now = Date.now();
  const existing = await db.getFirstAsync<{ created_at: number }>(
    "SELECT created_at FROM attempts_local WHERE id = ?",
    [row.id],
  );
  const created = existing?.created_at ?? now;
  await db.runAsync(
    `INSERT INTO attempts_local (id, activity_id, team_id, user_id, payload, sync_status, updated_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       activity_id = excluded.activity_id,
       team_id = excluded.team_id,
       user_id = excluded.user_id,
       payload = excluded.payload,
       sync_status = excluded.sync_status,
       updated_at = excluded.updated_at`,
    [
      row.id,
      row.activityId,
      row.teamId,
      row.userId,
      JSON.stringify(row.payload),
      row.syncStatus,
      now,
      created,
    ],
  );
}

export async function listLocalAttempts(filters?: {
  teamId?: string;
  activityId?: string;
}): Promise<ActivityAttempt[]> {
  const db = await openStemmDatabase();
  let sql = "SELECT payload FROM attempts_local WHERE 1=1";
  const args: string[] = [];
  if (filters?.teamId) {
    sql += " AND team_id = ?";
    args.push(filters.teamId);
  }
  if (filters?.activityId) {
    sql += " AND activity_id = ?";
    args.push(filters.activityId);
  }
  sql += " ORDER BY updated_at DESC";
  const rows = await db.getAllAsync<{ payload: string }>(sql, args);
  return rows.map((r) => JSON.parse(r.payload) as ActivityAttempt);
}

export async function getPendingSyncAttempts(): Promise<ActivityAttempt[]> {
  const db = await openStemmDatabase();
  const rows = await db.getAllAsync<{ payload: string }>(
    `SELECT payload FROM attempts_local WHERE sync_status IN ('pending_upload','failed') ORDER BY updated_at ASC`,
  );
  return rows.map((r) => JSON.parse(r.payload) as ActivityAttempt);
}

export async function getLocalAttempt(id: string): Promise<ActivityAttempt | null> {
  const db = await openStemmDatabase();
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM attempts_local WHERE id = ?",
    [id],
  );
  if (!row) return null;
  return JSON.parse(row.payload) as ActivityAttempt;
}

export async function updateAttemptSyncStatus(
  id: string,
  status: ActivityAttempt["syncStatus"],
): Promise<void> {
  const db = await openStemmDatabase();
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM attempts_local WHERE id = ?",
    [id],
  );
  if (!row) return;
  const payload = JSON.parse(row.payload) as ActivityAttempt;
  payload.syncStatus = status;
  await db.runAsync(
    "UPDATE attempts_local SET sync_status = ?, payload = ?, updated_at = ? WHERE id = ?",
    [status, JSON.stringify(payload), Date.now(), id],
  );
}
