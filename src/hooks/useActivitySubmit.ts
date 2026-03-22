import { useCallback, useState } from "react";
import { newId } from "@/lib/id";
import { runActivityCalculations } from "@/lib/calculations/runActivityCalculations";
import { getActivityConfig } from "@/activities";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { getLocalUserId } from "@/services/localIdentity";
import { isOnline, processSyncQueueOnce } from "@/services/sync/syncEngine";
import { upsertLocalAttempt } from "@/services/sqlite/attemptsLocal";
import { enqueueMediaUpload, enqueueSyncItem } from "@/services/sqlite/syncQueueLocal";
import type {
  ActivityAttempt,
  AttemptMedia,
  CalculationResult,
  Comment,
  Rating,
  Reflection,
  SensorReading,
} from "@/types/models";
import type { ActivityConfig } from "@/types/activity-config";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";

function metricValue(data: Record<string, unknown>, fieldId: string): number {
  const v = data[fieldId];
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return parseFloat(v) || 0;
  return 0;
}

export function useActivitySubmit(activityId: string) {
  const [busy, setBusy] = useState(false);
  const user = useAuthStore((s) => s.firebaseUser);
  const team = useTeamStore((s) => s.team);

  const submit = useCallback(
    async (input: {
      attemptId?: string;
      config: ActivityConfig;
      customData: Record<string, unknown>;
      calculations: CalculationResult[];
      sensorReadings: SensorReading[];
      pendingMedia: { localUri: string; kind: AttemptMedia["kind"]; contentType: string }[];
      reflections: Reflection[];
      ratings: Rating[];
      comments: Comment[];
      advancedMode: boolean;
      durationSec?: number;
      duplicateOf?: string;
    }) => {
      if (!team) throw new Error("No team");
      let uid = user?.uid;
      if (!uid) {
        if (isFirebaseConfigured()) throw new Error("Sign in required");
        uid = await getLocalUserId();
      }

      setBusy(true);
      try {
        const id = input.attemptId ?? (await newId());
        const cfg = input.config;
        const calcs =
          input.calculations.length > 0
            ? input.calculations
            : await runActivityCalculations(id, cfg, input.customData, input.advancedMode);

        const builtMedia: AttemptMedia[] = [];
        for (const pm of input.pendingMedia) {
          const mid = await newId();
          const ext =
            pm.kind === "photo" ? "jpg" : pm.kind === "video" ? "mp4" : "m4a";
          const storagePath = `teams/${team.id}/attempts/${id}/${mid}.${ext}`;
          builtMedia.push({
            id: mid,
            attemptId: id,
            teamId: team.id,
            storagePath,
            contentType: pm.contentType,
            kind: pm.kind,
            createdAt: Date.now(),
            localUri: pm.localUri,
          });
        }

        const attempt: ActivityAttempt = {
          id,
          activityId,
          teamId: team.id,
          teamName: team.name,
          createdByUid: uid,
          gradeLevel: team.gradeLevel,
          syncStatus: "pending_upload",
          startedAt: Date.now(),
          submittedAt: Date.now(),
          durationSec: input.durationSec,
          customData: input.customData,
          calculations: calcs,
          sensorReadings: input.sensorReadings,
          media: builtMedia,
          reflections: input.reflections,
          ratings: input.ratings,
          comments: input.comments,
          score: metricValue(input.customData, cfg.leaderboard.metricFieldId),
          duplicateOf: input.duplicateOf,
        };

        await upsertLocalAttempt({
          id,
          activityId,
          teamId: team.id,
          userId: uid,
          payload: attempt,
          syncStatus: "pending_upload",
        });

        for (const m of builtMedia) {
          if (m.localUri) {
            await enqueueMediaUpload({
              id: m.id,
              attemptId: id,
              localUri: m.localUri,
              storagePath: m.storagePath,
              contentType: m.contentType,
              kind: m.kind,
            });
          }
        }

        await enqueueSyncItem({
          kind: "attempt",
          attemptId: id,
          payload: attempt as unknown as Record<string, unknown>,
        });

        const online = await isOnline();
        const entryId = `${team.id}_${activityId}`;
        const entry = {
          id: entryId,
          teamId: team.id,
          teamName: team.name,
          activityId,
          gradeLevel: team.gradeLevel,
          metricValue: attempt.score ?? 0,
          metricLabel: cfg.leaderboard.metricFieldId,
          completionCount: 1,
          bestScore: attempt.score ?? 0,
          lastAttemptAt: Date.now(),
          updatedAt: Date.now(),
        };
        await enqueueSyncItem({
          kind: "leaderboard",
          attemptId: id,
          payload: entry as unknown as Record<string, unknown>,
        });

        if (online && isFirebaseConfigured()) {
          await processSyncQueueOnce();
        }

        return attempt;
      } finally {
        setBusy(false);
      }
    },
    [activityId, team, user],
  );

  return { submit, busy };
}

export function buildReflections(
  prompts: string[],
  texts: Record<string, string>,
  attemptId: string,
): Promise<Reflection[]> {
  return (async () => {
    const out: Reflection[] = [];
    for (const p of prompts) {
      const text = texts[p]?.trim();
      if (!text) continue;
      out.push({
        id: await newId(),
        attemptId,
        prompt: p,
        text,
        createdAt: Date.now(),
      });
    }
    return out;
  })();
}

export { getActivityConfig };
