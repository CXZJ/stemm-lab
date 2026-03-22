import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { Controller, useForm } from "react-hook-form";
import { TextInput, StyleSheet } from "react-native";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { useAuthStore } from "@/store/authStore";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { useStemTheme } from "@/theme/ThemeProvider";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function SignInScreen() {
  const t = useStemTheme();
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const err = useAuthStore((s) => s.error);
  const { control, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  if (!isFirebaseConfigured()) {
    return (
      <Screen>
        <StemText variant="h2">Cloud sign-in disabled</StemText>
        <StemText variant="body" style={{ marginVertical: 12 }}>
          Add Firebase keys to `.env` (see `.env.example`). You can still use the app locally with team
          data on this device.
        </StemText>
        <StemButton
          title="Continue to team setup"
          onPress={() => router.replace(href("/onboarding/team-wizard"))}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <StemText variant="h1">Welcome back</StemText>
      <StemText variant="small" style={{ color: t.colors.muted, marginBottom: 16 }}>
        Sign in to sync attempts, media, and leaderboards.
      </StemText>
      {err ? (
        <StemText variant="small" style={{ color: t.colors.danger, marginBottom: 8 }}>
          {err}
        </StemText>
      ) : null}
      <StemText variant="body" accessibilityLabel="Email">
        Email
      </StemText>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
          />
        )}
      />
      <StemText variant="body" style={{ marginTop: 12 }}>
        Password
      </StemText>
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            secureTextEntry
            style={[styles.input, { color: t.colors.text, borderColor: t.colors.border }]}
          />
        )}
      />
      <StemButton
        title="Sign in"
        onPress={handleSubmit(async (v) => {
          await signIn(v.email, v.password);
          router.replace("/");
        })}
        style={{ marginTop: 20 }}
      />
      <Link href={href("/(auth)/sign-up")} asChild>
        <StemButton title="Create an account" variant="secondary" />
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    fontSize: 17,
    minHeight: 48,
  },
});
