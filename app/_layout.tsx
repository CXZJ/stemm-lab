import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
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
  const user = useAuthStore((s) => s.firebaseUser);
  const authReady = useAuthStore((s) => s.ready);
  const hydrateTeam = useTeamStore((s) => s.hydrate);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsub = initAuth();
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
  }, [hydrateSettings, initAuth]);

  useEffect(() => {
    if (!authReady || !user) return;
    void hydrateTeam(user.uid);
  }, [authReady, user?.uid, hydrateTeam]);

  useEffect(() => {
    if (!authReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuthGroup) {
      router.replace("/(main)");
    }
  }, [user, authReady, segments, router]);

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