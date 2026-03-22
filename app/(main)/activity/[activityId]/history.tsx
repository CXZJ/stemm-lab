import { useLocalSearchParams, useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { useCallback, useEffect, useState } from "react";
import { Pressable } from "react-native";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { SyncStatusBadge } from "@/components/ui/SyncStatusBadge";
import { listLocalAttempts } from "@/services/sqlite/attemptsLocal";
import { useTeamStore } from "@/store/teamStore";
import type { ActivityAttempt } from "@/types/models";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function ActivityHistoryScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const router = useRouter();
  const t = useStemTheme();
  const team = useTeamStore((s) => s.team);
  const [rows, setRows] = useState<ActivityAttempt[]>([]);

  const load = useCallback(async () => {
    if (!team || !activityId) return;
    const r = await listLocalAttempts({ teamId: team.id, activityId });
    setRows(r);
  }, [team, activityId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <StemText variant="h1">History</StemText>
      {rows.length === 0 ? (
        <StemText variant="body">No attempts yet.</StemText>
      ) : (
        rows.map((a) => (
          <StemCard key={a.id}>
            <Pressable
              onPress={() => router.push(href(`/(main)/attempt/${a.id}/review`))}
              accessibilityRole="button"
            >
              <StemText variant="small" style={{ color: t.colors.muted }}>
                {new Date(a.startedAt).toLocaleString()}
              </StemText>
              <StemText variant="body">Attempt {a.id.slice(0, 8)}…</StemText>
              <SyncStatusBadge status={a.syncStatus} />
            </Pressable>
          </StemCard>
        ))
      )}
    </Screen>
  );
}
