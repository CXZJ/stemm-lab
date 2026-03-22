import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { ALL_ACTIVITIES } from "@/activities";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { SyncStatusBadge } from "@/components/ui/SyncStatusBadge";
import { listLocalAttempts } from "@/services/sqlite/attemptsLocal";
import { useTeamStore } from "@/store/teamStore";
import type { ActivityAttempt } from "@/types/models";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function ActivitiesScreen() {
  const t = useStemTheme();
  const router = useRouter();
  const team = useTeamStore((s) => s.team);
  const [byActivity, setByActivity] = useState<Record<string, ActivityAttempt[]>>({});

  const load = useCallback(async () => {
    if (!team) return;
    const all = await listLocalAttempts({ teamId: team.id });
    const map: Record<string, ActivityAttempt[]> = {};
    for (const a of all) {
      map[a.activityId] = map[a.activityId] ?? [];
      map[a.activityId].push(a);
    }
    setByActivity(map);
  }, [team]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <StemText variant="h1">Activities</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 12 }}>
        Each challenge uses the same save, upload, and reflection flow.
      </StemText>
      {ALL_ACTIVITIES.map((act) => {
        const attempts = byActivity[act.id] ?? [];
        const last = attempts[0];
        return (
          <StemCard key={act.id} title={act.title} subtitle={act.subjectArea}>
            <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 8 }}>
              {attempts.length} attempt(s) stored on device
            </StemText>
            {last ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <StemText variant="caption">Last:</StemText>
                <SyncStatusBadge status={last.syncStatus} />
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Pressable
                onPress={() => router.push(href(`/(main)/activity/${act.id}`))}
                accessibilityRole="button"
                accessibilityLabel={`Open ${act.title}`}
              >
                <StemText style={{ color: t.colors.primary, fontWeight: "700" }}>Details</StemText>
              </Pressable>
              <Pressable
                onPress={() => router.push(href(`/(main)/activity/${act.id}/attempt`))}
                accessibilityRole="button"
                accessibilityLabel={`Start ${act.title}`}
              >
                <StemText style={{ color: t.colors.primary, fontWeight: "700" }}>Start</StemText>
              </Pressable>
              <Pressable
                onPress={() => router.push(href(`/(main)/activity/${act.id}/history`))}
                accessibilityRole="button"
              >
                <StemText style={{ color: t.colors.primary, fontWeight: "700" }}>History</StemText>
              </Pressable>
            </View>
          </StemCard>
        );
      })}
    </Screen>
  );
}
