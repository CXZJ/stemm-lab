import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initMobileAds } from "@/services/adsInit";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { useAuthStore } from "@/store/authStore";
import { useTeamStore } from "@/store/teamStore";
import { useSettingsStore } from "@/store/settingsStore";
import { openStemmDatabase } from "@/services/sqlite/database";
import { registerBackgroundSync } from "@/services/sync/backgroundSync";
import { registerPushToken } from "@/services/notifications";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const initAuth = useAuthStore((s) => s.init);
  const hydrateTeam = useTeamStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    const unsub = initAuth();
    void hydrateTeam();
    void hydrateSettings();
    void openStemmDatabase();
    void registerBackgroundSync().catch(() => {});
    void initMobileAds();
    void registerPushToken().catch(() => {});
    const t = setTimeout(() => SplashScreen.hideAsync().catch(() => {}), 400);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [hydrateSettings, hydrateTeam, initAuth]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding/team-wizard" />
          <Stack.Screen name="(main)" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
