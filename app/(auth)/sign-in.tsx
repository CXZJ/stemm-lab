import { Screen } from "@/components/ui/Screen";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { href } from "@/navigation/href";
import { isFirebaseConfigured } from "@/services/firebase/config";
import { useAuthStore } from "@/store/authStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, TextInput } from "react-native";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function SignInScreen() {
  const t = useStemTheme();
  const router = useRouter();
  
  // Pull only standard email sign-in from your cleaned store
  const { signIn } = useAuthStore();

  const [signInError, setSignInError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
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

      {/* Firebase sign-in error */}
      {signInError ? (
        <StemText variant="small" style={{ color: t.colors.danger, marginBottom: 8 }}>
          {signInError}
        </StemText>
      ) : null}

      {/* Email field */}
      <StemText variant="body" accessibilityLabel="Email">
        Email
      </StemText>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={(text) => {
              onChange(text);
              setSignInError(null); 
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[
              styles.input,
              {
                color: t.colors.text,
                borderColor: errors.email ? t.colors.danger : t.colors.border,
              },
            ]}
          />
        )}
      />
      {errors.email ? (
        <StemText variant="small" style={{ color: t.colors.danger, marginTop: 4 }}>
          {errors.email.message}
        </StemText>
      ) : null}

      {/* Password field */}
      <StemText variant="body" style={{ marginTop: 12 }}>
        Password
      </StemText>
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={(text) => {
              onChange(text);
              setSignInError(null); 
            }}
            secureTextEntry
            style={[
              styles.input,
              {
                color: t.colors.text,
                borderColor: errors.password ? t.colors.danger : t.colors.border,
              },
            ]}
          />
        )}
      />
      {errors.password ? (
        <StemText variant="small" style={{ color: t.colors.danger, marginTop: 4 }}>
          {errors.password.message}
        </StemText>
      ) : null}

      <StemButton
        title={loading ? "Signing in…" : "Sign in"}
        onPress={handleSubmit(async (v) => {
          setSignInError(null);
          setLoading(true);
          try {
            await signIn(v.email, v.password);
          } catch {
            setSignInError("Incorrect email or password. Please try again.");
          } finally {
            setLoading(false);
          }
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