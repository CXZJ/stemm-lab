import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { Controller, useForm } from "react-hook-form";
import { TextInput, StyleSheet } from "react-native";
import { StemButton } from "@/components/ui/StemButton";
import { StemText } from "@/components/ui/StemText";
import { Screen } from "@/components/ui/Screen";
import { useAuthStore } from "@/store/authStore";
import { useStemTheme } from "@/theme/ThemeProvider";
import { useState } from "react";
import { z } from "zod";

const schema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function SignUpScreen() {
  const t = useStemTheme();
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);

  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", email: "", password: "" },
  });

  return (
    <Screen>
      <StemText variant="h1">Join STEMM Lab</StemText>

      {/* Firebase sign-up error (e.g. email already in use) */}
      {signUpError ? (
        <StemText variant="small" style={{ color: t.colors.danger, marginBottom: 8 }}>
          {signUpError}
        </StemText>
      ) : null}

      {/* Display name field */}
      <StemText variant="body">Your first name or nickname</StemText>
      <Controller
        control={control}
        name="displayName"
        render={({ field: { value, onChange } }) => (
          <TextInput
            value={value}
            onChangeText={(text) => {
              onChange(text);
              setSignUpError(null); 
            }}
            style={[
              styles.input,
              {
                color: t.colors.text,
                borderColor: errors.displayName ? t.colors.danger : t.colors.border,
              },
            ]}
          />
        )}
      />
      {errors.displayName ? (
        <StemText variant="small" style={{ color: t.colors.danger, marginTop: 4 }}>
          {errors.displayName.message}
        </StemText>
      ) : null}

      {/* Email field */}
      <StemText variant="body" style={{ marginTop: 12 }}>
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
              setSignUpError(null); 
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
              setSignUpError(null); 
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
        title={loading ? "Creating account…" : "Create account"}
        onPress={handleSubmit(async (v) => {
          setSignUpError(null);
          setLoading(true);
          try {
            await signUp(v.email, v.password, v.displayName);
          } catch {
            setSignUpError("Could not create account. This email may already be in use.");
          } finally {
            setLoading(false);
          }
        })}
        style={{ marginTop: 20 }}
      />
      <Link href={href("/(auth)/sign-in")} asChild>
        <StemButton title="Already have an account?" variant="ghost" />
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