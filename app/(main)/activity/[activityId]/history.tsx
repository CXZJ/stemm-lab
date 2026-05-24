import { Screen } from "@/components/ui/Screen";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { SyncStatusBadge } from "@/components/ui/SyncStatusBadge";
import { useSpeech } from "@/hooks/useSpeech";
import { href } from "@/navigation/href";
import { listLocalAttempts } from "@/services/sqlite/attemptsLocal";
import { useSettingsStore } from "@/store/settingsStore";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import type { ActivityAttempt } from "@/types/models";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity } from "react-native";

export default function ActivityHistoryScreen() {
  const { activityId } = useLocalSearchParams<{ activityId: string }>();
  const router = useRouter();
  const t = useStemTheme();
  const team = useTeamStore((s) => s.team);
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled);
  const { speak, stop, isSpeaking, speakingId } = useSpeech();
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
        rows.map((a, i) => {
          const entryId = `attempt-${a.id}`;
          const entryText = `Attempt ${i + 1}. Date: ${new Date(a.startedAt).toLocaleString()}. Status: ${a.syncStatus}.`;
          return (
            <StemCard
              key={a.id}
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