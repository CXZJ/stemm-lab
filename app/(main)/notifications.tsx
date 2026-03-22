import { Pressable } from "react-native";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { useNotificationStore } from "@/store/notificationStore";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function NotificationsScreen() {
  const t = useStemTheme();
  const items = useNotificationStore((s) => s.items);
  const markRead = useNotificationStore((s) => s.markRead);

  return (
    <Screen>
      <StemText variant="h1">Notifications</StemText>
      {items.length === 0 ? (
        <StemText variant="body">No notifications yet.</StemText>
      ) : (
        items.map((n) => (
          <StemCard key={n.id} title={n.title}>
            <Pressable onPress={() => markRead(n.id)} accessibilityRole="button">
              <StemText
                variant="body"
                style={{ opacity: n.read ? 0.6 : 1 }}
              >
                {n.body}
              </StemText>
              <StemText variant="caption" style={{ color: t.colors.muted, marginTop: 6 }}>
                {new Date(n.createdAt).toLocaleString()} · {n.type}
              </StemText>
            </Pressable>
          </StemCard>
        ))
      )}
    </Screen>
  );
}
