import { useLocalSearchParams, useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, View } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { getActivityConfig } from "@/activities";
import { StemButton } from "@/components/ui/StemButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { listLocalAttempts } from "@/services/sqlite/attemptsLocal";
import { useTeamStore } from "@/store/teamStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import type { ActivityAttempt } from "@/types/models";

export default function ActivityDetailScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const router = useRouter();
  const t = useStemTheme();
  const simple = useSettingsStore((s) => s.primarySchoolMode);
  const team = useTeamStore((s) => s.team);
  const config = activityId ? getActivityConfig(activityId) : undefined;
  const [attempts, setAttempts] = useState<ActivityAttempt[]>([]);

  const load = useCallback(async () => {
    if (!team || !activityId) return;
    const rows = await listLocalAttempts({ teamId: team.id, activityId });
    setAttempts(rows);
  }, [team, activityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const chart = useMemo(() => {
    if (activityId !== "parachute_drop" || attempts.length === 0) return null;
    const labels = attempts
      .filter((a) => !a.id.startsWith("draft_"))
      .slice(0, 8)
      .map((_, i) => `P${i + 1}`);
    const data = attempts
      .filter((a) => !a.id.startsWith("draft_"))
      .slice(0, 8)
      .map((a) => {
        const v = a.customData.timeToGroundSec;
        return typeof v === "number" ? v : parseFloat(String(v)) || 0;
      });
    if (!data.length) return null;
    const w = Dimensions.get("window").width - 32;
    return (
      <StemCard title={simple ? "Compare drops" : "Prototype comparison (time to ground)"}>
        <BarChart
          data={{
            labels: labels.length ? labels : ["1"],
            datasets: [{ data: data.length ? data : [0] }],
          }}
          width={Math.min(w, 360)}
          height={200}
          yAxisLabel=""
          yAxisSuffix="s"
          chartConfig={{
            backgroundGradientFrom: t.colors.card,
            backgroundGradientTo: t.colors.card,
            decimalPlaces: 2,
            color: () => t.colors.primary,
            labelColor: () => t.colors.text,
          }}
          style={{ borderRadius: 12, marginVertical: 8 }}
        />
      </StemCard>
    );
  }, [activityId, attempts, simple, t.colors]);

  if (!config) {
    return (
      <Screen>
        <StemText variant="body">Unknown activity.</StemText>
      </Screen>
    );
  }

  return (
    <Screen>
      <StemText variant="h1">{config.title}</StemText>
      <StemText variant="small" style={{ color: t.colors.muted }}>
        {config.subjectArea}
      </StemText>
      <StemCard title={simple ? "About" : "Description"}>
        <StemText variant="body">{simple ? config.descriptionSimple : config.description}</StemText>
      </StemCard>
      {chart}
      <StemCard title="Progress">
        <StemText variant="body">{attempts.length} saved attempt(s) on this device</StemText>
      </StemCard>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        <StemButton
          title="Start"
          onPress={() => router.push(href(`/(main)/activity/${activityId}/attempt`))}
        />
        <StemButton
          title="History"
          variant="secondary"
          onPress={() => router.push(href(`/(main)/activity/${activityId}/history`))}
        />
      </View>
    </Screen>
  );
}
