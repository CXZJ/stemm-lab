import NetInfo from "@react-native-community/netinfo";
import { saveAttemptRemote } from "@/services/firebase/attemptService";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { uploadLocalFile } from "@/services/firebase/storageUpload";
import {
  upsertLeaderboardEntry,
} from "@/services/firebase/leaderboardService";
import {
  dequeueNextPending,
  getSyncRow,
  listPendingMedia,
  markMediaDone,
  markSyncDone,
  markSyncFailed,
} from "@/services/sqlite/syncQueueLocal";
import { updateAttemptSyncStatus } from "@/services/sqlite/attemptsLocal";
import type { ActivityAttempt, LeaderboardEntry } from "@/types/models";
import { useNotificationStore } from "@/store/notificationStore";

export async function isOnline(): Promise<boolean> {
  const s = await NetInfo.fetch();
  return Boolean(s.isConnected && s.isInternetReachable !== false);
}

export async function processSyncQueueOnce(): Promise<{ processed: number }> {
  if (!(await isOnline()) || !isFirebaseConfigured()) {
    return { processed: 0 };
  }
  let processed = 0;

  const media = await listPendingMedia();
  for (const m of media) {
    try {
      await uploadLocalFile({
        localUri: m.localUri,
        storagePath: m.storagePath,
        contentType: m.contentType || "application/octet-stream",
      });
      await markMediaDone(m.id);
      processed += 1;
    } catch (e) {
      console.warn("media upload failed", e);
    }
  }

  for (let i = 0; i < 10; i++) {
    const job = await dequeueNextPending();
    if (!job) break;
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
        await upsertLeaderboardEntry(entry);
      }
      await markSyncDone(job.id);
      processed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await markSyncFailed(job.id, msg);
      const after = await getSyncRow(job.id);
      const aid = attemptIdForFailure ?? job.attemptId ?? undefined;
      if (after?.status === "failed" && aid) {
        await updateAttemptSyncStatus(aid, "failed");
      }
      useNotificationStore.getState().pushLocal({
        title: "Sync issue",
        body: msg,
        type: "sync",
      });
    }
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
