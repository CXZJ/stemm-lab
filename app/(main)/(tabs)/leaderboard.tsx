import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { ALL_ACTIVITIES } from "@/activities";
import { subscribeLeaderboard } from "@/services/firebase/leaderboardService";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { listLocalAttempts } from "@/services/sqlite/attemptsLocal";
import { useTeamStore } from "@/store/teamStore";
import type { LeaderboardEntry } from "@/types/models";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function LeaderboardScreen() {
  const t = useStemTheme();
  const team = useTeamStore((s) => s.team);
  const [activityId, setActivityId] = useState(ALL_ACTIVITIES[0]?.id ?? "parachute_drop");
  const [remote, setRemote] = useState<LeaderboardEntry[]>([]);
  const [localBest, setLocalBest] = useState<{ metric: number; count: number } | null>(null);

  const act = useMemo(() => ALL_ACTIVITIES.find((a) => a.id === activityId), [activityId]);

  useEffect(() => {
    if (!isFirebaseConfigured() || !team) {
      setRemote([]);
      return;
    }
    const unsub = subscribeLeaderboard(activityId, team.gradeLevel, setRemote);
    return unsub;
  }, [activityId, team]);

  useEffect(() => {
    void (async () => {
      if (!team || !act) {
        setLocalBest(null);
        return;
      }
      const rows = await listLocalAttempts({ teamId: team.id, activityId });
      const field = act.leaderboard.metricFieldId;
      let best = 0;
      let count = 0;
      for (const r of rows) {
        count += 1;
        const v = r.customData[field];
        const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) || 0 : 0;
        if (act.leaderboard.higherIsBetter) best = Math.max(best, n);
        else if (count === 1 || n < best) best = n;
      }
      setLocalBest(count ? { metric: best, count } : null);
    })();
  }, [act, activityId, team]);

  return (
    <Screen>
      <StemText variant="h1">Leaderboard</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 12 }}>
        Filter by activity and compare with other teams in your grade (when online and Firebase is
        configured).
      </StemText>
      <View
      style={{
        borderWidth: 1,
        borderColor: t.colors.muted,
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <Picker
        selectedValue={activityId}
        onValueChange={(value) => setActivityId(value)}
        style={{
          color: t.colors.text,
          backgroundColor: t.colors.bg,
          height: 56,        // 👈 taller touch target
          fontSize: 16,      // 👈 bigger text
        }}
        dropdownIconColor={t.colors.muted}
        itemStyle={{ fontSize: 16, height: 56 }} // 👈 for iOS
      >
        {ALL_ACTIVITIES.map((a) => (
          <Picker.Item key={a.id} label={a.title} value={a.id} />
        ))}
      </Picker>
    </View>

      {localBest && act ? (
        <StemCard title="Your team (on device)">
          <StemText variant="body">
            Best {act.leaderboard.metricFieldId}: {localBest.metric.toFixed(2)} · {localBest.count}{" "}
            attempts
          </StemText>
        </StemCard>
      ) : null}
      {!isFirebaseConfigured() ? (
        <StemText variant="body">Connect Firebase to load live leaderboards.</StemText>
      ) : remote.length === 0 ? (
        <StemText variant="body">No remote entries yet for this filter.</StemText>
      ) : (
        remote.map((e, i) => (
          <StemCard key={e.id} title={`#${i + 1} ${e.teamName}`}>
            <StemText variant="body">
              Score metric: {e.metricValue.toFixed(2)} ({e.metricLabel})
            </StemText>
            <StemText variant="caption" style={{ color: t.colors.muted }}>
              Grade {e.gradeLevel}
            </StemText>
          </StemCard>
        ))
      )}
    </Screen>
  );
}