import { Link } from "expo-router";
import { href } from "@/navigation/href";
import { Switch, View } from "react-native";
import { StemButton } from "@/components/ui/StemButton";
import { StemCard } from "@/components/ui/StemCard";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTeamStore } from "@/store/teamStore";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { useStemTheme } from "@/theme/ThemeProvider";

export default function SettingsScreen() {
  const t = useStemTheme();
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.firebaseUser);
  const primary = useSettingsStore((s) => s.primarySchoolMode);
  const setPrimary = useSettingsStore((s) => s.setPrimarySchoolMode);
  const themePref = useSettingsStore((s) => s.themePreference);
  const setThemePref = useSettingsStore((s) => s.setThemePreference);
  const clearTeam = useTeamStore((s) => s.clear);

  return (
    <Screen>
      <StemText variant="h1">Settings</StemText>
      <StemCard title="Learning mode">
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48 }}>
          <StemText variant="body" style={{ flex: 1 }}>
            Primary school mode (simpler language & fewer numbers)
          </StemText>
          <Switch
            value={primary}
            onValueChange={(v) => setPrimary(v)}
            accessibilityLabel="Primary school mode"
          />
        </View>
      </StemCard>
      <StemCard title="Appearance">
        <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 8 }}>
          Theme preference
        </StemText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["system", "light", "dark"] as const).map((opt) => (
            <StemButton
              key={opt}
              title={opt}
              variant={themePref === opt ? "primary" : "secondary"}
              onPress={() => setThemePref(opt)}
            />
          ))}
        </View>
      </StemCard>
      <StemCard title="Account">
        {user ? (
          <StemText variant="body" style={{ marginBottom: 12 }}>
            Signed in as {user.email}
          </StemText>
        ) : (
          <StemText variant="body" style={{ marginBottom: 12 }}>
            {isFirebaseConfigured() ? "Not signed in" : "Local-only profile (Firebase not configured)"}
          </StemText>
        )}
        {isFirebaseConfigured() && user ? (
          <StemButton title="Sign out" variant="danger" onPress={() => signOut()} />
        ) : null}
      </StemCard>
      <StemCard title="Team data on device">
        <StemButton
          title="Clear local team (sign out of device profile)"
          variant="secondary"
          onPress={() => clearTeam()}
        />
      </StemCard>
      <Link href={href("/(main)/debug")} asChild>
        <StemButton title="Developer / debug info" variant="ghost" />
      </Link>
    </Screen>
  );
}
