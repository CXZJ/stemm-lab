import { ALL_ACTIVITIES } from "@/activities";
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
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";

export default function ActivitiesScreen() {
  const t = useStemTheme();
  const router = useRouter();
  const team = useTeamStore((s) => s.team);
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled);
  const { speak, stop, isSpeaking, speakingId } = useSpeech();
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
        const speakText = `${act.title}. Subject: ${act.subjectArea}. ${attempts.length} attempt${attempts.length !== 1 ? "s" : ""} stored on device.`;

        return (
          <StemCard
            key={act.id}
            title={act.title}
            subtitle={act.subjectArea}
            footer={
              ttsEnabled ? (
                <SpeakButton
                  id={act.id}
                  text={speakText}
                  isSpeaking={isSpeaking(act.id)}
                  onPress={() => speak(act.id, speakText)}
                />
              ) : null
            }
          >
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

      {/* Global stop — only visible while something is playing */}
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