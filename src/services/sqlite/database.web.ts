/**
 * In-memory + localStorage stand-in for expo-sqlite on web (WASM bundle is often missing/broken in Metro).
 */
import type { StemmLocalDatabase } from "@/services/sqlite/types";

const KEY = "stemm_lab_web_db_v1";

type AttemptRow = {
  id: string;
  activity_id: string;
  team_id: string;
  user_id: string;
  payload: string;
  sync_status: string;
  updated_at: number;
  created_at: number;
};

type SyncRow = {
  id: string;
  kind: string;
  attempt_id: string | null;
  payload: string;
  status: string;
  retries: number;
  last_error: string | null;
  created_at: number;
};

type MediaRow = {
  id: string;
  attempt_id: string;
  local_uri: string;
  storage_path: string;
  content_type: string | null;
  kind: string;
  status: string;
  progress: number;
  created_at: number;
};

type Store = {
  attempts: AttemptRow[];
  syncQueue: SyncRow[];
  mediaQueue: MediaRow[];
};

function load(): Store {
  if (typeof localStorage === "undefined") {
    return { attempts: [], syncQueue: [], mediaQueue: [] };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { attempts: [], syncQueue: [], mediaQueue: [] };
    const p = JSON.parse(raw) as Store;
    return {
      attempts: Array.isArray(p.attempts) ? p.attempts : [],
      syncQueue: Array.isArray(p.syncQueue) ? p.syncQueue : [],
      mediaQueue: Array.isArray(p.mediaQueue) ? p.mediaQueue : [],
    };
  } catch {
    return { attempts: [], syncQueue: [], mediaQueue: [] };
  }
}

function save(s: Store) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota */
  }
}

let singleton: StemmLocalDatabase | null = null;

