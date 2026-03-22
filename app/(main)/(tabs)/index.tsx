import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { SyncStatusBadge } from "@/components/ui/SyncStatusBadge";
import { listLocalAttempts } from "@/services/sqlite/attemptsLocal";
import { processSyncQueueOnce, isOnline } from "@/services/sync/syncEngine";
import { useTeamStore } from "@/store/teamStore";
import { useNotificationStore } from "@/store/notificationStore";
import type { ActivityAttempt } from "@/types/models";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function HomeScreen() {
  const t = useStemTheme();
  const router = useRouter();
  const team = useTeamStore((s) => s.team);
  const notifs = useNotificationStore((s) => s.items);
  const [recent, setRecent] = useState<ActivityAttempt[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

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

      <StemCard title="Sync & network">
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
          unread > 0 ? (
            <StemText variant="caption" style={{ color: t.colors.accent, marginTop: 8 }}>
              {unread} unread
            </StemText>
          ) : null
        }
      >
        <StemText variant="small" style={{ color: t.colors.muted }}>
          Challenges, leaderboard changes, and sync updates appear here.
        </StemText>
      </StemCard>

      <StemCard title="Recent attempts">
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
    </Screen>
  );
}
