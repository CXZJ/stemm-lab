import { Redirect } from "expo-router";
import { href } from "@/navigation/href";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { useSettingsStore } from "@/store/settingsStore";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function Index() {
  const t = useStemTheme();
  const initializing = useAuthStore((s) => s.initializing);
  const user = useAuthStore((s) => s.firebaseUser);
  const teamHydrated = useTeamStore((s) => s.hydrated);
  const team = useTeamStore((s) => s.team);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);

  if (!teamHydrated || !settingsHydrated || initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: t.colors.bg }}>
        <ActivityIndicator size="large" color={t.colors.primary} accessibilityLabel="Loading" />
      </View>
    );
  }

  if (isFirebaseConfigured() && !user) {
    return <Redirect href={href("/(auth)/sign-in")} />;
  }

  if (!team) {
    return <Redirect href={href("/onboarding/team-wizard")} />;
  }

  return <Redirect href={href("/(main)/(tabs)")} />;
}
