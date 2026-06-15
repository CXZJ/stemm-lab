import { getActivityConfig } from "@/activities";
import { saveAttemptRemote } from "@/services/firebase/attemptService";
import { isFirebaseConfigured } from "@/services/firebase/config";
import {
  upsertLeaderboardEntry,
} from "@/services/firebase/leaderboardService";
import { uploadLocalFile } from "@/services/firebase/storageUpload";
import { updateAttemptSyncStatus } from "@/services/sqlite/attemptsLocal";
import {
  dequeueNextPending,
  getSyncRow,
  listPendingMedia,
  markMediaDone,
  markSyncDone,
  markSyncFailed,
} from "@/services/sqlite/syncQueueLocal";
import { useNotificationStore } from "@/store/notificationStore";
import type { ActivityAttempt, LeaderboardEntry } from "@/types/models";
import NetInfo from "@react-native-community/netinfo";

export async function isOnline(): Promise<boolean> {
  const s = await NetInfo.fetch();
  return Boolean(s.isConnected && s.isInternetReachable !== false);
}

export async function processSyncQueueOnce(): Promise<{ processed: number }> {
  if (!(await isOnline()) || !isFirebaseConfigured()) {
    return { processed: 0 };
  }
  let processed = 0;

  // --- Media uploads: independent files, safe to run concurrently ---
  const media = await listPendingMedia();
  const mediaResults = await Promise.allSettled(
    media.map(async (m) => {
      await uploadLocalFile({
        localUri: m.localUri,
        storagePath: m.storagePath,
        contentType: m.contentType || "application/octet-stream",
      });
      await markMediaDone(m.id);
    })
  );
  for (const result of mediaResults) {
    if (result.status === "fulfilled") {
      processed += 1;
    } else {
      console.warn("media upload failed", result.reason);
    }
  }

  // --- Sync jobs: dequeue sequentially (it mutates queue state),
  //     then process the batch concurrently ---
  type SyncJob = NonNullable<Awaited<ReturnType<typeof dequeueNextPending>>>;
  const jobs: SyncJob[] = [];
  for (let i = 0; i < 10; i++) {
    const job = await dequeueNextPending();
    if (!job) break;
    jobs.push(job);
  }

  const jobResults = await Promise.allSettled(
    jobs.map(async (job) => {
      let attemptIdForFailure: string | undefined;
      try {
        if (job.kind === "attempt") {
          const attempt = JSON.parse(job.payload) as ActivityAttempt;
          attemptIdForFailure = attempt.id;
          await saveAttemptRemote(attempt);
          await updateAttemptSyncStatus(attempt.id, "uploaded");
        }
        if (job.kind === "leaderboard") {
          const entry = JSON.parse(job.payload) as LeaderboardEntry;
          const cfg = getActivityConfig(entry.activityId);
          await upsertLeaderboardEntry(entry, cfg.leaderboard.higherIsBetter);
        }
        await markSyncDone(job.id);
        return { ok: true as const };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await markSyncFailed(job.id, msg);
        const after = await getSyncRow(job.id);
        const aid = attemptIdForFailure ?? job.attemptId ?? undefined;
        if (after?.status === "failed" && aid) {
          await updateAttemptSyncStatus(aid, "failed");
        }
        return { ok: false as const, error: msg };
      }
    })
  );

  const failures: string[] = [];
  for (const result of jobResults) {
    if (result.status === "fulfilled") {
      if (result.value.ok) processed += 1;
      else failures.push(result.value.error);
    }
  }
  if (failures.length > 0) {
    useNotificationStore.getState().pushLocal({
      title: "Sync issue",
      body: failures.length === 1 ? failures[0] : `${failures.length} items failed to sync`,
      type: "sync",
    });
  }

  if (processed > 0) {
    useNotificationStore.getState().pushLocal({
      title: "Sync update",
      body: `Processed ${processed} background task(s).`,
      type: "sync",
    });
  }

  return { processed };
}