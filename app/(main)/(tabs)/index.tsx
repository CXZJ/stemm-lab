import { Screen } from "@/components/ui/Screen";
import { SpeakButton } from "@/components/ui/SpeakButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { SyncStatusBadge } from "@/components/ui/SyncStatusBadge";
import { useSpeech } from "@/hooks/useSpeech";
import { href } from "@/navigation/href";
import { listLocalAttempts } from "@/services/sqlite/attemptsLocal";
import { isOnline, processSyncQueueOnce } from "@/services/sync/syncEngine";
import { useNotificationStore } from "@/store/notificationStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTeamStore } from "@/store/teamStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import type { ActivityAttempt } from "@/types/models";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";

export default function HomeScreen() {
  const t = useStemTheme();
  const router = useRouter();
  const team = useTeamStore((s) => s.team);
  const notifs = useNotificationStore((s) => s.items);
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled);
  const [recent, setRecent] = useState<ActivityAttempt[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { speak, stop, isSpeaking, speakingId } = useSpeech();

  const load = useCallback(async () => {
    if (!team) return;
    const rows = await listLocalAttempts({ teamId: team.id });
    setRecent(rows.slice(0, 6));
    setOnline(await isOnline());
  }, [team]);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <Screen>
      <StemText variant="h1" accessibilityRole="header">
        STEMM Lab
      </StemText>
      {team ? (
        <StemText variant="body" style={{ color: t.colors.muted }}>
          Team {team.name} · Code {team.discriminator} · {team.gradeLevel}
        </StemText>
      ) : null}

      <StemCard
        title="Sync & network"
        footer={
          ttsEnabled ? (
            <SpeakButton
              id="sync"
              text={`Network status: ${online ? "Online" : "Offline, drafts stay on device"}.`}
              isSpeaking={isSpeaking("sync")}
              onPress={() =>
                speak("sync", `Network status: ${online ? "Online" : "Offline, drafts stay on device"}.`)
              }
            />
          ) : null
        }
      >
        <StemText variant="body">
          Network: {online ? "Online" : "Offline — drafts stay on device"}
        </StemText>
        <Pressable
          onPress={async () => {
            setSyncing(true);
            await processSyncQueueOnce();
            await load();
            setSyncing(false);
          }}
          accessibilityRole="button"
          accessibilityLabel="Run sync now"
          style={{ marginTop: 10 }}
        >
          <StemText variant="body" style={{ color: t.colors.primary, fontWeight: "700" }}>
            {syncing ? "Syncing…" : "Run sync now"}
          </StemText>
        </Pressable>
        <Link href={href("/(main)/sync-queue") as never} asChild>
          <Pressable accessibilityRole="button" style={{ marginTop: 8 }}>
            <StemText variant="small" style={{ color: t.colors.primary }}>
              View sync queue
            </StemText>
          </Pressable>
        </Link>
      </StemCard>

      <StemCard
        title="Notifications"
        onPress={() => router.push(href("/(main)/notifications"))}
        footer={
          ttsEnabled ? (
            <SpeakButton
              id="notifs"
              text={
                unread > 0
                  ? `You have ${unread} unread notification${unread > 1 ? "s" : ""}.`
                  : "No unread notifications."
              }
              isSpeaking={isSpeaking("notifs")}
              onPress={() =>
                speak(
                  "notifs",
                  unread > 0
                    ? `You have ${unread} unread notification${unread > 1 ? "s" : ""}.`
                    : "No unread notifications.",
                )
              }
            />
          ) : null
        }
      >
        <StemText variant="small" style={{ color: t.colors.muted }}>
          Challenges, leaderboard changes, and sync updates appear here.
        </StemText>
        {unread > 0 ? (
          <StemText variant="caption" style={{ color: t.colors.accent, marginTop: 8 }}>
            {unread} unread
          </StemText>
        ) : null}
      </StemCard>

      <StemCard
        title="Recent attempts"
        footer={
          ttsEnabled && recent.length > 0 ? (
            <SpeakButton
              id="recent"
              text={`You have ${recent.length} recent attempt${recent.length > 1 ? "s" : ""}. Latest: ${recent[0].activityId}.`}
              isSpeaking={isSpeaking("recent")}
              onPress={() =>
                speak(
                  "recent",
                  `You have ${recent.length} recent attempt${recent.length > 1 ? "s" : ""}. Latest: ${recent[0].activityId}.`,
                )
              }
            />
          ) : null
        }
      >
        {recent.length === 0 ? (
          <StemText variant="body">No attempts yet — start from the Activities tab.</StemText>
        ) : (
          recent.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => router.push(href(`/(main)/attempt/${a.id}/review`))}
              accessibilityRole="button"
              style={{ marginBottom: 12 }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <StemText variant="body">{a.activityId}</StemText>
                <SyncStatusBadge status={a.syncStatus} />
              </View>
              <StemText variant="caption" style={{ color: t.colors.muted }}>
                {new Date(a.startedAt).toLocaleString()}
              </StemText>
            </Pressable>
          ))
        )}
      </StemCard>

      {/* Global stop button — only shown when something is speaking */}
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