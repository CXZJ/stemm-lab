import { initMobileAds } from "@/services/adsInit";
import { registerPushToken } from "@/services/notifications";
import { openStemmDatabase } from "@/services/sqlite/database";
import { registerBackgroundSync } from "@/services/sync/backgroundSync";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTeamStore } from "@/store/teamStore";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
    const isVerifyScreen = (segments as string[]).length > 1 && (segments as string[])[1] === "verify-email";

    if (!user) {
      if (!inAuthGroup) {
        router.replace("/(auth)/sign-in");
      }
    } else if (!user.emailVerified) {
      if (!isVerifyScreen) {
        router.replace("/(auth)/verify-email");
      }
    } else {
      if (inAuthGroup) {
        router.replace("/(main)");
      }
    }
  }, [user, user?.emailVerified, authReady, segments, router]);

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