export async function openStemmDatabase(): Promise<StemmLocalDatabase> {
  if (singleton) return singleton;
  let state = load();

  const persist = () => save(state);

  const api: StemmLocalDatabase = {
    async execAsync() {
      /* schema created implicitly */
    },

    async runAsync(sql: string, params: unknown[] = []) {
      const s = sql.replace(/\s+/g, " ").trim();

      if (s.includes("INSERT INTO attempts_local") && s.includes("ON CONFLICT")) {
        const [
          id,
          activity_id,
          team_id,
          user_id,
          payload,
          sync_status,
          updated_at,
          created_at,
        ] = params as [string, string, string, string, string, string, number, number];
        const i = state.attempts.findIndex((r) => r.id === id);
        const row: AttemptRow = {
          id,
          activity_id,
          team_id,
          user_id,
          payload,
          sync_status,
          updated_at,
          created_at: i >= 0 ? state.attempts[i]!.created_at : created_at,
        };
        if (i >= 0) state.attempts[i] = row;
        else state.attempts.push(row);
        persist();
        return;
      }

      if (s.startsWith("UPDATE attempts_local SET sync_status")) {
        const [sync_status, payload, updated_at, id] = params as [string, string, number, string];
        const r = state.attempts.find((x) => x.id === id);
        if (r) {
          r.sync_status = sync_status;
          r.payload = payload;
          r.updated_at = updated_at;
          persist();
        }
        return;
      }

      if (s.startsWith("INSERT INTO sync_queue")) {
        const [id, kind, attempt_id, payload, created_at] = params as [
          string,
          string,
          string | null,
          string,
          number,
        ];
        state.syncQueue.push({
          id,
          kind,
          attempt_id,
          payload,
          status: "pending",
          retries: 0,
          last_error: null,
          created_at,
        });
        persist();
        return;
      }

      if (s.startsWith("DELETE FROM sync_queue")) {
        const [id] = params as [string];
        state.syncQueue = state.syncQueue.filter((r) => r.id !== id);
        persist();
        return;
      }

      if (s.startsWith("UPDATE sync_queue SET status")) {
        const [status, last_error, retries, id] = params as [string, string, number, string];
        const r = state.syncQueue.find((x) => x.id === id);
        if (r) {
          r.status = status;
          r.last_error = last_error;
          r.retries = retries;
          persist();
        }
        return;
      }

      if (s.includes("INSERT OR REPLACE INTO media_queue")) {
        const [id, attempt_id, local_uri, storage_path, content_type, kind, created_at] = params as [
          string,
          string,
          string,
          string,
          string,
          string,
          number,
        ];
        const next: MediaRow = {
          id,
          attempt_id,
          local_uri,
          storage_path,
          content_type,
          kind,
          status: "pending",
          progress: 0,
          created_at,
        };
        const ix = state.mediaQueue.findIndex((m) => m.id === id);
        if (ix >= 0) state.mediaQueue[ix] = next;
        else state.mediaQueue.push(next);
        persist();
        return;
      }

      if (s.startsWith("DELETE FROM media_queue")) {
        const [id] = params as [string];
        state.mediaQueue = state.mediaQueue.filter((m) => m.id !== id);
        persist();
        return;
      }

      if (s.startsWith("UPDATE media_queue SET progress")) {
        const [progress, id] = params as [number, string];
        const m = state.mediaQueue.find((x) => x.id === id);
        if (m) {
          m.progress = progress;
          persist();
        }
      }
    },

    async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const s = sql.replace(/\s+/g, " ").trim();

      if (s.startsWith("SELECT created_at FROM attempts_local WHERE id =")) {
        const [id] = params as [string];
        const r = state.attempts.find((x) => x.id === id);
        return (r ? { created_at: r.created_at } : null) as T | null;
      }

      if (s.startsWith("SELECT payload FROM attempts_local WHERE id =")) {
        const [id] = params as [string];
        const r = state.attempts.find((x) => x.id === id);
        return (r ? { payload: r.payload } : null) as T | null;
      }

      if (s.startsWith("SELECT * FROM sync_queue WHERE status = 'pending'")) {
        const pending = state.syncQueue
          .filter((r) => r.status === "pending")
          .sort((a, b) => a.created_at - b.created_at);
        const row = pending[0];
        if (!row) return null;
        return {
          id: row.id,
          kind: row.kind,
          attempt_id: row.attempt_id,
          payload: row.payload,
          status: row.status,
          retries: row.retries,
          last_error: row.last_error,
          created_at: row.created_at,
        } as T;
      }

      if (s.startsWith("SELECT * FROM sync_queue WHERE id =")) {
        const [id] = params as [string];
        const row = state.syncQueue.find((x) => x.id === id);
        if (!row) return null;
        return {
          id: row.id,
          kind: row.kind,
          attempt_id: row.attempt_id,
          payload: row.payload,
          status: row.status,
          retries: row.retries,
          last_error: row.last_error,
          created_at: row.created_at,
        } as T;
      }

      if (s.startsWith("SELECT retries FROM sync_queue WHERE id =")) {
        const [id] = params as [string];
        const row = state.syncQueue.find((x) => x.id === id);
        return (row ? { retries: row.retries } : null) as T | null;
      }

      return null;
    },

    async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      const s = sql.replace(/\s+/g, " ").trim();

      if (s.includes("sync_status IN")) {
        const rows = state.attempts
          .filter((r) => r.sync_status === "pending_upload" || r.sync_status === "failed")
          .sort((a, b) => a.updated_at - b.updated_at);
        return rows.map((r) => ({ payload: r.payload })) as T[];
      }

      if (s.startsWith("SELECT payload FROM attempts_local")) {
        let rows = [...state.attempts];
        let pi = 0;
        if (s.includes("AND team_id = ?")) {
          const tid = params[pi++] as string;
          rows = rows.filter((r) => r.team_id === tid);
        }
        if (s.includes("AND activity_id = ?")) {
          const aid = params[pi++] as string;
          rows = rows.filter((r) => r.activity_id === aid);
        }
        rows.sort((a, b) => b.updated_at - a.updated_at);
        return rows.map((r) => ({ payload: r.payload })) as T[];
      }

      if (s.startsWith("SELECT * FROM sync_queue ORDER BY created_at DESC")) {
        const rows = [...state.syncQueue].sort((a, b) => b.created_at - a.created_at).slice(0, 200);
        return rows.map((row) => ({
          id: row.id,
          kind: row.kind,
          attempt_id: row.attempt_id,
          payload: row.payload,
          status: row.status,
          retries: row.retries,
          last_error: row.last_error,
          created_at: row.created_at,
        })) as T[];
      }

      if (s.startsWith("SELECT id, attempt_id")) {
        const rows = state.mediaQueue
          .filter((m) => m.status === "pending")
          .sort((a, b) => a.created_at - b.created_at);
        return rows.map((r) => ({
          id: r.id,
          attempt_id: r.attempt_id,
          local_uri: r.local_uri,
          storage_path: r.storage_path,
          content_type: r.content_type,
          kind: r.kind,
        })) as T[];
      }

      return [];
    },
  };

  singleton = api;
  return api;
}
