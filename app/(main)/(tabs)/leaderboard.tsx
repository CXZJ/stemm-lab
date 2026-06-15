import { ALL_ACTIVITIES } from "@/activities";
import { Screen } from "@/components/ui/Screen";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { useSpeech } from "@/hooks/useSpeech";
import { bestMetricFromAttempts } from "@/lib/leaderboard";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { subscribeLeaderboard } from "@/services/firebase/leaderboardService";
import { listLocalAttempts } from "@/services/sqlite/attemptsLocal";
import { useSettingsStore } from "@/store/settingsStore";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import type { LeaderboardEntry } from "@/types/models";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function LeaderboardScreen() {
  const t = useStemTheme();
  const team = useTeamStore((s) => s.team);
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled);
  const { speak, stop, isSpeaking, speakingId } = useSpeech();
  const [activityId, setActivityId] = useState(ALL_ACTIVITIES[0]?.id ?? "parachute_drop");
  const [remote, setRemote] = useState<LeaderboardEntry[]>([]);
  const [localBest, setLocalBest] = useState<{ metric: number; count: number } | null>(null);

  const act = useMemo(() => ALL_ACTIVITIES.find((a) => a.id === activityId), [activityId]);

  const loadLocalBest = useCallback(async () => {
    if (!team || !act) {
      setLocalBest(null);
      return;
    }
    const rows = await listLocalAttempts({ teamId: team.id, activityId });
    const { best, count } = bestMetricFromAttempts(rows, act.leaderboard);
    setLocalBest(best != null ? { metric: best, count } : null);
  }, [act, activityId, team]);

  useEffect(() => {
    if (!isFirebaseConfigured() || !team || !act) {
      setRemote([]);
      return;
    }
    const unsub = subscribeLeaderboard(activityId, team.gradeLevel, {
      higherIsBetter: act.leaderboard.higherIsBetter,
      onData: setRemote,
    });
    return unsub;
  }, [act, activityId, team]);

  useFocusEffect(
    useCallback(() => {
      void loadLocalBest();
    }, [loadLocalBest]),
  );

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
            height: 56,
            fontSize: 16,
          }}
          dropdownIconColor={t.colors.muted}
          itemStyle={{ fontSize: 16, height: 56 }}
        >
          {ALL_ACTIVITIES.map((a) => (
            <Picker.Item key={a.id} label={a.title} value={a.id} />
          ))}
        </Picker>
      </View>

      {localBest && act ? (
        <StemCard
          title="Your team (on device)"
          footer={
            ttsEnabled ? (
              <SpeakButton
                id="local-best"
                text={`Your best ${act.leaderboard.metricFieldId} is ${localBest.metric.toFixed(2)}, across ${localBest.count} attempt${localBest.count !== 1 ? "s" : ""}.`}
                isSpeaking={isSpeaking("local-best")}
                onPress={() =>
                  speak(
                    "local-best",
                    `Your best ${act.leaderboard.metricFieldId} is ${localBest.metric.toFixed(2)}, across ${localBest.count} attempt${localBest.count !== 1 ? "s" : ""}.`,
                  )
                }
              />
            ) : null
          }
        >
          <StemText variant="body">
            Best {act.leaderboard.metricFieldId}: {localBest.metric.toFixed(2)} · {localBest.count} attempts
          </StemText>
        </StemCard>
      ) : null}

      {!isFirebaseConfigured() ? (
        <StemText variant="body">
          Connect Firebase to load live leaderboards. Your on-device best score still updates when you submit attempts.
        </StemText>
      ) : remote.length === 0 ? (
        <StemText variant="body">
          No remote entries yet for this activity and grade. Submit an attempt while online to appear here.
        </StemText>
      ) : (
        remote.map((e, i) => {
          const entryId = `entry-${e.id}`;
          const entryText = `Number ${i + 1}: ${e.teamName}. Score: ${e.metricValue.toFixed(2)} ${e.metricLabel}. Grade ${e.gradeLevel}.`;
          return (
            <StemCard
              key={e.id}
              title={`#${i + 1} ${e.teamName}`}
              footer={
                ttsEnabled ? (
                  <SpeakButton
                    id={entryId}
                    text={entryText}
                    isSpeaking={isSpeaking(entryId)}
                    onPress={() => speak(entryId, entryText)}
                  />
                ) : null
              }
            >
              <StemText variant="body">
                Score metric: {e.metricValue.toFixed(2)} ({e.metricLabel})
              </StemText>
              <StemText variant="caption" style={{ color: t.colors.muted }}>
                Grade {e.gradeLevel}
              </StemText>
            </StemCard>
          );
        })
      )}

      {ttsEnabled && speakingId && (
        <TouchableOpacity style={styles.stopAll} onPress={stop}>
          <StemText variant="body" style={{ color: "#fff" }}>
            ⏹ Stop reading
          </StemText>
        </TouchableOpacity>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stopAll: {
    backgroundColor: "#555",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
});